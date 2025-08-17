import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { NotificationManager } from '../notification-manager'
import { prisma } from '@/lib/prisma'
import { io } from '@/lib/socket'

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
  prisma: {
    notification: {
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}))

vi.mock('@/lib/socket', () => ({
  io: {
    to: vi.fn().mockReturnThis(),
    emit: vi.fn(),
  },
}))

describe('NotificationManager', () => {
  let notificationManager: NotificationManager

  beforeEach(() => {
    notificationManager = new NotificationManager()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('create', () => {
    it('should create notification and emit socket event', async () => {
      const mockNotification = {
        userId: 'user123',
        type: 'ACTIVITY' as const,
        title: 'New Activity',
        message: 'A new activity has been logged',
        data: { activityId: 'activity123' },
        read: false,
        priority: 'MEDIUM' as const,
      }

      const mockCreatedNotification = {
        id: 'notification123',
        ...mockNotification,
        createdAt: new Date(),
        expiresAt: null,
      }

      vi.mocked(prisma.notification.create).mockResolvedValue(mockCreatedNotification)

      await notificationManager.create(mockNotification)

      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: mockNotification,
      })

      expect(io.to).toHaveBeenCalledWith(`user:${mockNotification.userId}`)
      expect(io.emit).toHaveBeenCalledWith('notification:new', mockCreatedNotification)
    })

    it('should create notification with expiration date', async () => {
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
      const mockNotification = {
        userId: 'user123',
        type: 'CALENDAR_REMINDER' as const,
        title: 'Meeting Reminder',
        message: 'You have a meeting in 1 hour',
        read: false,
        priority: 'HIGH' as const,
        expiresAt,
      }

      const mockCreatedNotification = {
        id: 'notification123',
        ...mockNotification,
        createdAt: new Date(),
        data: null,
      }

      vi.mocked(prisma.notification.create).mockResolvedValue(mockCreatedNotification)

      await notificationManager.create(mockNotification)

      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: mockNotification,
      })
    })

    it('should handle creation errors', async () => {
      const mockNotification = {
        userId: 'user123',
        type: 'SYSTEM' as const,
        title: 'System Alert',
        message: 'System maintenance scheduled',
        read: false,
        priority: 'CRITICAL' as const,
      }

      vi.mocked(prisma.notification.create).mockRejectedValue(new Error('Database error'))

      await expect(notificationManager.create(mockNotification)).rejects.toThrow('Database error')
    })
  })

  describe('markAsRead', () => {
    it('should mark notification as read and emit socket event', async () => {
      const notificationId = 'notification123'
      const userId = 'user123'

      const mockUpdatedNotification = {
        id: notificationId,
        userId,
        type: 'ACTIVITY',
        title: 'Test Notification',
        message: 'Test message',
        read: true,
        priority: 'MEDIUM',
        createdAt: new Date(),
        expiresAt: null,
        data: null,
      }

      vi.mocked(prisma.notification.update).mockResolvedValue(mockUpdatedNotification)

      await notificationManager.markAsRead(notificationId, userId)

      expect(prisma.notification.update).toHaveBeenCalledWith({
        where: {
          id: notificationId,
          userId: userId,
        },
        data: {
          read: true,
        },
      })

      expect(io.to).toHaveBeenCalledWith(`user:${userId}`)
      expect(io.emit).toHaveBeenCalledWith('notification:read', { notificationId })
    })

    it('should handle update errors', async () => {
      const notificationId = 'notification123'
      const userId = 'user123'

      vi.mocked(prisma.notification.update).mockRejectedValue(new Error('Notification not found'))

      await expect(notificationManager.markAsRead(notificationId, userId)).rejects.toThrow('Notification not found')
    })
  })

  describe('getUnreadCount', () => {
    it('should return unread count for user', async () => {
      const userId = 'user123'
      const expectedCount = 5

      vi.mocked(prisma.notification.count).mockResolvedValue(expectedCount)

      const result = await notificationManager.getUnreadCount(userId)

      expect(prisma.notification.count).toHaveBeenCalledWith({
        where: {
          userId,
          read: false,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: expect.any(Date) } },
          ],
        },
      })

      expect(result).toBe(expectedCount)
    })

    it('should return unread count for specific notification type', async () => {
      const userId = 'user123'
      const type = 'CALENDAR_REMINDER'
      const expectedCount = 2

      vi.mocked(prisma.notification.count).mockResolvedValue(expectedCount)

      const result = await notificationManager.getUnreadCount(userId, type)

      expect(prisma.notification.count).toHaveBeenCalledWith({
        where: {
          userId,
          type,
          read: false,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: expect.any(Date) } },
          ],
        },
      })

      expect(result).toBe(expectedCount)
    })
  })

  describe('getNotifications', () => {
    it('should retrieve notifications with default filters', async () => {
      const userId = 'user123'
      const mockNotifications = [
        {
          id: 'notification1',
          userId,
          type: 'ACTIVITY',
          title: 'Activity Notification',
          message: 'New activity logged',
          read: false,
          priority: 'MEDIUM',
          createdAt: new Date(),
          expiresAt: null,
          data: null,
        },
      ]

      vi.mocked(prisma.notification.findMany).mockResolvedValue(mockNotifications)

      const result = await notificationManager.getNotifications(userId)

      expect(prisma.notification.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: expect.any(Date) } },
          ],
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 50,
        skip: 0,
      })

      expect(result).toEqual(mockNotifications)
    })

    it('should retrieve notifications with custom filters', async () => {
      const userId = 'user123'
      const filters = {
        type: 'INVENTORY_ALERT' as const,
        read: false,
        priority: 'HIGH' as const,
        limit: 10,
        offset: 20,
      }

      const mockNotifications = []
      vi.mocked(prisma.notification.findMany).mockResolvedValue(mockNotifications)

      const result = await notificationManager.getNotifications(userId, filters)

      expect(prisma.notification.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          type: filters.type,
          read: filters.read,
          priority: filters.priority,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: expect.any(Date) } },
          ],
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: filters.limit,
        skip: filters.offset,
      })

      expect(result).toEqual(mockNotifications)
    })
  })

  describe('cleanupExpiredNotifications', () => {
    it('should delete expired notifications', async () => {
      const deletedCount = 10
      vi.mocked(prisma.notification.deleteMany).mockResolvedValue({ count: deletedCount })

      const result = await notificationManager.cleanupExpiredNotifications()

      expect(prisma.notification.deleteMany).toHaveBeenCalledWith({
        where: {
          expiresAt: {
            lt: expect.any(Date),
          },
        },
      })

      expect(result).toBe(deletedCount)
    })
  })
})