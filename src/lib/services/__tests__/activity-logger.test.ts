import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { UserRole } from '@prisma/client'

// Mock the Prisma client import
const mockCreate = vi.fn()
const mockFindMany = vi.fn()
const mockCount = vi.fn()
const mockDeleteMany = vi.fn()

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn().mockImplementation(() => ({
    activityLog: {
      create: mockCreate,
      findMany: mockFindMany,
      count: mockCount,
      deleteMany: mockDeleteMany,
    },
  })),
  UserRole: {
    DIRECTOR: 'DIRECTOR',
    MANAGER: 'MANAGER',
    HOD: 'HOD',
    SALES_REP: 'SALES_REP',
    INTERNAL_CONSULTANT: 'INTERNAL_CONSULTANT',
    INVENTORY_MANAGER: 'INVENTORY_MANAGER',
    HR_STAFF: 'HR_STAFF',
    ACCOUNTANT: 'ACCOUNTANT',
    STAFF_MEMBER: 'STAFF_MEMBER',
    USER: 'USER',
  },
}))

import { ActivityLogger, ActivityLogData } from '../activity-logger'

describe('ActivityLogger', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('log', () => {
    it('should log activity successfully', async () => {
      const activityData: ActivityLogData = {
        userId: 'user123',
        module: 'inventory',
        action: 'create',
        entityType: 'product',
        entityId: 'product123',
        entityName: 'Test Product',
        details: { price: 100 },
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      }

      mockCreate.mockResolvedValue({
        id: 'activity123',
        ...activityData,
        timestamp: new Date(),
      })

      await ActivityLogger.log(activityData)

      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          userId: 'user123',
          module: 'inventory',
          action: 'create',
          entityType: 'product',
          entityId: 'product123',
          entityName: 'Test Product',
          details: { price: 100 },
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
        },
      })
    })

    it('should handle logging errors gracefully', async () => {
      const activityData: ActivityLogData = {
        userId: 'user123',
        module: 'inventory',
        action: 'create',
        entityType: 'product',
        entityId: 'product123',
        entityName: 'Test Product',
      }

      mockCreate.mockRejectedValue(new Error('Database error'))

      // Should not throw error
      await expect(ActivityLogger.log(activityData)).resolves.toBeUndefined()
    })

    it('should use empty object for details if not provided', async () => {
      const activityData: ActivityLogData = {
        userId: 'user123',
        module: 'inventory',
        action: 'create',
        entityType: 'product',
        entityId: 'product123',
        entityName: 'Test Product',
      }

      await ActivityLogger.log(activityData)

      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          details: {},
        }),
      })
    })
  })

  describe('getActivities', () => {
    it('should retrieve activities with default parameters', async () => {
      const mockActivities = [
        {
          id: 'activity1',
          userId: 'user1',
          module: 'inventory',
          action: 'create',
          entityType: 'product',
          entityId: 'product1',
          entityName: 'Product 1',
          details: {},
          timestamp: new Date(),
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          user: {
            id: 'user1',
            name: 'John Doe',
            email: 'john@example.com',
            role: UserRole.USER,
          },
        },
      ]

      mockFindMany.mockResolvedValue(mockActivities)

      const result = await ActivityLogger.getActivities()

      expect(mockFindMany).toHaveBeenCalledWith({
        where: {},
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
        take: 50,
        skip: 0,
      })

      expect(result).toEqual(mockActivities)
    })

    it('should apply filters correctly', async () => {
      const filters = {
        userId: 'user123',
        module: 'inventory',
        action: 'create',
        entityType: 'product',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        limit: 10,
        offset: 5,
      }

      mockFindMany.mockResolvedValue([])

      await ActivityLogger.getActivities(filters)

      expect(mockFindMany).toHaveBeenCalledWith({
        where: {
          userId: 'user123',
          module: 'inventory',
          action: 'create',
          entityType: 'product',
          timestamp: {
            gte: filters.startDate,
            lte: filters.endDate,
          },
        },
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
        take: 10,
        skip: 5,
      })
    })
  })

  describe('getActivitiesByRole', () => {
    it('should return all activities for DIRECTOR role', async () => {
      const mockActivities = [
        {
          id: 'activity1',
          userId: 'user1',
          module: 'inventory',
          action: 'create',
          entityType: 'product',
          entityId: 'product1',
          entityName: 'Product 1',
          details: {},
          timestamp: new Date(),
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          user: {
            id: 'user1',
            name: 'John Doe',
            email: 'john@example.com',
            role: UserRole.USER,
          },
        },
      ]

      mockFindMany.mockResolvedValue(mockActivities)

      const result = await ActivityLogger.getActivitiesByRole('director123', UserRole.DIRECTOR)

      expect(result).toEqual(mockActivities)
    })

    it('should filter activities for STAFF_MEMBER role to only their own', async () => {
      const mockActivities = [
        {
          id: 'activity1',
          userId: 'staff123',
          module: 'inventory',
          action: 'view',
          entityType: 'product',
          entityId: 'product1',
          entityName: 'Product 1',
          details: {},
          timestamp: new Date(),
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          user: {
            id: 'staff123',
            name: 'Staff Member',
            email: 'staff@example.com',
            role: UserRole.STAFF_MEMBER,
          },
        },
      ]

      mockFindMany.mockResolvedValue(mockActivities)

      await ActivityLogger.getActivitiesByRole('staff123', UserRole.STAFF_MEMBER)

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'staff123',
          }),
        })
      )
    })

    it('should filter activities for INVENTORY_MANAGER role to inventory module', async () => {
      mockFindMany.mockResolvedValue([])

      await ActivityLogger.getActivitiesByRole('inv123', UserRole.INVENTORY_MANAGER)

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            module: 'inventory',
          }),
        })
      )
    })
  })

  describe('getActivityCount', () => {
    it('should return activity count with filters', async () => {
      mockCount.mockResolvedValue(42)

      const filters = {
        module: 'inventory',
        startDate: new Date('2024-01-01'),
      }

      const result = await ActivityLogger.getActivityCount(filters)

      expect(mockCount).toHaveBeenCalledWith({
        where: {
          module: 'inventory',
          timestamp: {
            gte: filters.startDate,
          },
        },
      })

      expect(result).toBe(42)
    })
  })

  describe('getEntityActivities', () => {
    it('should retrieve activities for specific entity', async () => {
      mockFindMany.mockResolvedValue([])

      await ActivityLogger.getEntityActivities('product', 'product123', 5)

      expect(mockFindMany).toHaveBeenCalledWith({
        where: {
          entityType: 'product',
          entityId: 'product123',
        },
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
        take: 5,
        skip: 0,
      })
    })
  })

  describe('getModuleActivities', () => {
    it('should retrieve activities for specific module', async () => {
      mockFindMany.mockResolvedValue([])

      await ActivityLogger.getModuleActivities('inventory', 10)

      expect(mockFindMany).toHaveBeenCalledWith({
        where: {
          module: 'inventory',
        },
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
        take: 10,
        skip: 0,
      })
    })
  })

  describe('cleanupOldActivities', () => {
    it('should delete activities older than specified days', async () => {
      mockDeleteMany.mockResolvedValue({ count: 100 })

      const result = await ActivityLogger.cleanupOldActivities(30)

      expect(mockDeleteMany).toHaveBeenCalledWith({
        where: {
          timestamp: {
            lt: expect.any(Date),
          },
        },
      })

      expect(result).toBe(100)
    })

    it('should use default 365 days if not specified', async () => {
      mockDeleteMany.mockResolvedValue({ count: 50 })

      await ActivityLogger.cleanupOldActivities()

      const call = mockDeleteMany.mock.calls[0][0]
      const cutoffDate = call.where.timestamp.lt
      const daysDiff = Math.floor((Date.now() - cutoffDate.getTime()) / (1000 * 60 * 60 * 24))
      
      expect(daysDiff).toBeCloseTo(365, 0)
    })
  })
})