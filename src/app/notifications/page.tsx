'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Header } from '@/components/header'
import { 
  Bell, 
  Check, 
  CheckCheck, 
  Search, 
  Filter, 
  Clock, 
  User, 
  FileText, 
  ShoppingCart, 
  Users, 
  Package,
  ExternalLink,
  Trash2
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface Notification {
  id: string
  title: string
  description: string
  type: 'info' | 'warning' | 'success' | 'error'
  category: 'system' | 'sales' | 'inventory' | 'customer' | 'finance'
  isRead: boolean
  timestamp: string
  actionUrl?: string
  icon?: React.ReactNode
}

const mockNotifications: Notification[] = [
  {
    id: '1',
    title: 'New Order Received',
    description: 'ABC Construction has placed a new order for R 15,420.00',
    type: 'success',
    category: 'sales',
    isRead: false,
    timestamp: '2025-06-23T10:30:00Z',
    actionUrl: '/sales',
    icon: <ShoppingCart className="h-4 w-4" />
  },
  {
    id: '2',
    title: 'Low Stock Alert',
    description: 'Laptop Dell XPS 15 is running low on stock (5 units remaining)',
    type: 'warning',
    category: 'inventory',
    isRead: false,
    timestamp: '2025-06-23T09:15:00Z',
    actionUrl: '/inventory',
    icon: <Package className="h-4 w-4" />
  },
  {
    id: '3',
    title: 'New Customer Registered',
    description: 'Johannesburg Retail has registered as a new customer',
    type: 'success',
    category: 'customer',
    isRead: true,
    timestamp: '2025-06-23T08:45:00Z',
    actionUrl: '/customers',
    icon: <Users className="h-4 w-4" />
  },
  {
    id: '4',
    title: 'Invoice Overdue',
    description: 'Invoice INV-2025-001234 is 5 days overdue (R 8,950.00)',
    type: 'error',
    category: 'finance',
    isRead: false,
    timestamp: '2025-06-22T16:20:00Z',
    actionUrl: '/invoicing',
    icon: <FileText className="h-4 w-4" />
  },
  {
    id: '5',
    title: 'System Maintenance',
    description: 'Scheduled maintenance this weekend from 22:00 to 06:00',
    type: 'info',
    category: 'system',
    isRead: true,
    timestamp: '2025-06-22T14:30:00Z',
    icon: <Bell className="h-4 w-4" />
  },
  {
    id: '6',
    title: 'Payment Received',
    description: 'Payment of R 25,000.00 received from Tech Solutions Pty Ltd',
    type: 'success',
    category: 'finance',
    isRead: false,
    timestamp: '2025-06-22T11:30:00Z',
    actionUrl: '/invoicing',
    icon: <FileText className="h-4 w-4" />
  },
  {
    id: '7',
    title: 'Employee Birthday',
    description: 'John Doe celebrates his birthday tomorrow',
    type: 'info',
    category: 'system',
    isRead: true,
    timestamp: '2025-06-22T09:00:00Z',
    icon: <User className="h-4 w-4" />
  },
  {
    id: '8',
    title: 'Stock Arrival',
    description: 'New stock of 50 units has arrived for Product LP-002',
    type: 'success',
    category: 'inventory',
    isRead: false,
    timestamp: '2025-06-21T15:45:00Z',
    actionUrl: '/inventory',
    icon: <Package className="h-4 w-4" />
  }
]

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [readFilter, setReadFilter] = useState<string>('all')
  const { toast } = useToast()

  const unreadCount = notifications.filter(n => !n.isRead).length

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id ? { ...notification, isRead: true } : notification
      )
    )
  }

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, isRead: true }))
    )
    toast({
      title: "All notifications marked as read",
      description: "All notifications have been marked as read",
    })
  }

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id))
    toast({
      title: "Notification deleted",
      description: "The notification has been removed",
    })
  }

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id)
    
    if (notification.actionUrl) {
      setTimeout(() => {
        window.location.href = notification.actionUrl!
      }, 300)
    }
  }

  const filteredNotifications = notifications.filter(notification => {
    const matchesSearch = notification.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         notification.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = typeFilter === 'all' || notification.type === typeFilter
    const matchesCategory = categoryFilter === 'all' || notification.category === categoryFilter
    const matchesRead = readFilter === 'all' || 
                       (readFilter === 'read' && notification.isRead) ||
                       (readFilter === 'unread' && !notification.isRead)
    
    return matchesSearch && matchesType && matchesCategory && matchesRead
  })

  const getTypeColor = (type: Notification['type']) => {
    switch (type) {
      case 'success': return 'bg-green-50 border-green-200 text-green-700'
      case 'warning': return 'bg-yellow-50 border-yellow-200 text-yellow-700'
      case 'error': return 'bg-red-50 border-red-200 text-red-700'
      case 'info': return 'bg-blue-50 border-blue-200 text-blue-700'
      default: return 'bg-gray-50 border-gray-200 text-gray-700'
    }
  }

  const getCategoryIcon = (category: Notification['category']) => {
    switch (category) {
      case 'sales': return <ShoppingCart className="h-4 w-4" />
      case 'inventory': return <Package className="h-4 w-4" />
      case 'customer': return <Users className="h-4 w-4" />
      case 'finance': return <FileText className="h-4 w-4" />
      case 'system': return <Bell className="h-4 w-4" />
      default: return <Bell className="h-4 w-4" />
    }
  }

  const formatTimestamp = (timestamp: string) => {
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
      <Header currentPage="/notifications" breadcrumbs={[{ name: 'Home', href: '/' }, { name: 'Notifications' }]} />

      {/* Main content */}
      <div className="lg:pl-64">
        <main className="p-6">
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
                <p className="text-gray-600">Stay updated with your business activities</p>
                <div className="mt-2 text-sm text-blue-600">
                  🇿🇦 {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  onClick={markAllAsRead}
                  disabled={unreadCount === 0}
                  className="flex items-center space-x-2"
                >
                  <CheckCheck className="h-4 w-4" />
                  <span>Mark all as read</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search notifications..."
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
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="success">Success</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="error">Error</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                      <SelectItem value="sales">Sales</SelectItem>
                      <SelectItem value="inventory">Inventory</SelectItem>
                      <SelectItem value="customer">Customer</SelectItem>
                      <SelectItem value="finance">Finance</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={readFilter} onValueChange={setReadFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="unread">Unread</SelectItem>
                      <SelectItem value="read">Read</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notifications list */}
          <div className="space-y-4">
            {filteredNotifications.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications found</h3>
                  <p className="text-gray-500">
                    {searchQuery || typeFilter !== 'all' || categoryFilter !== 'all' || readFilter !== 'all'
                      ? 'Try adjusting your filters'
                      : 'You\'re all caught up!'
                    }
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredNotifications.map((notification) => (
                <Card
                  key={notification.id}
                  className={`cursor-pointer transition-all hover:shadow-sm ${
                    notification.isRead ? 'bg-gray-50' : 'border-l-4 ' + 
                    (notification.type === 'success' ? 'border-l-green-500' :
                     notification.type === 'warning' ? 'border-l-yellow-500' :
                     notification.type === 'error' ? 'border-l-red-500' :
                     'border-l-blue-500')
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-4">
                      <div className={`p-3 rounded-full ${
                        notification.isRead ? 'bg-gray-200' : 'bg-white'
                      }`}>
                        {notification.icon || getCategoryIcon(notification.category)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className={`text-lg font-medium ${
                            notification.isRead ? 'text-gray-600' : 'text-gray-900'
                          }`}>
                            {notification.title}
                          </h4>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-500">
                              {formatTimestamp(notification.timestamp)}
                            </span>
                            {!notification.isRead && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            )}
                          </div>
                        </div>
                        
                        <p className={`text-sm mb-3 ${
                          notification.isRead ? 'text-gray-500' : 'text-gray-700'
                        }`}>
                          {notification.description}
                        </p>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline">
                              {notification.category}
                            </Badge>
                            <Badge 
                              variant={notification.type === 'error' ? 'destructive' : 
                                       notification.type === 'warning' ? 'default' : 
                                       notification.type === 'success' ? 'default' : 'secondary'}
                              className={
                                notification.type === 'success' ? 'bg-green-100 text-green-800' :
                                notification.type === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                                notification.type === 'error' ? 'bg-red-100 text-red-800' :
                                'bg-blue-100 text-blue-800'
                              }
                            >
                              {notification.type}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            {notification.actionUrl && (
                              <div className="flex items-center space-x-1 text-sm text-blue-600">
                                <span>View</span>
                                <ExternalLink className="h-3 w-3" />
                              </div>
                            )}
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                deleteNotification(notification.id)
                              }}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
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