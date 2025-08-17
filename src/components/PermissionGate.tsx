import React from 'react'
import { UserRole } from '@prisma/client'
import { useHasPermission, useHasRole } from '@/hooks/usePermissions'
import { Permission } from '@/lib/services/access-control-manager'

interface PermissionGateProps {
  children: React.ReactNode
  permission?: Permission
  roles?: UserRole[]
  fallback?: React.ReactNode
  requireAll?: boolean // If true, user must have ALL specified permissions/roles
}

/**
 * Component that conditionally renders children based on user permissions or roles
 */
export function PermissionGate({
  children,
  permission,
  roles,
  fallback = null,
  requireAll = false
}: PermissionGateProps) {
  const hasPermission = useHasPermission(permission || { module: '', action: '' })
  const hasRole = useHasRole(roles || [])

  // If both permission and roles are specified
  if (permission && roles) {
    const hasAccess = requireAll ? (hasPermission && hasRole) : (hasPermission || hasRole)
    return hasAccess ? <>{children}</> : <>{fallback}</>
  }

  // If only permission is specified
  if (permission) {
    return hasPermission ? <>{children}</> : <>{fallback}</>
  }

  // If only roles are specified
  if (roles) {
    return hasRole ? <>{children}</> : <>{fallback}</>
  }

  // If neither permission nor roles are specified, render children
  return <>{children}</>
}

/**
 * Component for admin-only content (Director and Manager roles)
 */
export function AdminOnly({ 
  children, 
  fallback = null 
}: { 
  children: React.ReactNode
  fallback?: React.ReactNode 
}) {
  return (
    <PermissionGate 
      roles={[UserRole.DIRECTOR, UserRole.MANAGER]} 
      fallback={fallback}
    >
      {children}
    </PermissionGate>
  )
}

/**
 * Component for management-only content (Director, Manager, HOD roles)
 */
export function ManagementOnly({ 
  children, 
  fallback = null 
}: { 
  children: React.ReactNode
  fallback?: React.ReactNode 
}) {
  return (
    <PermissionGate 
      roles={[UserRole.DIRECTOR, UserRole.MANAGER, UserRole.HOD]} 
      fallback={fallback}
    >
      {children}
    </PermissionGate>
  )
}

/**
 * Component for director-only content
 */
export function DirectorOnly({ 
  children, 
  fallback = null 
}: { 
  children: React.ReactNode
  fallback?: React.ReactNode 
}) {
  return (
    <PermissionGate 
      roles={[UserRole.DIRECTOR]} 
      fallback={fallback}
    >
      {children}
    </PermissionGate>
  )
}

/**
 * Component that shows content only to users with specific module access
 */
export function ModuleAccess({ 
  module,
  action = 'read',
  children, 
  fallback = null 
}: { 
  module: string
  action?: string
  children: React.ReactNode
  fallback?: React.ReactNode 
}) {
  return (
    <PermissionGate 
      permission={{ module, action }} 
      fallback={fallback}
    >
      {children}
    </PermissionGate>
  )
}

/**
 * Higher-order component that wraps a component with permission checking
 */
export function withPermission<P extends object>(
  Component: React.ComponentType<P>,
  permission: Permission,
  fallback?: React.ReactNode
) {
  return function PermissionWrappedComponent(props: P) {
    return (
      <PermissionGate permission={permission} fallback={fallback}>
        <Component {...props} />
      </PermissionGate>
    )
  }
}

/**
 * Higher-order component that wraps a component with role checking
 */
export function withRole<P extends object>(
  Component: React.ComponentType<P>,
  roles: UserRole[],
  fallback?: React.ReactNode
) {
  return function RoleWrappedComponent(props: P) {
    return (
      <PermissionGate roles={roles} fallback={fallback}>
        <Component {...props} />
      </PermissionGate>
    )
  }
}