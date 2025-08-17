import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NotificationType, NotificationPriority } from '@prisma/client'
import { NotificationManager } from '@/lib/services/notification-manager'
import {
  createNotificationFromTemplate,
  createBulkNotificationsFromTemplate,
  createInventoryAlert,
  createLargeSaleAlert,
  createSystemErrorAlert,
  createCalendarReminder,
  getSidebarNotificationCounts,
  formatNotificationCount,
  getNotificationPriorityColor,
  getNotificationTypeIcon,
  NOTIFICATION_TEMPLATES
} from '../notification-utils'

// Mock NotificationManager
const mockNotificationManager = {
  create: vi.fn(),
  createBulk: vi.fn(),
  getUnreadCount: vi.fn()
} as unknown as NotificationManager

describe('notification-utils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createNotificationFromTemplate', () => {
    it('should create notification from template with context interpolation', async () => {
      const mockCreatedNotification = {
        id: 'notif1',
        userId: 'user1',
        type: NotificationType.INVENTORY_ALERT,
        title: 'Low Stock Alert',
        message: 'Product Test Product is running low (5 remaining)',
        priority: NotificationPriority.HIGH,
        read: false,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        data: {}
      }

      vi.mocked(mockNotificationManager.create).mockResolvedValue(mockCreatedNotification)

      await createNotificationFromTemplate(
        mockNotificationManager,
        'LOW_STOCK',
        'user1',
        {
          productName: 'Test Product',
          currentStock: '5'
        },
        {
          productId: 'prod123'
        }
      )

      expect(mockNotificationManager.create).toHaveBeenCalledWith({
        userId: 'user1',
        type: NotificationType.INVENTORY_ALERT,
        title: 'Low Stock Alert',
        message: 'Product Test Product is running low (5 remaining)',
        priority: NotificationPriority.HIGH,
        data: {
          template: 'LOW_STOCK',
          context: {
            productName: 'Test Product',
            currentStock: '5'
          },
          productId: 'prod123'
        },
        expiresAt: expect.any(Date)
      })
    })

    it('should handle missing context values gracefully', async () => {
      await createNotificationFromTemplate(
        mockNotificationManager,
        'LOW_STOCK',
        'user1',
        {
          productName: 'Test Product'
          // currentStock is missing
        }
      )

      expect(mockNotificationManager.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Product Test Product is running low ({{currentStock}} remaining)'
        })
      )
    })
  })

  describe('createBulkNotificationsFromTemplate', () => {
    it('should create bulk notifications for multiple users', async () => {
      const userIds = ['user1', 'user2', 'user3']
      
      await createBulkNotificationsFromTemplate(
        mockNotificationManager,
        'SYSTEM_MAINTENANCE',
        userIds,
        {
          maintenanceDetails: 'Database upgrade scheduled for 2 AM'
        }
      )

      expect(mockNotificationManager.createBulk).toHaveBeenCalledWith([
        expect.objectContaining({
          userId: 'user1',
          type: NotificationType.SYSTEM,
          title: 'System Maintenance',
          message: 'Scheduled maintenance: Database upgrade scheduled for 2 AM'
        }),
        expect.objectContaining({
          userId: 'user2',
          type: NotificationType.SYSTEM,
          title: 'System Maintenance',
          message: 'Scheduled maintenance: Database upgrade scheduled for 2 AM'
        }),
        expect.objectContaining({
          userId: 'user3',
          type: NotificationType.SYSTEM,
          title: 'System Maintenance',
          message: 'Scheduled maintenance: Database upgrade scheduled for 2 AM'
        })
      ])
    })
  })

  describe('createInventoryAlert', () => {
    it('should create low stock alert when stock is above zero', async () => {
      await createInventoryAlert(
        mockNotificationManager,
        'user1',
        'Test Product',
        5,
        10,
        'prod123'
      )

      expect(mockNotificationManager.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NotificationType.INVENTORY_ALERT,
          title: 'Low Stock Alert',
          message: 'Product Test Product is running low (5 remaining)',
          priority: NotificationPriority.HIGH,
          data: expect.objectContaining({
            template: 'LOW_STOCK',
            productId: 'prod123',
            stockLevel: 5,
            thresholdLevel: 10
          })
        })
      )
    })

    it('should create out of stock alert when stock is zero', async () => {
      await createInventoryAlert(
        mockNotificationManager,
        'user1',
        'Test Product',
        0,
        10,
        'prod123'
      )

      expect(mockNotificationManager.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NotificationType.INVENTORY_ALERT,
          title: 'Out of Stock',
          message: 'Product Test Product is out of stock',
          priority: NotificationPriority.CRITICAL,
          data: expect.objectContaining({
            template: 'OUT_OF_STOCK'
          })
        })
      )
    })
  })

  describe('createLargeSaleAlert', () => {
    it('should create large sale notification', async () => {
      await createLargeSaleAlert(
        mockNotificationManager,
        'user1',
        'SALE-001',
        'R 15,000.00',
        'John Doe',
        'sale123'
      )

      expect(mockNotificationManager.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NotificationType.ACTIVITY,
          title: 'Large Sale Transaction',
          message: 'Sale #SALE-001 for R 15,000.00 has been processed',
          priority: NotificationPriority.HIGH,
          data: expect.objectContaining({
            template: 'LARGE_SALE',
            saleId: 'sale123',
            transactionType: 'sale'
          })
        })
      )
    })
  })

  describe('createSystemErrorAlert', () => {
    it('should create system error notification', async () => {
      await createSystemErrorAlert(
        mockNotificationManager,
        'admin1',
        'Database connection failed',
        'DB_CONN_001',
        { server: 'primary', attempts: 3 }
      )

      expect(mockNotificationManager.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NotificationType.SYSTEM,
          title: 'System Error',
          message: 'Critical system error: Database connection failed',
          priority: NotificationPriority.CRITICAL,
          data: expect.objectContaining({
            template: 'SYSTEM_ERROR',
            errorDetails: { server: 'primary', attempts: 3 },
            severity: 'critical'
          })
        })
      )
    })
  })

  describe('createCalendarReminder', () => {
    it('should create calendar reminder notification', async () => {
      await createCalendarReminder(
        mockNotificationManager,
        'user1',
        'Team Meeting',
        '2024-01-15 10:00 AM',
        '30 minutes',
        'event123'
      )

      expect(mockNotificationManager.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NotificationType.CALENDAR_REMINDER,
          title: 'Event Reminder',
          message: 'Don\'t forget: Team Meeting at 2024-01-15 10:00 AM',
          priority: NotificationPriority.HIGH,
          data: expect.objectContaining({
            template: 'EVENT_REMINDER',
            eventId: 'event123',
            reminderType: 'calendar'
          })
        })
      )
    })
  })

  describe('getSidebarNotificationCounts', () => {
    it('should return notification counts for sidebar', async () => {
      vi.mocked(mockNotificationManager.getUnreadCount)
        .mockResolvedValueOnce(3) // calendar
        .mockResolvedValueOnce(5) // messages
        .mockResolvedValueOnce(2) // notice board
        .mockResolvedValueOnce(15) // total

      const counts = await getSidebarNotificationCounts(mockNotificationManager, 'user1')

      expect(counts).toEqual({
        calendar: 3,
        messages: 5,
        noticeBoard: 2,
        total: 15
      })

      expect(mockNotificationManager.getUnreadCount).toHaveBeenCalledTimes(4)
      expect(mockNotificationManager.getUnreadCount).toHaveBeenCalledWith('user1', NotificationType.CALENDAR_REMINDER)
      expect(mockNotificationManager.getUnreadCount).toHaveBeenCalledWith('user1', NotificationType.MESSAGE)
      expect(mockNotificationManager.getUnreadCount).toHaveBeenCalledWith('user1', NotificationType.NOTICE_BOARD)
      expect(mockNotificationManager.getUnreadCount).toHaveBeenCalledWith('user1')
    })
  })

  describe('formatNotificationCount', () => {
    it('should return empty string for zero count', () => {
      expect(formatNotificationCount(0)).toBe('')
    })

    it('should return count as string for counts 1-99', () => {
      expect(formatNotificationCount(1)).toBe('1')
      expect(formatNotificationCount(50)).toBe('50')
      expect(formatNotificationCount(99)).toBe('99')
    })

    it('should return "99+" for counts over 99', () => {
      expect(formatNotificationCount(100)).toBe('99+')
      expect(formatNotificationCount(500)).toBe('99+')
    })
  })

  describe('getNotificationPriorityColor', () => {
    it('should return correct colors for each priority', () => {
      expect(getNotificationPriorityColor(NotificationPriority.CRITICAL))
        .toBe('text-red-600 bg-red-50 border-red-200')
      
      expect(getNotificationPriorityColor(NotificationPriority.HIGH))
        .toBe('text-orange-600 bg-orange-50 border-orange-200')
      
      expect(getNotificationPriorityColor(NotificationPriority.MEDIUM))
        .toBe('text-blue-600 bg-blue-50 border-blue-200')
      
      expect(getNotificationPriorityColor(NotificationPriority.LOW))
        .toBe('text-gray-600 bg-gray-50 border-gray-200')
    })
  })

  describe('getNotificationTypeIcon', () => {
    it('should return correct icons for each notification type', () => {
      expect(getNotificationTypeIcon(NotificationType.ACTIVITY)).toBe('activity')
      expect(getNotificationTypeIcon(NotificationType.INVENTORY_ALERT)).toBe('package')
      expect(getNotificationTypeIcon(NotificationType.SYSTEM)).toBe('settings')
      expect(getNotificationTypeIcon(NotificationType.CALENDAR_REMINDER)).toBe('calendar')
      expect(getNotificationTypeIcon(NotificationType.MESSAGE)).toBe('message-circle')
      expect(getNotificationTypeIcon(NotificationType.NOTICE_BOARD)).toBe('clipboard')
    })
  })

  describe('NOTIFICATION_TEMPLATES', () => {
    it('should have all required template properties', () => {
      Object.entries(NOTIFICATION_TEMPLATES).forEach(([key, template]) => {
        expect(template).toHaveProperty('type')
        expect(template).toHaveProperty('priority')
        expect(template).toHaveProperty('titleTemplate')
        expect(template).toHaveProperty('messageTemplate')
        expect(Object.values(NotificationType)).toContain(template.type)
        expect(Object.values(NotificationPriority)).toContain(template.priority)
      })
    })

    it('should have templates for all major notification scenarios', () => {
      // Inventory templates
      expect(NOTIFICATION_TEMPLATES).toHaveProperty('LOW_STOCK')
      expect(NOTIFICATION_TEMPLATES).toHaveProperty('OUT_OF_STOCK')
      expect(NOTIFICATION_TEMPLATES).toHaveProperty('STOCK_ADJUSTMENT')

      // Activity templates
      expect(NOTIFICATION_TEMPLATES).toHaveProperty('LARGE_SALE')
      expect(NOTIFICATION_TEMPLATES).toHaveProperty('INVOICE_CREATED')
      expect(NOTIFICATION_TEMPLATES).toHaveProperty('PAYMENT_RECEIVED')

      // System templates
      expect(NOTIFICATION_TEMPLATES).toHaveProperty('SYSTEM_MAINTENANCE')
      expect(NOTIFICATION_TEMPLATES).toHaveProperty('BACKUP_COMPLETED')
      expect(NOTIFICATION_TEMPLATES).toHaveProperty('SYSTEM_ERROR')

      // Calendar templates
      expect(NOTIFICATION_TEMPLATES).toHaveProperty('UPCOMING_EVENT')
      expect(NOTIFICATION_TEMPLATES).toHaveProperty('EVENT_REMINDER')

      // Message templates
      expect(NOTIFICATION_TEMPLATES).toHaveProperty('NEW_MESSAGE')
      expect(NOTIFICATION_TEMPLATES).toHaveProperty('URGENT_MESSAGE')

      // Notice board templates
      expect(NOTIFICATION_TEMPLATES).toHaveProperty('NEW_NOTICE')
      expect(NOTIFICATION_TEMPLATES).toHaveProperty('IMPORTANT_NOTICE')
    })
  })
})