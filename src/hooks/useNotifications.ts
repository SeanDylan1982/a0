import { useState, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { NotificationType, NotificationPriority, Notification } from '@prisma/client'

export interface NotificationFilters {
  type?: NotificationType
  priority?: NotificationPriority
  read?: boolean
  startDate?: Date
  endDate?: Date
  limit?: number
  offset?: number
}

export interface CreateNotificationData {
  userId?: string
  type: NotificationType
  title: string
  message: string
  data?: Record<string, any>
  priority?: NotificationPriority
  expiresAt?: Date
}

export interface NotificationStats {
  total: number
  unread: number
  byType: Record<NotificationType, number>
  byPriority: Record<NotificationPriority, number>
}

// API functions
const fetchNotifications = async (filters?: NotificationFilters): Promise<Notification[]> => {
  const params = new URLSearchParams()
  
  if (filters?.type) params.append('type', filters.type)
  if (filters?.priority) params.append('priority', filters.priority)
  if (filters?.read !== undefined) params.append('read', filters.read.toString())
  if (filters?.startDate) params.append('startDate', filters.startDate.toISOString())
  if (filters?.endDate) params.append('endDate', filters.endDate.toISOString())
  if (filters?.limit) params.append('limit', filters.limit.toString())
  if (filters?.offset) params.append('offset', filters.offset.toString())

  const response = await fetch(`/api/notifications?${params}`)
  if (!response.ok) {
    throw new Error('Failed to fetch notifications')
  }
  
  const data = await response.json()
  return data.notifications
}

const fetchNotificationCount = async (type?: NotificationType): Promise<number> => {
  const params = new URLSearchParams()
  if (type) params.append('type', type)

  const response = await fetch(`/api/notifications/count?${params}`)
  if (!response.ok) {
    throw new Error('Failed to fetch notification count')
  }
  
  const data = await response.json()
  return data.count
}

const fetchNotificationStats = async (): Promise<NotificationStats> => {
  const response = await fetch('/api/notifications/stats')
  if (!response.ok) {
    throw new Error('Failed to fetch notification stats')
  }
  
  const data = await response.json()
  return data.stats
}

const createNotification = async (data: CreateNotificationData): Promise<Notification> => {
  const response = await fetch('/api/notifications', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  })
  
  if (!response.ok) {
    throw new Error('Failed to create notification')
  }
  
  const result = await response.json()
  return result.notification
}

const markNotificationAsRead = async (notificationId: string): Promise<void> => {
  const response = await fetch(`/api/notifications/${notificationId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ action: 'mark_read' })
  })
  
  if (!response.ok) {
    throw new Error('Failed to mark notification as read')
  }
}

const deleteNotification = async (notificationId: string): Promise<void> => {
  const response = await fetch(`/api/notifications/${notificationId}`, {
    method: 'DELETE'
  })
  
  if (!response.ok) {
    throw new Error('Failed to delete notification')
  }
}

const markAllAsRead = async (type?: NotificationType): Promise<number> => {
  const body: any = { action: 'mark_read' }
  if (type) body.type = type

  const response = await fetch('/api/notifications/bulk', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })
  
  if (!response.ok) {
    throw new Error('Failed to mark all notifications as read')
  }
  
  const data = await response.json()
  return data.count
}

// Main hook
export function useNotifications(filters?: NotificationFilters) {
  const queryClient = useQueryClient()
  
  const {
    data: notifications = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['notifications', filters],
    queryFn: () => fetchNotifications(filters),
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000 // Refetch every minute
  })

  const createMutation = useMutation({
    mutationFn: createNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notification-count'] })
      queryClient.invalidateQueries({ queryKey: ['notification-stats'] })
    }
  })

  const markAsReadMutation = useMutation({
    mutationFn: markNotificationAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notification-count'] })
      queryClient.invalidateQueries({ queryKey: ['notification-stats'] })
    }
  })

  const deleteMutation = useMutation({
    mutationFn: deleteNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notification-count'] })
      queryClient.invalidateQueries({ queryKey: ['notification-stats'] })
    }
  })

  const markAllAsReadMutation = useMutation({
    mutationFn: markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notification-count'] })
      queryClient.invalidateQueries({ queryKey: ['notification-stats'] })
    }
  })

  return {
    notifications,
    isLoading,
    error,
    refetch,
    createNotification: createMutation.mutate,
    markAsRead: markAsReadMutation.mutate,
    deleteNotification: deleteMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,
    isCreating: createMutation.isPending,
    isMarkingAsRead: markAsReadMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isMarkingAllAsRead: markAllAsReadMutation.isPending
  }
}

// Hook for notification count
export function useNotificationCount(type?: NotificationType) {
  const {
    data: count = 0,
    isLoading,
    error
  } = useQuery({
    queryKey: ['notification-count', type],
    queryFn: () => fetchNotificationCount(type),
    staleTime: 10000, // 10 seconds
    refetchInterval: 30000 // Refetch every 30 seconds
  })

  return { count, isLoading, error }
}

// Hook for notification statistics
export function useNotificationStats() {
  const {
    data: stats,
    isLoading,
    error
  } = useQuery({
    queryKey: ['notification-stats'],
    queryFn: fetchNotificationStats,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000 // Refetch every minute
  })

  return { stats, isLoading, error }
}

// Hook for real-time notifications (to be used with Socket.IO)
export function useRealtimeNotifications() {
  const queryClient = useQueryClient()
  const [isConnected, setIsConnected] = useState(false)

  const handleNewNotification = useCallback((notification: Notification) => {
    // Add new notification to cache
    queryClient.setQueryData(['notifications'], (old: Notification[] = []) => {
      return [notification, ...old]
    })

    // Update counts
    queryClient.invalidateQueries({ queryKey: ['notification-count'] })
    queryClient.invalidateQueries({ queryKey: ['notification-stats'] })
  }, [queryClient])

  const handleNotificationRead = useCallback((notificationId: string) => {
    // Update notification in cache
    queryClient.setQueryData(['notifications'], (old: Notification[] = []) => {
      return old.map(notification => 
        notification.id === notificationId 
          ? { ...notification, read: true }
          : notification
      )
    })

    // Update counts
    queryClient.invalidateQueries({ queryKey: ['notification-count'] })
    queryClient.invalidateQueries({ queryKey: ['notification-stats'] })
  }, [queryClient])

  const handleNotificationDeleted = useCallback((notificationId: string) => {
    // Remove notification from cache
    queryClient.setQueryData(['notifications'], (old: Notification[] = []) => {
      return old.filter(notification => notification.id !== notificationId)
    })

    // Update counts
    queryClient.invalidateQueries({ queryKey: ['notification-count'] })
    queryClient.invalidateQueries({ queryKey: ['notification-stats'] })
  }, [queryClient])

  useEffect(() => {
    // Socket.IO connection logic would go here
    // This is a placeholder for when Socket.IO integration is implemented
    
    return () => {
      // Cleanup socket connection
    }
  }, [handleNewNotification, handleNotificationRead, handleNotificationDeleted])

  return {
    isConnected,
    handleNewNotification,
    handleNotificationRead,
    handleNotificationDeleted
  }
}