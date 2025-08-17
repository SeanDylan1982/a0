'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  FileText, 
  Plus, 
  Search, 
  Edit, 
  Eye, 
  Download,
  Send,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  Receipt,
  FileSignature,
  Truck
} from 'lucide-react'
import { ShareButton } from '@/components/share-button'
import { ProductSelector } from '@/components/product-selector'
import { InventoryAlertManager } from '@/lib/inventory-alerts'
import { TooltipButton } from '@/components/tooltip-button'
import { useToast } from '@/hooks/use-toast'
import { PageLayout } from '@/components/page-layout'
import { QuoteDocument } from '@/components/documents/quote-document'
import type { ProductItem } from '@/components/product-selector'
import { exportElementToPDF } from '@/lib/pdf'

interface Invoice {
  id: string
  number: string
  customerId: string
  userId: string
  status: string
  subtotal: number
  tax: number
  total: number
  dueDate?: string
  paidDate?: string
  notes?: string
  createdAt: string
  updatedAt: string
  customer: {
    id: string
    firstName: string
    lastName: string
    company?: string
  }
  user: {
    id: string
    name: string
  }
  sales: any[]
  payments: Payment[]
}

interface Payment {
  id: string
  amount: number
  method: string
  reference?: string
  notes?: string
  createdAt: string
}

interface Quote {
  id: string
  number: string
  customerId: string
  status: string
  subtotal: number
  tax: number
  total: number
  validUntil: string
  createdAt: string
  notes?: string
  customer: {
    id: string
    firstName: string
    lastName: string
    company?: string
  }
  items?: Array<{
    productId: string
    quantity: number
    price: number
    total: number
    product?: { sku?: string; name?: string }
  }>
}

interface CreditNote {
  id: string
  number: string
  invoiceId: string
  amount: number
  reason: string
  status: string
  createdAt: string
}

interface DeliveryNote {
  id: string
  number: string
  invoiceId: string
  status: string
  deliveryDate: string
  createdAt: string
}

export default function InvoicingPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>([])
  const [deliveryNotes, setDeliveryNotes] = useState<DeliveryNote[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [isAddInvoiceOpen, setIsAddInvoiceOpen] = useState(false)
  const [isAddQuoteOpen, setIsAddQuoteOpen] = useState(false)
  const [invoiceItems, setInvoiceItems] = useState<ProductItem[]>([])
  const [quoteItems, setQuoteItems] = useState<ProductItem[]>([])
  const { toast } = useToast()
  // View Quote dialog state
  const [isViewQuoteOpen, setIsViewQuoteOpen] = useState(false)
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null)
  const [activeTab, setActiveTab] = useState('invoices')
  const [printQuote, setPrintQuote] = useState<Quote | null>(null)
  // Edit Quote dialog state
  const [isEditQuoteOpen, setIsEditQuoteOpen] = useState(false)
  const [editQuoteItems, setEditQuoteItems] = useState<ProductItem[]>([])
  const [editQuoteMeta, setEditQuoteMeta] = useState<{ validUntil?: string; notes?: string; customerId?: string }>({})

  useEffect(() => {
    fetchInvoices()
    fetchQuotes()
    fetchCustomers()
  }, [])

  // Refresh data when switching tabs to keep lists current
  useEffect(() => {
    if (activeTab === 'invoices') {
      fetchInvoices()
    } else if (activeTab === 'quotes') {
      fetchQuotes()
    } else if (activeTab === 'credit-notes') {
      fetchCreditNotes()
    } else if (activeTab === 'delivery-notes') {
      fetchDeliveryNotes()
    }
  }, [activeTab])

  const fetchInvoices = async () => {
    try {
      const response = await fetch('/api/invoicing/invoices')
      if (response.ok) {
        const data = await response.json()
        setInvoices(data.invoices)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch invoices",
        variant: "destructive",
      })
    }
  }

  // Quote actions
  const handleViewQuote = (quote: Quote) => {
    setSelectedQuote(quote)
    setIsViewQuoteOpen(true)
  }

  const handleDownloadQuote = async (quote: Quote) => {
    try {
      setPrintQuote(quote)
      await new Promise((res) => requestAnimationFrame(() => res(null)))
      const el = document.getElementById('quote-print-area')
      if (el) {
        await exportElementToPDF(el, `${quote.number || 'quote'}.pdf`)
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to generate PDF', variant: 'destructive' })
    } finally {
      setPrintQuote(null)
    }
  }

  const handleEditQuote = (quote: Quote) => {
    setSelectedQuote(quote)
    setEditQuoteItems((quote.items as any) || [])
    setEditQuoteMeta({
      validUntil: quote.validUntil ? new Date(quote.validUntil).toISOString().slice(0, 10) : undefined,
      notes: quote.notes || '',
      customerId: quote.customerId,
    })
    setIsEditQuoteOpen(true)
  }

  const handleSaveEditedQuote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedQuote) return
    if (editQuoteItems.length === 0) {
      toast({ title: 'Error', description: 'Please add at least one item', variant: 'destructive' })
      return
    }
    try {
      const res = await fetch('/api/invoicing/quotes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedQuote.id,
          validUntil: editQuoteMeta.validUntil,
          notes: editQuoteMeta.notes,
          customerId: editQuoteMeta.customerId,
          items: editQuoteItems.map((it: any) => ({
            productId: it.productId,
            quantity: it.quantity,
            price: it.price,
            total: it.total,
          })),
        }),
      })
      if (res.ok) {
        toast({ title: 'Quote updated', description: `Quote ${selectedQuote.number} saved` })
        setIsEditQuoteOpen(false)
        setSelectedQuote(null)
        setEditQuoteItems([])
        await fetchQuotes()
      } else {
        const data = await res.json().catch(() => ({}))
        toast({ title: 'Error', description: data.error || 'Failed to update quote', variant: 'destructive' })
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Network error while saving quote', variant: 'destructive' })
    }
  }

  const handleConvertToInvoice = async (quote: Quote) => {
    try {
      const items = (quote.items || []).map((it) => ({
        productId: it.productId,
        quantity: it.quantity,
        price: it.price,
        total: it.total,
      }))
      if (items.length === 0) {
        toast({ title: 'Error', description: 'Quote has no items', variant: 'destructive' })
        return
      }
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + 30)
      const res = await fetch('/api/invoicing/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: quote.customerId,
          dueDate: dueDate.toISOString().slice(0, 10),
          notes: quote.notes,
          items,
        }),
      })
      if (res.ok) {
        toast({ title: 'Converted', description: `Quote ${quote.number} converted to invoice` })
        setActiveTab('invoices')
        await fetchInvoices()
      } else {
        const data = await res.json().catch(() => ({}))
        toast({ title: 'Error', description: data.error || 'Failed to convert to invoice', variant: 'destructive' })
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Network error while converting', variant: 'destructive' })
    }
  }

  const fetchQuotes = async () => {
    try {
      const response = await fetch('/api/invoicing/quotes')
      if (response.ok) {
        const data = await response.json()
        setQuotes(data.quotes)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch quotes",
        variant: "destructive",
      })
    }
  }

  const fetchCreditNotes = async () => {
    try {
      const response = await fetch('/api/invoicing/credit-notes')
      if (response.ok) {
        const data = await response.json()
        setCreditNotes(data.creditNotes)
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch credit notes',
        variant: 'destructive',
      })
    }
  }

  const fetchDeliveryNotes = async () => {
    try {
      const response = await fetch('/api/invoicing/delivery-notes')
      if (response.ok) {
        const data = await response.json()
        setDeliveryNotes(data.deliveryNotes)
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch delivery notes',
        variant: 'destructive',
      })
    }
  }

  const fetchCustomers = async () => {
    try {
      const response = await fetch('/api/customers')
      if (response.ok) {
        const data = await response.json()
        setCustomers(data.customers)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch customers",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddInvoice = async (e: React.FormEvent) => {
    e.preventDefault()
    const formData = new FormData(e.target as HTMLFormElement)
    
    if (invoiceItems.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one product to the invoice",
        variant: "destructive",
      })
      return
    }
    
    // Validate stock availability for all items
    for (const item of invoiceItems) {
      const stockCheck = await InventoryAlertManager.validateStockAvailability(
        item.productId, 
        item.quantity
      )
      
      if (!stockCheck.available) {
        toast({
          title: "Insufficient Stock",
          description: `${item.product.name}: ${stockCheck.message}`,
          variant: "destructive",
        })
        return
      }
    }
    
    const subtotal = invoiceItems.reduce((sum, item) => sum + item.total, 0)
    const tax = subtotal * 0.15
    const total = subtotal + tax
    
    try {
      const response = await fetch('/api/invoicing/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId: formData.get('customerId'),
          subtotal,
          tax,
          total,
          dueDate: formData.get('dueDate'),
          notes: formData.get('notes'),
          items: invoiceItems.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
            total: item.total
          }))
        }),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Invoice created successfully",
        })
        setIsAddInvoiceOpen(false)
        setInvoiceItems([])
        fetchInvoices()
      } else {
        const data = await response.json()
        toast({
          title: "Error",
          description: data.error || "Failed to create invoice",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Network error. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleAddQuote = async (e: React.FormEvent) => {
    e.preventDefault()
    const formData = new FormData(e.target as HTMLFormElement)
    
    if (quoteItems.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one product to the quote",
        variant: "destructive",
      })
      return
    }
    
    const subtotal = quoteItems.reduce((sum, item) => sum + item.total, 0)
    const tax = subtotal * 0.15
    const total = subtotal + tax
    
    try {
      const customerId = String(formData.get('customerId') || '')
      const customerObj = customers.find(c => c.id === customerId)
      const response = await fetch('/api/invoicing/quotes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId,
          subtotal,
          tax,
          total,
          validUntil: formData.get('validUntil'),
          notes: formData.get('notes'),
          customerSnapshot: customerObj ? {
            id: customerObj.id,
            firstName: customerObj.firstName,
            lastName: customerObj.lastName,
            company: customerObj.company,
          } : undefined,
          items: quoteItems.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
            total: item.total
          }))
        }),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Quote created successfully",
        })
        setIsAddQuoteOpen(false)
        setQuoteItems([])
        fetchQuotes()
      } else {
        const data = await response.json()
        toast({
          title: "Error",
          description: data.error || "Failed to create quote",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Network error. Please try again.",
        variant: "destructive",
      })
    }
  }

  const getInvoiceStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'secondary'
      case 'SENT': return 'default'
      case 'PAID': return 'default'
      case 'OVERDUE': return 'destructive'
      case 'CANCELLED': return 'destructive'
      default: return 'secondary'
    }
  }

  const getQuoteStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'secondary'
      case 'SENT': return 'default'
      case 'ACCEPTED': return 'default'
      case 'REJECTED': return 'destructive'
      case 'EXPIRED': return 'destructive'
      default: return 'secondary'
    }
  }

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = invoice.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         invoice.customer.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         invoice.customer.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (invoice.customer.company && invoice.customer.company.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const filteredQuotes = quotes.filter(quote => {
    const matchesSearch = quote.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         quote.customer.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         quote.customer.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (quote.customer.company && quote.customer.company.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesStatus = statusFilter === 'all' || quote.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const totalInvoices = invoices.length
  const paidInvoices = invoices.filter(i => i.status === 'PAID').length
  const overdueInvoices = invoices.filter(i => i.status === 'OVERDUE').length
  const totalRevenue = invoices.filter(i => i.status === 'PAID').reduce((sum, i) => sum + i.total, 0)
  const outstandingRevenue = invoices.filter(i => i.status !== 'PAID' && i.status !== 'CANCELLED').reduce((sum, i) => sum + i.total, 0)

  return (
    <PageLayout currentPage="/invoicing" breadcrumbs={[{ name: 'Home', href: '/' }, { name: 'Invoicing' }]}>
      <div className="container mx-auto px-4 py-6">
        {/* Page header with card styling */}
        <div className="mb-6">
          <Card className="bg-gradient-to-r from-cyan-50 to-sky-50 border-l-4 border-l-cyan-500 shadow-md">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Invoicing</h1>
                  <p className="text-sm text-gray-500">
                    Manage invoices, quotes, credit notes, and delivery notes
                  </p>
                </div>
                <div className="inline-flex items-center px-3 py-1 rounded-full bg-cyan-100 text-cyan-800 text-sm font-medium">
                  🇿🇦 SARS compliant VAT invoicing
                </div>
              </div>
              <div className="hidden md:block">
                <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-sky-600 rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-white text-xl">📄</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

      <div className="flex items-center justify-end mb-6">
        <div className="flex space-x-2">
          <Dialog open={isAddQuoteOpen} onOpenChange={setIsAddQuoteOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <FileSignature className="h-4 w-4 mr-2" />
                New Quote
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[90vw] sm:max-w-[90vw] max-w-[90vw] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Quote</DialogTitle>
                <DialogDescription>
                  Create a pro forma invoice / sales quote
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddQuote} className="space-y-6">
                <div>
                  <Label htmlFor="quoteCustomerId">Customer</Label>
                  <Select name="customerId" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map(customer => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.firstName} {customer.lastName} {customer.company && `(${customer.company})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <ProductSelector 
                  items={quoteItems}
                  onItemsChange={setQuoteItems}
                  title="Add Products to Quote"
                  inline
                />
                
                <div>
                  <Label htmlFor="validUntil">Valid Until</Label>
                  <Input id="validUntil" name="validUntil" type="date" required />
                </div>
                <div>
                  <Label htmlFor="quoteNotes">Notes</Label>
                  <Input id="quoteNotes" name="notes" />
                </div>
                <Button type="submit" className="w-full">Create Quote</Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isAddInvoiceOpen} onOpenChange={setIsAddInvoiceOpen}>
            <DialogTrigger asChild>
              <Button>
                <FileText className="h-4 w-4 mr-2" />
                New Invoice
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[90vw] sm:max-w-[90vw] max-w-[90vw] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Tax Invoice</DialogTitle>
                <DialogDescription>
                  Create a SARS compliant tax invoice
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddInvoice} className="space-y-6">
                <div>
                  <Label htmlFor="invoiceCustomerId">Customer</Label>
                  <Select name="customerId" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map(customer => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.firstName} {customer.lastName} {customer.company && `(${customer.company})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <ProductSelector 
                  items={invoiceItems}
                  onItemsChange={setInvoiceItems}
                  title="Add Products to Invoice"
                  inline
                />
                
                <div>
                  <Label htmlFor="dueDate">Due Date</Label>
                  <Input id="dueDate" name="dueDate" type="date" required />
                </div>
                <div>
                  <Label htmlFor="invoiceNotes">Notes</Label>
                  <Input id="invoiceNotes" name="notes" />
                </div>
                <Button type="submit" className="w-full">Create Invoice</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Invoices
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalInvoices}</div>
            <p className="text-xs text-muted-foreground">
              {paidInvoices} paid, {overdueInvoices} overdue
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Revenue Collected
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">R{totalRevenue.toLocaleString()}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Outstanding
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">R{outstandingRevenue.toLocaleString()}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Active Quotes
            </CardTitle>
            <FileSignature className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{quotes.filter(q => q.status === 'SENT').length}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="quotes">Quotes</TabsTrigger>
          <TabsTrigger value="credit-notes">Credit Notes</TabsTrigger>
          <TabsTrigger value="delivery-notes">Delivery Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="space-y-4">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search invoices..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="SENT">Sent</SelectItem>
                <SelectItem value="PAID">Paid</SelectItem>
                <SelectItem value="OVERDUE">Overdue</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Tax Invoices</CardTitle>
              <CardDescription>SARS compliant tax invoices</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">Loading invoices...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-mono text-sm">
                          {invoice.number}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {invoice.customer.firstName} {invoice.customer.lastName}
                            </div>
                            {invoice.customer.company && (
                              <div className="text-sm text-gray-500">{invoice.customer.company}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(invoice.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {invoice.dueDate && new Date(invoice.dueDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getInvoiceStatusBadgeColor(invoice.status)}>
                            {invoice.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          R{invoice.total.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <TooltipButton tooltip="View invoice details" variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </TooltipButton>
                            <TooltipButton tooltip="Download PDF" variant="ghost" size="sm">
                              <Download className="h-4 w-4" />
                            </TooltipButton>
                            <TooltipButton tooltip="Send to customer" variant="ghost" size="sm">
                              <Send className="h-4 w-4" />
                            </TooltipButton>
                            <ShareButton 
                              title={`Invoice ${invoice.number}`}
                              data={invoice}
                              type="document"
                              variant="ghost"
                            />
                            <TooltipButton tooltip="Edit invoice" variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </TooltipButton>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Edit Quote Dialog */}
        <Dialog open={isEditQuoteOpen} onOpenChange={setIsEditQuoteOpen}>
          <DialogContent className="w-[90vw] sm:max-w-[90vw] max-w-[90vw] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Quote</DialogTitle>
              <DialogDescription>
                {selectedQuote ? selectedQuote.number : ''}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSaveEditedQuote} className="space-y-6">
              <div>
                <Label htmlFor="editQuoteCustomerId">Customer</Label>
                <Select
                  name="customerId"
                  value={editQuoteMeta.customerId}
                  onValueChange={(v) => setEditQuoteMeta((m) => ({ ...m, customerId: v }))}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.firstName} {customer.lastName} {customer.company && `(${customer.company})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <ProductSelector
                items={editQuoteItems}
                onItemsChange={setEditQuoteItems}
                title="Edit Quote Items"
                inline
              />
              <div>
                <Label htmlFor="editValidUntil">Valid Until</Label>
                <Input
                  id="editValidUntil"
                  type="date"
                  value={editQuoteMeta.validUntil || ''}
                  onChange={(e) => setEditQuoteMeta((m) => ({ ...m, validUntil: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="editNotes">Notes</Label>
                <Input
                  id="editNotes"
                  value={editQuoteMeta.notes || ''}
                  onChange={(e) => setEditQuoteMeta((m) => ({ ...m, notes: e.target.value }))}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setIsEditQuoteOpen(false)}>Cancel</Button>
                <Button type="submit">Save Changes</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <TabsContent value="quotes" className="space-y-4">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search quotes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="SENT">Sent</SelectItem>
                <SelectItem value="ACCEPTED">Accepted</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
                <SelectItem value="EXPIRED">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Sales Quotes / Pro Forma Invoices</CardTitle>
              <CardDescription>Customer quotes and price proposals</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">Loading quotes...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Quote #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Valid Until</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredQuotes.map((quote) => (
                      <TableRow key={quote.id}>
                        <TableCell className="font-mono text-sm">
                          {quote.number}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {quote.customer.firstName} {quote.customer.lastName}
                            </div>
                            {quote.customer.company && (
                              <div className="text-sm text-gray-500">{quote.customer.company}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(quote.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {new Date(quote.validUntil).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getQuoteStatusBadgeColor(quote.status)}>
                            {quote.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          R{quote.total.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <TooltipButton tooltip="View quote details" variant="ghost" size="sm" onClick={() => handleViewQuote(quote)}>
                              <Eye className="h-4 w-4" />
                            </TooltipButton>
                            <TooltipButton tooltip="Download PDF" variant="ghost" size="sm" onClick={() => handleDownloadQuote(quote)}>
                              <Download className="h-4 w-4" />
                            </TooltipButton>
                            <TooltipButton tooltip="Convert to Invoice" variant="ghost" size="sm" onClick={() => handleConvertToInvoice(quote)}>
                              <FileText className="h-4 w-4" />
                            </TooltipButton>
                            <ShareButton 
                              title={`Quote ${quote.number}`}
                              data={quote}
                              type="document"
                              variant="ghost"
                            />
                            <TooltipButton tooltip="Edit quote" variant="ghost" size="sm" onClick={() => handleEditQuote(quote)}>
                              <Edit className="h-4 w-4" />
                            </TooltipButton>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* View Quote Dialog */}
        <Dialog open={isViewQuoteOpen} onOpenChange={setIsViewQuoteOpen}>
          <DialogContent className="w-[900px] max-w-[95vw]">
            <DialogHeader>
              <DialogTitle>Quote Details</DialogTitle>
              <DialogDescription>
                {selectedQuote ? selectedQuote.number : ''}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 text-sm">
              {selectedQuote && (
                <QuoteDocument
                  quote={{
                    id: selectedQuote.id,
                    number: selectedQuote.number,
                    createdAt: selectedQuote.createdAt,
                    validUntil: selectedQuote.validUntil,
                    subtotal: selectedQuote.subtotal,
                    tax: selectedQuote.tax,
                    total: selectedQuote.total,
                    notes: selectedQuote.notes,
                    customer: {
                      firstName: selectedQuote.customer.firstName,
                      lastName: selectedQuote.customer.lastName,
                      company: selectedQuote.customer.company,
                    },
                    items: selectedQuote.items,
                  }}
                />
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Hidden offscreen container for PDF generation */}
        {printQuote && (
          <div id="quote-print-area" style={{ position: 'fixed', left: -9999, top: 0, width: '794px' }}>
            <QuoteDocument
              quote={{
                id: printQuote.id,
                number: printQuote.number,
                createdAt: printQuote.createdAt,
                validUntil: printQuote.validUntil,
                subtotal: printQuote.subtotal,
                tax: printQuote.tax,
                total: printQuote.total,
                notes: printQuote.notes,
                customer: {
                  firstName: printQuote.customer.firstName,
                  lastName: printQuote.customer.lastName,
                  company: printQuote.customer.company,
                },
                items: printQuote.items,
              }}
            />
          </div>
        )}

        <TabsContent value="credit-notes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Credit Notes</CardTitle>
              <CardDescription>Manage credit notes and refunds</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">Credit note management coming soon!</p>
                <Button>
                  <Receipt className="h-4 w-4 mr-2" />
                  Create Credit Note
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="delivery-notes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Delivery Notes</CardTitle>
              <CardDescription>Track deliveries and proof of delivery</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">Delivery note management coming soon!</p>
                <Button>
                  <Truck className="h-4 w-4 mr-2" />
                  Create Delivery Note
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  </PageLayout>
  )
}