import { useState, useEffect } from 'react'
import { UserRole } from '@prisma/client'
import { Permission } from '@/lib/services/access-control-manager'

// Mock session interface for development
interface MockSession {
  user?: {
    id: string
    email: string
    role: UserRole
  }
}

// Mock useSession hook for development - replace with actual auth when implemented
function useSession(): { data: MockSession | null; status: string } {
  // For development, return a mock session
  // In production, this should be replaced with actual authentication
  return {
    data: {
      user: {
        id: 'mock-user-id',
        email: 'dev@example.com',
        role: UserRole.DIRECTOR // Use DIRECTOR for testing all features
      }
    },
    status: 'authenticated'
  }
}

interface UsePermissionsReturn {
  permissions: Permission[]
  hasPermission: (permission: Permission) => boolean
  hasRole: (roles: UserRole[]) => boolean
  isLoading: boolean
  error: string | null
}

/**
 * Hook to manage user permissions in React components
 */
export function usePermissions(): UsePermissionsReturn {
  const { data: session, status } = useSession()
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchPermissions() {
      if (status === 'loading') return
      
      if (!session?.user?.id) {
        setIsLoading(false)
        setError('User not authenticated')
        return
      }

      try {
        setIsLoading(true)
        setError(null)

        const response = await fetch('/api/permissions')
        
        if (!response.ok) {
          throw new Error('Failed to fetch permissions')
        }

        const data = await response.json()
        setPermissions(data.permissions || [])
      } catch (err) {
        console.error('Error fetching permissions:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setIsLoading(false)
      }
    }

    fetchPermissions()
  }, [session?.user?.id, status])

  const hasPermission = (permission: Permission): boolean => {
    if (!session?.user) return false

    // Directors have all permissions
    if (session.user.role === UserRole.DIRECTOR) {
      return true
    }

    // Check explicit permissions
    return permissions.some(p => {
      const moduleMatch = p.module === '*' || p.module === permission.module
      const actionMatch = p.action === '*' || p.action === permission.action
      const resourceMatch = !p.resource || p.resource === permission.resource
      
      return moduleMatch && actionMatch && resourceMatch
    })
  }

  const hasRole = (roles: UserRole[]): boolean => {
    if (!session?.user?.role) return false
    return roles.includes(session.user.role as UserRole)
  }

  return {
    permissions,
    hasPermission,
    hasRole,
    isLoading,
    error
  }
}

/**
 * Hook to check a specific permission
 */
export function useHasPermission(permission: Permission): boolean {
  const { hasPermission } = usePermissions()
  return hasPermission(permission)
}

/**
 * Hook to check if user has any of the specified roles
 */
export function useHasRole(roles: UserRole[]): boolean {
  const { hasRole } = usePermissions()
  return hasRole(roles)
}

/**
 * Hook for admin-only features (Director and Manager)
 */
export function useIsAdmin(): boolean {
  return useHasRole([UserRole.DIRECTOR, UserRole.MANAGER])
}

/**
 * Hook for management roles (Director, Manager, HOD)
 */
export function useIsManagement(): boolean {
  return useHasRole([UserRole.DIRECTOR, UserRole.MANAGER, UserRole.HOD])
}

/**
 * Common permission constants for use in components
 */
export const UI_PERMISSIONS = {
  // Dashboard
  VIEW_DASHBOARD: { module: 'dashboard', action: 'read' },
  
  // Sales
  VIEW_SALES: { module: 'sales', action: 'read' },
  CREATE_SALES: { module: 'sales', action: 'create' },
  EDIT_SALES: { module: 'sales', action: 'update' },
  DELETE_SALES: { module: 'sales', action: 'delete' },
  
  // Customers
  VIEW_CUSTOMERS: { module: 'customers', action: 'read' },
  CREATE_CUSTOMERS: { module: 'customers', action: 'create' },
  EDIT_CUSTOMERS: { module: 'customers', action: 'update' },
  DELETE_CUSTOMERS: { module: 'customers', action: 'delete' },
  
  // Inventory
  VIEW_INVENTORY: { module: 'inventory', action: 'read' },
  CREATE_INVENTORY: { module: 'inventory', action: 'create' },
  EDIT_INVENTORY: { module: 'inventory', action: 'update' },
  DELETE_INVENTORY: { module: 'inventory', action: 'delete' },
  
  // Invoicing
  VIEW_INVOICES: { module: 'invoicing', action: 'read' },
  CREATE_INVOICES: { module: 'invoicing', action: 'create' },
  EDIT_INVOICES: { module: 'invoicing', action: 'update' },
  DELETE_INVOICES: { module: 'invoicing', action: 'delete' },
  
  // HR
  VIEW_HR: { module: 'hr', action: 'read' },
  CREATE_HR: { module: 'hr', action: 'create' },
  EDIT_HR: { module: 'hr', action: 'update' },
  DELETE_HR: { module: 'hr', action: 'delete' },
  
  // Accounting
  VIEW_ACCOUNTING: { module: 'accounting', action: 'read' },
  CREATE_ACCOUNTING: { module: 'accounting', action: 'create' },
  EDIT_ACCOUNTING: { module: 'accounting', action: 'update' },
  DELETE_ACCOUNTING: { module: 'accounting', action: 'delete' },
  
  // Users
  VIEW_USERS: { module: 'users', action: 'read' },
  CREATE_USERS: { module: 'users', action: 'create' },
  EDIT_USERS: { module: 'users', action: 'update' },
  DELETE_USERS: { module: 'users', action: 'delete' },
  
  // Settings
  VIEW_SETTINGS: { module: 'settings', action: 'read' },
  EDIT_SETTINGS: { module: 'settings', action: 'update' },
  
  // Calendar
  VIEW_CALENDAR: { module: 'calendar', action: 'read' },
  CREATE_CALENDAR: { module: 'calendar', action: 'create' },
  EDIT_CALENDAR: { module: 'calendar', action: 'update' },
  DELETE_CALENDAR: { module: 'calendar', action: 'delete' },
} as const