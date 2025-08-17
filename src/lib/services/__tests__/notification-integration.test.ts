import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { PrismaClient, NotificationType, NotificationPriority } from '@prisma/client'
import { NotificationManager } from '../notification-manager'

// Mock Prisma Client for integration testing
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

describe('NotificationManager Integration', () => {
  let notificationManager: NotificationManager
  const mockUserId = '507f1f77bcf86cd799439011'

  beforeEach(() => {
    notificationManager = new NotificationManager(mockPrisma)
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('should handle complete notification lifecycle', async () => {
    // Mock notification creation
    const mockNotification = {
      id: 'notif1',
      userId: mockUserId,
      type: NotificationType.INVENTORY_ALERT,
      title: 'Low Stock Alert',
      message: 'Product XYZ is running low on stock',
      priority: NotificationPriority.HIGH,
      data: { productId: 'prod123', currentStock: 5 },
      read: false,
      createdAt: new Date(),
      expiresAt: null
    }

    vi.mocked(mockPrisma.notification.create).mockResolvedValue(mockNotification)

    // 1. Create notification
    const createdNotification = await notificationManager.create({
      userId: mockUserId,
      type: NotificationType.INVENTORY_ALERT,
      title: 'Low Stock Alert',
      message: 'Product XYZ is running low on stock',
      priority: NotificationPriority.HIGH,
      data: { productId: 'prod123', currentStock: 5 }
    })

    expect(createdNotification).toEqual(mockNotification)
    expect(mockPrisma.notification.create).toHaveBeenCalledWith({
      data: {
        userId: mockUserId,
        type: NotificationType.INVENTORY_ALERT,
        title: 'Low Stock Alert',
        message: 'Product XYZ is running low on stock',
        priority: NotificationPriority.HIGH,
        data: { productId: 'prod123', currentStock: 5 },
        expiresAt: undefined,
        read: false
      }
    })

    // 2. Get unread count
    vi.mocked(mockPrisma.notification.count).mockResolvedValue(1)
    
    const unreadCount = await notificationManager.getUnreadCount(mockUserId)
    expect(unreadCount).toBe(1)

    // 3. Get notifications
    vi.mocked(mockPrisma.notification.findMany).mockResolvedValue([mockNotification])
    
    const notifications = await notificationManager.getNotifications(mockUserId, {
      type: NotificationType.INVENTORY_ALERT,
      read: false
    })
    
    expect(notifications).toHaveLength(1)
    expect(notifications[0]).toEqual(mockNotification)

    // 4. Mark as read
    vi.mocked(mockPrisma.notification.updateMany).mockResolvedValue({ count: 1 })
    
    const markReadResult = await notificationManager.markAsRead('notif1', mockUserId)
    expect(markReadResult).toBe(true)

    // 5. Verify count updated
    vi.mocked(mockPrisma.notification.count).mockResolvedValue(0)
    
    const updatedCount = await notificationManager.getUnreadCount(mockUserId)
    expect(updatedCount).toBe(0)
  })

  it('should handle bulk operations efficiently', async () => {
    const bulkNotifications = [
      {
        userId: mockUserId,
        type: NotificationType.SYSTEM,
        title: 'System Maintenance',
        message: 'Scheduled maintenance at 2 AM',
        priority: NotificationPriority.MEDIUM
      },
      {
        userId: mockUserId,
        type: NotificationType.ACTIVITY,
        title: 'New Sale',
        message: 'Sale #12345 has been created',
        priority: NotificationPriority.LOW
      },
      {
        userId: mockUserId,
        type: NotificationType.INVENTORY_ALERT,
        title: 'Stock Alert',
        message: 'Multiple products need restocking',
        priority: NotificationPriority.HIGH
      }
    ]

    // Mock bulk creation
    vi.mocked(mockPrisma.notification.createMany).mockResolvedValue({ count: 3 })
    vi.mocked(mockPrisma.notification.findMany).mockResolvedValue(
      bulkNotifications.map((n, i) => ({
        id: `notif${i + 1}`,
        ...n,
        data: {},
        read: false,
        createdAt: new Date(),
        expiresAt: null
      }))
    )

    const createdNotifications = await notificationManager.createBulk(bulkNotifications)
    
    expect(createdNotifications).toHaveLength(3)
    expect(mockPrisma.notification.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          type: NotificationType.SYSTEM,
          title: 'System Maintenance'
        }),
        expect.objectContaining({
          type: NotificationType.ACTIVITY,
          title: 'New Sale'
        }),
        expect.objectContaining({
          type: NotificationType.INVENTORY_ALERT,
          title: 'Stock Alert'
        })
      ])
    })

    // Mock bulk mark as read
    vi.mocked(mockPrisma.notification.updateMany).mockResolvedValue({ count: 3 })
    
    const markedCount = await notificationManager.markAllAsRead(mockUserId)
    expect(markedCount).toBe(3)
  })

  it('should handle notification filtering and priority correctly', async () => {
    const mockNotifications = [
      {
        id: 'critical1',
        userId: mockUserId,
        type: NotificationType.SYSTEM,
        title: 'Critical System Error',
        message: 'Database connection lost',
        priority: NotificationPriority.CRITICAL,
        data: {},
        read: false,
        createdAt: new Date(),
        expiresAt: null
      },
      {
        id: 'high1',
        userId: mockUserId,
        type: NotificationType.INVENTORY_ALERT,
        title: 'Stock Alert',
        message: 'Critical stock levels',
        priority: NotificationPriority.HIGH,
        data: {},
        read: false,
        createdAt: new Date(),
        expiresAt: null
      }
    ]

    // Test critical notifications
    vi.mocked(mockPrisma.notification.findMany).mockResolvedValue([mockNotifications[0]])
    
    const criticalNotifications = await notificationManager.getCriticalNotifications(mockUserId)
    
    expect(criticalNotifications).toHaveLength(1)
    expect(criticalNotifications[0].priority).toBe(NotificationPriority.CRITICAL)
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

    // Test high priority notifications
    vi.mocked(mockPrisma.notification.findMany).mockResolvedValue([mockNotifications[1]])
    
    const highPriorityNotifications = await notificationManager.getNotificationsByPriority(
      mockUserId,
      NotificationPriority.HIGH,
      5
    )
    
    expect(highPriorityNotifications).toHaveLength(1)
    expect(highPriorityNotifications[0].priority).toBe(NotificationPriority.HIGH)
  })

  it('should handle notification statistics correctly', async () => {
    const mockNotifications = [
      { type: NotificationType.ACTIVITY, priority: NotificationPriority.LOW, read: false },
      { type: NotificationType.ACTIVITY, priority: NotificationPriority.MEDIUM, read: true },
      { type: NotificationType.SYSTEM, priority: NotificationPriority.HIGH, read: false },
      { type: NotificationType.INVENTORY_ALERT, priority: NotificationPriority.CRITICAL, read: false }
    ]

    vi.mocked(mockPrisma.notification.findMany).mockResolvedValue(mockNotifications)

    const stats = await notificationManager.getNotificationStats(mockUserId)

    expect(stats.total).toBe(4)
    expect(stats.unread).toBe(3)
    expect(stats.byType[NotificationType.ACTIVITY]).toBe(2)
    expect(stats.byType[NotificationType.SYSTEM]).toBe(1)
    expect(stats.byType[NotificationType.INVENTORY_ALERT]).toBe(1)
    expect(stats.byPriority[NotificationPriority.LOW]).toBe(1)
    expect(stats.byPriority[NotificationPriority.MEDIUM]).toBe(1)
    expect(stats.byPriority[NotificationPriority.HIGH]).toBe(1)
    expect(stats.byPriority[NotificationPriority.CRITICAL]).toBe(1)
  })

  it('should handle expired notification cleanup', async () => {
    vi.mocked(mockPrisma.notification.deleteMany).mockResolvedValue({ count: 10 })

    const deletedCount = await notificationManager.cleanupExpiredNotifications()

    expect(deletedCount).toBe(10)
    expect(mockPrisma.notification.deleteMany).toHaveBeenCalledWith({
      where: {
        expiresAt: {
          lt: expect.any(Date)
        }
      }
    })
  })
})