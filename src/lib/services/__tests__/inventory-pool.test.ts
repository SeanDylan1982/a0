import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { InventoryPool } from '../inventory-pool'
import { prisma } from '@/lib/prisma'

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    product: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    stockReservation: {
      create: vi.fn(),
      findMany: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    stockMovement: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

describe('InventoryPool', () => {
  let inventoryPool: InventoryPool

  beforeEach(() => {
    inventoryPool = new InventoryPool()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getAvailableStock', () => {
    it('should return available stock minus reservations', async () => {
      const productId = 'product123'
      const mockProduct = {
        id: productId,
        quantity: 100,
      }

      const mockReservations = [
        { quantity: 10 },
        { quantity: 5 },
      ]

      vi.mocked(prisma.product.findUnique).mockResolvedValue(mockProduct)
      vi.mocked(prisma.stockReservation.findMany).mockResolvedValue(mockReservations)

      const result = await inventoryPool.getAvailableStock(productId)

      expect(result).toBe(85) // 100 - 10 - 5
      expect(prisma.product.findUnique).toHaveBeenCalledWith({
        where: { id: productId },
        select: { quantity: true },
      })
      expect(prisma.stockReservation.findMany).toHaveBeenCalledWith({
        where: {
          productId,
          expiresAt: { gt: expect.any(Date) },
        },
        select: { quantity: true },
      })
    })

    it('should return 0 when product not found', async () => {
      vi.mocked(prisma.product.findUnique).mockResolvedValue(null)

      const result = await inventoryPool.getAvailableStock('nonexistent')

      expect(result).toBe(0)
    })

    it('should handle no reservations', async () => {
      const productId = 'product123'
      const mockProduct = { id: productId, quantity: 50 }

      vi.mocked(prisma.product.findUnique).mockResolvedValue(mockProduct)
      vi.mocked(prisma.stockReservation.findMany).mockResolvedValue([])

      const result = await inventoryPool.getAvailableStock(productId)

      expect(result).toBe(50)
    })
  })

  describe('reserveStock', () => {
    it('should create stock reservation when sufficient stock available', async () => {
      const productId = 'product123'
      const quantity = 10
      const reason = 'Sales order'
      const userId = 'user123'

      const mockProduct = { id: productId, quantity: 100 }
      const mockReservations = []
      const mockCreatedReservation = {
        id: 'reservation123',
        productId,
        quantity,
        reason,
        userId,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      }

      vi.mocked(prisma.product.findUnique).mockResolvedValue(mockProduct)
      vi.mocked(prisma.stockReservation.findMany).mockResolvedValue(mockReservations)
      vi.mocked(prisma.stockReservation.create).mockResolvedValue(mockCreatedReservation)

      const result = await inventoryPool.reserveStock(productId, quantity, reason, userId)

      expect(result).toBe('reservation123')
      expect(prisma.stockReservation.create).toHaveBeenCalledWith({
        data: {
          productId,
          quantity,
          reason,
          userId,
          expiresAt: expect.any(Date),
        },
      })
    })

    it('should throw error when insufficient stock', async () => {
      const productId = 'product123'
      const quantity = 50
      const reason = 'Sales order'
      const userId = 'user123'

      const mockProduct = { id: productId, quantity: 30 }
      const mockReservations = [{ quantity: 10 }]

      vi.mocked(prisma.product.findUnique).mockResolvedValue(mockProduct)
      vi.mocked(prisma.stockReservation.findMany).mockResolvedValue(mockReservations)

      await expect(
        inventoryPool.reserveStock(productId, quantity, reason, userId)
      ).rejects.toThrow('Insufficient stock available')
    })

    it('should throw error when product not found', async () => {
      vi.mocked(prisma.product.findUnique).mockResolvedValue(null)

      await expect(
        inventoryPool.reserveStock('nonexistent', 10, 'test', 'user123')
      ).rejects.toThrow('Product not found')
    })
  })

  describe('releaseReservation', () => {
    it('should delete reservation', async () => {
      const reservationId = 'reservation123'

      vi.mocked(prisma.stockReservation.delete).mockResolvedValue({
        id: reservationId,
        productId: 'product123',
        quantity: 10,
        reason: 'test',
        userId: 'user123',
        expiresAt: new Date(),
        createdAt: new Date(),
      })

      await inventoryPool.releaseReservation(reservationId)

      expect(prisma.stockReservation.delete).toHaveBeenCalledWith({
        where: { id: reservationId },
      })
    })

    it('should handle reservation not found', async () => {
      const reservationId = 'nonexistent'

      vi.mocked(prisma.stockReservation.delete).mockRejectedValue(new Error('Reservation not found'))

      await expect(inventoryPool.releaseReservation(reservationId)).rejects.toThrow('Reservation not found')
    })
  })

  describe('updateStock', () => {
    it('should update stock and create movement record', async () => {
      const productId = 'product123'
      const change = -10
      const reason = 'Sale'
      const userId = 'user123'

      const mockProduct = { id: productId, quantity: 100 }
      const mockUpdatedProduct = { id: productId, quantity: 90 }
      const mockMovement = {
        id: 'movement123',
        productId,
        type: 'SALE',
        quantity: Math.abs(change),
        reason,
        userId,
        beforeQty: 100,
        afterQty: 90,
        timestamp: new Date(),
      }

      vi.mocked(prisma.product.findUnique).mockResolvedValue(mockProduct)
      vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
        return callback({
          product: {
            update: vi.fn().mockResolvedValue(mockUpdatedProduct),
          },
          stockMovement: {
            create: vi.fn().mockResolvedValue(mockMovement),
          },
        })
      })

      await inventoryPool.updateStock(productId, change, reason, userId)

      expect(prisma.$transaction).toHaveBeenCalled()
    })

    it('should throw error when product not found', async () => {
      vi.mocked(prisma.product.findUnique).mockResolvedValue(null)

      await expect(
        inventoryPool.updateStock('nonexistent', 10, 'test', 'user123')
      ).rejects.toThrow('Product not found')
    })

    it('should throw error when insufficient stock for negative change', async () => {
      const productId = 'product123'
      const change = -50
      const mockProduct = { id: productId, quantity: 30 }

      vi.mocked(prisma.product.findUnique).mockResolvedValue(mockProduct)

      await expect(
        inventoryPool.updateStock(productId, change, 'test', 'user123')
      ).rejects.toThrow('Insufficient stock')
    })
  })

  describe('getStockMovements', () => {
    it('should retrieve stock movements with date range', async () => {
      const productId = 'product123'
      const dateRange = {
        start: new Date('2024-01-01'),
        end: new Date('2024-12-31'),
      }

      const mockMovements = [
        {
          id: 'movement1',
          productId,
          type: 'PURCHASE',
          quantity: 50,
          reason: 'Restock',
          userId: 'user123',
          beforeQty: 0,
          afterQty: 50,
          timestamp: new Date('2024-06-01'),
          user: { id: 'user123', name: 'Test User' },
        },
      ]

      vi.mocked(prisma.stockMovement.findMany).mockResolvedValue(mockMovements)

      const result = await inventoryPool.getStockMovements(productId, dateRange)

      expect(prisma.stockMovement.findMany).toHaveBeenCalledWith({
        where: {
          productId,
          timestamp: {
            gte: dateRange.start,
            lte: dateRange.end,
          },
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          timestamp: 'desc',
        },
      })

      expect(result).toEqual(mockMovements)
    })

    it('should retrieve all movements when no date range provided', async () => {
      const productId = 'product123'
      const mockMovements = []

      vi.mocked(prisma.stockMovement.findMany).mockResolvedValue(mockMovements)

      const result = await inventoryPool.getStockMovements(productId)

      expect(prisma.stockMovement.findMany).toHaveBeenCalledWith({
        where: { productId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          timestamp: 'desc',
        },
      })

      expect(result).toEqual(mockMovements)
    })
  })

  describe('cleanupExpiredReservations', () => {
    it('should delete expired reservations', async () => {
      const deletedCount = 5
      vi.mocked(prisma.stockReservation.deleteMany).mockResolvedValue({ count: deletedCount })

      const result = await inventoryPool.cleanupExpiredReservations()

      expect(prisma.stockReservation.deleteMany).toHaveBeenCalledWith({
        where: {
          expiresAt: { lt: expect.any(Date) },
        },
      })

      expect(result).toBe(deletedCount)
    })
  })
})