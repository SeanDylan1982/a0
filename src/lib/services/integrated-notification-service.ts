import { NotificationManager } from './notification-manager'
import { ActivityLogger } from './activity-logger'
import { InventoryPool } from './inventory-pool'
import { AccessControlManager } from './access-control-manager'
import { 
  createNotificationFromTemplate,
  createBulkNotificationsFromTemplate,
  createInventoryAlert,
  createLargeSaleAlert,
  createSystemErrorAlert,
  createCalendarReminder,
  NotificationTemplateKey
} from '@/lib/utils/notification-utils'
import { NotificationType, NotificationPriority, UserRole } from '@prisma/client'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export interface NotificationContext {
  [key: string]: any
}

export interface BulkNotificationRequest {
  templateKey: NotificationTemplateKey
  context: NotificationContext
  targetRoles?: UserRole[]
  targetUserIds?: string[]
  moduleFilter?: string
  additionalData?: Record<string, any>
}

export class IntegratedNotificationService {
  private notificationManager: NotificationManager
  private accessControl: AccessControlManager

  constructor() {
    this.notificationManager = new NotificationManager()
    this.accessControl = new AccessControlManager()
  }

  /**
   * Send notification and log activity
   */
  async sendNotificationWithActivity(
    userId: string,
    templateKey: NotificationTemplateKey,
    context: NotificationContext,
    activityData: {
      module: string
      action: string
      entityType: string
      entityId: string
      entityName: string
      details?: Record<string, any>
      ipAddress?: string
      userAgent?: string
    },
    additionalData?: Record<string, any>
  ): Promise<void> {
    try {
      // Create notification
      await createNotificationFromTemplate(
        this.notificationManager,
        templateKey,
        userId,
        context,
        additionalData
      )

      // Log activity
      await ActivityLogger.log({
        userId: activityData.userId || userId,
        module: activityData.module,
        action: activityData.action,
        entityType: activityData.entityType,
        entityId: activityData.entityId,
        entityName: activityData.entityName,
        details: {
          ...activityData.details,
          notificationSent: true,
          notificationTemplate: templateKey
        },
        ipAddress: activityData.ipAddress,
        userAgent: activityData.userAgent
      })
    } catch (error) {
      console.error('Failed to send notification with activity:', error)
      // Still log the activity even if notification fails
      await ActivityLogger.log(activityData)
    }
  }

  /**
   * Send bulk notifications to users based on roles or specific user IDs
   */
  async sendBulkNotification(request: BulkNotificationRequest): Promise<void> {
    const { templateKey, context, targetRoles, targetUserIds, moduleFilter, additionalData } = request

    let userIds: string[] = []

    // Get users by roles if specified
    if (targetRoles && targetRoles.length > 0) {
      const users = await prisma.user.findMany({
        where: {
          role: { in: targetRoles },
          ...(moduleFilter && { 
            // Add module-specific filtering logic here if needed
          })
        },
        select: { id: true }
      })
      userIds.push(...users.map(u => u.id))
    }

    // Add specific user IDs if provided
    if (targetUserIds && targetUserIds.length > 0) {
      userIds.push(...targetUserIds)
    }

    // Remove duplicates
    userIds = [...new Set(userIds)]

    if (userIds.length === 0) {
      console.warn('No target users found for bulk notification')
      return
    }

    // Send bulk notifications
    await createBulkNotificationsFromTemplate(
      this.notificationManager,
      templateKey,
      userIds,
      context,
      additionalData
    )
  }

  /**
   * Handle inventory-related notifications
   */
  async handleInventoryNotification(
    productId: string,
    productName: string,
    currentStock: number,
    threshold: number,
    userId: string,
    activityContext?: {
      action: string
      reason?: string
      ipAddress?: string
      userAgent?: string
    }
  ): Promise<void> {
    // Create inventory alert notification
    await createInventoryAlert(
      this.notificationManager,
      userId,
      productName,
      currentStock,
      threshold,
      productId
    )

    // Notify inventory managers and directors
    const inventoryManagers = await prisma.user.findMany({
      where: {
        role: { in: [UserRole.INVENTORY_MANAGER, UserRole.DIRECTOR, UserRole.MANAGER] }
      },
      select: { id: true }
    })

    if (inventoryManagers.length > 0) {
      const templateKey = currentStock === 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK'
      await createBulkNotificationsFromTemplate(
        this.notificationManager,
        templateKey,
        inventoryManagers.map(u => u.id),
        {
          productName,
          currentStock: currentStock.toString(),
          threshold: threshold.toString()
        },
        {
          productId,
          stockLevel: currentStock,
          thresholdLevel: threshold,
          alertType: 'inventory_management'
        }
      )
    }

    // Log activity if context provided
    if (activityContext) {
      await ActivityLogger.log({
        userId,
        module: 'inventory',
        action: activityContext.action,
        entityType: 'product',
        entityId: productId,
        entityName: productName,
        details: {
          currentStock,
          threshold,
          reason: activityContext.reason,
          notificationSent: true
        },
        ipAddress: activityContext.ipAddress,
        userAgent: activityContext.userAgent
      })
    }
  }

  /**
   * Handle sales-related notifications
   */
  async handleSalesNotification(
    saleData: {
      saleId: string
      saleNumber: string
      amount: number
      customerName: string
      userId: string
      items?: Array<{ productId: string; quantity: number }>
    },
    activityContext?: {
      ipAddress?: string
      userAgent?: string
    }
  ): Promise<void> {
    const { saleId, saleNumber, amount, customerName, userId, items } = saleData

    // Check if it's a large sale (configurable threshold)
    const LARGE_SALE_THRESHOLD = 10000 // R10,000
    
    if (amount >= LARGE_SALE_THRESHOLD) {
      // Notify sales managers and directors
      const salesManagers = await prisma.user.findMany({
        where: {
          role: { in: [UserRole.DIRECTOR, UserRole.MANAGER, UserRole.SALES_REP] }
        },
        select: { id: true }
      })

      if (salesManagers.length > 0) {
        await createBulkNotificationsFromTemplate(
          this.notificationManager,
          'LARGE_SALE',
          salesManagers.map(u => u.id),
          {
            saleNumber,
            amount: `R ${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
            customerName
          },
          {
            saleId,
            transactionType: 'sale',
            isLargeSale: true
          }
        )
      }
    }

    // Update inventory and check for stock alerts
    if (items && items.length > 0) {
      for (const item of items) {
        try {
          // Record stock movement
          await InventoryPool.recordMovement({
            productId: item.productId,
            type: 'SALE',
            quantity: item.quantity,
            reason: `Sale ${saleNumber}`,
            reference: saleNumber,
            userId
          })

          // Check if stock levels trigger alerts
          const product = await prisma.product.findUnique({
            where: { id: item.productId },
            select: { name: true, quantity: true, minStockLevel: true }
          })

          if (product && product.minStockLevel && product.quantity <= product.minStockLevel) {
            await this.handleInventoryNotification(
              item.productId,
              product.name,
              product.quantity,
              product.minStockLevel,
              userId,
              {
                action: 'stock_alert_triggered',
                reason: `Stock low after sale ${saleNumber}`,
                ipAddress: activityContext?.ipAddress,
                userAgent: activityContext?.userAgent
              }
            )
          }
        } catch (error) {
          console.error(`Failed to process inventory for product ${item.productId}:`, error)
        }
      }
    }

    // Log sales activity
    await ActivityLogger.log({
      userId,
      module: 'sales',
      action: 'sale_completed',
      entityType: 'sale',
      entityId: saleId,
      entityName: `Sale ${saleNumber}`,
      details: {
        amount,
        customerName,
        itemCount: items?.length || 0,
        isLargeSale: amount >= LARGE_SALE_THRESHOLD,
        notificationSent: amount >= LARGE_SALE_THRESHOLD
      },
      ipAddress: activityContext?.ipAddress,
      userAgent: activityContext?.userAgent
    })
  }

  /**
   * Handle invoice-related notifications
   */
  async handleInvoiceNotification(
    invoiceData: {
      invoiceId: string
      invoiceNumber: string
      customerName: string
      amount: number
      dueDate: Date
      userId: string
    },
    activityContext?: {
      ipAddress?: string
      userAgent?: string
    }
  ): Promise<void> {
    const { invoiceId, invoiceNumber, customerName, amount, dueDate, userId } = invoiceData

    // Notify accounting staff
    const accountingStaff = await prisma.user.findMany({
      where: {
        role: { in: [UserRole.ACCOUNTANT, UserRole.DIRECTOR, UserRole.MANAGER] }
      },
      select: { id: true }
    })

    if (accountingStaff.length > 0) {
      await createBulkNotificationsFromTemplate(
        this.notificationManager,
        'INVOICE_CREATED',
        accountingStaff.map(u => u.id),
        {
          invoiceNumber,
          customerName,
          amount: `R ${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
          dueDate: dueDate.toLocaleDateString('en-ZA')
        },
        {
          invoiceId,
          transactionType: 'invoice',
          dueDate: dueDate.toISOString()
        }
      )
    }

    // Log invoice activity
    await ActivityLogger.log({
      userId,
      module: 'invoicing',
      action: 'invoice_created',
      entityType: 'invoice',
      entityId: invoiceId,
      entityName: `Invoice ${invoiceNumber}`,
      details: {
        customerName,
        amount,
        dueDate: dueDate.toISOString(),
        notificationSent: true
      },
      ipAddress: activityContext?.ipAddress,
      userAgent: activityContext?.userAgent
    })
  }

  /**
   * Handle payment-related notifications
   */
  async handlePaymentNotification(
    paymentData: {
      paymentId: string
      invoiceNumber: string
      amount: number
      paymentMethod: string
      userId: string
    },
    activityContext?: {
      ipAddress?: string
      userAgent?: string
    }
  ): Promise<void> {
    const { paymentId, invoiceNumber, amount, paymentMethod, userId } = paymentData

    // Notify accounting staff and sales team
    const relevantStaff = await prisma.user.findMany({
      where: {
        role: { in: [UserRole.ACCOUNTANT, UserRole.SALES_REP, UserRole.DIRECTOR, UserRole.MANAGER] }
      },
      select: { id: true }
    })

    if (relevantStaff.length > 0) {
      await createBulkNotificationsFromTemplate(
        this.notificationManager,
        'PAYMENT_RECEIVED',
        relevantStaff.map(u => u.id),
        {
          amount: `R ${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
          invoiceNumber,
          paymentMethod
        },
        {
          paymentId,
          transactionType: 'payment',
          paymentMethod
        }
      )
    }

    // Log payment activity
    await ActivityLogger.log({
      userId,
      module: 'accounting',
      action: 'payment_received',
      entityType: 'payment',
      entityId: paymentId,
      entityName: `Payment for Invoice ${invoiceNumber}`,
      details: {
        amount,
        paymentMethod,
        invoiceNumber,
        notificationSent: true
      },
      ipAddress: activityContext?.ipAddress,
      userAgent: activityContext?.userAgent
    })
  }

  /**
   * Handle system-related notifications
   */
  async handleSystemNotification(
    notificationType: 'maintenance' | 'error' | 'backup' | 'update',
    data: {
      title: string
      message: string
      severity?: 'low' | 'medium' | 'high' | 'critical'
      userId: string
      details?: Record<string, any>
    },
    activityContext?: {
      ipAddress?: string
      userAgent?: string
    }
  ): Promise<void> {
    const { title, message, severity = 'medium', userId, details } = data

    let templateKey: NotificationTemplateKey
    let targetRoles: UserRole[]

    switch (notificationType) {
      case 'maintenance':
        templateKey = 'SYSTEM_MAINTENANCE'
        targetRoles = [UserRole.DIRECTOR, UserRole.MANAGER, UserRole.IT_ADMIN]
        break
      case 'error':
        templateKey = 'SYSTEM_ERROR'
        targetRoles = [UserRole.DIRECTOR, UserRole.IT_ADMIN]
        break
      case 'backup':
        templateKey = 'BACKUP_COMPLETED'
        targetRoles = [UserRole.DIRECTOR, UserRole.IT_ADMIN]
        break
      default:
        // Generic system notification
        await this.sendBulkNotification({
          templateKey: 'SYSTEM_MAINTENANCE',
          context: { maintenanceDetails: message },
          targetRoles: [UserRole.DIRECTOR, UserRole.MANAGER],
          additionalData: { systemNotificationType: notificationType, severity }
        })
        return
    }

    // Send notifications to relevant roles
    await this.sendBulkNotification({
      templateKey,
      context: {
        maintenanceDetails: message,
        errorMessage: message,
        timestamp: new Date().toISOString()
      },
      targetRoles,
      additionalData: { systemNotificationType: notificationType, severity, ...details }
    })

    // Log system activity
    await ActivityLogger.log({
      userId,
      module: 'system',
      action: `system_${notificationType}`,
      entityType: 'system',
      entityId: `system-${Date.now()}`,
      entityName: title,
      details: {
        message,
        severity,
        notificationType,
        notificationSent: true,
        ...details
      },
      ipAddress: activityContext?.ipAddress,
      userAgent: activityContext?.userAgent
    })
  }

  /**
   * Handle calendar/event notifications
   */
  async handleCalendarNotification(
    eventData: {
      eventId: string
      eventTitle: string
      eventTime: Date
      attendeeIds: string[]
      reminderMinutes: number
      userId: string
    },
    activityContext?: {
      ipAddress?: string
      userAgent?: string
    }
  ): Promise<void> {
    const { eventId, eventTitle, eventTime, attendeeIds, reminderMinutes, userId } = eventData

    // Calculate time until event
    const timeUntil = this.formatTimeUntil(eventTime)

    // Send reminders to all attendees
    if (attendeeIds.length > 0) {
      await createBulkNotificationsFromTemplate(
        this.notificationManager,
        'EVENT_REMINDER',
        attendeeIds,
        {
          eventTitle,
          eventTime: eventTime.toLocaleString('en-ZA'),
          timeUntil
        },
        {
          eventId,
          reminderType: 'calendar',
          reminderMinutes
        }
      )
    }

    // Log calendar activity
    await ActivityLogger.log({
      userId,
      module: 'calendar',
      action: 'event_reminder_sent',
      entityType: 'event',
      entityId: eventId,
      entityName: eventTitle,
      details: {
        eventTime: eventTime.toISOString(),
        attendeeCount: attendeeIds.length,
        reminderMinutes,
        notificationSent: true
      },
      ipAddress: activityContext?.ipAddress,
      userAgent: activityContext?.userAgent
    })
  }

  /**
   * Handle HR-related notifications
   */
  async handleHRNotification(
    notificationType: 'leave_request' | 'leave_approved' | 'leave_rejected' | 'employee_update',
    data: {
      employeeId: string
      employeeName: string
      details: Record<string, any>
      userId: string
    },
    activityContext?: {
      ipAddress?: string
      userAgent?: string
    }
  ): Promise<void> {
    const { employeeId, employeeName, details, userId } = data

    // Notify HR staff and managers
    const hrStaff = await prisma.user.findMany({
      where: {
        role: { in: [UserRole.HR_STAFF, UserRole.DIRECTOR, UserRole.MANAGER, UserRole.HOD] }
      },
      select: { id: true }
    })

    if (hrStaff.length > 0) {
      // Create custom notification for HR events
      await createBulkNotificationsFromTemplate(
        this.notificationManager,
        'NEW_NOTICE', // Using notice template for HR notifications
        hrStaff.map(u => u.id),
        {
          noticeTitle: `HR Update: ${employeeName}`,
          noticeDetails: JSON.stringify(details)
        },
        {
          employeeId,
          hrNotificationType: notificationType,
          ...details
        }
      )
    }

    // Log HR activity
    await ActivityLogger.log({
      userId,
      module: 'hr',
      action: notificationType,
      entityType: 'employee',
      entityId: employeeId,
      entityName: employeeName,
      details: {
        ...details,
        notificationSent: true
      },
      ipAddress: activityContext?.ipAddress,
      userAgent: activityContext?.userAgent
    })
  }

  /**
   * Handle message notifications
   */
  async handleMessageNotification(
    messageData: {
      messageId: string
      senderId: string
      senderName: string
      recipientIds: string[]
      subject: string
      messagePreview: string
      isUrgent: boolean
    },
    activityContext?: {
      ipAddress?: string
      userAgent?: string
    }
  ): Promise<void> {
    const { messageId, senderId, senderName, recipientIds, subject, messagePreview, isUrgent } = messageData

    const templateKey = isUrgent ? 'URGENT_MESSAGE' : 'NEW_MESSAGE'

    // Send notifications to recipients
    if (recipientIds.length > 0) {
      await createBulkNotificationsFromTemplate(
        this.notificationManager,
        templateKey,
        recipientIds,
        {
          senderName,
          messagePreview: messagePreview.substring(0, 100) + (messagePreview.length > 100 ? '...' : '')
        },
        {
          messageId,
          senderId,
          subject,
          isUrgent
        }
      )
    }

    // Log message activity
    await ActivityLogger.log({
      userId: senderId,
      module: 'messaging',
      action: 'message_sent',
      entityType: 'message',
      entityId: messageId,
      entityName: subject,
      details: {
        recipientCount: recipientIds.length,
        isUrgent,
        notificationSent: true
      },
      ipAddress: activityContext?.ipAddress,
      userAgent: activityContext?.userAgent
    })
  }

  /**
   * Handle notice board notifications
   */
  async handleNoticeNotification(
    noticeData: {
      noticeId: string
      noticeTitle: string
      isImportant: boolean
      targetRoles?: UserRole[]
      userId: string
    },
    activityContext?: {
      ipAddress?: string
      userAgent?: string
    }
  ): Promise<void> {
    const { noticeId, noticeTitle, isImportant, targetRoles, userId } = noticeData

    const templateKey = isImportant ? 'IMPORTANT_NOTICE' : 'NEW_NOTICE'
    const defaultTargetRoles = targetRoles || [
      UserRole.DIRECTOR,
      UserRole.MANAGER,
      UserRole.HOD,
      UserRole.STAFF_MEMBER,
      UserRole.USER
    ]

    // Send notifications to target roles
    await this.sendBulkNotification({
      templateKey,
      context: { noticeTitle },
      targetRoles: defaultTargetRoles,
      additionalData: {
        noticeId,
        isImportant
      }
    })

    // Log notice activity
    await ActivityLogger.log({
      userId,
      module: 'notice_board',
      action: 'notice_posted',
      entityType: 'notice',
      entityId: noticeId,
      entityName: noticeTitle,
      details: {
        isImportant,
        targetRoles: defaultTargetRoles,
        notificationSent: true
      },
      ipAddress: activityContext?.ipAddress,
      userAgent: activityContext?.userAgent
    })
  }

  /**
   * Format time until event for display
   */
  private formatTimeUntil(eventTime: Date): string {
    const now = new Date()
    const diffMs = eventTime.getTime() - now.getTime()
    const diffMinutes = Math.floor(diffMs / (1000 * 60))

    if (diffMinutes < 60) {
      return `${diffMinutes} minutes`
    } else if (diffMinutes < 1440) {
      const hours = Math.floor(diffMinutes / 60)
      return `${hours} hour${hours > 1 ? 's' : ''}`
    } else {
      const days = Math.floor(diffMinutes / 1440)
      return `${days} day${days > 1 ? 's' : ''}`
    }
  }

  /**
   * Get notification manager instance for direct access
   */
  getNotificationManager(): NotificationManager {
    return this.notificationManager
  }

  /**
   * Clean up old notifications and activities
   */
  async performMaintenance(): Promise<{
    expiredNotifications: number
    oldActivities: number
  }> {
    const [expiredNotifications, oldActivities] = await Promise.all([
      this.notificationManager.cleanupExpiredNotifications(),
      ActivityLogger.cleanupOldActivities(365) // Keep 1 year of activities
    ])

    // Log maintenance activity
    await ActivityLogger.log({
      userId: 'system',
      module: 'system',
      action: 'maintenance_completed',
      entityType: 'system',
      entityId: 'maintenance',
      entityName: 'System Maintenance',
      details: {
        expiredNotifications,
        oldActivities,
        timestamp: new Date().toISOString()
      }
    })

    return { expiredNotifications, oldActivities }
  }
}

// Export singleton instance
export const integratedNotificationService = new IntegratedNotificationService()