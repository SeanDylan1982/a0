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
  Users, 
  Plus, 
  Search, 
  Edit, 
  Eye, 
  Mail,
  Phone,
  Building,
  MapPin,
  FileText,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  Calendar
} from 'lucide-react'
import { ShareButton } from '@/components/share-button'
import { CustomerDetails } from '@/components/customer-details'
import { TooltipButton } from '@/components/tooltip-button'
import { useToast } from '@/hooks/use-toast'
import { PageLayout } from '@/components/page-layout'

interface Customer {
  id: string
  firstName: string
  lastName: string
  email?: string
  phone?: string
  company?: string
  address?: string
  city?: string
  state?: string
  country?: string
  postalCode?: string
  taxId?: string
  notes?: string
  status: string
  createdAt: string
  updatedAt: string
  contacts: CustomerContact[]
  sales: any[]
  invoices: any[]
}

interface CustomerContact {
  id: string
  name: string
  email?: string
  phone?: string
  position?: string
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [isCustomerDetailsOpen, setIsCustomerDetailsOpen] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchCustomers()
  }, [])

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

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault()
    const formData = new FormData(e.target as HTMLFormElement)
    
    try {
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: formData.get('firstName'),
          lastName: formData.get('lastName'),
          email: formData.get('email'),
          phone: formData.get('phone'),
          company: formData.get('company'),
          address: formData.get('address'),
          city: formData.get('city'),
          state: formData.get('state'),
          country: formData.get('country'),
          postalCode: formData.get('postalCode'),
          taxId: formData.get('taxId'),
          notes: formData.get('notes'),
        }),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Customer created successfully",
        })
        setIsAddCustomerOpen(false)
        fetchCustomers()
      } else {
        const data = await response.json()
        toast({
          title: "Error",
          description: data.error || "Failed to create customer",
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

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'default'
      case 'INACTIVE': return 'secondary'
      case 'PROSPECT': return 'outline'
      case 'LEAD': return 'secondary'
      default: return 'secondary'
    }
  }

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = customer.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customer.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (customer.company && customer.company.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (customer.email && customer.email.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesStatus = statusFilter === 'all' || customer.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const totalCustomers = customers.length
  const activeCustomers = customers.filter(c => c.status === 'ACTIVE').length
  const totalSales = customers.reduce((sum, c) => sum + c.sales.length, 0)
  const totalInvoices = customers.reduce((sum, c) => sum + c.invoices.length, 0)

  return (
    <PageLayout currentPage="/customers" breadcrumbs={[{ name: 'Home', href: '/' }, { name: 'Customers' }]}>
        {/* Page header with card styling */}
        <div className="mb-6">
          <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-l-4 border-l-purple-500 shadow-md">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-1">Customer Management</h1>
                  <p className="text-gray-600 text-sm mb-2">Manage customer relationships and contacts</p>
                  <div className="inline-flex items-center px-3 py-1 rounded-full bg-purple-100 text-purple-800 text-sm font-medium">
                    🇿🇦 POPIA compliant customer data management
                  </div>
                </div>
                <div className="hidden md:block">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-white text-xl">👥</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center justify-end mb-6">
          <div className="flex space-x-2">
            <Dialog open={isAddCustomerOpen} onOpenChange={setIsAddCustomerOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Customer
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New Customer</DialogTitle>
                  <DialogDescription>
                    Create a new customer record
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddCustomer} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">First Name</Label>
                      <Input id="firstName" name="firstName" required />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input id="lastName" name="lastName" required />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" name="email" type="email" />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone</Label>
                      <Input id="phone" name="phone" />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="company">Company</Label>
                    <Input id="company" name="company" />
                  </div>
                  <div>
                    <Label htmlFor="address">Address</Label>
                    <Input id="address" name="address" />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="city">City</Label>
                      <Input id="city" name="city" />
                    </div>
                    <div>
                      <Label htmlFor="state">State/Province</Label>
                      <Input id="state" name="state" />
                    </div>
                    <div>
                      <Label htmlFor="postalCode">Postal Code</Label>
                      <Input id="postalCode" name="postalCode" />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="country">Country</Label>
                    <Select name="country" defaultValue="South Africa">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="South Africa">South Africa</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="taxId">Tax ID / VAT Number</Label>
                    <Input id="taxId" name="taxId" />
                  </div>
                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <textarea
                      id="notes"
                      name="notes"
                      className="w-full p-2 border rounded-md"
                      rows={3}
                    />
                  </div>
                  <Button type="submit" className="w-full">Create Customer</Button>
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
                Total Customers
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalCustomers}</div>
              <p className="text-xs text-muted-foreground">
                +12% from last month
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Active Customers
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{activeCustomers}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Sales
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalSales}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Invoices
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalInvoices}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="customers" className="w-full">
          <TabsList>
            <TabsTrigger value="customers">Customers</TabsTrigger>
            <TabsTrigger value="contacts">Contacts</TabsTrigger>
            <TabsTrigger value="segments">Segments</TabsTrigger>
            <TabsTrigger value="communications">Communications</TabsTrigger>
          </TabsList>

          <TabsContent value="customers" className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search customers..."
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
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                  <SelectItem value="PROSPECT">Prospect</SelectItem>
                  <SelectItem value="LEAD">Lead</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Customers</CardTitle>
                <CardDescription>Manage your customer database</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8">Loading customers...</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCustomers.map((customer) => (
                        <TableRow key={customer.id}>
                          <TableCell>
                            <div className="font-medium">
                              {customer.firstName} {customer.lastName}
                            </div>
                            {customer.taxId && (
                              <div className="text-sm text-gray-500">
                                VAT: {customer.taxId}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {customer.email && (
                                <div className="flex items-center text-sm">
                                  <Mail className="h-3 w-3 mr-1" />
                                  {customer.email}
                                </div>
                              )}
                              {customer.phone && (
                                <div className="flex items-center text-sm">
                                  <Phone className="h-3 w-3 mr-1" />
                                  {customer.phone}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {customer.company && (
                              <div className="flex items-center">
                                <Building className="h-3 w-3 mr-1" />
                                {customer.company}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadgeColor(customer.status)}>
                              {customer.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {customer.city && (
                              <div className="flex items-center text-sm">
                                <MapPin className="h-3 w-3 mr-1" />
                                {customer.city}, {customer.country}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            {new Date(customer.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <TooltipButton 
                                tooltip="View customer details"
                                variant="ghost" 
                                size="sm"
                                onClick={() => {
                                  setSelectedCustomer(customer)
                                  setIsCustomerDetailsOpen(true)
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </TooltipButton>
                              <ShareButton 
                                title={`${customer.firstName} ${customer.lastName}`}
                                data={customer}
                                type="record"
                                variant="ghost"
                              />
                              <TooltipButton tooltip="Edit customer" variant="ghost" size="sm">
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

          <TabsContent value="contacts" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Customer Contacts</CardTitle>
                <CardDescription>Manage additional contact persons for customers</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">Contact management coming soon!</p>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Contact
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="segments" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Customer Segments</CardTitle>
                <CardDescription>Create and manage customer segments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">Customer segmentation coming soon!</p>
                  <Button>
                    <Users className="h-4 w-4 mr-2" />
                    Create Segment
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="communications" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Communications</CardTitle>
                <CardDescription>Track customer communications and interactions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">Communication tracking coming soon!</p>
                  <Button>
                    <Mail className="h-4 w-4 mr-2" />
                    Log Communication
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <CustomerDetails 
          customer={selectedCustomer}
          isOpen={isCustomerDetailsOpen}
          onClose={() => {
            setIsCustomerDetailsOpen(false)
            setSelectedCustomer(null)
          }}
        />
    </PageLayout>
  )
}