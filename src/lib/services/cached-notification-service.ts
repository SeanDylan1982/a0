import { PrismaClient, Notification, NotificationType, NotificationPriority } from '@prisma/client'
import { CacheManager } from '../cache/cache-manager'
import { PerformanceMonitor } from '../monitoring/performance-monitor'
import { PaginationHelper, NotificationPagination, PaginationParams, PaginationResult } from '../utils/pagination'

const prisma = new PrismaClient()

export class CachedNotificationService {
  private static readonly CACHE_PREFIX = 'notifications'
  private static readonly CACHE_TTL = 180 // 3 minutes
  private static readonly COUNT_CACHE_TTL = 60 // 1 minute for counts

  static async getNotifications(
    params: PaginationParams & {
      userId?: string
      type?: NotificationType
      read?: boolean
      priority?: NotificationPriority
    }
  ): Promise<PaginationResult<Notification>> {
    return await PerformanceMonitor.measureQuery('getNotifications', async () => {
      const validatedParams = PaginationHelper.validateParams(params)
      const { skip, take } = PaginationHelper.getSkipTake(validatedParams.page, validatedParams.limit)
      
      // Build cache key
      const cacheKey = this.buildCacheKey('notifications', params)
      
      // Try cache first
      const cached = await CacheManager.get<PaginationResult<Notification>>(
        cacheKey,
        { prefix: this.CACHE_PREFIX, ttl: this.CACHE_TTL }
      )
      
      if (cached) {
        return cached
      }

      // Build filters
      const where = NotificationPagination.buildFilters(params)
      const orderBy = PaginationHelper.buildOrderBy(validatedParams.sortBy || 'createdAt', validatedParams.sortOrder)

      // Execute queries
      const [notifications, total] = await Promise.all([
        prisma.notification.findMany({
          where,
          skip,
          take,
          orderBy: orderBy || { createdAt: 'desc' },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }),
        prisma.notification.count({ where })
      ])

      const result = PaginationHelper.buildResult(notifications, total, validatedParams.page, validatedParams.limit)
      
      // Cache the result
      await CacheManager.set(cacheKey, result, { prefix: this.CACHE_PREFIX, ttl: this.CACHE_TTL })
      
      return result
    })
  }

  static async getUnreadCount(
    userId: string,
    type?: NotificationType
  ): Promise<number> {
    return await PerformanceMonitor.measureQuery('getUnreadCount', async () => {
      const cacheKey = this.buildCacheKey('unread-count', { userId, type })
      
      // Try cache first
      const cached = await CacheManager.get<number>(
        cacheKey,
        { prefix: this.CACHE_PREFIX, ttl: this.COUNT_CACHE_TTL }
      )
      
      if (cached !== null) {
        return cached
      }

      const where: any = {
        userId,
        read: false
      }

      if (type) {
        where.type = type
      }

      const count = await prisma.notification.count({ where })
      
      // Cache the result
      await CacheManager.set(cacheKey, count, { prefix: this.CACHE_PREFIX, ttl: this.COUNT_CACHE_TTL })
      
      return count
    })
  }

  static async getNotificationCounts(userId: string): Promise<{
    total: number
    byType: Record<string, number>
    byPriority: Record<string, number>
    unread: number
  }> {
    return await PerformanceMonitor.measureQuery('getNotificationCounts', async () => {
      const cacheKey = this.buildCacheKey('counts', { userId })
      
      // Try cache first
      const cached = await CacheManager.get<any>(
        cacheKey,
        { prefix: this.CACHE_PREFIX, ttl: this.COUNT_CACHE_TTL }
      )
      
      if (cached) {
        return cached
      }

      const [total, unread, typeStats, priorityStats] = await Promise.all([
        prisma.notification.count({ where: { userId } }),
        prisma.notification.count({ where: { userId, read: false } }),
        prisma.notification.groupBy({
          by: ['type'],
          where: { userId },
          _count: { type: true }
        }),
        prisma.notification.groupBy({
          by: ['priority'],
          where: { userId },
          _count: { priority: true }
        })
      ])

      const byType = typeStats.reduce((acc, stat) => {
        acc[stat.type] = stat._count.type
        return acc
      }, {} as Record<string, number>)

      const byPriority = priorityStats.reduce((acc, stat) => {
        acc[stat.priority] = stat._count.priority
        return acc
      }, {} as Record<string, number>)

      const result = {
        total,
        byType,
        byPriority,
        unread
      }
      
      // Cache the result
      await CacheManager.set(cacheKey, result, { prefix: this.CACHE_PREFIX, ttl: this.COUNT_CACHE_TTL })
      
      return result
    })
  }

  static async markAsRead(notificationId: string, userId: string): Promise<void> {
    await PerformanceMonitor.measureQuery('markAsRead', async () => {
      await prisma.notification.updateMany({
        where: {
          id: notificationId,
          userId
        },
        data: {
          read: true
        }
      })

      // Invalidate relevant caches
      await this.invalidateUserCache(userId)
    })
  }

  static async markAllAsRead(userId: string, type?: NotificationType): Promise<void> {
    await PerformanceMonitor.measureQuery('markAllAsRead', async () => {
      const where: any = { userId, read: false }
      if (type) {
        where.type = type
      }

      await prisma.notification.updateMany({
        where,
        data: {
          read: true
        }
      })

      // Invalidate relevant caches
      await this.invalidateUserCache(userId)
    })
  }

  static async createNotification(notification: {
    userId: string
    type: NotificationType
    title: string
    message: string
    data?: any
    priority?: NotificationPriority
    expiresAt?: Date
  }): Promise<Notification> {
    return await PerformanceMonitor.measureQuery('createNotification', async () => {
      const created = await prisma.notification.create({
        data: notification
      })

      // Invalidate relevant caches
      await this.invalidateUserCache(notification.userId)

      return created
    })
  }

  static async deleteExpiredNotifications(): Promise<number> {
    return await PerformanceMonitor.measureQuery('deleteExpiredNotifications', async () => {
      const result = await prisma.notification.deleteMany({
        where: {
          expiresAt: {
            lt: new Date()
          }
        }
      })

      // Invalidate all notification caches since we don't know which users were affected
      await this.invalidateCache()

      return result.count
    })
  }

  static async invalidateCache(pattern?: string): Promise<void> {
    if (pattern) {
      await CacheManager.invalidatePattern(pattern, { prefix: this.CACHE_PREFIX })
    } else {
      await CacheManager.invalidatePattern('*', { prefix: this.CACHE_PREFIX })
    }
  }

  static async invalidateUserCache(userId: string): Promise<void> {
    await CacheManager.invalidatePattern(`*${userId}*`, { prefix: this.CACHE_PREFIX })
  }

  private static buildCacheKey(operation: string, params: any): string {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((result, key) => {
        result[key] = params[key]
        return result
      }, {} as any)
    
    return `${operation}:${Buffer.from(JSON.stringify(sortedParams)).toString('base64')}`
  }
}