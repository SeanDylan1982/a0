'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { 
  FileText, 
  DollarSign, 
  Calendar,
  CreditCard,
  AlertTriangle,
  TrendingUp,
  Download,
  Eye
} from 'lucide-react'
import { ShareButton } from '@/components/share-button'

interface CustomerDetailsProps {
  customer: any
  isOpen: boolean
  onClose: () => void
}

export function CustomerDetails({ customer, isOpen, onClose }: CustomerDetailsProps) {
  const [documents, setDocuments] = useState({
    invoices: [],
    quotes: [],
    creditNotes: [],
    deliveryNotes: []
  })
  const [accountStatement, setAccountStatement] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (isOpen && customer) {
      fetchCustomerData()
    }
  }, [isOpen, customer])

  const fetchCustomerData = async () => {
    setIsLoading(true)
    try {
      // Fetch all customer documents
      const [invoicesRes, quotesRes, creditNotesRes, deliveryNotesRes] = await Promise.all([
        fetch(`/api/customers/${customer.id}/invoices`),
        fetch(`/api/customers/${customer.id}/quotes`),
        fetch(`/api/customers/${customer.id}/credit-notes`),
        fetch(`/api/customers/${customer.id}/delivery-notes`)
      ])

      const invoices = invoicesRes.ok ? await invoicesRes.json() : []
      const quotes = quotesRes.ok ? await quotesRes.json() : []
      const creditNotes = creditNotesRes.ok ? await creditNotesRes.json() : []
      const deliveryNotes = deliveryNotesRes.ok ? await deliveryNotesRes.json() : []

      setDocuments({ invoices, quotes, creditNotes, deliveryNotes })

      // Generate account statement
      const statement = generateAccountStatement(invoices, creditNotes)
      setAccountStatement(statement)

      // Auto-add due dates to calendar for credit accounts
      if (customer.accountType === 'CREDIT') {
        await addDueDatesToCalendar(invoices)
      }
    } catch (error) {
      console.error('Error fetching customer data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const generateAccountStatement = (invoices: any[], creditNotes: any[]) => {
    const transactions = []
    
    // Add invoices as debits
    invoices.forEach(invoice => {
      transactions.push({
        date: invoice.createdAt,
        type: 'INVOICE',
        reference: invoice.number,
        description: `Invoice ${invoice.number}`,
        debit: invoice.total,
        credit: 0,
        balance: 0
      })
      
      // Add payments as credits
      if (invoice.payments) {
        invoice.payments.forEach(payment => {
          transactions.push({
            date: payment.createdAt,
            type: 'PAYMENT',
            reference: payment.reference || invoice.number,
            description: `Payment for ${invoice.number}`,
            debit: 0,
            credit: payment.amount,
            balance: 0
          })
        })
      }
    })

    // Add credit notes as credits
    creditNotes.forEach(creditNote => {
      transactions.push({
        date: creditNote.createdAt,
        type: 'CREDIT_NOTE',
        reference: creditNote.number,
        description: `Credit Note ${creditNote.number}`,
        debit: 0,
        credit: creditNote.amount,
        balance: 0
      })
    })

    // Sort by date and calculate running balance
    transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    
    let runningBalance = 0
    transactions.forEach(transaction => {
      runningBalance += transaction.debit - transaction.credit
      transaction.balance = runningBalance
    })

    return transactions
  }

  const addDueDatesToCalendar = async (invoices: any[]) => {
    const dueDates = invoices
      .filter(invoice => invoice.dueDate && invoice.status !== 'PAID')
      .map(invoice => ({
        title: `Payment Due: ${invoice.number}`,
        description: `Invoice ${invoice.number} payment due for ${customer.firstName} ${customer.lastName}`,
        startDate: invoice.dueDate,
        endDate: invoice.dueDate,
        type: 'DEADLINE',
        isAllDay: true
      }))

    if (dueDates.length > 0) {
      try {
        await fetch('/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ events: dueDates })
        })
      } catch (error) {
        console.error('Error adding due dates to calendar:', error)
      }
    }
  }

  const getAccountTypeColor = (type: string) => {
    switch (type) {
      case 'CREDIT': return 'bg-blue-100 text-blue-800'
      case 'CASH': return 'bg-green-100 text-green-800'
      case 'NO_ACCOUNT': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID': return 'bg-green-100 text-green-800'
      case 'OVERDUE': return 'bg-red-100 text-red-800'
      case 'SENT': return 'bg-blue-100 text-blue-800'
      case 'DRAFT': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (!customer) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{customer.firstName} {customer.lastName}</span>
            <div className="flex items-center space-x-2">
              <Badge className={getAccountTypeColor(customer.accountType)}>
                {customer.accountType}
              </Badge>
              <ShareButton 
                title={`${customer.firstName} ${customer.lastName}`}
                data={customer}
                type="record"
                variant="outline"
                size="sm"
              />
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Customer Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <DollarSign className="h-4 w-4 mr-2" />
                Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${customer.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                R {Math.abs(customer.balance || 0).toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                {customer.balance > 0 ? 'Outstanding' : 'Credit'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <CreditCard className="h-4 w-4 mr-2" />
                Credit Limit
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                R {(customer.creditLimit || 0).toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                Available: R {Math.max(0, (customer.creditLimit || 0) - (customer.balance || 0)).toFixed(2)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                Payment Terms
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {customer.paymentTerms || 0} days
              </div>
              <p className="text-xs text-muted-foreground">
                {customer.accountType === 'CASH' ? 'Cash on delivery' : 'Credit terms'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <FileText className="h-4 w-4 mr-2" />
                Total Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(documents.invoices.length + documents.quotes.length + documents.creditNotes.length + documents.deliveryNotes.length)}
              </div>
              <p className="text-xs text-muted-foreground">
                All document types
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="documents" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="statement">Account Statement</TabsTrigger>
            <TabsTrigger value="details">Customer Details</TabsTrigger>
          </TabsList>

          <TabsContent value="documents" className="space-y-4">
            <Tabs defaultValue="invoices" className="w-full">
              <TabsList>
                <TabsTrigger value="invoices">Invoices ({documents.invoices.length})</TabsTrigger>
                <TabsTrigger value="quotes">Quotes ({documents.quotes.length})</TabsTrigger>
                <TabsTrigger value="credit-notes">Credit Notes ({documents.creditNotes.length})</TabsTrigger>
                <TabsTrigger value="delivery-notes">Delivery Notes ({documents.deliveryNotes.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="invoices">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documents.invoices.map((invoice: any) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">{invoice.number}</TableCell>
                        <TableCell>{new Date(invoice.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell>{invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : '-'}</TableCell>
                        <TableCell>R {invoice.total.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(invoice.status)}>
                            {invoice.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <ShareButton 
                              title={`Invoice ${invoice.number}`}
                              data={invoice}
                              type="document"
                              variant="ghost"
                              size="sm"
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent value="quotes">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Quote #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Valid Until</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documents.quotes.map((quote: any) => (
                      <TableRow key={quote.id}>
                        <TableCell className="font-medium">{quote.number}</TableCell>
                        <TableCell>{new Date(quote.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell>{new Date(quote.validUntil).toLocaleDateString()}</TableCell>
                        <TableCell>R {quote.total.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(quote.status)}>
                            {quote.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <ShareButton 
                              title={`Quote ${quote.number}`}
                              data={quote}
                              type="document"
                              variant="ghost"
                              size="sm"
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent value="credit-notes">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Credit Note #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documents.creditNotes.map((creditNote: any) => (
                      <TableRow key={creditNote.id}>
                        <TableCell className="font-medium">{creditNote.number}</TableCell>
                        <TableCell>{new Date(creditNote.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell>{creditNote.invoice?.number || '-'}</TableCell>
                        <TableCell>R {creditNote.amount.toFixed(2)}</TableCell>
                        <TableCell>{creditNote.reason}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <ShareButton 
                              title={`Credit Note ${creditNote.number}`}
                              data={creditNote}
                              type="document"
                              variant="ghost"
                              size="sm"
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent value="delivery-notes">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Delivery Note #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Delivery Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documents.deliveryNotes.map((deliveryNote: any) => (
                      <TableRow key={deliveryNote.id}>
                        <TableCell className="font-medium">{deliveryNote.number}</TableCell>
                        <TableCell>{new Date(deliveryNote.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell>{new Date(deliveryNote.deliveryDate).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(deliveryNote.status)}>
                            {deliveryNote.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{deliveryNote.deliveryAddress || customer.address}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <ShareButton 
                              title={`Delivery Note ${deliveryNote.number}`}
                              data={deliveryNote}
                              type="document"
                              variant="ghost"
                              size="sm"
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="statement">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Account Statement
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Debit</TableHead>
                      <TableHead className="text-right">Credit</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accountStatement.map((transaction: any, index) => (
                      <TableRow key={index}>
                        <TableCell>{new Date(transaction.date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{transaction.type}</Badge>
                        </TableCell>
                        <TableCell>{transaction.reference}</TableCell>
                        <TableCell>{transaction.description}</TableCell>
                        <TableCell className="text-right">
                          {transaction.debit > 0 ? `R ${transaction.debit.toFixed(2)}` : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {transaction.credit > 0 ? `R ${transaction.credit.toFixed(2)}` : '-'}
                        </TableCell>
                        <TableCell className={`text-right font-medium ${transaction.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          R {Math.abs(transaction.balance).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="details">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div><strong>Name:</strong> {customer.firstName} {customer.lastName}</div>
                  <div><strong>Company:</strong> {customer.company || 'N/A'}</div>
                  <div><strong>Email:</strong> {customer.email || 'N/A'}</div>
                  <div><strong>Phone:</strong> {customer.phone || 'N/A'}</div>
                  <div><strong>Tax ID:</strong> {customer.taxId || 'N/A'}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Address</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>{customer.address || 'N/A'}</div>
                  <div>{customer.city}, {customer.state}</div>
                  <div>{customer.country} {customer.postalCode}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Account Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div><strong>Account Type:</strong> {customer.accountType}</div>
                  <div><strong>Credit Limit:</strong> R {(customer.creditLimit || 0).toFixed(2)}</div>
                  <div><strong>Payment Terms:</strong> {customer.paymentTerms || 0} days</div>
                  <div><strong>Status:</strong> {customer.status}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>{customer.notes || 'No notes available'}</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}