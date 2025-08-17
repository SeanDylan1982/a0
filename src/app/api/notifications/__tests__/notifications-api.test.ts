import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { NotificationType, NotificationPriority } from '@prisma/client'

// Mock next-auth
const mockGetServerSession = vi.fn()
vi.mock('next-auth', () => ({
  getServerSession: mockGetServerSession
}))

// Mock auth options
vi.mock('@/lib/auth', () => ({
  authOptions: {}
}))

// Mock NotificationManager
const mockNotificationManager = {
  getNotifications: vi.fn(),
  create: vi.fn()
}

vi.mock('@/lib/services/notification-manager', () => ({
  NotificationManager: vi.fn(() => mockNotificationManager)
}))

// Import after mocking
const { GET, POST } = await import('../route')



describe('/api/notifications', () => {
  const mockUserId = '507f1f77bcf86cd799439011'
  const mockSession = {
    user: { id: mockUserId }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetServerSession.mockResolvedValue(mockSession)
  })

  describe('GET', () => {
    it('should return notifications with default parameters', async () => {
      const mockNotifications = [
        {
          id: 'notif1',
          userId: mockUserId,
          type: NotificationType.ACTIVITY,
          title: 'Test Notification',
          message: 'Test message',
          priority: NotificationPriority.MEDIUM,
          read: false,
          createdAt: new Date(),
          expiresAt: null,
          data: {}
        }
      ]

      mockNotificationManager.getNotifications.mockResolvedValue(mockNotifications)

      const request = new NextRequest('http://localhost:3000/api/notifications')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.notifications).toEqual(mockNotifications)
      expect(mockNotificationManager.getNotifications).toHaveBeenCalledWith(
        mockUserId,
        expect.objectContaining({
          limit: undefined,
          offset: undefined
        })
      )
    })

    it('should apply query filters', async () => {
      mockNotificationManager.getNotifications.mockResolvedValue([])

      const url = new URL('http://localhost:3000/api/notifications')
      url.searchParams.set('type', NotificationType.SYSTEM)
      url.searchParams.set('priority', NotificationPriority.HIGH)
      url.searchParams.set('read', 'false')
      url.searchParams.set('limit', '10')
      url.searchParams.set('offset', '5')

      const request = new NextRequest(url)
      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(mockNotificationManager.getNotifications).toHaveBeenCalledWith(
        mockUserId,
        expect.objectContaining({
          type: NotificationType.SYSTEM,
          priority: NotificationPriority.HIGH,
          read: false,
          limit: 10,
          offset: 5
        })
      )
    })

    it('should return 401 if not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/notifications')
      const response = await GET(request)

      expect(response.status).toBe(401)
    })

    it('should return 400 for invalid query parameters', async () => {
      const url = new URL('http://localhost:3000/api/notifications')
      url.searchParams.set('type', 'INVALID_TYPE')

      const request = new NextRequest(url)
      const response = await GET(request)

      expect(response.status).toBe(400)
    })
  })

  describe('POST', () => {
    it('should create notification successfully', async () => {
      const notificationData = {
        type: NotificationType.ACTIVITY,
        title: 'Test Notification',
        message: 'Test message',
        priority: NotificationPriority.HIGH
      }

      const mockCreatedNotification = {
        id: 'notif1',
        userId: mockUserId,
        ...notificationData,
        read: false,
        createdAt: new Date(),
        expiresAt: null,
        data: {}
      }

      mockNotificationManager.create.mockResolvedValue(mockCreatedNotification)

      const request = new NextRequest('http://localhost:3000/api/notifications', {
        method: 'POST',
        body: JSON.stringify(notificationData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.notification).toEqual(mockCreatedNotification)
      expect(mockNotificationManager.create).toHaveBeenCalledWith({
        userId: mockUserId,
        type: NotificationType.ACTIVITY,
        title: 'Test Notification',
        message: 'Test message',
        priority: NotificationPriority.HIGH,
        data: undefined,
        expiresAt: undefined
      })
    })

    it('should create notification for specific user', async () => {
      const targetUserId = '507f1f77bcf86cd799439012'
      const notificationData = {
        userId: targetUserId,
        type: NotificationType.SYSTEM,
        title: 'System Alert',
        message: 'System maintenance'
      }

      const mockCreatedNotification = {
        id: 'notif1',
        ...notificationData,
        priority: NotificationPriority.MEDIUM,
        read: false,
        createdAt: new Date(),
        expiresAt: null,
        data: {}
      }

      mockNotificationManager.create.mockResolvedValue(mockCreatedNotification)

      const request = new NextRequest('http://localhost:3000/api/notifications', {
        method: 'POST',
        body: JSON.stringify(notificationData)
      })

      const response = await POST(request)

      expect(response.status).toBe(201)
      expect(mockNotificationManager.create).toHaveBeenCalledWith({
        userId: targetUserId,
        type: NotificationType.SYSTEM,
        title: 'System Alert',
        message: 'System maintenance',
        data: undefined,
        priority: undefined,
        expiresAt: undefined
      })
    })

    it('should return 401 if not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/notifications', {
        method: 'POST',
        body: JSON.stringify({
          type: NotificationType.ACTIVITY,
          title: 'Test',
          message: 'Test'
        })
      })

      const response = await POST(request)

      expect(response.status).toBe(401)
    })

    it('should return 400 for invalid request data', async () => {
      const request = new NextRequest('http://localhost:3000/api/notifications', {
        method: 'POST',
        body: JSON.stringify({
          type: 'INVALID_TYPE',
          title: '',
          message: 'Test'
        })
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
    })
  })
})