import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { PrismaClient, NotificationType, NotificationPriority } from '@prisma/client'
import { NotificationManager, CreateNotificationData } from '../notification-manager'

// Mock Prisma Client
const mockPrisma = {
  notification: {
    create: vi.fn(),
    createMany: vi.fn(),
    findMany: vi.fn(),
    updateMany: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn()
  }
} as unknown as PrismaClient

describe('NotificationManager', () => {
  let notificationManager: NotificationManager
  const mockUserId = '507f1f77bcf86cd799439011'
  const mockNotificationId = '507f1f77bcf86cd799439012'

  beforeEach(() => {
    notificationManager = new NotificationManager(mockPrisma)
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('create', () => {
    it('should create a notification successfully', async () => {
      const notificationData: CreateNotificationData = {
        userId: mockUserId,
        type: NotificationType.ACTIVITY,
        title: 'Test Notification',
        message: 'This is a test notification',
        priority: NotificationPriority.HIGH
      }

      const mockNotification = {
        id: mockNotificationId,
        ...notificationData,
        data: {},
        read: false,
        createdAt: new Date(),
        expiresAt: null
      }

      vi.mocked(mockPrisma.notification.create).mockResolvedValue(mockNotification)

      const result = await notificationManager.create(notificationData)

      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: {
          userId: mockUserId,
          type: NotificationType.ACTIVITY,
          title: 'Test Notification',
          message: 'This is a test notification',
          data: {},
          priority: NotificationPriority.HIGH,
          expiresAt: undefined,
          read: false
        }
      })
      expect(result).toEqual(mockNotification)
    })

    it('should create notification with default priority', async () => {
      const notificationData: CreateNotificationData = {
        userId: mockUserId,
        type: NotificationType.SYSTEM,
        title: 'System Alert',
        message: 'System maintenance scheduled'
      }

      const mockNotification = {
        id: mockNotificationId,
        ...notificationData,
        priority: NotificationPriority.MEDIUM,
        data: {},
        read: false,
        createdAt: new Date(),
        expiresAt: null
      }

      vi.mocked(mockPrisma.notification.create).mockResolvedValue(mockNotification)

      await notificationManager.create(notificationData)

      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          priority: NotificationPriority.MEDIUM
        })
      })
    })

    it('should handle creation errors', async () => {
      const notificationData: CreateNotificationData = {
        userId: mockUserId,
        type: NotificationType.ACTIVITY,
        title: 'Test Notification',
        message: 'This is a test notification'
      }

      vi.mocked(mockPrisma.notification.create).mockRejectedValue(new Error('Database error'))

      await expect(notificationManager.create(notificationData)).rejects.toThrow('Failed to create notification')
    })
  })

  describe('createBulk', () => {
    it('should create multiple notifications', async () => {
      const notifications: CreateNotificationData[] = [
        {
          userId: mockUserId,
          type: NotificationType.ACTIVITY,
          title: 'Notification 1',
          message: 'Message 1'
        },
        {
          userId: mockUserId,
          type: NotificationType.SYSTEM,
          title: 'Notification 2',
          message: 'Message 2'
        }
      ]

      const mockCreatedNotifications = notifications.map((n, i) => ({
        id: `507f1f77bcf86cd79943901${i}`,
        ...n,
        priority: NotificationPriority.MEDIUM,
        data: {},
        read: false,
        createdAt: new Date(),
        expiresAt: null
      }))

      vi.mocked(mockPrisma.notification.createMany).mockResolvedValue({ count: 2 })
      vi.mocked(mockPrisma.notification.findMany).mockResolvedValue(mockCreatedNotifications)

      const result = await notificationManager.createBulk(notifications)

      expect(mockPrisma.notification.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            userId: mockUserId,
            type: NotificationType.ACTIVITY,
            title: 'Notification 1'
          }),
          expect.objectContaining({
            userId: mockUserId,
            type: NotificationType.SYSTEM,
            title: 'Notification 2'
          })
        ])
      })
      expect(result).toHaveLength(2)
    })
  })

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      vi.mocked(mockPrisma.notification.updateMany).mockResolvedValue({ count: 1 })

      const result = await notificationManager.markAsRead(mockNotificationId, mockUserId)

      expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
        where: {
          id: mockNotificationId,
          userId: mockUserId
        },
        data: {
          read: true
        }
      })
      expect(result).toBe(true)
    })

    it('should return false if notification not found', async () => {
      vi.mocked(mockPrisma.notification.updateMany).mockResolvedValue({ count: 0 })

      const result = await notificationManager.markAsRead(mockNotificationId, mockUserId)

      expect(result).toBe(false)
    })
  })

  describe('markMultipleAsRead', () => {
    it('should mark multiple notifications as read', async () => {
      const notificationIds = ['id1', 'id2', 'id3']
      vi.mocked(mockPrisma.notification.updateMany).mockResolvedValue({ count: 3 })

      const result = await notificationManager.markMultipleAsRead(notificationIds, mockUserId)

      expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
        where: {
          id: { in: notificationIds },
          userId: mockUserId
        },
        data: {
          read: true
        }
      })
      expect(result).toBe(3)
    })
  })

  describe('markAllAsRead', () => {
    it('should mark all notifications as read', async () => {
      vi.mocked(mockPrisma.notification.updateMany).mockResolvedValue({ count: 5 })

      const result = await notificationManager.markAllAsRead(mockUserId)

      expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
        where: {
          userId: mockUserId,
          read: false
        },
        data: {
          read: true
        }
      })
      expect(result).toBe(5)
    })

    it('should mark all notifications of specific type as read', async () => {
      vi.mocked(mockPrisma.notification.updateMany).mockResolvedValue({ count: 3 })

      const result = await notificationManager.markAllAsRead(mockUserId, NotificationType.ACTIVITY)

      expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
        where: {
          userId: mockUserId,
          read: false,
          type: NotificationType.ACTIVITY
        },
        data: {
          read: true
        }
      })
      expect(result).toBe(3)
    })
  })

  describe('getUnreadCount', () => {
    it('should return unread count for user', async () => {
      vi.mocked(mockPrisma.notification.count).mockResolvedValue(7)

      const result = await notificationManager.getUnreadCount(mockUserId)

      expect(mockPrisma.notification.count).toHaveBeenCalledWith({
        where: {
          userId: mockUserId,
          read: false,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: expect.any(Date) } }
          ]
        }
      })
      expect(result).toBe(7)
    })

    it('should return unread count for specific type', async () => {
      vi.mocked(mockPrisma.notification.count).mockResolvedValue(3)

      const result = await notificationManager.getUnreadCount(mockUserId, NotificationType.INVENTORY_ALERT)

      expect(mockPrisma.notification.count).toHaveBeenCalledWith({
        where: {
          userId: mockUserId,
          read: false,
          type: NotificationType.INVENTORY_ALERT,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: expect.any(Date) } }
          ]
        }
      })
      expect(result).toBe(3)
    })

    it('should return 0 on error', async () => {
      vi.mocked(mockPrisma.notification.count).mockRejectedValue(new Error('Database error'))

      const result = await notificationManager.getUnreadCount(mockUserId)

      expect(result).toBe(0)
    })
  })

  describe('getNotifications', () => {
    it('should get notifications with default parameters', async () => {
      const mockNotifications = [
        {
          id: 'notif1',
          userId: mockUserId,
          type: NotificationType.ACTIVITY,
          title: 'Test 1',
          message: 'Message 1',
          priority: NotificationPriority.HIGH,
          read: false,
          createdAt: new Date(),
          expiresAt: null,
          data: {}
        }
      ]

      vi.mocked(mockPrisma.notification.findMany).mockResolvedValue(mockNotifications)

      const result = await notificationManager.getNotifications(mockUserId)

      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith({
        where: {
          userId: mockUserId,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: expect.any(Date) } }
          ]
        },
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' }
        ],
        take: 50,
        skip: 0
      })
      expect(result).toEqual(mockNotifications)
    })

    it('should apply filters correctly', async () => {
      const filters = {
        type: NotificationType.SYSTEM,
        priority: NotificationPriority.CRITICAL,
        read: false,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        limit: 10,
        offset: 5
      }

      vi.mocked(mockPrisma.notification.findMany).mockResolvedValue([])

      await notificationManager.getNotifications(mockUserId, filters)

      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith({
        where: {
          userId: mockUserId,
          type: NotificationType.SYSTEM,
          priority: NotificationPriority.CRITICAL,
          read: false,
          createdAt: {
            gte: filters.startDate,
            lte: filters.endDate
          },
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: expect.any(Date) } }
          ]
        },
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' }
        ],
        take: 10,
        skip: 5
      })
    })
  })

  describe('getNotificationStats', () => {
    it('should return notification statistics', async () => {
      const mockNotifications = [
        { type: NotificationType.ACTIVITY, priority: NotificationPriority.HIGH, read: false },
        { type: NotificationType.ACTIVITY, priority: NotificationPriority.MEDIUM, read: true },
        { type: NotificationType.SYSTEM, priority: NotificationPriority.CRITICAL, read: false },
        { type: NotificationType.INVENTORY_ALERT, priority: NotificationPriority.HIGH, read: false }
      ]

      vi.mocked(mockPrisma.notification.findMany).mockResolvedValue(mockNotifications)

      const result = await notificationManager.getNotificationStats(mockUserId)

      expect(result.total).toBe(4)
      expect(result.unread).toBe(3)
      expect(result.byType[NotificationType.ACTIVITY]).toBe(2)
      expect(result.byType[NotificationType.SYSTEM]).toBe(1)
      expect(result.byType[NotificationType.INVENTORY_ALERT]).toBe(1)
      expect(result.byPriority[NotificationPriority.HIGH]).toBe(2)
      expect(result.byPriority[NotificationPriority.MEDIUM]).toBe(1)
      expect(result.byPriority[NotificationPriority.CRITICAL]).toBe(1)
    })
  })

  describe('deleteNotification', () => {
    it('should delete notification successfully', async () => {
      vi.mocked(mockPrisma.notification.deleteMany).mockResolvedValue({ count: 1 })

      const result = await notificationManager.deleteNotification(mockNotificationId, mockUserId)

      expect(mockPrisma.notification.deleteMany).toHaveBeenCalledWith({
        where: {
          id: mockNotificationId,
          userId: mockUserId
        }
      })
      expect(result).toBe(true)
    })

    it('should return false if notification not found', async () => {
      vi.mocked(mockPrisma.notification.deleteMany).mockResolvedValue({ count: 0 })

      const result = await notificationManager.deleteNotification(mockNotificationId, mockUserId)

      expect(result).toBe(false)
    })
  })

  describe('cleanupExpiredNotifications', () => {
    it('should cleanup expired notifications', async () => {
      vi.mocked(mockPrisma.notification.deleteMany).mockResolvedValue({ count: 5 })

      const result = await notificationManager.cleanupExpiredNotifications()

      expect(mockPrisma.notification.deleteMany).toHaveBeenCalledWith({
        where: {
          expiresAt: {
            lt: expect.any(Date)
          }
        }
      })
      expect(result).toBe(5)
    })
  })

  describe('getNotificationsByPriority', () => {
    it('should get notifications by priority', async () => {
      const mockNotifications = [
        {
          id: 'notif1',
          userId: mockUserId,
          type: NotificationType.SYSTEM,
          title: 'Critical Alert',
          message: 'System down',
          priority: NotificationPriority.CRITICAL,
          read: false,
          createdAt: new Date(),
          expiresAt: null,
          data: {}
        }
      ]

      vi.mocked(mockPrisma.notification.findMany).mockResolvedValue(mockNotifications)

      const result = await notificationManager.getNotificationsByPriority(
        mockUserId, 
        NotificationPriority.CRITICAL,
        5
      )

      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith({
        where: {
          userId: mockUserId,
          priority: NotificationPriority.CRITICAL,
          read: false,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: expect.any(Date) } }
          ]
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      })
      expect(result).toEqual(mockNotifications)
    })
  })

  describe('getCriticalNotifications', () => {
    it('should get critical notifications', async () => {
      const mockNotifications = [
        {
          id: 'notif1',
          userId: mockUserId,
          type: NotificationType.SYSTEM,
          title: 'Critical Alert',
          message: 'System down',
          priority: NotificationPriority.CRITICAL,
          read: false,
          createdAt: new Date(),
          expiresAt: null,
          data: {}
        }
      ]

      vi.mocked(mockPrisma.notification.findMany).mockResolvedValue(mockNotifications)

      const result = await notificationManager.getCriticalNotifications(mockUserId)

      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith({
        where: {
          userId: mockUserId,
          priority: NotificationPriority.CRITICAL,
          read: false,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: expect.any(Date) } }
          ]
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      })
      expect(result).toEqual(mockNotifications)
    })
  })
})