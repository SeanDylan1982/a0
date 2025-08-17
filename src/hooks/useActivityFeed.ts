import { useState, useEffect, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ActivityLog, UserRole } from '@prisma/client'
import { useSocketActivities } from '@/hooks/use-socket'
import { useUser } from '@/contexts/user-context'

export interface ActivityFilters {
  modules?: string[]
  actions?: string[]
  entityTypes?: string[]
  userId?: string
  startDate?: Date
  endDate?: Date
  limit?: number
  offset?: number
}

export interface ActivityFeedOptions {
  filters?: ActivityFilters
  enableRealtime?: boolean
  autoRefresh?: boolean
  refreshInterval?: number
}

interface ActivityLogWithUser extends ActivityLog {
  user: {
    id: string
    email: string
    name?: string
    role: UserRole
  }
}

// API functions
const fetchActivities = async (filters?: ActivityFilters): Promise<ActivityLogWithUser[]> => {
  const params = new URLSearchParams()
  
  if (filters?.modules?.length) {
    filters.modules.forEach(module => params.append('modules', module))
  }
  if (filters?.actions?.length) {
    filters.actions.forEach(action => params.append('actions', action))
  }
  if (filters?.entityTypes?.length) {
    filters.entityTypes.forEach(type => params.append('entityTypes', type))
  }
  if (filters?.userId) params.append('userId', filters.userId)
  if (filters?.startDate) params.append('startDate', filters.startDate.toISOString())
  if (filters?.endDate) params.append('endDate', filters.endDate.toISOString())
  if (filters?.limit) params.append('limit', filters.limit.toString())
  if (filters?.offset) params.append('offset', filters.offset.toString())

  const response = await fetch(`/api/activities?${params}`)
  if (!response.ok) {
    throw new Error('Failed to fetch activities')
  }
  
  const data = await response.json()
  return data.activities
}

const fetchActivitiesByRole = async (userId: string, role: UserRole, filters?: ActivityFilters): Promise<ActivityLogWithUser[]> => {
  const params = new URLSearchParams()
  params.append('userId', userId)
  params.append('role', role)
  
  if (filters?.modules?.length) {
    filters.modules.forEach(module => params.append('modules', module))
  }
  if (filters?.actions?.length) {
    filters.actions.forEach(action => params.append('actions', action))
  }
  if (filters?.entityTypes?.length) {
    filters.entityTypes.forEach(type => params.append('entityTypes', type))
  }
  if (filters?.startDate) params.append('startDate', filters.startDate.toISOString())
  if (filters?.endDate) params.append('endDate', filters.endDate.toISOString())
  if (filters?.limit) params.append('limit', filters.limit.toString())
  if (filters?.offset) params.append('offset', filters.offset.toString())

  const response = await fetch(`/api/activities?${params}`)
  if (!response.ok) {
    throw new Error('Failed to fetch role-based activities')
  }
  
  const data = await response.json()
  return data.activities
}

/**
 * Hook for managing activity feed with role-based filtering and real-time updates
 */
export function useActivityFeed(options: ActivityFeedOptions = {}) {
  const { 
    filters, 
    enableRealtime = true, 
    autoRefresh = false, 
    refreshInterval = 60000 
  } = options
  
  const { user, hasRole } = useUser()
  const queryClient = useQueryClient()
  const [localActivities, setLocalActivities] = useState<ActivityLogWithUser[]>([])
  
  // Determine which modules the user can see based on their role
  const getAccessibleModules = useCallback(() => {
    if (!user) return []
    
    // Directors can see all modules
    if (hasRole([UserRole.DIRECTOR])) {
      return undefined // undefined means all modules
    }
    
    // Managers can see their functional area modules
    if (hasRole([UserRole.MANAGER])) {
      return ['sales', 'inventory', 'customers', 'invoicing', 'accounting']
    }
    
    // HODs can see department-specific modules
    if (hasRole([UserRole.HOD])) {
      return ['hr', 'users', 'calendar']
    }
    
    // Other roles see limited modules
    const roleModuleMap: Record<UserRole, string[]> = {
      [UserRole.SALES_REP]: ['sales', 'customers', 'invoicing'],
      [UserRole.INTERNAL_CONSULTANT]: ['sales', 'customers'],
      [UserRole.INVENTORY_MANAGER]: ['inventory', 'sales'],
      [UserRole.HR_STAFF]: ['hr', 'users'],
      [UserRole.ACCOUNTANT]: ['accounting', 'invoicing', 'sales'],
      [UserRole.STAFF_MEMBER]: ['calendar'],
      [UserRole.USER]: ['calendar'],
      [UserRole.DIRECTOR]: [], // Already handled above
      [UserRole.MANAGER]: [], // Already handled above
      [UserRole.HOD]: [], // Already handled above
    }
    
    return roleModuleMap[user.role] || []
  }, [user, hasRole])
  
  // Merge user's accessible modules with filter modules
  const effectiveFilters = {
    ...filters,
    modules: filters?.modules || getAccessibleModules()
  }
  
  // Fetch activities based on user role
  const {
    data: activities = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['activities', user?.id, user?.role, effectiveFilters],
    queryFn: () => {
      if (!user) return Promise.resolve([])
      
      // Use role-based fetching for better security
      return fetchActivitiesByRole(user.id, user.role, effectiveFilters)
    },
    enabled: !!user,
    staleTime: 30000, // 30 seconds
    refetchInterval: autoRefresh ? refreshInterval : false
  })
  
  // Real-time activities via Socket.IO
  const { 
    activities: realtimeActivities, 
    subscribed: isRealtimeConnected 
  } = useSocketActivities(effectiveFilters.modules)
  
  // Merge real-time activities with fetched activities
  useEffect(() => {
    if (enableRealtime && realtimeActivities.length > 0) {
      // Convert socket activities to the expected format
      const formattedRealtimeActivities: ActivityLogWithUser[] = realtimeActivities.map(activity => ({
        id: activity.id,
        userId: activity.userId,
        module: activity.module,
        action: activity.action,
        entityType: activity.entityType,
        entityId: '', // Socket events might not have this
        entityName: activity.entityName,
        details: {},
        timestamp: activity.timestamp,
        ipAddress: null,
        userAgent: null,
        user: activity.user
      }))
      
      setLocalActivities(prev => {
        // Merge and deduplicate activities
        const combined = [...formattedRealtimeActivities, ...prev]
        const unique = combined.filter((activity, index, self) => 
          index === self.findIndex(a => a.id === activity.id)
        )
        
        // Sort by timestamp (newest first) and limit to reasonable number
        return unique
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 100)
      })
    }
  }, [realtimeActivities, enableRealtime])
  
  // Combine fetched and local activities
  const combinedActivities = [...localActivities, ...activities]
    .filter((activity, index, self) => 
      index === self.findIndex(a => a.id === activity.id)
    )
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  
  // Filter activities based on user permissions
  const filteredActivities = combinedActivities.filter(activity => {
    // Directors can see all activities
    if (hasRole([UserRole.DIRECTOR])) return true
    
    // Managers can see activities in their functional areas
    if (hasRole([UserRole.MANAGER])) {
      const managerModules = ['sales', 'inventory', 'customers', 'invoicing', 'accounting']
      return managerModules.includes(activity.module)
    }
    
    // HODs can see department activities
    if (hasRole([UserRole.HOD])) {
      const hodModules = ['hr', 'users', 'calendar']
      return hodModules.includes(activity.module)
    }
    
    // Other roles see only their own activities or public activities
    return activity.userId === user?.id || activity.module === 'calendar'
  })
  
  // Pagination helpers
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  
  const totalPages = Math.ceil(filteredActivities.length / pageSize)
  const paginatedActivities = filteredActivities.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )
  
  // Search and filtering
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedModules, setSelectedModules] = useState<string[]>([])
  const [selectedActions, setSelectedActions] = useState<string[]>([])
  
  const searchFilteredActivities = paginatedActivities.filter(activity => {
    const matchesSearch = !searchTerm || 
      activity.entityName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.module.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesModule = selectedModules.length === 0 || 
      selectedModules.includes(activity.module)
    
    const matchesAction = selectedActions.length === 0 || 
      selectedActions.includes(activity.action)
    
    return matchesSearch && matchesModule && matchesAction
  })
  
  // Get unique values for filter options
  const availableModules = [...new Set(filteredActivities.map(a => a.module))].sort()
  const availableActions = [...new Set(filteredActivities.map(a => a.action))].sort()
  
  return {
    // Data
    activities: searchFilteredActivities,
    allActivities: filteredActivities,
    totalCount: filteredActivities.length,
    
    // Loading states
    isLoading,
    error,
    
    // Real-time status
    isRealtimeConnected,
    
    // Pagination
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalPages,
    
    // Search and filtering
    searchTerm,
    setSearchTerm,
    selectedModules,
    setSelectedModules,
    selectedActions,
    setSelectedActions,
    availableModules,
    availableActions,
    
    // Actions
    refetch,
    refresh: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] })
      refetch()
    }
  }
}

/**
 * Hook for getting activity statistics
 */
export function useActivityStats(timeRange?: { start: Date; end: Date }) {
  const { user } = useUser()
  
  const {
    data: stats,
    isLoading,
    error
  } = useQuery({
    queryKey: ['activity-stats', user?.id, timeRange],
    queryFn: async () => {
      if (!user) return null
      
      const params = new URLSearchParams()
      params.append('userId', user.id)
      params.append('role', user.role)
      
      if (timeRange) {
        params.append('startDate', timeRange.start.toISOString())
        params.append('endDate', timeRange.end.toISOString())
      }
      
      const response = await fetch(`/api/activities/stats?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch activity stats')
      }
      
      return response.json()
    },
    enabled: !!user,
    staleTime: 60000 // 1 minute
  })
  
  return { stats, isLoading, error }
}

/**
 * Hook for getting recent activities for a specific entity
 */
export function useEntityActivities(entityType: string, entityId: string) {
  const { user } = useUser()
  
  const {
    data: activities = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['entity-activities', entityType, entityId, user?.id],
    queryFn: async () => {
      if (!user) return []
      
      const response = await fetch(`/api/activities/${entityType}/${entityId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch entity activities')
      }
      
      const data = await response.json()
      return data.activities
    },
    enabled: !!user && !!entityType && !!entityId,
    staleTime: 30000 // 30 seconds
  })
  
  return { activities, isLoading, error }
}