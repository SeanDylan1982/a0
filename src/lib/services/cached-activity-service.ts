import { PrismaClient, ActivityLog, UserRole } from '@prisma/client'
import { CacheManager } from '../cache/cache-manager'
import { PerformanceMonitor } from '../monitoring/performance-monitor'
import { PaginationHelper, ActivityLogPagination, PaginationParams, PaginationResult } from '../utils/pagination'

const prisma = new PrismaClient()

export class CachedActivityService {
  private static readonly CACHE_PREFIX = 'activity'
  private static readonly CACHE_TTL = 300 // 5 minutes

  static async getActivities(
    params: PaginationParams & {
      userId?: string
      module?: string
      entityType?: string
      dateFrom?: Date
      dateTo?: Date
    }
  ): Promise<PaginationResult<ActivityLog>> {
    return await PerformanceMonitor.measureQuery('getActivities', async () => {
      const validatedParams = PaginationHelper.validateParams(params)
      const { skip, take } = PaginationHelper.getSkipTake(validatedParams.page, validatedParams.limit)
      
      // Build cache key
      const cacheKey = this.buildCacheKey('activities', params)
      
      // Try cache first
      const cached = await CacheManager.get<PaginationResult<ActivityLog>>(
        cacheKey,
        { prefix: this.CACHE_PREFIX, ttl: this.CACHE_TTL }
      )
      
      if (cached) {
        return cached
      }

      // Build filters
      const where = ActivityLogPagination.buildFilters(params)
      const orderBy = PaginationHelper.buildOrderBy(validatedParams.sortBy || 'timestamp', validatedParams.sortOrder)

      // Execute queries
      const [activities, total] = await Promise.all([
        prisma.activityLog.findMany({
          where,
          skip,
          take,
          orderBy: orderBy || { timestamp: 'desc' },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true
              }
            }
          }
        }),
        prisma.activityLog.count({ where })
      ])

      const result = PaginationHelper.buildResult(activities, total, validatedParams.page, validatedParams.limit)
      
      // Cache the result
      await CacheManager.set(cacheKey, result, { prefix: this.CACHE_PREFIX, ttl: this.CACHE_TTL })
      
      return result
    })
  }

  static async getActivitiesByRole(
    userId: string,
    role: UserRole,
    params: PaginationParams
  ): Promise<PaginationResult<ActivityLog>> {
    return await PerformanceMonitor.measureQuery('getActivitiesByRole', async () => {
      const cacheKey = this.buildCacheKey('activities-by-role', { userId, role, ...params })
      
      // Try cache first
      const cached = await CacheManager.get<PaginationResult<ActivityLog>>(
        cacheKey,
        { prefix: this.CACHE_PREFIX, ttl: this.CACHE_TTL }
      )
      
      if (cached) {
        return cached
      }

      const validatedParams = PaginationHelper.validateParams(params)
      const { skip, take } = PaginationHelper.getSkipTake(validatedParams.page, validatedParams.limit)

      // Build role-based filters
      let where: any = {}
      
      switch (role) {
        case 'DIRECTOR':
          // Directors see all activities
          break
        case 'MANAGER':
        case 'HOD':
          // Managers see activities in their functional area
          // This would need to be implemented based on your business logic
          break
        default:
          // Regular users see only their own activities
          where.userId = userId
      }

      const [activities, total] = await Promise.all([
        prisma.activityLog.findMany({
          where,
          skip,
          take,
          orderBy: { timestamp: 'desc' },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true
              }
            }
          }
        }),
        prisma.activityLog.count({ where })
      ])

      const result = PaginationHelper.buildResult(activities, total, validatedParams.page, validatedParams.limit)
      
      // Cache the result
      await CacheManager.set(cacheKey, result, { prefix: this.CACHE_PREFIX, ttl: this.CACHE_TTL })
      
      return result
    })
  }

  static async getActivityStats(userId?: string): Promise<{
    totalActivities: number
    todayActivities: number
    moduleBreakdown: Record<string, number>
    recentActivities: ActivityLog[]
  }> {
    return await PerformanceMonitor.measureQuery('getActivityStats', async () => {
      const cacheKey = this.buildCacheKey('stats', { userId })
      
      // Try cache first
      const cached = await CacheManager.get<any>(
        cacheKey,
        { prefix: this.CACHE_PREFIX, ttl: this.CACHE_TTL }
      )
      
      if (cached) {
        return cached
      }

      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      const where = userId ? { userId } : {}

      const [totalActivities, todayActivities, moduleStats, recentActivities] = await Promise.all([
        prisma.activityLog.count({ where }),
        prisma.activityLog.count({
          where: {
            ...where,
            timestamp: { gte: today }
          }
        }),
        prisma.activityLog.groupBy({
          by: ['module'],
          where,
          _count: { module: true }
        }),
        prisma.activityLog.findMany({
          where,
          take: 10,
          orderBy: { timestamp: 'desc' },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true
              }
            }
          }
        })
      ])

      const moduleBreakdown = moduleStats.reduce((acc, stat) => {
        acc[stat.module] = stat._count.module
        return acc
      }, {} as Record<string, number>)

      const result = {
        totalActivities,
        todayActivities,
        moduleBreakdown,
        recentActivities
      }
      
      // Cache the result
      await CacheManager.set(cacheKey, result, { prefix: this.CACHE_PREFIX, ttl: this.CACHE_TTL })
      
      return result
    })
  }

  static async invalidateCache(pattern?: string): Promise<void> {
    if (pattern) {
      await CacheManager.invalidatePattern(pattern, { prefix: this.CACHE_PREFIX })
    } else {
      await CacheManager.invalidatePattern('*', { prefix: this.CACHE_PREFIX })
    }
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