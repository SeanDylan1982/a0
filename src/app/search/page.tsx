'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Header } from '@/components/header'
import { 
  Search, 
  Users, 
  FileText, 
  Package, 
  ShoppingCart, 
  Building, 
  ExternalLink,
  Filter,
  Clock
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface SearchResult {
  id: string
  type: 'customer' | 'invoice' | 'product' | 'supplier' | 'order' | 'user'
  name: string
  description: string
  href: string
  timestamp?: string
  status?: string
  amount?: string
  category?: string
}

const mockSearchResults: SearchResult[] = [
  {
    id: '1',
    type: 'customer',
    name: 'ABC Construction Ltd',
    description: 'Construction company in Cape Town - Premium customer since 2020',
    href: '/customers',
    timestamp: '2025-06-23T10:30:00Z',
    category: 'Construction'
  },
  {
    id: '2',
    type: 'invoice',
    name: 'INV-2025-001234',
    description: 'Outstanding invoice - R 15,420.00 - Due 5 days ago',
    href: '/invoicing',
    timestamp: '2025-06-18T14:30:00Z',
    amount: 'R 15,420.00',
    status: 'overdue'
  },
  {
    id: '3',
    type: 'supplier',
    name: 'Tech Supplies SA',
    description: 'IT equipment supplier - 45 active products',
    href: '/inventory',
    category: 'Technology'
  },
  {
    id: '4',
    type: 'product',
    name: 'Laptop Dell XPS 15',
    description: 'SKU: LP-001 - Stock: 45 units - Price: R 25,999.00',
    href: '/inventory',
    amount: 'R 25,999.00',
    status: 'in_stock'
  },
  {
    id: '5',
    type: 'customer',
    name: 'Johannesburg Retail',
    description: 'Retail chain - Premium customer - 23 orders this year',
    href: '/customers',
    timestamp: '2025-06-23T08:45:00Z',
    category: 'Retail'
  },
  {
    id: '6',
    type: 'invoice',
    name: 'INV-2025-001235',
    description: 'Paid invoice - R 8,950.00 - Paid on time',
    href: '/invoicing',
    timestamp: '2025-06-20T11:30:00Z',
    amount: 'R 8,950.00',
    status: 'paid'
  },
  {
    id: '7',
    type: 'order',
    name: 'ORD-2025-001234',
    description: 'Sales order for ABC Construction - R 12,350.00',
    href: '/sales',
    timestamp: '2025-06-23T10:30:00Z',
    amount: 'R 12,350.00',
    status: 'confirmed'
  },
  {
    id: '8',
    type: 'product',
    name: 'Office Chair Ergonomic',
    description: 'SKU: CH-002 - Stock: 12 units - Price: R 2,499.00',
    href: '/inventory',
    amount: 'R 2,499.00',
    status: 'low_stock'
  },
  {
    id: '9',
    type: 'user',
    name: 'John Doe',
    description: 'Administrator - Last active 2 hours ago',
    href: '/users',
    timestamp: '2025-06-23T08:30:00Z',
    status: 'active'
  },
  {
    id: '10',
    type: 'supplier',
    name: 'Office Furniture Co',
    description: 'Office furniture supplier - 12 active products',
    href: '/inventory',
    category: 'Furniture'
  }
]

export default function SearchResultsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [results, setResults] = useState<SearchResult[]>(mockSearchResults)
  const { toast } = useToast()

  useEffect(() => {
    // Get search query from URL
    const urlParams = new URLSearchParams(window.location.search)
    const query = urlParams.get('q') || ''
    setSearchQuery(query)
    
    if (query) {
      // Filter results based on search query
      const filtered = mockSearchResults.filter(result =>
        result.name.toLowerCase().includes(query.toLowerCase()) ||
        result.description.toLowerCase().includes(query.toLowerCase())
      )
      setResults(filtered)
    }
  }, [])

  const filteredResults = results.filter(result => {
    const matchesType = typeFilter === 'all' || result.type === typeFilter
    const matchesStatus = statusFilter === 'all' || result.status === statusFilter
    
    return matchesType && matchesStatus
  })

  const handleResultClick = (result: SearchResult) => {
    toast({
      title: `Navigating to ${result.type}`,
      description: `Opening ${result.name}`,
    })
    setTimeout(() => {
      window.location.href = result.href
    }, 500)
  }

  const getTypeIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'customer': return <Users className="h-4 w-4" />
      case 'invoice': return <FileText className="h-4 w-4" />
      case 'product': return <Package className="h-4 w-4" />
      case 'supplier': return <Building className="h-4 w-4" />
      case 'order': return <ShoppingCart className="h-4 w-4" />
      case 'user': return <Users className="h-4 w-4" />
      default: return <Search className="h-4 w-4" />
    }
  }

  const getTypeColor = (type: SearchResult['type']) => {
    switch (type) {
      case 'customer': return 'bg-purple-100 text-purple-800'
      case 'invoice': return 'bg-blue-100 text-blue-800'
      case 'product': return 'bg-green-100 text-green-800'
      case 'supplier': return 'bg-orange-100 text-orange-800'
      case 'order': return 'bg-red-100 text-red-800'
      case 'user': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800'
      case 'overdue': return 'bg-red-100 text-red-800'
      case 'in_stock': return 'bg-green-100 text-green-800'
      case 'low_stock': return 'bg-yellow-100 text-yellow-800'
      case 'confirmed': return 'bg-blue-100 text-blue-800'
      case 'active': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours}h ago`
    if (diffInHours < 48) return 'Yesterday'
    return date.toLocaleDateString()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header currentPage="/search" breadcrumbs={[{ name: 'Home', href: '/' }, { name: 'Search Results' }]} />

      {/* Main content */}
      <div className="lg:pl-64">
        <main className="p-6">
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Search Results</h1>
                <p className="text-gray-600">
                  {searchQuery ? `Results for "${searchQuery}"` : 'All results'}
                </p>
                <div className="mt-2 text-sm text-blue-600">
                  🇿🇦 {filteredResults.length} result{filteredResults.length !== 1 ? 's' : ''} found
                </div>
              </div>
            </div>
          </div>

          {/* Search bar and filters */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search customers, invoices, suppliers..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="customer">Customers</SelectItem>
                      <SelectItem value="invoice">Invoices</SelectItem>
                      <SelectItem value="product">Products</SelectItem>
                      <SelectItem value="supplier">Suppliers</SelectItem>
                      <SelectItem value="order">Orders</SelectItem>
                      <SelectItem value="user">Users</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                      <SelectItem value="in_stock">In Stock</SelectItem>
                      <SelectItem value="low_stock">Low Stock</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Search results */}
          <div className="space-y-4">
            {filteredResults.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
                  <p className="text-gray-500">
                    {searchQuery ? `No results found for "${searchQuery}"` : 'No results found'}
                  </p>
                  <p className="text-sm text-gray-400 mt-2">
                    Try adjusting your search terms or filters
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredResults.map((result) => (
                <Card
                  key={result.id}
                  className="cursor-pointer transition-all hover:shadow-sm"
                  onClick={() => handleResultClick(result)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-4">
                      <div className="p-3 rounded-full bg-gray-100">
                        {getTypeIcon(result.type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-lg font-medium text-gray-900">
                            {result.name}
                          </h4>
                          <div className="flex items-center space-x-2">
                            {result.timestamp && (
                              <div className="flex items-center space-x-1 text-sm text-gray-500">
                                <Clock className="h-3 w-3" />
                                <span>{formatTimestamp(result.timestamp)}</span>
                              </div>
                            )}
                            <div className="flex items-center space-x-1 text-sm text-blue-600">
                              <span>View</span>
                              <ExternalLink className="h-3 w-3" />
                            </div>
                          </div>
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-3">
                          {result.description}
                        </p>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Badge className={getTypeColor(result.type)}>
                              {result.type}
                            </Badge>
                            
                            {result.category && (
                              <Badge variant="outline">
                                {result.category}
                              </Badge>
                            )}
                            
                            {result.status && (
                              <Badge className={getStatusColor(result.status)}>
                                {result.status.replace('_', ' ')}
                              </Badge>
                            )}
                            
                            {result.amount && (
                              <Badge variant="outline">
                                {result.amount}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </main>
      </div>
    </div>
  )
}