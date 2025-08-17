import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { AccessControlManager } from '../access-control-manager'
import { prisma } from '@/lib/prisma'

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    userPermission: {
      findMany: vi.fn(),
    },
  },
}))

describe('AccessControlManager', () => {
  let accessControlManager: AccessControlManager

  beforeEach(() => {
    accessControlManager = new AccessControlManager()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('hasPermission', () => {
    it('should return true for DIRECTOR role with any permission', async () => {
      const mockUser = {
        id: 'user123',
        role: 'DIRECTOR',
        function: 'MANAGEMENT',
      }

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser)

      const permission = {
        module: 'inventory',
        action: 'delete',
        resource: 'product',
      }

      const result = await accessControlManager.hasPermission('user123', permission)

      expect(result).toBe(true)
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user123' },
        select: { role: true, function: true },
      })
    })

    it('should check specific permissions for non-DIRECTOR roles', async () => {
      const mockUser = {
        id: 'user123',
        role: 'STAFF_MEMBER',
        function: 'SALES',
      }

      const mockPermissions = [
        {
          id: 'perm1',
          userId: 'user123',
          module: 'sales',
          action: 'create',
          resource: 'quote',
          conditions: null,
        },
      ]

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser)
      vi.mocked(prisma.userPermission.findMany).mockResolvedValue(mockPermissions)

      const permission = {
        module: 'sales',
        action: 'create',
        resource: 'quote',
      }

      const result = await accessControlManager.hasPermission('user123', permission)

      expect(result).toBe(true)
      expect(prisma.userPermission.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user123',
          module: permission.module,
          action: permission.action,
          resource: permission.resource,
        },
      })
    })

    it('should return false when permission not found', async () => {
      const mockUser = {
        id: 'user123',
        role: 'STAFF_MEMBER',
        function: 'SALES',
      }

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser)
      vi.mocked(prisma.userPermission.findMany).mockResolvedValue([])

      const permission = {
        module: 'inventory',
        action: 'delete',
        resource: 'product',
      }

      const result = await accessControlManager.hasPermission('user123', permission)

      expect(result).toBe(false)
    })

    it('should handle role-based permissions for MANAGER', async () => {
      const mockUser = {
        id: 'user123',
        role: 'MANAGER',
        function: 'INVENTORY',
      }

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser)

      const permission = {
        module: 'inventory',
        action: 'update',
        resource: 'product',
      }

      const result = await accessControlManager.hasPermission('user123', permission)

      expect(result).toBe(true)
    })

    it('should return false for user not found', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

      const permission = {
        module: 'sales',
        action: 'create',
      }

      const result = await accessControlManager.hasPermission('user123', permission)

      expect(result).toBe(false)
    })
  })

  describe('getAccessibleData', () => {
    it('should return all data for DIRECTOR role', async () => {
      const mockUser = {
        id: 'user123',
        role: 'DIRECTOR',
        function: 'MANAGEMENT',
      }

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser)

      const testData = [
        { id: '1', name: 'Item 1', userId: 'user456' },
        { id: '2', name: 'Item 2', userId: 'user789' },
      ]

      const result = await accessControlManager.getAccessibleData('user123', 'inventory', testData)

      expect(result).toEqual(testData)
    })

    it('should filter data for STAFF_MEMBER role', async () => {
      const mockUser = {
        id: 'user123',
        role: 'STAFF_MEMBER',
        function: 'SALES',
      }

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser)

      const testData = [
        { id: '1', name: 'Item 1', userId: 'user123' },
        { id: '2', name: 'Item 2', userId: 'user456' },
      ]

      const result = await accessControlManager.getAccessibleData('user123', 'sales', testData)

      expect(result).toEqual([{ id: '1', name: 'Item 1', userId: 'user123' }])
    })

    it('should return department data for MANAGER role', async () => {
      const mockUser = {
        id: 'user123',
        role: 'MANAGER',
        function: 'INVENTORY',
      }

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser)

      const testData = [
        { id: '1', name: 'Item 1', department: 'INVENTORY' },
        { id: '2', name: 'Item 2', department: 'SALES' },
        { id: '3', name: 'Item 3', department: 'INVENTORY' },
      ]

      const result = await accessControlManager.getAccessibleData('user123', 'inventory', testData)

      expect(result).toEqual([
        { id: '1', name: 'Item 1', department: 'INVENTORY' },
        { id: '3', name: 'Item 3', department: 'INVENTORY' },
      ])
    })

    it('should return empty array when user not found', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

      const testData = [{ id: '1', name: 'Item 1' }]

      const result = await accessControlManager.getAccessibleData('user123', 'inventory', testData)

      expect(result).toEqual([])
    })
  })

  describe('getUserPermissions', () => {
    it('should return all permissions for DIRECTOR', async () => {
      const mockUser = {
        id: 'user123',
        role: 'DIRECTOR',
        function: 'MANAGEMENT',
      }

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser)

      const result = await accessControlManager.getUserPermissions('user123')

      expect(result).toEqual([
        { module: '*', action: '*', resource: '*' }
      ])
    })

    it('should return specific permissions for other roles', async () => {
      const mockUser = {
        id: 'user123',
        role: 'STAFF_MEMBER',
        function: 'SALES',
      }

      const mockPermissions = [
        {
          id: 'perm1',
          userId: 'user123',
          module: 'sales',
          action: 'create',
          resource: 'quote',
          conditions: null,
        },
        {
          id: 'perm2',
          userId: 'user123',
          module: 'sales',
          action: 'read',
          resource: 'customer',
          conditions: null,
        },
      ]

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser)
      vi.mocked(prisma.userPermission.findMany).mockResolvedValue(mockPermissions)

      const result = await accessControlManager.getUserPermissions('user123')

      expect(result).toEqual([
        { module: 'sales', action: 'create', resource: 'quote' },
        { module: 'sales', action: 'read', resource: 'customer' },
      ])

      expect(prisma.userPermission.findMany).toHaveBeenCalledWith({
        where: { userId: 'user123' },
        select: {
          module: true,
          action: true,
          resource: true,
          conditions: true,
        },
      })
    })

    it('should return empty array when user not found', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

      const result = await accessControlManager.getUserPermissions('user123')

      expect(result).toEqual([])
    })
  })
})