'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Bell, Check, CheckCheck, ExternalLink, Clock, User, FileText, ShoppingCart, Users, Package } from 'lucide-react'
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

interface NotificationsModalProps {
  children: React.ReactNode
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
  }
]

export function NotificationsModal({ children }: NotificationsModalProps) {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications)
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

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id)
    
    if (notification.actionUrl) {
      setTimeout(() => {
        window.location.href = notification.actionUrl!
      }, 300)
    }
    
    setOpen(false)
  }

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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Bell className="h-5 w-5" />
              <DialogTitle>Notifications</DialogTitle>
              {unreadCount > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {unreadCount} unread
                </Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="text-xs"
              disabled={unreadCount === 0}
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Mark all as read
            </Button>
          </div>
          <DialogDescription>
            Stay updated with your business activities
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh] px-6">
          <div className="space-y-3 py-4">
            {notifications.length === 0 ? (
              <div className="text-center py-8">
                <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No notifications</p>
                <p className="text-sm text-gray-400">You're all caught up!</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-sm ${
                    notification.isRead ? 'bg-gray-50 border-gray-200' : getTypeColor(notification.type)
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`p-2 rounded-full ${
                      notification.isRead ? 'bg-gray-200' : 'bg-white'
                    }`}>
                      {notification.icon || getCategoryIcon(notification.category)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className={`text-sm font-medium ${
                          notification.isRead ? 'text-gray-600' : 'text-gray-900'
                        }`}>
                          {notification.title}
                        </h4>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500">
                            {formatTimestamp(notification.timestamp)}
                          </span>
                          {!notification.isRead && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          )}
                        </div>
                      </div>
                      
                      <p className={`text-sm ${
                        notification.isRead ? 'text-gray-500' : 'text-gray-700'
                      } mb-2`}>
                        {notification.description}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-xs">
                          {notification.category}
                        </Badge>
                        
                        {notification.actionUrl && (
                          <div className="flex items-center space-x-1 text-xs text-blue-600">
                            <span>View</span>
                            <ExternalLink className="h-3 w-3" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
        
        <div className="p-6 pt-0 border-t">
          <Button variant="outline" className="w-full" asChild>
            <a href="/notifications">View all notifications</a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}