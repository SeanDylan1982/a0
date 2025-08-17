import { PrismaClient } from '@prisma/client'
import { UserRole } from '@prisma/client'

const prisma = new PrismaClient()

export interface ActivityLogData {
  userId: string
  module: string
  action: string
  entityType: string
  entityId: string
  entityName: string
  details?: Record<string, any>
  ipAddress?: string
  userAgent?: string
}

export interface ActivityFilters {
  userId?: string
  module?: string
  action?: string
  entityType?: string
  startDate?: Date
  endDate?: Date
  limit?: number
  offset?: number
}

export interface ActivityLogWithUser {
  id: string
  userId: string
  module: string
  action: string
  entityType: string
  entityId: string
  entityName: string
  details: Record<string, any>
  timestamp: Date
  ipAddress?: string
  userAgent?: string
  user: {
    id: string
    name?: string
    email: string
    role: UserRole
  }
}

export class ActivityLogger {
  /**
   * Log a user activity
   */
  static async log(activity: ActivityLogData): Promise<void> {
    try {
      await prisma.activityLog.create({
        data: {
          userId: activity.userId,
          module: activity.module,
          action: activity.action,
          entityType: activity.entityType,
          entityId: activity.entityId,
          entityName: activity.entityName,
          details: activity.details || {},
          ipAddress: activity.ipAddress,
          userAgent: activity.userAgent,
        },
      })
    } catch (error) {
      console.error('Failed to log activity:', error)
      // Don't throw error to avoid breaking the main operation
    }
  }

  /**
   * Get activities with optional filtering
   */
  static async getActivities(filters: ActivityFilters = {}): Promise<ActivityLogWithUser[]> {
    const {
      userId,
      module,
      action,
      entityType,
      startDate,
      endDate,
      limit = 50,
      offset = 0,
    } = filters

    const where: any = {}

    if (userId) where.userId = userId
    if (module) where.module = module
    if (action) where.action = action
    if (entityType) where.entityType = entityType
    if (startDate || endDate) {
      where.timestamp = {}
      if (startDate) where.timestamp.gte = startDate
      if (endDate) where.timestamp.lte = endDate
    }

    const activities = await prisma.activityLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: {
        timestamp: 'desc',
      },
      take: limit,
      skip: offset,
    })

    return activities.map(activity => ({
      ...activity,
      details: activity.details as Record<string, any>,
    }))
  }

  /**
   * Get activities filtered by user role and permissions
   */
  static async getActivitiesByRole(
    userId: string,
    role: UserRole,
    filters: ActivityFilters = {}
  ): Promise<ActivityLogWithUser[]> {
    // Get base activities
    let baseFilters = { ...filters }

    // Apply role-based filtering
    switch (role) {
      case UserRole.DIRECTOR:
        // Directors can see all activities
        break
      
      case UserRole.MANAGER:
        // Managers can see activities from their functional area and subordinate roles
        // For now, we'll show all activities but this can be refined based on department/function
        break
      
      case UserRole.HOD:
        // HODs can see activities from their department
        // This would need department-specific filtering
        break
      
      case UserRole.SALES_REP:
      case UserRole.INTERNAL_CONSULTANT:
        // Sales reps can see sales-related activities and their own activities
        if (!baseFilters.module) {
          // If no specific module filter, show sales and their own activities
          const salesActivities = await this.getActivities({
            ...baseFilters,
            module: 'sales',
          })
          const userActivities = await this.getActivities({
            ...baseFilters,
            userId,
          })
          
          // Combine and deduplicate
          const combined = [...salesActivities, ...userActivities]
          const unique = combined.filter((activity, index, self) => 
            index === self.findIndex(a => a.id === activity.id)
          )
          return unique.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        }
        break
      
      case UserRole.INVENTORY_MANAGER:
        // Inventory managers can see inventory-related activities
        if (!baseFilters.module) {
          baseFilters.module = 'inventory'
        }
        break
      
      case UserRole.HR_STAFF:
        // HR staff can see HR-related activities
        if (!baseFilters.module) {
          baseFilters.module = 'hr'
        }
        break
      
      case UserRole.ACCOUNTANT:
        // Accountants can see accounting and financial activities
        if (!baseFilters.module) {
          const accountingActivities = await this.getActivities({
            ...baseFilters,
            module: 'accounting',
          })
          const invoicingActivities = await this.getActivities({
            ...baseFilters,
            module: 'invoicing',
          })
          
          const combined = [...accountingActivities, ...invoicingActivities]
          return combined.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        }
        break
      
      case UserRole.STAFF_MEMBER:
      case UserRole.USER:
      default:
        // Regular users can only see their own activities
        baseFilters.userId = userId
        break
    }

    return this.getActivities(baseFilters)
  }

  /**
   * Get activity count for dashboard statistics
   */
  static async getActivityCount(filters: ActivityFilters = {}): Promise<number> {
    const {
      userId,
      module,
      action,
      entityType,
      startDate,
      endDate,
    } = filters

    const where: any = {}

    if (userId) where.userId = userId
    if (module) where.module = module
    if (action) where.action = action
    if (entityType) where.entityType = entityType
    if (startDate || endDate) {
      where.timestamp = {}
      if (startDate) where.timestamp.gte = startDate
      if (endDate) where.timestamp.lte = endDate
    }

    return prisma.activityLog.count({ where })
  }

  /**
   * Get recent activities for a specific entity
   */
  static async getEntityActivities(
    entityType: string,
    entityId: string,
    limit: number = 10
  ): Promise<ActivityLogWithUser[]> {
    return this.getActivities({
      entityType,
      entityId,
      limit,
    })
  }

  /**
   * Get activities by module for dashboard widgets
   */
  static async getModuleActivities(
    module: string,
    limit: number = 5
  ): Promise<ActivityLogWithUser[]> {
    return this.getActivities({
      module,
      limit,
    })
  }

  /**
   * Clean up old activity logs (for maintenance)
   */
  static async cleanupOldActivities(daysToKeep: number = 365): Promise<number> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

    const result = await prisma.activityLog.deleteMany({
      where: {
        timestamp: {
          lt: cutoffDate,
        },
      },
    })

    return result.count
  }
}