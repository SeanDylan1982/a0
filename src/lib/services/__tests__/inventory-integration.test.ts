import { describe, it, expect, vi, beforeEach } from 'vitest'
import { InventoryPool, VALID_ADJUSTMENT_REASONS } from '../inventory-pool'

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
  prisma: {
    product: {
      findUnique: vi.fn(),
      update: vi.fn()
    },
    stockReservation: {
      aggregate: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn()
    },
    stockMovement: {
      create: vi.fn(),
      findMany: vi.fn()
    },
    $transaction: vi.fn()
  }
}))

vi.mock('@/lib/inventory-alerts', () => ({
  InventoryAlertManager: {
    checkStockLevels: vi.fn()
  }
}))

vi.mock('@/lib/socket', () => ({
  SocketBroadcaster: {
    broadcastStockMovement: vi.fn()
  }
}))

describe('Inventory Module Integration', () => {
  const mockProduct = {
    id: 'product-1',
    quantity: 100,
    name: 'Test Product'
  }

  const mockUser = {
    id: 'user-1'
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Central Inventory Pool Integration', () => {
    it('should calculate available stock correctly', async () => {
      const { prisma } = await import('@/lib/prisma')
      
      // Mock product with 100 units
      ;(prisma.product.findUnique as any).mockResolvedValue(mockProduct)
      
      // Mock 20 units reserved
      ;(prisma.stockReservation.aggregate as any).mockResolvedValue({
        _sum: { quantity: 20 }
      })

      const availableStock = await InventoryPool.getAvailableStock('product-1')
      
      expect(availableStock).toBe(80) // 100 - 20 reserved
      expect(prisma.product.findUnique).toHaveBeenCalledWith({
        where: { id: 'product-1' },
        select: { quantity: true }
      })
    })

    it('should validate adjustment reasons against allowed list', async () => {
      const { prisma } = await import('@/lib/prisma')
      
      ;(prisma.product.findUnique as any).mockResolvedValue(mockProduct)

      // Valid reason should work
      expect(VALID_ADJUSTMENT_REASONS).toContain('BREAKAGE')
      
      // Invalid reason should be rejected
      await expect(
        InventoryPool.updateStock({
          productId: 'product-1',
          quantity: -10,
          reason: 'INVALID_REASON',
          userId: 'user-1'
        })
      ).rejects.toThrow('Invalid adjustment reason')
    })

    it('should integrate with notification system on stock changes', async () => {
      const { prisma } = await import('@/lib/prisma')
      const { InventoryAlertManager } = await import('@/lib/inventory-alerts')
      const { SocketBroadcaster } = await import('@/lib/socket')
      
      ;(prisma.product.findUnique as any).mockResolvedValue(mockProduct)
      ;(prisma.$transaction as any).mockImplementation(async (callback) => {
        return callback({
          product: {
            update: vi.fn()
          },
          stockMovement: {
            create: vi.fn().mockResolvedValue({
              id: 'movement-1',
              productId: 'product-1',
              type: 'ADJUSTMENT',
              quantity: 10,
              beforeQty: 100,
              afterQty: 90,
              reason: 'BREAKAGE',
              userId: 'user-1',
              timestamp: new Date()
            })
          }
        })
      })

      await InventoryPool.updateStock({
        productId: 'product-1',
        quantity: -10,
        reason: 'BREAKAGE',
        userId: 'user-1'
      })

      // Should trigger alert check
      expect(InventoryAlertManager.checkStockLevels).toHaveBeenCalled()
      
      // Should broadcast via socket
      expect(SocketBroadcaster.broadcastStockMovement).toHaveBeenCalled()
    })

    it('should handle concurrent stock operations safely', async () => {
      const { prisma } = await import('@/lib/prisma')
      
      // Mock transaction behavior
      let transactionCallCount = 0
      ;(prisma.$transaction as any).mockImplementation(async (callback) => {
        transactionCallCount++
        
        // Simulate different available stock for concurrent operations
        const mockTx = {
          product: {
            findUnique: vi.fn().mockResolvedValue({
              ...mockProduct,
              quantity: transactionCallCount === 1 ? 100 : 80 // Second call sees reduced stock
            })
          },
          stockReservation: {
            aggregate: vi.fn().mockResolvedValue({
              _sum: { quantity: 0 }
            }),
            create: vi.fn().mockResolvedValue({
              id: `reservation-${transactionCallCount}`
            })
          }
        }
        
        return callback(mockTx)
      })

      // First reservation should succeed
      const reservation1 = InventoryPool.reserveStock({
        productId: 'product-1',
        quantity: 30,
        reason: 'SALES_ORDER_1',
        userId: 'user-1'
      })

      // Second reservation should also succeed (different transaction)
      const reservation2 = InventoryPool.reserveStock({
        productId: 'product-1',
        quantity: 25,
        reason: 'SALES_ORDER_2',
        userId: 'user-1'
      })

      const results = await Promise.all([reservation1, reservation2])
      
      expect(results[0]).toBe('reservation-1')
      expect(results[1]).toBe('reservation-2')
      expect(transactionCallCount).toBe(2)
    })

    it('should provide comprehensive stock summary', async () => {
      const { prisma } = await import('@/lib/prisma')
      
      ;(prisma.product.findUnique as any).mockResolvedValue(mockProduct)
      ;(prisma.stockReservation.aggregate as any).mockResolvedValue({
        _sum: { quantity: 15 }
      })
      ;(prisma.stockReservation.count as any).mockResolvedValue(2)
      ;(prisma.stockMovement.findMany as any).mockResolvedValue([
        {
          id: 'movement-1',
          type: 'SALE',
          quantity: 10,
          beforeQty: 110,
          afterQty: 100,
          timestamp: new Date()
        }
      ])

      const summary = await InventoryPool.getStockSummary('product-1')

      expect(summary).toEqual({
        productId: 'product-1',
        totalStock: 100,
        availableStock: 85, // 100 - 15 reserved
        reservedStock: 15,
        activeReservations: 2,
        recentMovements: expect.any(Array)
      })
    })
  })

  describe('Real-time Integration', () => {
    it('should broadcast stock movements via Socket.IO', async () => {
      const { prisma } = await import('@/lib/prisma')
      const { SocketBroadcaster } = await import('@/lib/socket')
      
      ;(prisma.product.findUnique as any)
        .mockResolvedValueOnce(mockProduct) // For updateStock call
        .mockResolvedValueOnce(mockProduct) // For broadcast call
      
      ;(prisma.$transaction as any).mockImplementation(async (callback) => {
        return callback({
          product: {
            update: vi.fn()
          },
          stockMovement: {
            create: vi.fn().mockResolvedValue({
              id: 'movement-1',
              productId: 'product-1',
              type: 'ADJUSTMENT',
              quantity: 5,
              beforeQty: 100,
              afterQty: 95,
              reason: 'BREAKAGE',
              userId: 'user-1',
              timestamp: new Date()
            })
          }
        })
      })

      await InventoryPool.updateStock({
        productId: 'product-1',
        quantity: -5,
        reason: 'BREAKAGE',
        userId: 'user-1'
      })

      expect(SocketBroadcaster.broadcastStockMovement).toHaveBeenCalledWith({
        id: 'movement-1',
        productId: 'product-1',
        productName: 'Test Product',
        type: 'ADJUSTMENT',
        quantity: 5,
        beforeQty: 100,
        afterQty: 95,
        reason: 'BREAKAGE',
        userId: 'user-1',
        timestamp: expect.any(Date)
      })
    })

    it('should handle socket broadcast failures gracefully', async () => {
      const { prisma } = await import('@/lib/prisma')
      const { SocketBroadcaster } = await import('@/lib/socket')
      
      ;(prisma.product.findUnique as any)
        .mockResolvedValueOnce(mockProduct)
        .mockResolvedValueOnce(mockProduct)
      
      ;(prisma.$transaction as any).mockImplementation(async (callback) => {
        return callback({
          product: { update: vi.fn() },
          stockMovement: {
            create: vi.fn().mockResolvedValue({
              id: 'movement-1',
              productId: 'product-1',
              type: 'ADJUSTMENT',
              quantity: 5,
              beforeQty: 100,
              afterQty: 95,
              reason: 'BREAKAGE',
              userId: 'user-1',
              timestamp: new Date()
            })
          }
        })
      })

      // Mock socket broadcast failure
      ;(SocketBroadcaster.broadcastStockMovement as any).mockRejectedValue(
        new Error('Socket connection failed')
      )

      // Should not throw error - stock adjustment should still succeed
      const result = await InventoryPool.updateStock({
        productId: 'product-1',
        quantity: -5,
        reason: 'BREAKAGE',
        userId: 'user-1'
      })

      expect(result).toBeDefined()
      expect(result.afterQty).toBe(95)
    })
  })

  describe('Audit Trail Integration', () => {
    it('should create detailed movement records', async () => {
      const { prisma } = await import('@/lib/prisma')
      
      ;(prisma.product.findUnique as any).mockResolvedValue(mockProduct)
      ;(prisma.$transaction as any).mockImplementation(async (callback) => {
        const mockTx = {
          product: {
            update: vi.fn()
          },
          stockMovement: {
            create: vi.fn().mockResolvedValue({
              id: 'movement-1',
              productId: 'product-1',
              type: 'ADJUSTMENT',
              quantity: 10,
              reason: 'BREAKAGE',
              userId: 'user-1',
              beforeQty: 100,
              afterQty: 90,
              timestamp: new Date(),
              reference: expect.stringMatching(/^ADJ-\d+$/)
            })
          }
        }
        return callback(mockTx)
      })

      await InventoryPool.updateStock({
        productId: 'product-1',
        quantity: -10,
        reason: 'BREAKAGE',
        userId: 'user-1'
      })

      const mockTx = (prisma.$transaction as any).mock.calls[0][0]
      const txResult = await mockTx({
        product: { update: vi.fn() },
        stockMovement: { create: vi.fn() }
      })

      expect(txResult).toBeDefined()
    })
  })
})