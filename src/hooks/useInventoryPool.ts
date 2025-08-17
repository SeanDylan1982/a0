import { useState, useCallback } from 'react'
import { StockMovementType } from '@prisma/client'

interface StockSummary {
  productId: string
  totalStock: number
  availableStock: number
  reservedStock: number
  activeReservations: number
  recentMovements: any[]
}

interface StockValidation {
  valid: boolean
  availableStock: number
  message: string
}

interface ReserveStockRequest {
  productId: string
  quantity: number
  reason: string
  expirationMinutes?: number
}

interface RecordMovementRequest {
  productId: string
  type: StockMovementType
  quantity: number
  reason: string
  reference?: string
}

interface AdjustStockRequest {
  productId: string
  quantity: number
  reason: string
  requireApproval?: boolean
}

export function useInventoryPool() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const clearError = useCallback(() => setError(null), [])

  const getStockSummary = useCallback(async (productId: string): Promise<StockSummary | null> => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/inventory/pool?productId=${productId}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to get stock summary')
      }

      return result.data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const validateStockOperation = useCallback(async (
    productId: string,
    quantity: number,
    operation: 'reserve' | 'reduce'
  ): Promise<StockValidation | null> => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/inventory/pool/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, quantity, operation })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to validate stock operation')
      }

      return result.data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const reserveStock = useCallback(async (request: ReserveStockRequest): Promise<string | null> => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/inventory/pool/reserve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to reserve stock')
      }

      return result.data.reservationId
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const releaseReservation = useCallback(async (reservationId: string): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/inventory/pool/reserve?reservationId=${reservationId}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to release reservation')
      }

      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const recordMovement = useCallback(async (request: RecordMovementRequest): Promise<any | null> => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/inventory/pool/movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'record', ...request })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to record movement')
      }

      return result.data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const adjustStock = useCallback(async (request: AdjustStockRequest): Promise<any | null> => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/inventory/pool/movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'adjust', ...request })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to adjust stock')
      }

      return result.data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const getStockMovements = useCallback(async (
    productId: string,
    dateRange?: { from: Date; to: Date }
  ): Promise<any[] | null> => {
    setLoading(true)
    setError(null)

    try {
      let url = `/api/inventory/pool/movements?productId=${productId}`
      
      if (dateRange) {
        url += `&from=${dateRange.from.toISOString()}&to=${dateRange.to.toISOString()}`
      }

      const response = await fetch(url)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to get stock movements')
      }

      return result.data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const cleanupExpiredReservations = useCallback(async (): Promise<number | null> => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/inventory/pool/cleanup', {
        method: 'POST'
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to cleanup reservations')
      }

      return result.data.cleanedReservations
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    loading,
    error,
    clearError,
    getStockSummary,
    validateStockOperation,
    reserveStock,
    releaseReservation,
    recordMovement,
    adjustStock,
    getStockMovements,
    cleanupExpiredReservations
  }
}