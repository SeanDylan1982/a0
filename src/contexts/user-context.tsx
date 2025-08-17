'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { UserRole, NotificationType } from '@prisma/client'
import { Permission } from '@/lib/services/access-control-manager'
import { usePermissions } from '@/hooks/usePermissions'
import { useNotifications, useNotificationCount } from '@/hooks/useNotifications'
import { useSocketNotifications } from '@/hooks/use-socket'

// Mock session interface for development
interface MockSession {
  user?: {
    id: string
    email: string
    name?: string
    role: UserRole
  }
}

// Mock useSession hook for development - replace with actual auth when implemented
function useSession(): { data: MockSession | null; status: string } {
  return {
    data: {
      user: {
        id: 'mock-user-id',
        email: 'dev@example.com',
        name: 'Development User',
        role: UserRole.DIRECTOR // Use DIRECTOR for testing all features
      }
    },
    status: 'authenticated'
  }
}

interface UserContextType {
  // User data
  user: MockSession['user'] | null
  isAuthenticated: boolean
  isLoading: boolean
  
  // Permissions
  permissions: Permission[]
  hasPermission: (permission: Permission) => boolean
  hasRole: (roles: UserRole[]) => boolean
  isAdmin: boolean
  isManagement: boolean
  
  // Notifications
  unreadNotificationCounts: Record<NotificationType, number>
  totalUnreadCount: number
  refreshNotificationCounts: () => void
  
  // Real-time updates
  isSocketConnected: boolean
  
  // Error states
  error: string | null
}

const UserContext = createContext<UserContextType | undefined>(undefined)

interface UserProviderProps {
  children: ReactNode
}

export function UserProvider({ children }: UserProviderProps) {
  const { data: session, status } = useSession()
  const [error, setError] = useState<string | null>(null)
  
  // Permissions
  const {
    permissions,
    hasPermission,
    hasRole,
    isLoading: permissionsLoading,
    error: permissionsError
  } = usePermissions()
  
  // Notification counts for different types
  const { count: calendarCount } = useNotificationCount(NotificationType.CALENDAR_REMINDER)
  const { count: messageCount } = useNotificationCount(NotificationType.MESSAGE)
  const { count: noticeBoardCount } = useNotificationCount(NotificationType.NOTICE_BOARD)
  const { count: inventoryAlertCount } = useNotificationCount(NotificationType.INVENTORY_ALERT)
  const { count: activityCount } = useNotificationCount(NotificationType.ACTIVITY)
  const { count: systemCount } = useNotificationCount(NotificationType.SYSTEM)
  
  // Real-time notifications
  const { 
    counts: realtimeCounts, 
    subscribed: isSocketConnected 
  } = useSocketNotifications()
  
  // Combine static and real-time counts
  const unreadNotificationCounts: Record<NotificationType, number> = {
    [NotificationType.CALENDAR_REMINDER]: realtimeCounts[NotificationType.CALENDAR_REMINDER] ?? calendarCount,
    [NotificationType.MESSAGE]: realtimeCounts[NotificationType.MESSAGE] ?? messageCount,
    [NotificationType.NOTICE_BOARD]: realtimeCounts[NotificationType.NOTICE_BOARD] ?? noticeBoardCount,
    [NotificationType.INVENTORY_ALERT]: realtimeCounts[NotificationType.INVENTORY_ALERT] ?? inventoryAlertCount,
    [NotificationType.ACTIVITY]: realtimeCounts[NotificationType.ACTIVITY] ?? activityCount,
    [NotificationType.SYSTEM]: realtimeCounts[NotificationType.SYSTEM] ?? systemCount,
  }
  
  const totalUnreadCount = Object.values(unreadNotificationCounts).reduce((sum, count) => sum + count, 0)
  
  // Derived values
  const isAuthenticated = status === 'authenticated' && !!session?.user
  const isLoading = status === 'loading' || permissionsLoading
  const isAdmin = hasRole([UserRole.DIRECTOR, UserRole.MANAGER])
  const isManagement = hasRole([UserRole.DIRECTOR, UserRole.MANAGER, UserRole.HOD])
  
  // Handle errors
  useEffect(() => {
    if (permissionsError) {
      setError(permissionsError)
    } else {
      setError(null)
    }
  }, [permissionsError])
  
  // Refresh notification counts
  const refreshNotificationCounts = () => {
    // This would trigger a refetch of notification counts
    // The actual implementation would depend on the query client
    window.location.reload() // Temporary solution for development
  }
  
  const contextValue: UserContextType = {
    // User data
    user: session?.user || null,
    isAuthenticated,
    isLoading,
    
    // Permissions
    permissions,
    hasPermission,
    hasRole,
    isAdmin,
    isManagement,
    
    // Notifications
    unreadNotificationCounts,
    totalUnreadCount,
    refreshNotificationCounts,
    
    // Real-time updates
    isSocketConnected,
    
    // Error states
    error
  }
  
  return (
    <UserContext.Provider value={contextValue}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}

// Convenience hooks that use the user context
export function useCurrentUser() {
  const { user } = useUser()
  return user
}

export function useUserPermissions() {
  const { permissions, hasPermission, hasRole, isAdmin, isManagement } = useUser()
  return { permissions, hasPermission, hasRole, isAdmin, isManagement }
}

export function useUserNotifications() {
  const { 
    unreadNotificationCounts, 
    totalUnreadCount, 
    refreshNotificationCounts,
    isSocketConnected 
  } = useUser()
  return { 
    unreadNotificationCounts, 
    totalUnreadCount, 
    refreshNotificationCounts,
    isSocketConnected 
  }
}