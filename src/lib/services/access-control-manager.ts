import { PrismaClient, UserRole, UserPermission } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export interface Permission {
  module: string
  action: string
  resource?: string
  conditions?: Record<string, any>
}

export interface DataAccessRule {
  module: string
  field?: string
  condition: (userId: string, data: any) => boolean
}

export interface RolePermissions {
  role: UserRole
  permissions: Permission[]
  dataAccess: DataAccessRule[]
}

export class AccessControlManager {
  private static instance: AccessControlManager
  private roleHierarchy: Map<UserRole, UserRole[]>
  private defaultPermissions: Map<UserRole, Permission[]>

  constructor() {
    this.initializeRoleHierarchy()
    this.initializeDefaultPermissions()
  }

  static getInstance(): AccessControlManager {
    if (!AccessControlManager.instance) {
      AccessControlManager.instance = new AccessControlManager()
    }
    return AccessControlManager.instance
  }

  private initializeRoleHierarchy(): void {
    this.roleHierarchy = new Map([
      [UserRole.DIRECTOR, [UserRole.MANAGER, UserRole.HOD, UserRole.SALES_REP, UserRole.INTERNAL_CONSULTANT, UserRole.INVENTORY_MANAGER, UserRole.HR_STAFF, UserRole.ACCOUNTANT, UserRole.STAFF_MEMBER, UserRole.USER]],
      [UserRole.MANAGER, [UserRole.SALES_REP, UserRole.INTERNAL_CONSULTANT, UserRole.STAFF_MEMBER, UserRole.USER]],
      [UserRole.HOD, [UserRole.STAFF_MEMBER, UserRole.USER]],
      [UserRole.SALES_REP, []],
      [UserRole.INTERNAL_CONSULTANT, []],
      [UserRole.INVENTORY_MANAGER, []],
      [UserRole.HR_STAFF, []],
      [UserRole.ACCOUNTANT, []],
      [UserRole.STAFF_MEMBER, []],
      [UserRole.USER, []]
    ])
  }

  private initializeDefaultPermissions(): void {
    this.defaultPermissions = new Map([
      [UserRole.DIRECTOR, [
        { module: '*', action: '*' }, // Full access to everything
      ]],
      [UserRole.MANAGER, [
        { module: 'dashboard', action: 'read' },
        { module: 'sales', action: '*' },
        { module: 'customers', action: '*' },
        { module: 'inventory', action: 'read' },
        { module: 'inventory', action: 'update' },
        { module: 'invoicing', action: '*' },
        { module: 'accounting', action: 'read' },
        { module: 'hr', action: 'read' },
        { module: 'calendar', action: '*' },
        { module: 'users', action: 'read' },
      ]],
      [UserRole.HOD, [
        { module: 'dashboard', action: 'read' },
        { module: 'sales', action: 'read' },
        { module: 'customers', action: 'read' },
        { module: 'inventory', action: 'read' },
        { module: 'hr', action: '*', conditions: { department: 'own' } },
        { module: 'calendar', action: '*' },
        { module: 'users', action: 'read', conditions: { department: 'own' } },
      ]],
      [UserRole.SALES_REP, [
        { module: 'dashboard', action: 'read' },
        { module: 'sales', action: '*', conditions: { ownRecords: true } },
        { module: 'customers', action: '*' },
        { module: 'inventory', action: 'read' },
        { module: 'invoicing', action: '*', conditions: { ownRecords: true } },
        { module: 'calendar', action: '*' },
      ]],
      [UserRole.INTERNAL_CONSULTANT, [
        { module: 'dashboard', action: 'read' },
        { module: 'sales', action: 'read' },
        { module: 'customers', action: 'read' },
        { module: 'inventory', action: 'read' },
        { module: 'calendar', action: '*' },
      ]],
      [UserRole.INVENTORY_MANAGER, [
        { module: 'dashboard', action: 'read' },
        { module: 'inventory', action: '*' },
        { module: 'sales', action: 'read' },
        { module: 'customers', action: 'read' },
        { module: 'calendar', action: '*' },
      ]],
      [UserRole.HR_STAFF, [
        { module: 'dashboard', action: 'read' },
        { module: 'hr', action: '*' },
        { module: 'users', action: '*' },
        { module: 'calendar', action: '*' },
      ]],
      [UserRole.ACCOUNTANT, [
        { module: 'dashboard', action: 'read' },
        { module: 'accounting', action: '*' },
        { module: 'sales', action: 'read' },
        { module: 'invoicing', action: 'read' },
        { module: 'customers', action: 'read' },
        { module: 'calendar', action: '*' },
      ]],
      [UserRole.STAFF_MEMBER, [
        { module: 'dashboard', action: 'read' },
        { module: 'calendar', action: 'read' },
        { module: 'hr', action: 'read', conditions: { ownRecords: true } },
      ]],
      [UserRole.USER, [
        { module: 'dashboard', action: 'read' },
        { module: 'calendar', action: 'read' },
      ]]
    ])
  }

  /**
   * Check if a user has permission to perform an action
   */
  async hasPermission(userId: string, permission: Permission): Promise<boolean> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { permissions: true }
      })

      if (!user) {
        return false
      }

      // Check if user has explicit permission
      const explicitPermission = user.permissions.find(p => 
        this.matchesPermission(p, permission)
      )

      if (explicitPermission) {
        return true
      }

      // Check role-based permissions
      const rolePermissions = this.getRolePermissions(user.role)
      return this.checkRolePermission(rolePermissions, permission, userId)
    } catch (error) {
      console.error('Error checking permission:', error)
      return false
    }
  }

  /**
   * Filter data based on user's access permissions
   */
  async getAccessibleData<T extends Record<string, any>>(
    userId: string, 
    module: string, 
    data: T[]
  ): Promise<T[]> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { permissions: true }
      })

      if (!user) {
        return []
      }

      // Directors have access to all data
      if (user.role === UserRole.DIRECTOR) {
        return data
      }

      // Apply role-based data filtering
      return data.filter(item => this.canAccessData(user, module, item))
    } catch (error) {
      console.error('Error filtering accessible data:', error)
      return []
    }
  }

  /**
   * Get all permissions for a user (role-based + explicit)
   */
  async getUserPermissions(userId: string): Promise<Permission[]> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { permissions: true }
      })

      if (!user) {
        return []
      }

      const rolePermissions = this.getRolePermissions(user.role)
      const explicitPermissions = user.permissions.map(p => ({
        module: p.module,
        action: p.action,
        resource: p.resource || undefined,
        conditions: p.conditions as Record<string, any> || undefined
      }))

      return [...rolePermissions, ...explicitPermissions]
    } catch (error) {
      console.error('Error getting user permissions:', error)
      return []
    }
  }

  /**
   * Grant permission to a user
   */
  async grantPermission(
    userId: string, 
    permission: Permission, 
    grantedBy: string
  ): Promise<void> {
    try {
      await prisma.userPermission.create({
        data: {
          userId,
          module: permission.module,
          action: permission.action,
          resource: permission.resource,
          conditions: permission.conditions,
          grantedBy
        }
      })
    } catch (error) {
      console.error('Error granting permission:', error)
      throw new Error('Failed to grant permission')
    }
  }

  /**
   * Revoke permission from a user
   */
  async revokePermission(userId: string, permission: Permission): Promise<void> {
    try {
      await prisma.userPermission.deleteMany({
        where: {
          userId,
          module: permission.module,
          action: permission.action,
          resource: permission.resource
        }
      })
    } catch (error) {
      console.error('Error revoking permission:', error)
      throw new Error('Failed to revoke permission')
    }
  }

  /**
   * Check if user can access specific data based on role and conditions
   */
  private canAccessData(user: any, module: string, data: any): boolean {
    const rolePermissions = this.getRolePermissions(user.role)
    
    // Find relevant permission for this module
    const permission = rolePermissions.find(p => 
      p.module === module || p.module === '*'
    )

    if (!permission) {
      return false
    }

    // Apply conditions if they exist
    if (permission.conditions) {
      return this.evaluateConditions(permission.conditions, user, data)
    }

    return true
  }

  /**
   * Evaluate permission conditions
   */
  private evaluateConditions(
    conditions: Record<string, any>, 
    user: any, 
    data: any
  ): boolean {
    if (conditions.ownRecords && data.userId !== user.id) {
      return false
    }

    if (conditions.department === 'own' && data.department !== user.department) {
      return false
    }

    return true
  }

  /**
   * Get permissions for a specific role
   */
  private getRolePermissions(role: UserRole): Permission[] {
    return this.defaultPermissions.get(role) || []
  }

  /**
   * Check if a role-based permission matches the requested permission
   */
  private checkRolePermission(
    rolePermissions: Permission[], 
    requestedPermission: Permission,
    userId: string
  ): boolean {
    return rolePermissions.some(p => {
      // Check module match (wildcard or exact)
      const moduleMatch = p.module === '*' || p.module === requestedPermission.module
      
      // Check action match (wildcard or exact)
      const actionMatch = p.action === '*' || p.action === requestedPermission.action
      
      // Check resource match (if specified)
      const resourceMatch = !p.resource || p.resource === requestedPermission.resource
      
      return moduleMatch && actionMatch && resourceMatch
    })
  }

  /**
   * Check if explicit permission matches requested permission
   */
  private matchesPermission(
    userPermission: UserPermission, 
    requestedPermission: Permission
  ): boolean {
    const moduleMatch = userPermission.module === requestedPermission.module
    const actionMatch = userPermission.action === requestedPermission.action
    const resourceMatch = !userPermission.resource || 
                         userPermission.resource === requestedPermission.resource
    
    return moduleMatch && actionMatch && resourceMatch
  }

  /**
   * Check if user has any of the specified roles
   */
  async hasRole(userId: string, roles: UserRole[]): Promise<boolean> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true }
      })

      return user ? roles.includes(user.role) : false
    } catch (error) {
      console.error('Error checking user role:', error)
      return false
    }
  }

  /**
   * Check if user role has access to subordinate roles
   */
  canManageRole(managerRole: UserRole, targetRole: UserRole): boolean {
    const subordinates = this.roleHierarchy.get(managerRole) || []
    return subordinates.includes(targetRole)
  }
}

export const accessControlManager = AccessControlManager.getInstance()