import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { UserRole } from '@prisma/client'

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    userPermission: {
      create: vi.fn(),
      deleteMany: vi.fn(),
    }
  }
}))

// Import after mocking
import { AccessControlManager, Permission } from '../access-control-manager'
import { prisma } from '@/lib/prisma'

const mockPrisma = prisma as any

describe('AccessControlManager', () => {
  let accessControlManager: AccessControlManager
  
  beforeEach(() => {
    accessControlManager = new AccessControlManager()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('Role Hierarchy Tests', () => {
    it('should allow directors to manage all roles', () => {
      expect(accessControlManager.canManageRole(UserRole.DIRECTOR, UserRole.MANAGER)).toBe(true)
      expect(accessControlManager.canManageRole(UserRole.DIRECTOR, UserRole.HOD)).toBe(true)
      expect(accessControlManager.canManageRole(UserRole.DIRECTOR, UserRole.SALES_REP)).toBe(true)
      expect(accessControlManager.canManageRole(UserRole.DIRECTOR, UserRole.USER)).toBe(true)
    })

    it('should allow managers to manage subordinate roles only', () => {
      expect(accessControlManager.canManageRole(UserRole.MANAGER, UserRole.SALES_REP)).toBe(true)
      expect(accessControlManager.canManageRole(UserRole.MANAGER, UserRole.STAFF_MEMBER)).toBe(true)
      expect(accessControlManager.canManageRole(UserRole.MANAGER, UserRole.USER)).toBe(true)
      expect(accessControlManager.canManageRole(UserRole.MANAGER, UserRole.DIRECTOR)).toBe(false)
      expect(accessControlManager.canManageRole(UserRole.MANAGER, UserRole.HOD)).toBe(false)
    })

    it('should allow HODs to manage staff members and users only', () => {
      expect(accessControlManager.canManageRole(UserRole.HOD, UserRole.STAFF_MEMBER)).toBe(true)
      expect(accessControlManager.canManageRole(UserRole.HOD, UserRole.USER)).toBe(true)
      expect(accessControlManager.canManageRole(UserRole.HOD, UserRole.MANAGER)).toBe(false)
      expect(accessControlManager.canManageRole(UserRole.HOD, UserRole.SALES_REP)).toBe(false)
    })

    it('should not allow staff members to manage any roles', () => {
      expect(accessControlManager.canManageRole(UserRole.STAFF_MEMBER, UserRole.USER)).toBe(false)
      expect(accessControlManager.canManageRole(UserRole.USER, UserRole.STAFF_MEMBER)).toBe(false)
    })
  })

  describe('Permission Checking Tests', () => {
    const mockUser = {
      id: 'user123',
      role: UserRole.SALES_REP,
      permissions: []
    }

    beforeEach(() => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser)
    })

    it('should grant director full access to all modules', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        role: UserRole.DIRECTOR
      })

      const permission: Permission = { module: 'inventory', action: 'delete' }
      const result = await accessControlManager.hasPermission('user123', permission)
      
      expect(result).toBe(true)
    })

    it('should allow sales rep to access sales module', async () => {
      const permission: Permission = { module: 'sales', action: 'create' }
      const result = await accessControlManager.hasPermission('user123', permission)
      
      expect(result).toBe(true)
    })

    it('should deny sales rep access to HR module', async () => {
      const permission: Permission = { module: 'hr', action: 'read' }
      const result = await accessControlManager.hasPermission('user123', permission)
      
      expect(result).toBe(false)
    })

    it('should allow inventory manager full access to inventory', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        role: UserRole.INVENTORY_MANAGER
      })

      const permission: Permission = { module: 'inventory', action: 'delete' }
      const result = await accessControlManager.hasPermission('user123', permission)
      
      expect(result).toBe(true)
    })

    it('should allow HR staff full access to HR module', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        role: UserRole.HR_STAFF
      })

      const permission: Permission = { module: 'hr', action: 'update' }
      const result = await accessControlManager.hasPermission('user123', permission)
      
      expect(result).toBe(true)
    })

    it('should allow accountant full access to accounting module', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        role: UserRole.ACCOUNTANT
      })

      const permission: Permission = { module: 'accounting', action: 'create' }
      const result = await accessControlManager.hasPermission('user123', permission)
      
      expect(result).toBe(true)
    })

    it('should limit staff member access to basic modules only', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        role: UserRole.STAFF_MEMBER
      })

      const dashboardPermission: Permission = { module: 'dashboard', action: 'read' }
      const salesPermission: Permission = { module: 'sales', action: 'create' }
      
      expect(await accessControlManager.hasPermission('user123', dashboardPermission)).toBe(true)
      expect(await accessControlManager.hasPermission('user123', salesPermission)).toBe(false)
    })
  })

  describe('Explicit Permission Tests', () => {
    it('should grant explicit permissions even if role doesnt allow', async () => {
      const mockUserWithPermissions = {
        id: 'user123',
        role: UserRole.USER,
        permissions: [{
          module: 'sales',
          action: 'read',
          resource: null,
          conditions: null
        }]
      }

      mockPrisma.user.findUnique.mockResolvedValue(mockUserWithPermissions)

      const permission: Permission = { module: 'sales', action: 'read' }
      const result = await accessControlManager.hasPermission('user123', permission)
      
      expect(result).toBe(true)
    })

    it('should handle permission granting', async () => {
      const permission: Permission = { module: 'inventory', action: 'update' }
      
      await accessControlManager.grantPermission('user123', permission, 'admin123')
      
      expect(mockPrisma.userPermission.create).toHaveBeenCalledWith({
        data: {
          userId: 'user123',
          module: 'inventory',
          action: 'update',
          resource: undefined,
          conditions: undefined,
          grantedBy: 'admin123'
        }
      })
    })

    it('should handle permission revocation', async () => {
      const permission: Permission = { module: 'inventory', action: 'update' }
      
      await accessControlManager.revokePermission('user123', permission)
      
      expect(mockPrisma.userPermission.deleteMany).toHaveBeenCalledWith({
        where: {
          userId: 'user123',
          module: 'inventory',
          action: 'update',
          resource: undefined
        }
      })
    })
  })

  describe('Data Access Filtering Tests', () => {
    it('should allow directors to access all data', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'director123',
        role: UserRole.DIRECTOR,
        permissions: []
      })

      const testData = [
        { id: '1', userId: 'other1', name: 'Item 1' },
        { id: '2', userId: 'other2', name: 'Item 2' }
      ]

      const result = await accessControlManager.getAccessibleData('director123', 'sales', testData)
      
      expect(result).toEqual(testData)
    })

    it('should filter data for sales rep to own records only', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'salesrep123',
        role: UserRole.SALES_REP,
        permissions: []
      })

      const testData = [
        { id: '1', userId: 'salesrep123', name: 'My Sale' },
        { id: '2', userId: 'other123', name: 'Other Sale' }
      ]

      const result = await accessControlManager.getAccessibleData('salesrep123', 'sales', testData)
      
      expect(result).toHaveLength(1)
      expect(result[0].userId).toBe('salesrep123')
    })

    it('should return empty array for non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)

      const testData = [{ id: '1', name: 'Item 1' }]
      const result = await accessControlManager.getAccessibleData('nonexistent', 'sales', testData)
      
      expect(result).toEqual([])
    })
  })

  describe('Role Checking Tests', () => {
    it('should correctly identify user roles', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        role: UserRole.MANAGER
      })

      const hasManagerRole = await accessControlManager.hasRole('user123', [UserRole.MANAGER])
      const hasDirectorRole = await accessControlManager.hasRole('user123', [UserRole.DIRECTOR])
      const hasAnyRole = await accessControlManager.hasRole('user123', [UserRole.MANAGER, UserRole.DIRECTOR])
      
      expect(hasManagerRole).toBe(true)
      expect(hasDirectorRole).toBe(false)
      expect(hasAnyRole).toBe(true)
    })

    it('should return false for non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)

      const result = await accessControlManager.hasRole('nonexistent', [UserRole.USER])
      
      expect(result).toBe(false)
    })
  })

  describe('Error Handling Tests', () => {
    it('should handle database errors gracefully in permission check', async () => {
      mockPrisma.user.findUnique.mockRejectedValue(new Error('Database error'))

      const permission: Permission = { module: 'sales', action: 'read' }
      const result = await accessControlManager.hasPermission('user123', permission)
      
      expect(result).toBe(false)
    })

    it('should handle database errors gracefully in data filtering', async () => {
      mockPrisma.user.findUnique.mockRejectedValue(new Error('Database error'))

      const testData = [{ id: '1', name: 'Item 1' }]
      const result = await accessControlManager.getAccessibleData('user123', 'sales', testData)
      
      expect(result).toEqual([])
    })

    it('should throw error when granting permission fails', async () => {
      mockPrisma.userPermission.create.mockRejectedValue(new Error('Database error'))

      const permission: Permission = { module: 'sales', action: 'read' }
      
      await expect(
        accessControlManager.grantPermission('user123', permission, 'admin123')
      ).rejects.toThrow('Failed to grant permission')
    })

    it('should throw error when revoking permission fails', async () => {
      mockPrisma.userPermission.deleteMany.mockRejectedValue(new Error('Database error'))

      const permission: Permission = { module: 'sales', action: 'read' }
      
      await expect(
        accessControlManager.revokePermission('user123', permission)
      ).rejects.toThrow('Failed to revoke permission')
    })
  })

  describe('Permission Conditions Tests', () => {
    it('should handle department-based permissions for HOD', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'hod123',
        role: UserRole.HOD,
        department: 'IT',
        permissions: []
      })

      const testData = [
        { id: '1', department: 'IT', name: 'IT Employee' },
        { id: '2', department: 'HR', name: 'HR Employee' }
      ]

      const result = await accessControlManager.getAccessibleData('hod123', 'hr', testData)
      
      expect(result).toHaveLength(1)
      expect(result[0].department).toBe('IT')
    })

    it('should handle own records condition for sales rep', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'salesrep123',
        role: UserRole.SALES_REP,
        permissions: []
      })

      const testData = [
        { id: '1', userId: 'salesrep123', total: 1000 },
        { id: '2', userId: 'other123', total: 2000 }
      ]

      const result = await accessControlManager.getAccessibleData('salesrep123', 'sales', testData)
      
      expect(result).toHaveLength(1)
      expect(result[0].userId).toBe('salesrep123')
    })
  })

  describe('getUserPermissions Tests', () => {
    it('should return combined role and explicit permissions', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user123',
        role: UserRole.SALES_REP,
        permissions: [{
          module: 'inventory',
          action: 'read',
          resource: 'products',
          conditions: null
        }]
      })

      const permissions = await accessControlManager.getUserPermissions('user123')
      
      expect(permissions.length).toBeGreaterThan(0)
      expect(permissions.some(p => p.module === 'sales')).toBe(true) // Role permission
      expect(permissions.some(p => p.module === 'inventory' && p.resource === 'products')).toBe(true) // Explicit permission
    })

    it('should return empty array for non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)

      const permissions = await accessControlManager.getUserPermissions('nonexistent')
      
      expect(permissions).toEqual([])
    })
  })
})