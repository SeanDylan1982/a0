import { PrismaClient, NotificationType, NotificationPriority, Notification } from '@prisma/client'

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
  userId: string
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

export class NotificationManager {
  private prisma: PrismaClient

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || new PrismaClient()
  }

  /**
   * Create a new notification
   */
  async create(data: CreateNotificationData): Promise<Notification> {
    try {
      const notification = await this.prisma.notification.create({
        data: {
          userId: data.userId,
          type: data.type,
          title: data.title,
          message: data.message,
          data: data.data || {},
          priority: data.priority || NotificationPriority.MEDIUM,
          expiresAt: data.expiresAt,
          read: false
        }
      })

      // Broadcast notification via Socket.IO
      try {
        const { SocketBroadcaster } = await import('@/lib/socket')
        SocketBroadcaster.broadcastNotification({
          id: notification.id,
          userId: notification.userId,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          priority: notification.priority,
          data: notification.data as any,
          createdAt: notification.createdAt
        })

        // Broadcast updated count for this notification type
        const newCount = await this.getUnreadCount(notification.userId, notification.type)
        SocketBroadcaster.broadcastNotificationCountUpdate(
          notification.userId, 
          notification.type, 
          newCount
        )
      } catch (socketError) {
        console.warn('Failed to broadcast notification via socket:', socketError)
        // Don't throw error - notification was created successfully
      }

      return notification
    } catch (error) {
      console.error('Error creating notification:', error)
      throw new Error('Failed to create notification')
    }
  }

  /**
   * Create multiple notifications in bulk
   */
  async createBulk(notifications: CreateNotificationData[]): Promise<Notification[]> {
    try {
      const result = await this.prisma.notification.createMany({
        data: notifications.map(data => ({
          userId: data.userId,
          type: data.type,
          title: data.title,
          message: data.message,
          data: data.data || {},
          priority: data.priority || NotificationPriority.MEDIUM,
          expiresAt: data.expiresAt,
          read: false
        }))
      })

      // Return the created notifications
      const createdNotifications = await this.prisma.notification.findMany({
        where: {
          userId: { in: notifications.map(n => n.userId) },
          createdAt: { gte: new Date(Date.now() - 1000) } // Within last second
        },
        orderBy: { createdAt: 'desc' },
        take: result.count
      })

      // Broadcast notifications via Socket.IO
      try {
        const { SocketBroadcaster } = await import('@/lib/socket')
        createdNotifications.forEach(notification => {
          SocketBroadcaster.broadcastNotification({
            id: notification.id,
            userId: notification.userId,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            priority: notification.priority,
            data: notification.data as any,
            createdAt: notification.createdAt
          })
        })
      } catch (socketError) {
        console.warn('Failed to broadcast bulk notifications via socket:', socketError)
        // Don't throw error - notifications were created successfully
      }

      return createdNotifications
    } catch (error) {
      console.error('Error creating bulk notifications:', error)
      throw new Error('Failed to create bulk notifications')
    }
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    try {
      // Get the notification type before updating
      const notification = await this.prisma.notification.findFirst({
        where: {
          id: notificationId,
          userId: userId
        },
        select: { type: true }
      })

      const result = await this.prisma.notification.updateMany({
        where: {
          id: notificationId,
          userId: userId
        },
        data: {
          read: true
        }
      })

      // Broadcast updated count if notification was found and updated
      if (result.count > 0 && notification) {
        try {
          const { SocketBroadcaster } = await import('@/lib/socket')
          const newCount = await this.getUnreadCount(userId, notification.type)
          SocketBroadcaster.broadcastNotificationCountUpdate(
            userId, 
            notification.type, 
            newCount
          )
        } catch (socketError) {
          console.warn('Failed to broadcast count update via socket:', socketError)
        }
      }

      return result.count > 0
    } catch (error) {
      console.error('Error marking notification as read:', error)
      throw new Error('Failed to mark notification as read')
    }
  }

  /**
   * Mark multiple notifications as read
   */
  async markMultipleAsRead(notificationIds: string[], userId: string): Promise<number> {
    try {
      const result = await this.prisma.notification.updateMany({
        where: {
          id: { in: notificationIds },
          userId: userId
        },
        data: {
          read: true
        }
      })

      return result.count
    } catch (error) {
      console.error('Error marking multiple notifications as read:', error)
      throw new Error('Failed to mark notifications as read')
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string, type?: NotificationType): Promise<number> {
    try {
      const whereClause: any = {
        userId: userId,
        read: false
      }

      if (type) {
        whereClause.type = type
      }

      const result = await this.prisma.notification.updateMany({
        where: whereClause,
        data: {
          read: true
        }
      })

      // Broadcast updated counts
      if (result.count > 0) {
        try {
          const { SocketBroadcaster } = await import('@/lib/socket')
          
          if (type) {
            // Broadcast count for specific type (should be 0 now)
            SocketBroadcaster.broadcastNotificationCountUpdate(userId, type, 0)
          } else {
            // Broadcast counts for all types
            const types = Object.values(NotificationType)
            for (const notificationType of types) {
              const newCount = await this.getUnreadCount(userId, notificationType)
              SocketBroadcaster.broadcastNotificationCountUpdate(
                userId, 
                notificationType, 
                newCount
              )
            }
          }
        } catch (socketError) {
          console.warn('Failed to broadcast count updates via socket:', socketError)
        }
      }

      return result.count
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
      throw new Error('Failed to mark all notifications as read')
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string, type?: NotificationType): Promise<number> {
    try {
      const whereClause: any = {
        userId: userId,
        read: false,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      }

      if (type) {
        whereClause.type = type
      }

      const count = await this.prisma.notification.count({
        where: whereClause
      })

      return count
    } catch (error) {
      console.error('Error getting unread count:', error)
      return 0
    }
  }

  /**
   * Get notifications with filtering and pagination
   */
  async getNotifications(userId: string, filters?: NotificationFilters): Promise<Notification[]> {
    try {
      const whereClause: any = {
        userId: userId,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      }

      if (filters?.type) {
        whereClause.type = filters.type
      }

      if (filters?.priority) {
        whereClause.priority = filters.priority
      }

      if (filters?.read !== undefined) {
        whereClause.read = filters.read
      }

      if (filters?.startDate || filters?.endDate) {
        whereClause.createdAt = {}
        if (filters.startDate) {
          whereClause.createdAt.gte = filters.startDate
        }
        if (filters.endDate) {
          whereClause.createdAt.lte = filters.endDate
        }
      }

      const notifications = await this.prisma.notification.findMany({
        where: whereClause,
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' }
        ],
        take: filters?.limit || 50,
        skip: filters?.offset || 0
      })

      return notifications
    } catch (error) {
      console.error('Error getting notifications:', error)
      throw new Error('Failed to get notifications')
    }
  }

  /**
   * Get notification statistics for a user
   */
  async getNotificationStats(userId: string): Promise<NotificationStats> {
    try {
      const notifications = await this.prisma.notification.findMany({
        where: {
          userId: userId,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ]
        },
        select: {
          type: true,
          priority: true,
          read: true
        }
      })

      const stats: NotificationStats = {
        total: notifications.length,
        unread: notifications.filter(n => !n.read).length,
        byType: {} as Record<NotificationType, number>,
        byPriority: {} as Record<NotificationPriority, number>
      }

      // Initialize counters
      Object.values(NotificationType).forEach(type => {
        stats.byType[type] = 0
      })
      Object.values(NotificationPriority).forEach(priority => {
        stats.byPriority[priority] = 0
      })

      // Count by type and priority
      notifications.forEach(notification => {
        stats.byType[notification.type]++
        stats.byPriority[notification.priority]++
      })

      return stats
    } catch (error) {
      console.error('Error getting notification stats:', error)
      throw new Error('Failed to get notification statistics')
    }
  }

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: string, userId: string): Promise<boolean> {
    try {
      const result = await this.prisma.notification.deleteMany({
        where: {
          id: notificationId,
          userId: userId
        }
      })

      return result.count > 0
    } catch (error) {
      console.error('Error deleting notification:', error)
      throw new Error('Failed to delete notification')
    }
  }

  /**
   * Clean up expired notifications
   */
  async cleanupExpiredNotifications(): Promise<number> {
    try {
      const result = await this.prisma.notification.deleteMany({
        where: {
          expiresAt: {
            lt: new Date()
          }
        }
      })

      return result.count
    } catch (error) {
      console.error('Error cleaning up expired notifications:', error)
      throw new Error('Failed to cleanup expired notifications')
    }
  }

  /**
   * Get notifications by priority
   */
  async getNotificationsByPriority(
    userId: string, 
    priority: NotificationPriority,
    limit: number = 10
  ): Promise<Notification[]> {
    try {
      return await this.prisma.notification.findMany({
        where: {
          userId: userId,
          priority: priority,
          read: false,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ]
        },
        orderBy: { createdAt: 'desc' },
        take: limit
      })
    } catch (error) {
      console.error('Error getting notifications by priority:', error)
      throw new Error('Failed to get notifications by priority')
    }
  }

  /**
   * Get critical notifications that need immediate attention
   */
  async getCriticalNotifications(userId: string): Promise<Notification[]> {
    return this.getNotificationsByPriority(userId, NotificationPriority.CRITICAL)
  }
}

export default NotificationManager