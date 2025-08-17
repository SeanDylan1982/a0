import { NotificationType, NotificationPriority } from '@prisma/client'
import { NotificationManager, CreateNotificationData } from '@/lib/services/notification-manager'

export interface NotificationTemplate {
  type: NotificationType
  priority: NotificationPriority
  titleTemplate: string
  messageTemplate: string
  expiresInHours?: number
}

export interface NotificationContext {
  [key: string]: any
}

// Predefined notification templates
export const NOTIFICATION_TEMPLATES = {
  // Inventory notifications
  LOW_STOCK: {
    type: NotificationType.INVENTORY_ALERT,
    priority: NotificationPriority.HIGH,
    titleTemplate: 'Low Stock Alert',
    messageTemplate: 'Product {{productName}} is running low ({{currentStock}} remaining)',
    expiresInHours: 24
  },
  OUT_OF_STOCK: {
    type: NotificationType.INVENTORY_ALERT,
    priority: NotificationPriority.CRITICAL,
    titleTemplate: 'Out of Stock',
    messageTemplate: 'Product {{productName}} is out of stock',
    expiresInHours: 48
  },
  STOCK_ADJUSTMENT: {
    type: NotificationType.ACTIVITY,
    priority: NotificationPriority.MEDIUM,
    titleTemplate: 'Stock Adjustment',
    messageTemplate: 'Stock adjusted for {{productName}}: {{reason}}',
    expiresInHours: 72
  },

  // Activity notifications
  LARGE_SALE: {
    type: NotificationType.ACTIVITY,
    priority: NotificationPriority.HIGH,
    titleTemplate: 'Large Sale Transaction',
    messageTemplate: 'Sale #{{saleNumber}} for {{amount}} has been processed',
    expiresInHours: 48
  },
  INVOICE_CREATED: {
    type: NotificationType.ACTIVITY,
    priority: NotificationPriority.LOW,
    titleTemplate: 'Invoice Created',
    messageTemplate: 'Invoice #{{invoiceNumber}} has been created for {{customerName}}',
    expiresInHours: 168 // 1 week
  },
  PAYMENT_RECEIVED: {
    type: NotificationType.ACTIVITY,
    priority: NotificationPriority.MEDIUM,
    titleTemplate: 'Payment Received',
    messageTemplate: 'Payment of {{amount}} received for Invoice #{{invoiceNumber}}',
    expiresInHours: 72
  },

  // System notifications
  SYSTEM_MAINTENANCE: {
    type: NotificationType.SYSTEM,
    priority: NotificationPriority.HIGH,
    titleTemplate: 'System Maintenance',
    messageTemplate: 'Scheduled maintenance: {{maintenanceDetails}}',
    expiresInHours: 12
  },
  BACKUP_COMPLETED: {
    type: NotificationType.SYSTEM,
    priority: NotificationPriority.LOW,
    titleTemplate: 'Backup Completed',
    messageTemplate: 'System backup completed successfully at {{timestamp}}',
    expiresInHours: 24
  },
  SYSTEM_ERROR: {
    type: NotificationType.SYSTEM,
    priority: NotificationPriority.CRITICAL,
    titleTemplate: 'System Error',
    messageTemplate: 'Critical system error: {{errorMessage}}',
    expiresInHours: 1
  },

  // Calendar notifications
  UPCOMING_EVENT: {
    type: NotificationType.CALENDAR_REMINDER,
    priority: NotificationPriority.MEDIUM,
    titleTemplate: 'Upcoming Event',
    messageTemplate: 'Event "{{eventTitle}}" starts in {{timeUntil}}',
    expiresInHours: 1
  },
  EVENT_REMINDER: {
    type: NotificationType.CALENDAR_REMINDER,
    priority: NotificationPriority.HIGH,
    titleTemplate: 'Event Reminder',
    messageTemplate: 'Don\'t forget: {{eventTitle}} at {{eventTime}}',
    expiresInHours: 2
  },

  // Message notifications
  NEW_MESSAGE: {
    type: NotificationType.MESSAGE,
    priority: NotificationPriority.MEDIUM,
    titleTemplate: 'New Message',
    messageTemplate: 'New message from {{senderName}}: {{messagePreview}}',
    expiresInHours: 72
  },
  URGENT_MESSAGE: {
    type: NotificationType.MESSAGE,
    priority: NotificationPriority.HIGH,
    titleTemplate: 'Urgent Message',
    messageTemplate: 'Urgent message from {{senderName}}: {{messagePreview}}',
    expiresInHours: 24
  },

  // Notice board notifications
  NEW_NOTICE: {
    type: NotificationType.NOTICE_BOARD,
    priority: NotificationPriority.MEDIUM,
    titleTemplate: 'New Notice',
    messageTemplate: 'New notice posted: {{noticeTitle}}',
    expiresInHours: 168 // 1 week
  },
  IMPORTANT_NOTICE: {
    type: NotificationType.NOTICE_BOARD,
    priority: NotificationPriority.HIGH,
    titleTemplate: 'Important Notice',
    messageTemplate: 'Important notice: {{noticeTitle}}',
    expiresInHours: 72
  }
} as const

export type NotificationTemplateKey = keyof typeof NOTIFICATION_TEMPLATES

/**
 * Replace template placeholders with actual values
 */
function interpolateTemplate(template: string, context: NotificationContext): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return context[key]?.toString() || match
  })
}

/**
 * Create a notification from a template
 */
export async function createNotificationFromTemplate(
  notificationManager: NotificationManager,
  templateKey: NotificationTemplateKey,
  userId: string,
  context: NotificationContext,
  additionalData?: Record<string, any>
): Promise<void> {
  const template = NOTIFICATION_TEMPLATES[templateKey]
  
  const title = interpolateTemplate(template.titleTemplate, context)
  const message = interpolateTemplate(template.messageTemplate, context)
  
  const expiresAt = template.expiresInHours 
    ? new Date(Date.now() + template.expiresInHours * 60 * 60 * 1000)
    : undefined

  const notificationData: CreateNotificationData = {
    userId,
    type: template.type,
    title,
    message,
    priority: template.priority,
    data: {
      template: templateKey,
      context,
      ...additionalData
    },
    expiresAt
  }

  await notificationManager.create(notificationData)
}

/**
 * Create bulk notifications from templates
 */
export async function createBulkNotificationsFromTemplate(
  notificationManager: NotificationManager,
  templateKey: NotificationTemplateKey,
  userIds: string[],
  context: NotificationContext,
  additionalData?: Record<string, any>
): Promise<void> {
  const template = NOTIFICATION_TEMPLATES[templateKey]
  
  const title = interpolateTemplate(template.titleTemplate, context)
  const message = interpolateTemplate(template.messageTemplate, context)
  
  const expiresAt = template.expiresInHours 
    ? new Date(Date.now() + template.expiresInHours * 60 * 60 * 1000)
    : undefined

  const notifications: CreateNotificationData[] = userIds.map(userId => ({
    userId,
    type: template.type,
    title,
    message,
    priority: template.priority,
    data: {
      template: templateKey,
      context,
      ...additionalData
    },
    expiresAt
  }))

  await notificationManager.createBulk(notifications)
}

/**
 * Create notification for inventory alerts
 */
export async function createInventoryAlert(
  notificationManager: NotificationManager,
  userId: string,
  productName: string,
  currentStock: number,
  threshold: number,
  productId: string
): Promise<void> {
  const templateKey = currentStock === 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK'
  
  await createNotificationFromTemplate(
    notificationManager,
    templateKey,
    userId,
    {
      productName,
      currentStock: currentStock.toString(),
      threshold: threshold.toString()
    },
    {
      productId,
      stockLevel: currentStock,
      thresholdLevel: threshold
    }
  )
}

/**
 * Create notification for large sales
 */
export async function createLargeSaleAlert(
  notificationManager: NotificationManager,
  userId: string,
  saleNumber: string,
  amount: string,
  customerName: string,
  saleId: string
): Promise<void> {
  await createNotificationFromTemplate(
    notificationManager,
    'LARGE_SALE',
    userId,
    {
      saleNumber,
      amount,
      customerName
    },
    {
      saleId,
      transactionType: 'sale'
    }
  )
}

/**
 * Create system error notification
 */
export async function createSystemErrorAlert(
  notificationManager: NotificationManager,
  userId: string,
  errorMessage: string,
  errorCode?: string,
  additionalContext?: Record<string, any>
): Promise<void> {
  await createNotificationFromTemplate(
    notificationManager,
    'SYSTEM_ERROR',
    userId,
    {
      errorMessage,
      errorCode: errorCode || 'UNKNOWN',
      timestamp: new Date().toISOString()
    },
    {
      errorDetails: additionalContext,
      severity: 'critical'
    }
  )
}

/**
 * Create calendar reminder notification
 */
export async function createCalendarReminder(
  notificationManager: NotificationManager,
  userId: string,
  eventTitle: string,
  eventTime: string,
  timeUntil: string,
  eventId: string
): Promise<void> {
  await createNotificationFromTemplate(
    notificationManager,
    'EVENT_REMINDER',
    userId,
    {
      eventTitle,
      eventTime,
      timeUntil
    },
    {
      eventId,
      reminderType: 'calendar'
    }
  )
}

/**
 * Get notification count by type for sidebar indicators
 */
export async function getSidebarNotificationCounts(
  notificationManager: NotificationManager,
  userId: string
): Promise<{
  calendar: number
  messages: number
  noticeBoard: number
  total: number
}> {
  const [calendar, messages, noticeBoard, total] = await Promise.all([
    notificationManager.getUnreadCount(userId, NotificationType.CALENDAR_REMINDER),
    notificationManager.getUnreadCount(userId, NotificationType.MESSAGE),
    notificationManager.getUnreadCount(userId, NotificationType.NOTICE_BOARD),
    notificationManager.getUnreadCount(userId)
  ])

  return {
    calendar,
    messages,
    noticeBoard,
    total
  }
}

/**
 * Format notification count for display (99+ for large numbers)
 */
export function formatNotificationCount(count: number): string {
  if (count === 0) return ''
  if (count > 99) return '99+'
  return count.toString()
}

/**
 * Get priority color for UI display
 */
export function getNotificationPriorityColor(priority: NotificationPriority): string {
  switch (priority) {
    case NotificationPriority.CRITICAL:
      return 'text-red-600 bg-red-50 border-red-200'
    case NotificationPriority.HIGH:
      return 'text-orange-600 bg-orange-50 border-orange-200'
    case NotificationPriority.MEDIUM:
      return 'text-blue-600 bg-blue-50 border-blue-200'
    case NotificationPriority.LOW:
      return 'text-gray-600 bg-gray-50 border-gray-200'
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200'
  }
}

/**
 * Get notification type icon
 */
export function getNotificationTypeIcon(type: NotificationType): string {
  switch (type) {
    case NotificationType.ACTIVITY:
      return 'activity'
    case NotificationType.INVENTORY_ALERT:
      return 'package'
    case NotificationType.SYSTEM:
      return 'settings'
    case NotificationType.CALENDAR_REMINDER:
      return 'calendar'
    case NotificationType.MESSAGE:
      return 'message-circle'
    case NotificationType.NOTICE_BOARD:
      return 'clipboard'
    default:
      return 'bell'
  }
}