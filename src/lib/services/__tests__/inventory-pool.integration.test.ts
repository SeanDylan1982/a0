import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { InventoryPool } from '../inventory-pool'
import { prisma } from '@/lib/prisma'
import { StockMovementType } from '@prisma/client'

// Mock the InventoryAlertManager
vi.mock('@/lib/inventory-alerts', () => ({
  InventoryAlertManager: {
    checkStockLevels: vi.fn()
  }
}))

// Mock Socket.IO
vi.mock('@/lib/socket', () => ({
  SocketBroadcaster: {
    broadcastStockMovement: vi.fn()
  }
}))

describe('InventoryPool Integration Tests', () => {
  let testProduct: any
  let testUser: any

  beforeEach(async () => {
    // Create test user
    testUser = await prisma.user.create({
      data: {
        name: 'Test User',
        email: 'test@example.com',
        password: 'test-password',
        role: 'INVENTORY_MANAGER'
      }
    })

    // Create test product
    testProduct = await prisma.product.create({
      data: {
        sku: 'TEST-001',
        name: 'Test Product',
        category: 'Test Category',
        price: 100,
        cost: 50,
        quantity: 100,
        minStock: 10,
        maxStock: 200,
        unit: 'pcs',
        status: 'ACTIVE'
      }
    })
  })

  afterEach(async () => {
    // Clean up test data
    await prisma.stockReservation.deleteMany({
      where: { productId: testProduct.id }
    })
    await prisma.stockMovement.deleteMany({
      where: { productId: testProduct.id }
    })
    await prisma.product.delete({
      where: { id: testProduct.id }
    })
    await prisma.user.delete({
      where: { id: testUser.id }
    })
  })

  describe('Stock Availability', () => {
    it('should return correct available stock without reservations', async () => {
      const availableStock = await InventoryPool.getAvailableStock(testProduct.id)
      expect(availableStock).toBe(100)
    })

    it('should return correct available stock with active reservations', async () => {
      // Create a reservation
      await InventoryPool.reserveStock({
        productId: testProduct.id,
        quantity: 20,
        reason: 'SALES_ORDER',
        userId: testUser.id,
        expirationMinutes: 30
      })

      const availableStock = await InventoryPool.getAvailableStock(testProduct.id)
      expect(availableStock).toBe(80) // 100 - 20 reserved
    })

    it('should not count expired reservations', async () => {
      // Create an expired reservation
      await prisma.stockReservation.create({
        data: {
          productId: testProduct.id,
          quantity: 30,
          reason: 'EXPIRED_TEST',
          userId: testUser.id,
          expiresAt: new Date(Date.now() - 60000) // 1 minute ago
        }
      })

      const availableStock = await InventoryPool.getAvailableStock(testProduct.id)
      expect(availableStock).toBe(100) // Should ignore expired reservation
    })
  })

  describe('Stock Reservations', () => {
    it('should create stock reservation successfully', async () => {
      const reservationId = await InventoryPool.reserveStock({
        productId: testProduct.id,
        quantity: 25,
        reason: 'SALES_ORDER',
        userId: testUser.id,
        expirationMinutes: 60
      })

      expect(reservationId).toBeDefined()

      // Verify reservation was created
      const reservation = await prisma.stockReservation.findUnique({
        where: { id: reservationId }
      })

      expect(reservation).toBeTruthy()
      expect(reservation?.quantity).toBe(25)
      expect(reservation?.reason).toBe('SALES_ORDER')
    })

    it('should prevent over-reservation', async () => {
      // Try to reserve more than available
      await expect(
        InventoryPool.reserveStock({
          productId: testProduct.id,
          quantity: 150, // More than the 100 available
          reason: 'SALES_ORDER',
          userId: testUser.id
        })
      ).rejects.toThrow('Insufficient stock available')
    })

    it('should handle concurrent reservations correctly', async () => {
      // Create multiple reservations concurrently
      const reservationPromises = [
        InventoryPool.reserveStock({
          productId: testProduct.id,
          quantity: 30,
          reason: 'SALES_ORDER_1',
          userId: testUser.id
        }),
        InventoryPool.reserveStock({
          productId: testProduct.id,
          quantity: 40,
          reason: 'SALES_ORDER_2',
          userId: testUser.id
        }),
        InventoryPool.reserveStock({
          productId: testProduct.id,
          quantity: 35,
          reason: 'SALES_ORDER_3',
          userId: testUser.id
        })
      ]

      // Only first two should succeed (30 + 40 = 70 <= 100)
      // Third should fail (30 + 40 + 35 = 105 > 100)
      const results = await Promise.allSettled(reservationPromises)
      
      expect(results[0].status).toBe('fulfilled')
      expect(results[1].status).toBe('fulfilled')
      expect(results[2].status).toBe('rejected')
    })

    it('should release reservation successfully', async () => {
      const reservationId = await InventoryPool.reserveStock({
        productId: testProduct.id,
        quantity: 20,
        reason: 'SALES_ORDER',
        userId: testUser.id
      })

      await InventoryPool.releaseReservation(reservationId)

      // Verify reservation was deleted
      const reservation = await prisma.stockReservation.findUnique({
        where: { id: reservationId }
      })

      expect(reservation).toBeNull()
    })
  })

  describe('Stock Adjustments', () => {
    it('should update stock with valid adjustment reason', async () => {
      const movement = await InventoryPool.updateStock({
        productId: testProduct.id,
        quantity: -10, // Reduce by 10
        reason: 'BREAKAGE',
        userId: testUser.id
      })

      expect(movement.beforeQty).toBe(100)
      expect(movement.afterQty).toBe(90)
      expect(movement.type).toBe('ADJUSTMENT')

      // Verify product quantity was updated
      const updatedProduct = await prisma.product.findUnique({
        where: { id: testProduct.id }
      })
      expect(updatedProduct?.quantity).toBe(90)
    })

    it('should reject invalid adjustment reasons', async () => {
      await expect(
        InventoryPool.updateStock({
          productId: testProduct.id,
          quantity: -5,
          reason: 'INVALID_REASON',
          userId: testUser.id
        })
      ).rejects.toThrow('Invalid adjustment reason')
    })

    it('should prevent negative stock', async () => {
      await expect(
        InventoryPool.updateStock({
          productId: testProduct.id,
          quantity: -150, // Would result in -50
          reason: 'BREAKAGE',
          userId: testUser.id
        })
      ).rejects.toThrow('Cannot reduce stock below zero')
    })

    it('should handle large adjustments requiring approval', async () => {
      await expect(
        InventoryPool.updateStock({
          productId: testProduct.id,
          quantity: 150, // Large adjustment
          reason: 'RECOUNT',
          userId: testUser.id,
          requireApproval: true
        })
      ).rejects.toThrow('Large adjustments require management approval')
    })
  })

  describe('Stock Movements', () => {
    it('should record purchase movement correctly', async () => {
      const movement = await InventoryPool.recordMovement({
        productId: testProduct.id,
        type: 'PURCHASE' as StockMovementType,
        quantity: 50,
        reason: 'New stock delivery',
        userId: testUser.id,
        reference: 'PO-001'
      })

      expect(movement.beforeQty).toBe(100)
      expect(movement.afterQty).toBe(150)
      expect(movement.type).toBe('PURCHASE')

      // Verify product quantity was updated
      const updatedProduct = await prisma.product.findUnique({
        where: { id: testProduct.id }
      })
      expect(updatedProduct?.quantity).toBe(150)
    })

    it('should record sale movement correctly', async () => {
      const movement = await InventoryPool.recordMovement({
        productId: testProduct.id,
        type: 'SALE' as StockMovementType,
        quantity: 25,
        reason: 'Customer order',
        userId: testUser.id,
        reference: 'SO-001'
      })

      expect(movement.beforeQty).toBe(100)
      expect(movement.afterQty).toBe(75)
      expect(movement.type).toBe('SALE')
    })

    it('should prevent sale with insufficient stock', async () => {
      await expect(
        InventoryPool.recordMovement({
          productId: testProduct.id,
          type: 'SALE' as StockMovementType,
          quantity: 150, // More than available
          reason: 'Customer order',
          userId: testUser.id
        })
      ).rejects.toThrow('Insufficient stock for this movement')
    })
  })

  describe('Stock Summary', () => {
    it('should provide comprehensive stock summary', async () => {
      // Create some reservations and movements
      await InventoryPool.reserveStock({
        productId: testProduct.id,
        quantity: 15,
        reason: 'SALES_ORDER',
        userId: testUser.id
      })

      await InventoryPool.recordMovement({
        productId: testProduct.id,
        type: 'SALE' as StockMovementType,
        quantity: 10,
        reason: 'Customer order',
        userId: testUser.id
      })

      const summary = await InventoryPool.getStockSummary(testProduct.id)

      expect(summary.productId).toBe(testProduct.id)
      expect(summary.totalStock).toBe(90) // 100 - 10 from sale
      expect(summary.availableStock).toBe(75) // 90 - 15 reserved
      expect(summary.reservedStock).toBe(15)
      expect(summary.activeReservations).toBe(1)
      expect(summary.recentMovements).toBeDefined()
      expect(summary.recentMovements.length).toBeGreaterThan(0)
    })
  })

  describe('Cleanup Operations', () => {
    it('should clean up expired reservations', async () => {
      // Create expired reservations
      await prisma.stockReservation.createMany({
        data: [
          {
            productId: testProduct.id,
            quantity: 10,
            reason: 'EXPIRED_1',
            userId: testUser.id,
            expiresAt: new Date(Date.now() - 60000) // 1 minute ago
          },
          {
            productId: testProduct.id,
            quantity: 20,
            reason: 'EXPIRED_2',
            userId: testUser.id,
            expiresAt: new Date(Date.now() - 120000) // 2 minutes ago
          },
          {
            productId: testProduct.id,
            quantity: 30,
            reason: 'ACTIVE',
            userId: testUser.id,
            expiresAt: new Date(Date.now() + 60000) // 1 minute from now
          }
        ]
      })

      const cleanedCount = await InventoryPool.cleanupExpiredReservations()
      expect(cleanedCount).toBe(2) // Should clean up 2 expired reservations

      // Verify only active reservation remains
      const remainingReservations = await prisma.stockReservation.findMany({
        where: { productId: testProduct.id }
      })
      expect(remainingReservations).toHaveLength(1)
      expect(remainingReservations[0].reason).toBe('ACTIVE')
    })
  })
})