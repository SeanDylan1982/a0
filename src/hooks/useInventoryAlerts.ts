import { useState, useEffect, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSocketInventory } from '@/hooks/use-socket'
import { useUser } from '@/contexts/user-context'
import { UserRole } from '@prisma/client'

export interface InventoryAlert {
  id: string
  productId: string
  productName: string
  productCode?: string
  currentStock: number
  minimumStock: number
  alertType: 'LOW_STOCK' | 'OUT_OF_STOCK' | 'CRITICAL'
  severity: 'low' | 'medium' | 'high' | 'critical'
  timestamp: Date
  acknowledged: boolean
  acknowledgedBy?: string
  acknowledgedAt?: Date
}

export interface StockMovementAlert {
  id: string
  productId: string
  productName: string
  type: string
  quantity: number
  beforeQty: number
  afterQty: number
  reason: string
  userId: string
  userName?: string
  timestamp: Date
  isSignificant: boolean // Large movements that require attention
}

export interface InventoryAlertsOptions {
  productIds?: string[]
  alertTypes?: ('LOW_STOCK' | 'OUT_OF_STOCK' | 'CRITICAL')[]
  includeAcknowledged?: boolean
  enableRealtime?: boolean
  autoRefresh?: boolean
  refreshInterval?: number
}

// API functions
const fetchInventoryAlerts = async (options?: InventoryAlertsOptions): Promise<InventoryAlert[]> => {
  const params = new URLSearchParams()
  
  if (options?.productIds?.length) {
    options.productIds.forEach(id => params.append('productIds', id))
  }
  if (options?.alertTypes?.length) {
    options.alertTypes.forEach(type => params.append('alertTypes', type))
  }
  if (options?.includeAcknowledged !== undefined) {
    params.append('includeAcknowledged', options.includeAcknowledged.toString())
  }

  const response = await fetch(`/api/inventory/alerts?${params}`)
  if (!response.ok) {
    throw new Error('Failed to fetch inventory alerts')
  }
  
  const data = await response.json()
  return data.alerts
}

const fetchStockMovements = async (options?: { 
  productIds?: string[]
  significantOnly?: boolean
  limit?: number 
}): Promise<StockMovementAlert[]> => {
  const params = new URLSearchParams()
  
  if (options?.productIds?.length) {
    options.productIds.forEach(id => params.append('productIds', id))
  }
  if (options?.significantOnly) {
    params.append('significantOnly', 'true')
  }
  if (options?.limit) {
    params.append('limit', options.limit.toString())
  }

  const response = await fetch(`/api/inventory/movements?${params}`)
  if (!response.ok) {
    throw new Error('Failed to fetch stock movements')
  }
  
  const data = await response.json()
  return data.movements
}

const acknowledgeAlert = async (alertId: string): Promise<void> => {
  const response = await fetch(`/api/inventory/alerts/${alertId}/acknowledge`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  })
  
  if (!response.ok) {
    throw new Error('Failed to acknowledge alert')
  }
}

/**
 * Hook for managing inventory alerts with real-time updates
 */
export function useInventoryAlerts(options: InventoryAlertsOptions = {}) {
  const {
    productIds,
    alertTypes,
    includeAcknowledged = false,
    enableRealtime = true,
    autoRefresh = true,
    refreshInterval = 30000 // 30 seconds for inventory alerts
  } = options
  
  const { user, hasRole } = useUser()
  const queryClient = useQueryClient()
  const [localAlerts, setLocalAlerts] = useState<InventoryAlert[]>([])
  
  // Check if user can view inventory alerts
  const canViewInventoryAlerts = hasRole([
    UserRole.DIRECTOR,
    UserRole.MANAGER,
    UserRole.INVENTORY_MANAGER,
    UserRole.SALES_REP // Sales reps need to know about stock levels
  ])
  
  // Fetch inventory alerts
  const {
    data: alerts = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['inventory-alerts', productIds, alertTypes, includeAcknowledged],
    queryFn: () => fetchInventoryAlerts(options),
    enabled: canViewInventoryAlerts,
    staleTime: 15000, // 15 seconds - inventory data should be fresh
    refetchInterval: autoRefresh ? refreshInterval : false
  })
  
  // Real-time inventory updates via Socket.IO
  const { 
    alerts: realtimeAlerts, 
    movements: realtimeMovements,
    subscribed: isRealtimeConnected 
  } = useSocketInventory(productIds)
  
  // Convert socket alerts to our format
  useEffect(() => {
    if (enableRealtime && realtimeAlerts.length > 0) {
      const formattedAlerts: InventoryAlert[] = realtimeAlerts.map(alert => ({
        id: `realtime-${alert.productId}-${alert.timestamp.getTime()}`,
        productId: alert.productId,
        productName: alert.productName,
        currentStock: alert.currentStock,
        minimumStock: alert.minimumStock,
        alertType: alert.alertType,
        severity: alert.alertType === 'OUT_OF_STOCK' ? 'critical' :
                 alert.alertType === 'CRITICAL' ? 'high' : 'medium',
        timestamp: alert.timestamp,
        acknowledged: false
      }))
      
      setLocalAlerts(prev => {
        // Merge and deduplicate alerts
        const combined = [...formattedAlerts, ...prev]
        const unique = combined.filter((alert, index, self) => 
          index === self.findIndex(a => 
            a.productId === alert.productId && 
            a.alertType === alert.alertType
          )
        )
        
        // Sort by severity and timestamp
        return unique
          .sort((a, b) => {
            const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
            const severityDiff = severityOrder[b.severity] - severityOrder[a.severity]
            if (severityDiff !== 0) return severityDiff
            
            return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          })
          .slice(0, 50) // Keep reasonable number of alerts
      })
    }
  }, [realtimeAlerts, enableRealtime])
  
  // Combine fetched and local alerts
  const combinedAlerts = [...localAlerts, ...alerts]
    .filter((alert, index, self) => 
      index === self.findIndex(a => 
        a.productId === alert.productId && 
        a.alertType === alert.alertType
      )
    )
    .sort((a, b) => {
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
      const severityDiff = severityOrder[b.severity] - severityOrder[a.severity]
      if (severityDiff !== 0) return severityDiff
      
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    })
  
  // Filter alerts based on options
  const filteredAlerts = combinedAlerts.filter(alert => {
    if (!includeAcknowledged && alert.acknowledged) return false
    if (alertTypes && !alertTypes.includes(alert.alertType)) return false
    return true
  })
  
  // Acknowledge alert function
  const acknowledgeAlertMutation = useCallback(async (alertId: string) => {
    try {
      await acknowledgeAlert(alertId)
      
      // Update local state
      setLocalAlerts(prev => 
        prev.map(alert => 
          alert.id === alertId 
            ? { ...alert, acknowledged: true, acknowledgedAt: new Date() }
            : alert
        )
      )
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['inventory-alerts'] })
    } catch (error) {
      console.error('Failed to acknowledge alert:', error)
      throw error
    }
  }, [queryClient])
  
  // Get alert counts by severity
  const alertCounts = {
    critical: filteredAlerts.filter(a => a.severity === 'critical').length,
    high: filteredAlerts.filter(a => a.severity === 'high').length,
    medium: filteredAlerts.filter(a => a.severity === 'medium').length,
    low: filteredAlerts.filter(a => a.severity === 'low').length,
    total: filteredAlerts.length
  }
  
  // Get alerts by type
  const alertsByType = {
    outOfStock: filteredAlerts.filter(a => a.alertType === 'OUT_OF_STOCK'),
    lowStock: filteredAlerts.filter(a => a.alertType === 'LOW_STOCK'),
    critical: filteredAlerts.filter(a => a.alertType === 'CRITICAL')
  }
  
  return {
    // Data
    alerts: filteredAlerts,
    alertCounts,
    alertsByType,
    
    // Loading states
    isLoading,
    error,
    canViewAlerts: canViewInventoryAlerts,
    
    // Real-time status
    isRealtimeConnected,
    
    // Actions
    acknowledgeAlert: acknowledgeAlertMutation,
    refetch,
    refresh: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-alerts'] })
      refetch()
    }
  }
}

/**
 * Hook for monitoring stock movements with alerts for significant changes
 */
export function useStockMovementAlerts(options?: {
  productIds?: string[]
  significantOnly?: boolean
  limit?: number
}) {
  const { user, hasRole } = useUser()
  const [localMovements, setLocalMovements] = useState<StockMovementAlert[]>([])
  
  // Check if user can view stock movements
  const canViewMovements = hasRole([
    UserRole.DIRECTOR,
    UserRole.MANAGER,
    UserRole.INVENTORY_MANAGER,
    UserRole.ACCOUNTANT // Accountants need to see significant movements
  ])
  
  // Fetch stock movements
  const {
    data: movements = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['stock-movements', options],
    queryFn: () => fetchStockMovements(options),
    enabled: canViewMovements,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000 // 1 minute
  })
  
  // Real-time stock movements
  const { 
    movements: realtimeMovements,
    subscribed: isRealtimeConnected 
  } = useSocketInventory(options?.productIds)
  
  // Convert socket movements to our format
  useEffect(() => {
    if (realtimeMovements.length > 0) {
      const formattedMovements: StockMovementAlert[] = realtimeMovements.map(movement => ({
        id: movement.id,
        productId: movement.productId,
        productName: movement.productName,
        type: movement.type,
        quantity: movement.quantity,
        beforeQty: movement.beforeQty,
        afterQty: movement.afterQty,
        reason: movement.reason,
        userId: movement.userId,
        timestamp: movement.timestamp,
        isSignificant: Math.abs(movement.quantity) >= 10 || // Large quantity changes
                      movement.type === 'ADJUSTMENT' || // All adjustments are significant
                      movement.afterQty === 0 // Stock going to zero
      }))
      
      setLocalMovements(prev => {
        const combined = [...formattedMovements, ...prev]
        const unique = combined.filter((movement, index, self) => 
          index === self.findIndex(m => m.id === movement.id)
        )
        
        return unique
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 100)
      })
    }
  }, [realtimeMovements])
  
  // Combine and filter movements
  const combinedMovements = [...localMovements, ...movements]
    .filter((movement, index, self) => 
      index === self.findIndex(m => m.id === movement.id)
    )
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  
  const significantMovements = combinedMovements.filter(m => m.isSignificant)
  
  return {
    // Data
    movements: options?.significantOnly ? significantMovements : combinedMovements,
    significantMovements,
    totalCount: combinedMovements.length,
    significantCount: significantMovements.length,
    
    // Loading states
    isLoading,
    error,
    canViewMovements,
    
    // Real-time status
    isRealtimeConnected,
    
    // Actions
    refetch
  }
}

/**
 * Hook for getting inventory alert summary for dashboard/sidebar
 */
export function useInventoryAlertSummary() {
  const { alerts, alertCounts, isLoading, canViewAlerts } = useInventoryAlerts({
    includeAcknowledged: false,
    enableRealtime: true
  })
  
  const hasCriticalAlerts = alertCounts.critical > 0
  const hasHighPriorityAlerts = alertCounts.high > 0
  const totalUnacknowledgedAlerts = alertCounts.total
  
  // Get the most urgent alert
  const mostUrgentAlert = alerts.find(alert => alert.severity === 'critical') ||
                         alerts.find(alert => alert.severity === 'high') ||
                         alerts[0]
  
  return {
    hasCriticalAlerts,
    hasHighPriorityAlerts,
    totalUnacknowledgedAlerts,
    mostUrgentAlert,
    alertCounts,
    isLoading,
    canViewAlerts
  }
}