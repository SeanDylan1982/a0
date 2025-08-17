import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { ActivityLogger } from '../activity-logger'
import { prisma } from '@/lib/prisma'

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    activityLog: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}))

describe('ActivityLogger', () => {
  let activityLogger: ActivityLogger

  beforeEach(() => {
    activityLogger = new ActivityLogger()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('log', () => {
    it('should log activity with all required fields', async () => {
      const mockActivity = {
        userId: 'user123',
        module: 'inventory',
        action: 'create',
        entityType: 'product',
        entityId: 'product123',
        entityName: 'Test Product',
        details: { quantity: 100 },
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      }

      const mockCreatedActivity = {
        id: 'activity123',
        ...mockActivity,
        timestamp: new Date(),
      }

      vi.mocked(prisma.activityLog.create).mockResolvedValue(mockCreatedActivity)

      await activityLogger.log(mockActivity)

      expect(prisma.activityLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: mockActivity.userId,
          module: mockActivity.module,
          action: mockActivity.action,
          entityType: mockActivity.entityType,
          entityId: mockActivity.entityId,
          entityName: mockActivity.entityName,
          details: mockActivity.details,
          ipAddress: mockActivity.ipAddress,
          userAgent: mockActivity.userAgent,
        }),
      })
    })

    it('should handle logging without optional fields', async () => {
      const mockActivity = {
        userId: 'user123',
        module: 'sales',
        action: 'update',
        entityType: 'invoice',
        entityId: 'invoice123',
        entityName: 'Invoice #001',
        details: {},
      }

      const mockCreatedActivity = {
        id: 'activity123',
        ...mockActivity,
        timestamp: new Date(),
        ipAddress: null,
        userAgent: null,
      }

      vi.mocked(prisma.activityLog.create).mockResolvedValue(mockCreatedActivity)

      await activityLogger.log(mockActivity)

      expect(prisma.activityLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: mockActivity.userId,
          module: mockActivity.module,
          action: mockActivity.action,
          entityType: mockActivity.entityType,
          entityId: mockActivity.entityId,
          entityName: mockActivity.entityName,
          details: mockActivity.details,
        }),
      })
    })

    it('should throw error when logging fails', async () => {
      const mockActivity = {
        userId: 'user123',
        module: 'inventory',
        action: 'create',
        entityType: 'product',
        entityId: 'product123',
        entityName: 'Test Product',
        details: {},
      }

      vi.mocked(prisma.activityLog.create).mockRejectedValue(new Error('Database error'))

      await expect(activityLogger.log(mockActivity)).rejects.toThrow('Database error')
    })
  })

  describe('getActivities', () => {
    it('should retrieve activities with filters', async () => {
      const mockActivities = [
        {
          id: 'activity1',
          userId: 'user123',
          module: 'inventory',
          action: 'create',
          entityType: 'product',
          entityId: 'product123',
          entityName: 'Test Product',
          details: {},
          timestamp: new Date(),
          ipAddress: null,
          userAgent: null,
          user: { id: 'user123', name: 'Test User' },
        },
      ]

      vi.mocked(prisma.activityLog.findMany).mockResolvedValue(mockActivities)

      const filters = {
        userId: 'user123',
        module: 'inventory',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        limit: 10,
        offset: 0,
      }

      const result = await activityLogger.getActivities(filters)

      expect(prisma.activityLog.findMany).toHaveBeenCalledWith({
        where: {
          userId: filters.userId,
          module: filters.module,
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
            },
          },
        },
        orderBy: {
          timestamp: 'desc',
        },
        take: filters.limit,
        skip: filters.offset,
      })

      expect(result).toEqual(mockActivities)
    })

    it('should handle empty filters', async () => {
      const mockActivities = []
      vi.mocked(prisma.activityLog.findMany).mockResolvedValue(mockActivities)

      const result = await activityLogger.getActivities({})

      expect(prisma.activityLog.findMany).toHaveBeenCalledWith({
        where: {},
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
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
  })

  describe('getActivitiesByRole', () => {
    it('should return all activities for DIRECTOR role', async () => {
      const mockUser = {
        id: 'user123',
        role: 'DIRECTOR',
        function: 'MANAGEMENT',
      }

      const mockActivities = [
        {
          id: 'activity1',
          userId: 'user456',
          module: 'sales',
          action: 'create',
          entityType: 'invoice',
          entityId: 'invoice123',
          entityName: 'Invoice #001',
          details: {},
          timestamp: new Date(),
          ipAddress: null,
          userAgent: null,
          user: { id: 'user456', name: 'Sales User' },
        },
      ]

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser)
      vi.mocked(prisma.activityLog.findMany).mockResolvedValue(mockActivities)

      const result = await activityLogger.getActivitiesByRole('user123', 'DIRECTOR')

      expect(prisma.activityLog.findMany).toHaveBeenCalledWith({
        where: {},
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
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

    it('should filter activities for STAFF_MEMBER role', async () => {
      const mockUser = {
        id: 'user123',
        role: 'STAFF_MEMBER',
        function: 'SALES',
      }

      const mockActivities = [
        {
          id: 'activity1',
          userId: 'user123',
          module: 'sales',
          action: 'create',
          entityType: 'quote',
          entityId: 'quote123',
          entityName: 'Quote #001',
          details: {},
          timestamp: new Date(),
          ipAddress: null,
          userAgent: null,
          user: { id: 'user123', name: 'Staff User' },
        },
      ]

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser)
      vi.mocked(prisma.activityLog.findMany).mockResolvedValue(mockActivities)

      const result = await activityLogger.getActivitiesByRole('user123', 'STAFF_MEMBER')

      expect(prisma.activityLog.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user123',
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
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
  })
})