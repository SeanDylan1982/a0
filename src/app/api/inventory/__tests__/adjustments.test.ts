import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '../adjustments/route'

// Mock the inventory pool service
vi.mock('@/lib/services/inventory-pool', () => ({
  InventoryPool: {
    updateStock: vi.fn()
  }
}))

// Mock the middleware
vi.mock('@/lib/middleware/route-migrator', () => ({
  quickMigrate: vi.fn((module, handlers) => handlers),
  COMMON_NOTIFICATIONS: {
    stockAdjustment: 'stockAdjustment'
  }
}))

// Mock auth middleware
vi.mock('@/lib/middleware/auth-middleware', () => ({
  AuthenticatedRequest: class {
    user = { id: 'user-123' }
    json = vi.fn()
  }
}))

describe('Inventory Adjustments API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should validate required fields', async () => {
    const mockRequest = {
      user: { id: 'user-123' },
      json: vi.fn().mockResolvedValue({
        productId: 'product-1',
        // Missing quantity and reason
      })
    } as any

    const response = await POST(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('required')
  })

  it('should process valid stock adjustment', async () => {
    const { InventoryPool } = await import('@/lib/services/inventory-pool')
    
    ;(InventoryPool.updateStock as any).mockResolvedValue({
      id: 'movement-123',
      beforeQty: 100,
      afterQty: 90,
      timestamp: new Date()
    })

    const mockRequest = {
      user: { id: 'user-123' },
      json: vi.fn().mockResolvedValue({
        productId: 'product-1',
        quantity: -10,
        reason: 'BREAKAGE',
        notes: 'Damaged during handling',
        requireApproval: false
      })
    } as any

    const response = await POST(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.message).toContain('completed successfully')
    expect(InventoryPool.updateStock).toHaveBeenCalledWith({
      productId: 'product-1',
      quantity: -10,
      reason: 'BREAKAGE',
      userId: 'user-123',
      requireApproval: false
    })
  })

  it('should handle approval requirements', async () => {
    const { InventoryPool } = await import('@/lib/services/inventory-pool')
    
    ;(InventoryPool.updateStock as any).mockResolvedValue({
      id: 'movement-123',
      beforeQty: 100,
      afterQty: 250,
      timestamp: new Date()
    })

    const mockRequest = {
      user: { id: 'user-123' },
      json: vi.fn().mockResolvedValue({
        productId: 'product-1',
        quantity: 150,
        reason: 'RECOUNT',
        requireApproval: true
      })
    } as any

    const response = await POST(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.message).toContain('submitted for approval')
  })

  it('should handle inventory pool errors', async () => {
    const { InventoryPool } = await import('@/lib/services/inventory-pool')
    
    ;(InventoryPool.updateStock as any).mockRejectedValue(
      new Error('Cannot reduce stock below zero')
    )

    const mockRequest = {
      user: { id: 'user-123' },
      json: vi.fn().mockResolvedValue({
        productId: 'product-1',
        quantity: -200,
        reason: 'BREAKAGE'
      })
    } as any

    await expect(POST(mockRequest)).rejects.toThrow('Cannot reduce stock below zero')
  })
})