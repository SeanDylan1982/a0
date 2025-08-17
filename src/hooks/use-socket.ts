import { useEffect, useState, useCallback, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { NotificationType, UserRole } from '@prisma/client'

// Mock session interface for development
interface MockSession {
  accessToken?: string
  user?: {
    id: string
    email: string
    role: UserRole
  }
}

// Mock useSession hook for development - replace with actual auth when implemented
function useSession(): { data: MockSession | null } {
  // For development, return a mock session
  // In production, this should be replaced with actual authentication
  return {
    data: {
      accessToken: 'mock-token-for-development',
      user: {
        id: 'mock-user-id',
        email: 'dev@example.com',
        role: UserRole.DIRECTOR // Use DIRECTOR for testing all features
      }
    }
  }
}

interface SocketState {
  connected: boolean
  connecting: boolean
  error: string | null
}

interface ActivityEvent {
  id: string
  userId: string
  module: string
  action: string
  entityType: string
  entityName: string
  timestamp: Date
  user: { name?: string; email: string; role: UserRole }
}

interface NotificationEvent {
  id: string
  userId: string
  type: NotificationType
  title: string
  message: string
  priority: string
  data?: any
  createdAt: Date
}

interface InventoryAlert {
  productId: string
  productName: string
  currentStock: number
  minimumStock: number
  alertType: 'LOW_STOCK' | 'OUT_OF_STOCK' | 'CRITICAL'
  timestamp: Date
}

interface StockMovement {
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

export function useSocket() {
  const { data: session } = useSession()
  const [socket, setSocket] = useState<Socket | null>(null)
  const [state, setState] = useState<SocketState>({
    connected: false,
    connecting: false,
    error: null
  })

  useEffect(() => {
    // Only connect if socket is enabled and user is authenticated
    const enabled = typeof window !== 'undefined' && 
                   process.env.NEXT_PUBLIC_ENABLE_SOCKET === 'true' &&
                   session?.accessToken

    if (!enabled) return

    setState(prev => ({ ...prev, connecting: true, error: null }))

    const socketInstance = io({
      path: '/api/socketio',
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      auth: {
        token: session.accessToken
      }
    })

    socketInstance.on('connect', () => {
      console.log('Connected to Socket.IO server')
      setState({ connected: true, connecting: false, error: null })
    })

    socketInstance.on('disconnect', (reason) => {
      console.log('Disconnected from Socket.IO server:', reason)
      setState(prev => ({ ...prev, connected: false }))
    })

    socketInstance.on('connect_error', (error) => {
      console.error('Socket connection error:', error)
      setState({ connected: false, connecting: false, error: error.message })
    })

    socketInstance.on('connected', (data) => {
      console.log('Socket authenticated:', data)
    })

    setSocket(socketInstance)

    return () => {
      socketInstance.disconnect()
      setSocket(null)
      setState({ connected: false, connecting: false, error: null })
    }
  }, [session?.accessToken])

  return { socket, ...state }
}

export function useSocketActivities(modules?: string[]) {
  const { socket } = useSocket()
  const [activities, setActivities] = useState<ActivityEvent[]>([])
  const [subscribed, setSubscribed] = useState(false)

  useEffect(() => {
    if (!socket) return

    // Subscribe to activity updates
    socket.emit('subscribe:activities', { modules })

    const handleNewActivity = (activity: ActivityEvent) => {
      setActivities(prev => [activity, ...prev.slice(0, 49)]) // Keep last 50
    }

    const handleCriticalActivity = (activity: ActivityEvent) => {
      setActivities(prev => [activity, ...prev.slice(0, 49)])
      // Could trigger additional UI notifications here
    }

    const handleSubscribed = () => {
      setSubscribed(true)
    }

    socket.on('activity:new', handleNewActivity)
    socket.on('activity:critical', handleCriticalActivity)
    socket.on('subscribed:activities', handleSubscribed)

    return () => {
      socket.off('activity:new', handleNewActivity)
      socket.off('activity:critical', handleCriticalActivity)
      socket.off('subscribed:activities', handleSubscribed)
      setSubscribed(false)
    }
  }, [socket, modules])

  return { activities, subscribed }
}

export function useSocketNotifications(types?: NotificationType[]) {
  const { socket } = useSocket()
  const [notifications, setNotifications] = useState<NotificationEvent[]>([])
  const [counts, setCounts] = useState<Record<NotificationType, number>>({} as Record<NotificationType, number>)
  const [subscribed, setSubscribed] = useState(false)

  const markAsRead = useCallback((notificationId: string) => {
    if (!socket) return
    socket.emit('notification:read', { notificationId })
  }, [socket])

  const markAllAsRead = useCallback((type?: NotificationType) => {
    if (!socket) return
    socket.emit('notifications:mark-all-read', { type })
  }, [socket])

  useEffect(() => {
    if (!socket) return

    // Subscribe to notifications
    socket.emit('subscribe:notifications', { types })

    const handleNewNotification = (notification: NotificationEvent) => {
      setNotifications(prev => [notification, ...prev.slice(0, 99)]) // Keep last 100
      
      // Update counts
      setCounts(prev => ({
        ...prev,
        [notification.type]: (prev[notification.type] || 0) + 1
      }))
    }

    const handleNotificationRead = (data: { notificationId: string }) => {
      setNotifications(prev => 
        prev.map(n => n.id === data.notificationId ? { ...n, read: true } : n)
      )
    }

    const handleNotificationCounts = (newCounts: Record<NotificationType, number>) => {
      setCounts(newCounts)
    }

    const handleSubscribed = () => {
      setSubscribed(true)
    }

    socket.on('notification:new', handleNewNotification)
    socket.on('notification:read', handleNotificationRead)
    socket.on('notification:counts', handleNotificationCounts)
    socket.on('subscribed:notifications', handleSubscribed)

    return () => {
      socket.off('notification:new', handleNewNotification)
      socket.off('notification:read', handleNotificationRead)
      socket.off('notification:counts', handleNotificationCounts)
      socket.off('subscribed:notifications', handleSubscribed)
      setSubscribed(false)
    }
  }, [socket, types])

  return { 
    notifications, 
    counts, 
    subscribed, 
    markAsRead, 
    markAllAsRead 
  }
}

export function useSocketInventory(productIds?: string[]) {
  const { socket } = useSocket()
  const [alerts, setAlerts] = useState<InventoryAlert[]>([])
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [subscribed, setSubscribed] = useState(false)

  useEffect(() => {
    if (!socket) return

    // Subscribe to inventory updates
    socket.emit('subscribe:inventory', { productIds })

    const handleInventoryAlert = (alert: InventoryAlert) => {
      setAlerts(prev => [alert, ...prev.slice(0, 19)]) // Keep last 20
    }

    const handleStockMovement = (movement: StockMovement) => {
      setMovements(prev => [movement, ...prev.slice(0, 49)]) // Keep last 50
    }

    const handleSubscribed = () => {
      setSubscribed(true)
    }

    socket.on('inventory:alert', handleInventoryAlert)
    socket.on('inventory:movement', handleStockMovement)
    socket.on('inventory:product:alert', handleInventoryAlert)
    socket.on('inventory:product:movement', handleStockMovement)
    socket.on('subscribed:inventory', handleSubscribed)

    return () => {
      socket.off('inventory:alert', handleInventoryAlert)
      socket.off('inventory:movement', handleStockMovement)
      socket.off('inventory:product:alert', handleInventoryAlert)
      socket.off('inventory:product:movement', handleStockMovement)
      socket.off('subscribed:inventory', handleSubscribed)
      setSubscribed(false)
    }
  }, [socket, productIds])

  return { alerts, movements, subscribed }
}

export function useSocketSystem() {
  const { socket } = useSocket()
  const [messages, setMessages] = useState<Array<{
    type: 'info' | 'warning' | 'error' | 'success'
    title: string
    message: string
    timestamp: string
    data?: any
  }>>([])

  useEffect(() => {
    if (!socket) return

    const handleSystemMessage = (message: any) => {
      setMessages(prev => [message, ...prev.slice(0, 9)]) // Keep last 10
    }

    socket.on('system:message', handleSystemMessage)

    return () => {
      socket.off('system:message', handleSystemMessage)
    }
  }, [socket])

  return { messages }
}

// Hook for connection health monitoring
export function useSocketHealth() {
  const { socket, connected } = useSocket()
  const [latency, setLatency] = useState<number | null>(null)
  const pingIntervalRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    if (!socket || !connected) {
      setLatency(null)
      return
    }

    const ping = () => {
      const start = Date.now()
      socket.emit('ping')
      
      const handlePong = () => {
        setLatency(Date.now() - start)
        socket.off('pong', handlePong)
      }
      
      socket.on('pong', handlePong)
    }

    // Ping every 30 seconds
    pingIntervalRef.current = setInterval(ping, 30000)
    
    // Initial ping
    ping()

    return () => {
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current)
      }
    }
  }, [socket, connected])

  return { latency, connected }
}