import { useState, useEffect, useCallback } from 'react'

// Mock Socket.IO interfaces for development
export interface SocketInventoryAlert {
  productId: string
  productName: string
  currentStock: number
  minimumStock: number
  alertType: 'LOW_STOCK' | 'OUT_OF_STOCK' | 'CRITICAL'
  timestamp: Date
}

export interface SocketStockMovement {
  id: string
  productId: string
  productName: string
  type: string
  quantity: number
  beforeQty: number
  afterQty: number
  reason: string
  userId: string
  timestamp: Date
}

export interface SocketNotification {
  id: string
  userId: string
  type: string
  title: string
  message: string
  priority: string
  data: any
  createdAt: Date
}

export interface SocketActivity {
  id: string
  userId: string
  module: string
  action: string
  entityType: string
  entityName: string
  timestamp: Date
  user: {
    name?: string
    email: string
    role: string
  }
}

/**
 * Hook for Socket.IO inventory updates
 * In development, this returns mock data. In production, it would connect to actual Socket.IO
 */
export function useSocketInventory(productIds?: string[]) {
  const [alerts, setAlerts] = useState<SocketInventoryAlert[]>([])
  const [movements, setMovements] = useState<SocketStockMovement[]>([])
  const [subscribed, setSubscribed] = useState(false)

  useEffect(() => {
    // Mock Socket.IO connection for development
    // In production, this would establish actual socket connection
    
    console.log('Mock Socket.IO: Connecting to inventory updates...')
    setSubscribed(true)

    // Simulate receiving some mock data
    const mockAlerts: SocketInventoryAlert[] = []
    const mockMovements: SocketStockMovement[] = []

    setAlerts(mockAlerts)
    setMovements(mockMovements)

    // Cleanup function
    return () => {
      console.log('Mock Socket.IO: Disconnecting from inventory updates...')
      setSubscribed(false)
    }
  }, [productIds])

  return {
    alerts,
    movements,
    subscribed
  }
}

/**
 * Hook for Socket.IO notification updates
 */
export function useSocketNotifications(userId?: string) {
  const [notifications, setNotifications] = useState<SocketNotification[]>([])
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (!userId) return

    // Mock Socket.IO connection for development
    console.log('Mock Socket.IO: Connecting to notification updates...')
    setConnected(true)

    // Cleanup function
    return () => {
      console.log('Mock Socket.IO: Disconnecting from notification updates...')
      setConnected(false)
    }
  }, [userId])

  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === notificationId 
          ? { ...notification, data: { ...notification.data, read: true } }
          : notification
      )
    )
  }, [])

  return {
    notifications,
    connected,
    markAsRead
  }
}

/**
 * Hook for Socket.IO activity feed updates
 */
export function useSocketActivity(userId?: string) {
  const [activities, setActivities] = useState<SocketActivity[]>([])
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (!userId) return

    // Mock Socket.IO connection for development
    console.log('Mock Socket.IO: Connecting to activity updates...')
    setConnected(true)

    // Cleanup function
    return () => {
      console.log('Mock Socket.IO: Disconnecting from activity updates...')
      setConnected(false)
    }
  }, [userId])

  return {
    activities,
    connected
  }
}

/**
 * Generic Socket.IO hook for custom events
 */
export function useSocket(events: string[] = []) {
  const [connected, setConnected] = useState(false)
  const [data, setData] = useState<Record<string, any>>({})

  useEffect(() => {
    // Mock Socket.IO connection for development
    console.log('Mock Socket.IO: Connecting to events:', events)
    setConnected(true)

    // Initialize data for each event
    const initialData: Record<string, any> = {}
    events.forEach(event => {
      initialData[event] = []
    })
    setData(initialData)

    // Cleanup function
    return () => {
      console.log('Mock Socket.IO: Disconnecting from events:', events)
      setConnected(false)
    }
  }, [events])

  const emit = useCallback((event: string, data: any) => {
    console.log('Mock Socket.IO: Emitting event:', event, data)
    // In production, this would emit to actual socket
  }, [])

  return {
    connected,
    data,
    emit
  }
}