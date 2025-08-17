'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  ShoppingCart, 
  Package, 
  TrendingUp, 
  Users, 
  Search,
  Filter,
  Download,
  Plus,
  Calendar,
  MapPin,
  Phone,
  Mail,
  CreditCard,
  Truck,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react'
import { PageLayout } from '@/components/page-layout'

interface Customer {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  company?: string
  address: string
  city: string
  country: string
  postalCode: string
}

interface Sale {
  id: string
  customer: Customer
  date: string
  status: 'DRAFT' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED'
  items: {
    id: string
    name: string
    quantity: number
    price: number
    total: number
  }[]
  subtotal: number
  tax: number
  total: number
  paymentMethod: string
  shippingAddress: string
}

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchSalesData()
  }, [])

  const fetchSalesData = async () => {
    try {
      // Mock data for development
      const mockCustomers: Customer[] = [
        {
          id: '1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@email.com',
          phone: '+27 11 123 4567',
          company: 'Tech Solutions',
          address: '123 Tech Street',
          city: 'Johannesburg',
          country: 'South Africa',
          postalCode: '2000'
        },
        {
          id: '2',
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane.smith@email.com',
          phone: '+27 11 987 6543',
          address: '456 Business Ave',
          city: 'Cape Town',
          country: 'South Africa',
          postalCode: '8000'
        }
      ]

      const mockSales: Sale[] = [
        {
          id: '1',
          customer: mockCustomers[0],
          date: '2024-01-15',
          status: 'DELIVERED',
          items: [
            { id: '1', name: 'Laptop', quantity: 1, price: 15000, total: 15000 },
            { id: '2', name: 'Mouse', quantity: 1, price: 500, total: 500 }
          ],
          subtotal: 15500,
          tax: 2325,
          total: 17825,
          paymentMethod: 'Credit Card',
          shippingAddress: '123 Tech Street, Johannesburg, 2000'
        },
        {
          id: '2',
          customer: mockCustomers[1],
          date: '2024-01-16',
          status: 'CONFIRMED',
          items: [
            { id: '3', name: 'Monitor', quantity: 2, price: 3000, total: 6000 }
          ],
          subtotal: 6000,
          tax: 900,
          total: 6900,
          paymentMethod: 'EFT',
          shippingAddress: '456 Business Ave, Cape Town, 8000'
        }
      ]

      setCustomers(mockCustomers)
      setSales(mockSales)
    } catch (error) {
      console.error('Error fetching sales data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'secondary'
      case 'CONFIRMED': return 'default'
      case 'SHIPPED': return 'default'
      case 'DELIVERED': return 'default'
      case 'CANCELLED': return 'destructive'
      case 'REFUNDED': return 'destructive'
      default: return 'secondary'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'DRAFT': return <Clock className="h-4 w-4" />
      case 'CONFIRMED': return <Clock className="h-4 w-4" />
      case 'SHIPPED': return <Truck className="h-4 w-4" />
      case 'DELIVERED': return <CheckCircle className="h-4 w-4" />
      case 'CANCELLED': return <XCircle className="h-4 w-4" />
      case 'REFUNDED': return <XCircle className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  const filteredSales = sales.filter(sale => {
    const matchesSearch = sale.customer.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sale.customer.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (sale.customer.company && sale.customer.company.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesStatus = statusFilter === 'all' || sale.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const totalSales = sales.filter(s => s.status !== 'CANCELLED' && s.status !== 'REFUNDED').reduce((sum, s) => sum + s.total, 0)
  const totalTax = sales.filter(s => s.status !== 'CANCELLED' && s.status !== 'REFUNDED').reduce((sum, s) => sum + s.tax, 0)
  const pendingOrders = sales.filter(s => s.status === 'CONFIRMED').length
  const totalCustomers = customers.length

  return (
    <PageLayout currentPage="/sales" breadcrumbs={[{ name: 'Home', href: '/' }, { name: 'Sales' }]}>
        {/* Page header with card styling */}
        <div className="mb-6">
          <Card className="bg-gradient-to-r from-orange-50 to-amber-50 border-l-4 border-l-orange-500 shadow-md">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-1">Sales Management</h1>
                  <p className="text-gray-600 text-sm mb-2">Track orders, manage customers, and analyze sales performance</p>
                  <div className="inline-flex items-center px-3 py-1 rounded-full bg-orange-100 text-orange-800 text-sm font-medium">
                    <ShoppingCart className="h-4 w-4 mr-1" /> Sales & Orders
                  </div>
                </div>
                <div className="hidden md:block">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-600 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-white text-xl">🛒</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Sales</p>
                  <p className="text-2xl font-bold text-gray-900">R{totalSales.toLocaleString()}</p>
                </div>
                <div className="h-12 w-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Orders</p>
                  <p className="text-2xl font-bold text-gray-900">{sales.length}</p>
                </div>
                <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Package className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending Orders</p>
                  <p className="text-2xl font-bold text-gray-900">{pendingOrders}</p>
                </div>
                <div className="h-12 w-12 bg-yellow-100 rounded-full flex items-center justify-center">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Customers</p>
                  <p className="text-2xl font-bold text-gray-900">{totalCustomers}</p>
                </div>
                <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="orders" className="space-y-6">
          <TabsList>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="customers">Customers</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Sales Orders</CardTitle>
                    <CardDescription>Manage and track all sales orders</CardDescription>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      New Order
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Filters */}
                <div className="flex space-x-4 mb-6">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Search orders..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">All Status</option>
                      <option value="DRAFT">Draft</option>
                      <option value="CONFIRMED">Confirmed</option>
                      <option value="SHIPPED">Shipped</option>
                      <option value="DELIVERED">Delivered</option>
                      <option value="CANCELLED">Cancelled</option>
                      <option value="REFUNDED">Refunded</option>
                    </select>
                  </div>
                </div>

                {/* Orders Table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">Order ID</th>
                        <th className="text-left py-3 px-4">Customer</th>
                        <th className="text-left py-3 px-4">Date</th>
                        <th className="text-left py-3 px-4">Status</th>
                        <th className="text-left py-3 px-4">Total</th>
                        <th className="text-left py-3 px-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSales.map((sale) => (
                        <tr key={sale.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4">#{sale.id}</td>
                          <td className="py-3 px-4">
                            <div>
                              <div className="font-medium">{sale.customer.firstName} {sale.customer.lastName}</div>
                              {sale.customer.company && (
                                <div className="text-sm text-gray-600">{sale.customer.company}</div>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">{new Date(sale.date).toLocaleDateString()}</td>
                          <td className="py-3 px-4">
                            <Badge variant={getStatusBadgeColor(sale.status)} className="flex items-center space-x-1">
                              {getStatusIcon(sale.status)}
                              <span>{sale.status}</span>
                            </Badge>
                          </td>
                          <td className="py-3 px-4">R{sale.total.toLocaleString()}</td>
                          <td className="py-3 px-4">
                            <Button variant="outline" size="sm">View</Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="customers" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Customers</CardTitle>
                    <CardDescription>Manage customer information and contacts</CardDescription>
                  </div>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Customer
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {customers.map((customer) => (
                    <Card key={customer.id}>
                      <CardContent className="p-6">
                        <div className="space-y-3">
                          <div>
                            <h3 className="font-semibold">{customer.firstName} {customer.lastName}</h3>
                            {customer.company && (
                              <p className="text-sm text-gray-600">{customer.company}</p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2 text-sm">
                              <Mail className="h-4 w-4 text-gray-400" />
                              <span>{customer.email}</span>
                            </div>
                            <div className="flex items-center space-x-2 text-sm">
                              <Phone className="h-4 w-4 text-gray-400" />
                              <span>{customer.phone}</span>
                            </div>
                            <div className="flex items-center space-x-2 text-sm">
                              <MapPin className="h-4 w-4 text-gray-400" />
                              <span>{customer.city}, {customer.country}</span>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm">Edit</Button>
                            <Button variant="outline" size="sm">Orders</Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Sales Analytics</CardTitle>
                    <CardDescription>View sales performance and metrics</CardDescription>
                  </div>
                  <Button variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Generate Report
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Sales Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between">
                          <span>Total Sales</span>
                          <span className="font-semibold">R{totalSales.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Total Tax</span>
                          <span className="font-semibold">R{totalTax.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Net Revenue</span>
                          <span className="font-semibold">R{(totalSales - totalTax).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Average Order Value</span>
                          <span className="font-semibold">R{sales.length > 0 ? Math.round(totalSales / sales.length).toLocaleString() : '0'}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Order Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {['DRAFT', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'].map((status) => {
                          const count = sales.filter(s => s.status === status).length
                          return (
                            <div key={status} className="flex justify-between">
                              <div className="flex items-center space-x-2">
                                {getStatusIcon(status)}
                                <span>{status}</span>
                              </div>
                              <span className="font-semibold">{count}</span>
                            </div>
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
    </PageLayout>
  )
}