import { NextRequest, NextResponse } from 'next/server'
import { accessControlManager, Permission } from '@/lib/services/access-control-manager'
import { UserRole } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    id: string
    email: string
    role: UserRole
    name?: string
  }
}

/**
 * Extract user ID from Authorization header or custom header
 */
async function getUserFromRequest(req: NextRequest): Promise<{ id: string; email: string; role: UserRole; name?: string } | null> {
  try {
    // For testing purposes, check for a custom user ID header
    const userId = req.headers.get('x-user-id')
    
    if (!userId) {
      return null
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true, name: true }
    })

    return user
  } catch (error) {
    console.error('Error getting user from request:', error)
    return null
  }
}

/**
 * Middleware to authenticate requests and attach user info
 */
export async function withAuth(
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    try {
      const user = await getUserFromRequest(req)
      
      if (!user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      }

      // Attach user info to request
      const authenticatedReq = req as AuthenticatedRequest
      authenticatedReq.user = user

      return handler(authenticatedReq)
    } catch (error) {
      console.error('Authentication middleware error:', error)
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 500 }
      )
    }
  }
}

/**
 * Middleware to check permissions for API routes
 */
export function withPermission(
  permission: Permission,
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>
) {
  return withAuth(async (req: AuthenticatedRequest) => {
    try {
      if (!req.user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      }

      const hasPermission = await accessControlManager.hasPermission(
        req.user.id,
        permission
      )

      if (!hasPermission) {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        )
      }

      return handler(req)
    } catch (error) {
      console.error('Permission middleware error:', error)
      return NextResponse.json(
        { error: 'Permission check failed' },
        { status: 500 }
      )
    }
  })
}

/**
 * Middleware to check if user has any of the specified roles
 */
export function withRole(
  roles: UserRole[],
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>
) {
  return withAuth(async (req: AuthenticatedRequest) => {
    try {
      if (!req.user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      }

      const hasRole = await accessControlManager.hasRole(req.user.id, roles)

      if (!hasRole) {
        return NextResponse.json(
          { error: 'Insufficient role permissions' },
          { status: 403 }
        )
      }

      return handler(req)
    } catch (error) {
      console.error('Role middleware error:', error)
      return NextResponse.json(
        { error: 'Role check failed' },
        { status: 500 }
      )
    }
  })
}

/**
 * Middleware for admin-only routes (Director and Manager roles)
 */
export function withAdminRole(
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>
) {
  return withRole([UserRole.DIRECTOR, UserRole.MANAGER], handler)
}

/**
 * Middleware for management roles (Director, Manager, HOD)
 */
export function withManagementRole(
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>
) {
  return withRole([UserRole.DIRECTOR, UserRole.MANAGER, UserRole.HOD], handler)
}

/**
 * Extract user ID from request parameters or body
 */
export function extractUserId(req: NextRequest): string | null {
  try {
    const url = new URL(req.url)
    const pathSegments = url.pathname.split('/')
    
    // Look for user ID in path segments
    const userIdFromPath = pathSegments.find(segment => 
      segment.length === 24 && /^[0-9a-fA-F]{24}$/.test(segment)
    )
    
    return userIdFromPath || null
  } catch (error) {
    console.error('Error extracting user ID:', error)
    return null
  }
}

/**
 * Middleware to ensure user can only access their own data
 */
export function withOwnDataAccess(
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>
) {
  return withAuth(async (req: AuthenticatedRequest) => {
    try {
      if (!req.user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      }

      // Directors and Managers can access any data
      if ([UserRole.DIRECTOR, UserRole.MANAGER].includes(req.user.role)) {
        return handler(req)
      }

      const targetUserId = extractUserId(req)
      
      // If no user ID in path, allow (might be creating new data)
      if (!targetUserId) {
        return handler(req)
      }

      // Check if user is accessing their own data
      if (targetUserId !== req.user.id) {
        return NextResponse.json(
          { error: 'Access denied: can only access own data' },
          { status: 403 }
        )
      }

      return handler(req)
    } catch (error) {
      console.error('Own data access middleware error:', error)
      return NextResponse.json(
        { error: 'Access check failed' },
        { status: 500 }
      )
    }
  })
}

/**
 * Create a permission object for common use cases
 */
export const createPermission = (module: string, action: string, resource?: string): Permission => ({
  module,
  action,
  resource
})

/**
 * Common permission constants
 */
export const PERMISSIONS = {
  // Dashboard
  DASHBOARD_READ: createPermission('dashboard', 'read'),
  
  // Sales
  SALES_READ: createPermission('sales', 'read'),
  SALES_CREATE: createPermission('sales', 'create'),
  SALES_UPDATE: createPermission('sales', 'update'),
  SALES_DELETE: createPermission('sales', 'delete'),
  
  // Customers
  CUSTOMERS_READ: createPermission('customers', 'read'),
  CUSTOMERS_CREATE: createPermission('customers', 'create'),
  CUSTOMERS_UPDATE: createPermission('customers', 'update'),
  CUSTOMERS_DELETE: createPermission('customers', 'delete'),
  
  // Inventory
  INVENTORY_READ: createPermission('inventory', 'read'),
  INVENTORY_CREATE: createPermission('inventory', 'create'),
  INVENTORY_UPDATE: createPermission('inventory', 'update'),
  INVENTORY_DELETE: createPermission('inventory', 'delete'),
  
  // Invoicing
  INVOICING_READ: createPermission('invoicing', 'read'),
  INVOICING_CREATE: createPermission('invoicing', 'create'),
  INVOICING_UPDATE: createPermission('invoicing', 'update'),
  INVOICING_DELETE: createPermission('invoicing', 'delete'),
  
  // HR
  HR_READ: createPermission('hr', 'read'),
  HR_CREATE: createPermission('hr', 'create'),
  HR_UPDATE: createPermission('hr', 'update'),
  HR_DELETE: createPermission('hr', 'delete'),
  
  // Accounting
  ACCOUNTING_READ: createPermission('accounting', 'read'),
  ACCOUNTING_CREATE: createPermission('accounting', 'create'),
  ACCOUNTING_UPDATE: createPermission('accounting', 'update'),
  ACCOUNTING_DELETE: createPermission('accounting', 'delete'),
  
  // Users
  USERS_READ: createPermission('users', 'read'),
  USERS_CREATE: createPermission('users', 'create'),
  USERS_UPDATE: createPermission('users', 'update'),
  USERS_DELETE: createPermission('users', 'delete'),
  
  // Settings
  SETTINGS_READ: createPermission('settings', 'read'),
  SETTINGS_UPDATE: createPermission('settings', 'update'),
  
  // Calendar
  CALENDAR_READ: createPermission('calendar', 'read'),
  CALENDAR_CREATE: createPermission('calendar', 'create'),
  CALENDAR_UPDATE: createPermission('calendar', 'update'),
  CALENDAR_DELETE: createPermission('calendar', 'delete'),
} as const