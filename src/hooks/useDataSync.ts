import { useState, useEffect, useCallback } from 'react'
import { useSocket } from './use-socket'

export interface SyncStatus {
  entityId: string
  entityType: string
  status: 'pending' | 'syncing' | 'completed' | 'failed'
  lastSyncAt?: Date
  errorMessage?: string
  affectedModules: string[]
}

export interface SyncRule {
  id: string
  sourceModule: string
  targetModules: string[]
  trigger: string
  priority: number
  enabled: boolean
}

export interface SyncHealthStatus {
  isHealthy: boolean
  queueLength: number
  isProcessing: boolean
  activeRules: number
  lastProcessedAt?: Date
}

export function useDataSync() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [healthStatus, setHealthStatus] = useState<SyncHealthStatus | null>(null)
  const socket = useSocket()

  // Listen for sync events via Socket.IO
  useEffect(() => {
    if (!socket) return

    const handleSyncCompleted = (data: any) => {
      console.log('Sync completed:', data)
      // Refresh health status
      fetchHealthStatus()
    }

    const handleSyncError = (data: any) => {
      console.error('Sync error:', data)
      setError(`Sync error: ${data.error?.message || 'Unknown error'}`)
      fetchHealthStatus()
    }

    const handleQueueProcessingStarted = () => {
      setHealthStatus(prev => prev ? { ...prev, isProcessing: true } : null)
    }

    const handleQueueProcessingCompleted = () => {
      setHealthStatus(prev => prev ? { ...prev, isProcessing: false } : null)
      fetchHealthStatus()
    }

    socket.on('sync_completed', handleSyncCompleted)
    socket.on('sync_error', handleSyncError)
    socket.on('queue_processing_started', handleQueueProcessingStarted)
    socket.on('queue_processing_completed', handleQueueProcessingCompleted)

    return () => {
      socket.off('sync_completed', handleSyncCompleted)
      socket.off('sync_error', handleSyncError)
      socket.off('queue_processing_started', handleQueueProcessingStarted)
      socket.off('queue_processing_completed', handleQueueProcessingCompleted)
    }
  }, [socket])

  const triggerSync = useCallback(async (
    sourceModule: string,
    action: string,
    data: any
  ) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourceModule,
          action,
          data,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Sync failed')
      }

      return await response.json()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const getSyncStatus = useCallback(async (entityId: string): Promise<SyncStatus | null> => {
    try {
      const response = await fetch(`/api/sync?entityId=${entityId}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch sync status')
      }

      const data = await response.json()
      return data.status
    } catch (err) {
      console.error('Error fetching sync status:', err)
      return null
    }
  }, [])

  const fetchHealthStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/sync')
      
      if (!response.ok) {
        throw new Error('Failed to fetch health status')
      }

      const data = await response.json()
      setHealthStatus(data.health)
    } catch (err) {
      console.error('Error fetching health status:', err)
    }
  }, [])

  const getSyncRules = useCallback(async (): Promise<SyncRule[]> => {
    try {
      const response = await fetch('/api/sync/rules')
      
      if (!response.ok) {
        throw new Error('Failed to fetch sync rules')
      }

      const data = await response.json()
      return data.rules
    } catch (err) {
      console.error('Error fetching sync rules:', err)
      return []
    }
  }, [])

  const detectConflicts = useCallback(async (
    entityId: string,
    entityType: string
  ) => {
    try {
      const response = await fetch(
        `/api/sync/conflicts?entityId=${entityId}&entityType=${entityType}`
      )
      
      if (!response.ok) {
        throw new Error('Failed to detect conflicts')
      }

      const data = await response.json()
      return data.conflicts
    } catch (err) {
      console.error('Error detecting conflicts:', err)
      return []
    }
  }, [])

  const resolveConflict = useCallback(async (
    conflictId: string,
    resolution: 'source_wins' | 'target_wins' | 'merge' | 'manual'
  ) => {
    try {
      const response = await fetch('/api/sync/conflicts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conflictId,
          resolution,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to resolve conflict')
      }

      return await response.json()
    } catch (err) {
      console.error('Error resolving conflict:', err)
      throw err
    }
  }, [])

  // Fetch health status on mount
  useEffect(() => {
    fetchHealthStatus()
  }, [fetchHealthStatus])

  return {
    triggerSync,
    getSyncStatus,
    getSyncRules,
    detectConflicts,
    resolveConflict,
    healthStatus,
    isLoading,
    error,
    refreshHealthStatus: fetchHealthStatus,
  }
}