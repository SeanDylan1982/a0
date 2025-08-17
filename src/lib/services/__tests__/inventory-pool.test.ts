import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest'
import { InventoryPool, VALID_ADJUSTMENT_REASONS } from '../inventory-pool'
import { prisma as db } from '@/lib/prisma'
import { InventoryAlertManager } from '@/lib/inventory-alerts'

// Mock the InventoryAlertManager
vi.mock('@/lib/inventory-alerts', () => ({
  InventoryAlertManager: {
    checkStockLevels: vi.fn().mockResolvedValue([])
  }
}))

describe('InventoryPool', () => {
  let testProductId: string
  let testUserId: string

  beforeAll(async () => {
    // Create test user
    const testUser = await db.user.create({
      data: {
        email: 'test@inventory.com',
        password: 'password',
        name: 'Test User',
        role: 'INVENTORY_MANAGER'
      }
    })
    testUserId = testUser.id

    // Create test product
    const testProduct = await db.product.create({
      data: {
        sku: 'TEST-INV-001',
        name: 'Test Inventory Product',
        description: 'Product for inventory pool testing',
        category: 'Test',
        price: 100,
        cost: 50,
        quantity: 100,
        minStock: 10,
        unit: 'pcs'
      }
    })
    testProductId = testProduct.id
  })

  afterAll(async () => {
    // Clean up test data
    await db.stockReservation.deleteMany({ where: { productId: testProductId } })
    await db.stockMovement.deleteMany({ where: { productId: testProductId } })
    await db.product.delete({ where: { id: testProductId } })
    await db.user.delete({ where: { id: testUserId } })
  })

  beforeEach(async () => {
    // Reset product quantity and clean up reservations/movements
    await db.product.update({
      where: { id: testProductId },
      data: { quantity: 100 }
    })
    await db.stockReservation.deleteMany({ where: { productId: testProductId } })
    await db.stockMovement.deleteMany({ where: { productId: testProductId } })
  })

  describe('getAvailableStock', () => {
    it('should return total stock when no reservations exist', async () => {
      const availableStock = await InventoryPool.getAvailableStock(testProductId)
      expect(availableStock).toBe(100)
    })

    it('should subtract active reservations from total stock', async () => {
      // Create a reservation
      await InventoryPool.reserveStock({
        productId: testProductId,
        quantity: 20,
        reason: 'Test reservation',
        userId: testUserId
      })

      const availableStock = await InventoryPool.getAvailableStock(testProductId)
      expect(availableStock).toBe(80)
    })

    it('should ignore expired reservations', async () => {
      // Create an expired reservation manually
      await db.stockReservation.create({
        data: {
          productId: testProductId,
          quantity: 30,
          reason: 'Expired reservation',
          userId: testUserId,
          expiresAt: new Date(Date.now() - 60000) // 1 minute ago
        }
      })

      const availableStock = await InventoryPool.getAvailableStock(testProductId)
      expect(availableStock).toBe(100)
    })

    it('should throw error for non-existent product', async () => {
      // Use a valid ObjectId format that doesn't exist
      const nonExistentId = '507f1f77bcf86cd799439011'
      await expect(InventoryPool.getAvailableStock(nonExistentId))
        .rejects.toThrow('Product not found')
    })
  })

  describe('reserveStock', () => {
    it('should create a stock reservation successfully', async () => {
      const reservationId = await InventoryPool.reserveStock({
        productId: testProductId,
        quantity: 25,
        reason: 'Sales order',
        userId: testUserId
      })

      expect(reservationId).toBeDefined()

      // Verify reservation was created
      const reservation = await db.stockReservation.findUnique({
        where: { id: reservationId }
      })
      expect(reservation).toBeTruthy()
      expect(reservation?.quantity).toBe(25)
    })

    it('should set expiration time correctly', async () => {
      const reservationId = await InventoryPool.reserveStock({
        productId: testProductId,
        quantity: 10,
        reason: 'Test expiration',
        userId: testUserId,
        expirationMinutes: 60
      })

      const reservation = await db.stockReservation.findUnique({
        where: { id: reservationId }
      })

      const expectedExpiration = new Date(Date.now() + 60 * 60 * 1000)
      const actualExpiration = reservation?.expiresAt
      
      expect(actualExpiration).toBeDefined()
      // Allow 1 second tolerance for timing differences
      expect(Math.abs(actualExpiration!.getTime() - expectedExpiration.getTime())).toBeLessThan(1000)
    })

    it('should reject reservation when insufficient stock', async () => {
      await expect(InventoryPool.reserveStock({
        productId: testProductId,
        quantity: 150, // More than available (100)
        reason: 'Too much',
        userId: testUserId
      })).rejects.toThrow('Insufficient stock available')
    })

    it('should reject negative quantities', async () => {
      await expect(InventoryPool.reserveStock({
        productId: testProductId,
        quantity: -10,
        reason: 'Negative test',
        userId: testUserId
      })).rejects.toThrow('Reservation quantity must be positive')
    })
  })

  describe('releaseReservation', () => {
    it('should release an existing reservation', async () => {
      const reservationId = await InventoryPool.reserveStock({
        productId: testProductId,
        quantity: 15,
        reason: 'To be released',
        userId: testUserId
      })

      await InventoryPool.releaseReservation(reservationId)

      // Verify reservation was deleted
      const reservation = await db.stockReservation.findUnique({
        where: { id: reservationId }
      })
      expect(reservation).toBeNull()
    })

    it('should throw error for non-existent reservation', async () => {
      // Use a valid ObjectId format that doesn't exist
      const nonExistentId = '507f1f77bcf86cd799439011'
      await expect(InventoryPool.releaseReservation(nonExistentId))
        .rejects.toThrow('Reservation not found')
    })
  })

  describe('cleanupExpiredReservations', () => {
    it('should remove expired reservations', async () => {
      // Create expired reservation
      await db.stockReservation.create({
        data: {
          productId: testProductId,
          quantity: 20,
          reason: 'Expired',
          userId: testUserId,
          expiresAt: new Date(Date.now() - 60000) // 1 minute ago
        }
      })

      // Create active reservation
      await InventoryPool.reserveStock({
        productId: testProductId,
        quantity: 10,
        reason: 'Active',
        userId: testUserId
      })

      const cleanedCount = await InventoryPool.cleanupExpiredReservations()
      expect(cleanedCount).toBe(1)

      // Verify only active reservation remains
      const remainingReservations = await db.stockReservation.findMany({
        where: { productId: testProductId }
      })
      expect(remainingReservations).toHaveLength(1)
      expect(remainingReservations[0].reason).toBe('Active')
    })
  })

  describe('updateStock', () => {
    it('should update stock with valid adjustment reason', async () => {
      const movement = await InventoryPool.updateStock({
        productId: testProductId,
        quantity: -10,
        reason: 'BREAKAGE',
        userId: testUserId
      })

      expect(movement.beforeQty).toBe(100)
      expect(movement.afterQty).toBe(90)
      expect(movement.type).toBe('ADJUSTMENT')

      // Verify product quantity was updated
      const product = await db.product.findUnique({
        where: { id: testProductId },
        select: { quantity: true }
      })
      expect(product?.quantity).toBe(90)
    })

    it('should reject invalid adjustment reasons', async () => {
      await expect(InventoryPool.updateStock({
        productId: testProductId,
        quantity: -5,
        reason: 'INVALID_REASON',
        userId: testUserId
      })).rejects.toThrow('Invalid adjustment reason')
    })

    it('should prevent stock from going negative', async () => {
      await expect(InventoryPool.updateStock({
        productId: testProductId,
        quantity: -150, // More than current stock (100)
        reason: 'BREAKAGE',
        userId: testUserId
      })).rejects.toThrow('Cannot reduce stock below zero')
    })

    it('should trigger inventory alerts check', async () => {
      await InventoryPool.updateStock({
        productId: testProductId,
        quantity: 10,
        reason: 'FOUND',
        userId: testUserId
      })

      expect(InventoryAlertManager.checkStockLevels).toHaveBeenCalled()
    })
  })

  describe('recordMovement', () => {
    it('should record purchase movement correctly', async () => {
      const movement = await InventoryPool.recordMovement({
        productId: testProductId,
        type: 'PURCHASE',
        quantity: 50,
        reason: 'New stock arrival',
        userId: testUserId
      })

      expect(movement.beforeQty).toBe(100)
      expect(movement.afterQty).toBe(150)
      expect(movement.type).toBe('PURCHASE')

      // Verify product quantity was updated
      const product = await db.product.findUnique({
        where: { id: testProductId },
        select: { quantity: true }
      })
      expect(product?.quantity).toBe(150)
    })

    it('should record sale movement correctly', async () => {
      const movement = await InventoryPool.recordMovement({
        productId: testProductId,
        type: 'SALE',
        quantity: 30,
        reason: 'Customer purchase',
        userId: testUserId
      })

      expect(movement.beforeQty).toBe(100)
      expect(movement.afterQty).toBe(70)
      expect(movement.type).toBe('SALE')
    })

    it('should prevent sale when insufficient stock', async () => {
      await expect(InventoryPool.recordMovement({
        productId: testProductId,
        type: 'SALE',
        quantity: 150, // More than available
        reason: 'Large sale',
        userId: testUserId
      })).rejects.toThrow('Insufficient stock for this movement')
    })

    it('should reject adjustment movements', async () => {
      await expect(InventoryPool.recordMovement({
        productId: testProductId,
        type: 'ADJUSTMENT',
        quantity: 10,
        reason: 'Should use updateStock',
        userId: testUserId
      })).rejects.toThrow('Use updateStock method for adjustments')
    })

    it('should reject negative quantities', async () => {
      await expect(InventoryPool.recordMovement({
        productId: testProductId,
        type: 'PURCHASE',
        quantity: -10,
        reason: 'Negative test',
        userId: testUserId
      })).rejects.toThrow('Movement quantity must be positive')
    })
  })

  describe('getStockMovements', () => {
    beforeEach(async () => {
      // Create some test movements
      await InventoryPool.recordMovement({
        productId: testProductId,
        type: 'PURCHASE',
        quantity: 20,
        reason: 'Test purchase',
        userId: testUserId
      })

      await InventoryPool.recordMovement({
        productId: testProductId,
        type: 'SALE',
        quantity: 10,
        reason: 'Test sale',
        userId: testUserId
      })
    })

    it('should return movements for a product', async () => {
      const movements = await InventoryPool.getStockMovements(testProductId)
      expect(movements).toHaveLength(2)
      expect(movements[0].type).toBe('SALE') // Most recent first
      expect(movements[1].type).toBe('PURCHASE')
    })

    it('should filter movements by date range', async () => {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
      const dayAfterTomorrow = new Date(Date.now() + 48 * 60 * 60 * 1000)

      const movements = await InventoryPool.getStockMovements(testProductId, {
        from: tomorrow,
        to: dayAfterTomorrow
      })

      expect(movements).toHaveLength(0) // No movements in future date range
    })
  })

  describe('validateStockOperation', () => {
    it('should validate successful operation', async () => {
      const validation = await InventoryPool.validateStockOperation(
        testProductId,
        50,
        'reserve'
      )

      expect(validation.valid).toBe(true)
      expect(validation.availableStock).toBe(100)
      expect(validation.message).toBe('Stock operation valid')
    })

    it('should reject operation with insufficient stock', async () => {
      const validation = await InventoryPool.validateStockOperation(
        testProductId,
        150,
        'reduce'
      )

      expect(validation.valid).toBe(false)
      expect(validation.availableStock).toBe(100)
      expect(validation.message).toContain('Insufficient stock')
    })
  })

  describe('getStockSummary', () => {
    it('should return comprehensive stock summary', async () => {
      // Create a reservation and movement
      await InventoryPool.reserveStock({
        productId: testProductId,
        quantity: 20,
        reason: 'Test reservation',
        userId: testUserId
      })

      await InventoryPool.recordMovement({
        productId: testProductId,
        type: 'SALE',
        quantity: 10,
        reason: 'Test sale',
        userId: testUserId
      })

      const summary = await InventoryPool.getStockSummary(testProductId)

      expect(summary.productId).toBe(testProductId)
      expect(summary.totalStock).toBe(90) // 100 - 10 from sale
      expect(summary.availableStock).toBe(70) // 90 - 20 reserved
      expect(summary.reservedStock).toBe(20)
      expect(summary.activeReservations).toBe(1)
      expect(summary.recentMovements).toHaveLength(1)
    })
  })

  describe('edge cases and validation', () => {
    it('should prevent over-reservation through multiple reservations', async () => {
      // Create multiple reservations that together exceed stock
      const reservation1 = await InventoryPool.reserveStock({
        productId: testProductId,
        quantity: 60,
        reason: 'First reservation',
        userId: testUserId
      })

      const reservation2 = await InventoryPool.reserveStock({
        productId: testProductId,
        quantity: 30,
        reason: 'Second reservation',
        userId: testUserId
      })

      // Third reservation should fail
      await expect(InventoryPool.reserveStock({
        productId: testProductId,
        quantity: 20, // Would exceed available stock (100 - 60 - 30 = 10)
        reason: 'Third reservation',
        userId: testUserId
      })).rejects.toThrow('Insufficient stock available')

      // Verify total reservations
      const totalReserved = await db.stockReservation.aggregate({
        where: { productId: testProductId },
        _sum: { quantity: true }
      })

      expect(totalReserved._sum.quantity).toBe(90)
    })

    it('should handle sequential stock movements correctly', async () => {
      // Sequential execution to test stock level management
      const results = []
      
      for (let i = 0; i < 3; i++) {
        try {
          const movement = await InventoryPool.recordMovement({
            productId: testProductId,
            type: 'SALE',
            quantity: 40,
            reason: `Sequential sale ${i}`,
            userId: testUserId
          })
          results.push({ status: 'fulfilled', value: movement })
        } catch (error) {
          results.push({ status: 'rejected', reason: error })
        }
      }
      
      const successful = results.filter(r => r.status === 'fulfilled')
      const failed = results.filter(r => r.status === 'rejected')

      // Only 2 sales of 40 each should succeed (80 total), third should fail
      expect(successful.length).toBe(2)
      expect(failed.length).toBe(1)

      // Verify final stock level
      const product = await db.product.findUnique({
        where: { id: testProductId },
        select: { quantity: true }
      })
      expect(product?.quantity).toBe(20) // 100 - 80
    })
  })

  describe('VALID_ADJUSTMENT_REASONS', () => {
    it('should contain all expected adjustment reasons', () => {
      const expectedReasons = [
        'BREAKAGE', 'THEFT', 'SPILLAGE', 'DAMAGE', 'EXPIRED',
        'LOST', 'FOUND', 'RECOUNT', 'SUPPLIER_ERROR',
        'RETURN_TO_SUPPLIER', 'QUALITY_CONTROL', 'SAMPLE_USED', 'WRITE_OFF'
      ]

      expect(VALID_ADJUSTMENT_REASONS).toEqual(expect.arrayContaining(expectedReasons))
      expect(VALID_ADJUSTMENT_REASONS).toHaveLength(expectedReasons.length)
    })
  })
})