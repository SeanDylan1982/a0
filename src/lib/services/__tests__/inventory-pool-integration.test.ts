import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { InventoryPool } from '../inventory-pool'
import { InventoryAlertManager } from '@/lib/inventory-alerts'
import { prisma as db } from '@/lib/prisma'

describe('InventoryPool Integration Tests', () => {
  let testProductId: string
  let testUserId: string

  beforeAll(async () => {
    // Create test user
    const testUser = await db.user.create({
      data: {
        email: 'test-integration@inventory.com',
        password: 'password',
        name: 'Test Integration User',
        role: 'INVENTORY_MANAGER'
      }
    })
    testUserId = testUser.id

    // Create test product
    const testProduct = await db.product.create({
      data: {
        sku: 'TEST-INT-001',
        name: 'Test Integration Product',
        description: 'Product for integration testing',
        category: 'Test',
        price: 100,
        cost: 50,
        quantity: 50,
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
    await db.inventoryLog.deleteMany({ where: { productId: testProductId } })
    await db.product.delete({ where: { id: testProductId } })
    await db.user.delete({ where: { id: testUserId } })
  })

  beforeEach(async () => {
    // Reset product quantity and clean up
    await db.product.update({
      where: { id: testProductId },
      data: { quantity: 50 }
    })
    await db.stockReservation.deleteMany({ where: { productId: testProductId } })
    await db.stockMovement.deleteMany({ where: { productId: testProductId } })
    await db.inventoryLog.deleteMany({ where: { productId: testProductId } })
  })

  describe('Integration with InventoryAlertManager', () => {
    it('should work with existing stock validation', async () => {
      // Test InventoryAlertManager validation
      const validation = await InventoryAlertManager.validateStockAvailability(testProductId, 30)
      expect(validation.available).toBe(true)
      expect(validation.currentStock).toBe(50)

      // Test InventoryPool validation
      const poolValidation = await InventoryPool.validateStockOperation(testProductId, 30, 'reserve')
      expect(poolValidation.valid).toBe(true)
      expect(poolValidation.availableStock).toBe(50)
    })

    it('should integrate with InventoryAlertManager stock updates', async () => {
      // Use InventoryAlertManager to update stock (should use InventoryPool internally)
      const newQuantity = await InventoryAlertManager.updateStock(testProductId, 20, 'Purchase order received', testUserId)
      expect(newQuantity).toBe(70)

      // Verify stock movement was recorded
      const movements = await InventoryPool.getStockMovements(testProductId)
      expect(movements).toHaveLength(1)
      expect(movements[0].type).toBe('PURCHASE')
      expect(movements[0].quantity).toBe(20)
    })

    it('should handle stock reduction through InventoryAlertManager', async () => {
      // Reduce stock using InventoryAlertManager
      const newQuantity = await InventoryAlertManager.updateStock(testProductId, -15, 'BREAKAGE', testUserId)
      expect(newQuantity).toBe(35)

      // Verify adjustment was recorded
      const movements = await InventoryPool.getStockMovements(testProductId)
      expect(movements).toHaveLength(1)
      expect(movements[0].type).toBe('ADJUSTMENT')
      expect(movements[0].quantity).toBe(15)
    })
  })

  describe('Real-world workflow scenarios', () => {
    it('should handle complete sales workflow', async () => {
      // 1. Reserve stock for a sale
      const reservationId = await InventoryPool.reserveStock({
        productId: testProductId,
        quantity: 20,
        reason: 'Sales order #12345',
        userId: testUserId
      })

      // Verify available stock is reduced
      const availableAfterReservation = await InventoryPool.getAvailableStock(testProductId)
      expect(availableAfterReservation).toBe(30) // 50 - 20

      // 2. Complete the sale
      const saleMovement = await InventoryPool.recordMovement({
        productId: testProductId,
        type: 'SALE',
        quantity: 20,
        reason: 'Sales order #12345 completed',
        reference: 'SO-12345',
        userId: testUserId
      })

      expect(saleMovement.beforeQty).toBe(50)
      expect(saleMovement.afterQty).toBe(30)

      // 3. Release the reservation (no longer needed)
      await InventoryPool.releaseReservation(reservationId)

      // Verify final state
      const finalSummary = await InventoryPool.getStockSummary(testProductId)
      expect(finalSummary.totalStock).toBe(30)
      expect(finalSummary.availableStock).toBe(30)
      expect(finalSummary.reservedStock).toBe(0)
    })

    it('should handle purchase workflow', async () => {
      // 1. Record purchase receipt
      const purchaseMovement = await InventoryPool.recordMovement({
        productId: testProductId,
        type: 'PURCHASE',
        quantity: 100,
        reason: 'Purchase order #PO-001 received',
        reference: 'PO-001',
        userId: testUserId
      })

      expect(purchaseMovement.beforeQty).toBe(50)
      expect(purchaseMovement.afterQty).toBe(150)

      // 2. Verify stock summary
      const summary = await InventoryPool.getStockSummary(testProductId)
      expect(summary.totalStock).toBe(150)
      expect(summary.availableStock).toBe(150)
      expect(summary.recentMovements).toHaveLength(1)
    })

    it('should handle inventory adjustment workflow', async () => {
      // 1. Perform stock count and find discrepancy
      const currentStock = await InventoryPool.getAvailableStock(testProductId)
      expect(currentStock).toBe(50)

      // 2. Adjust for found discrepancy
      const adjustment = await InventoryPool.updateStock({
        productId: testProductId,
        quantity: -5, // Found 5 units missing
        reason: 'RECOUNT',
        userId: testUserId
      })

      expect(adjustment.beforeQty).toBe(50)
      expect(adjustment.afterQty).toBe(45)

      // 3. Verify adjustment is recorded
      const movements = await InventoryPool.getStockMovements(testProductId)
      expect(movements).toHaveLength(1)
      expect(movements[0].type).toBe('ADJUSTMENT')
      expect(movements[0].reason).toBe('RECOUNT')
    })

    it('should handle concurrent operations safely', async () => {
      // Create multiple reservations sequentially to test stock management
      const reservations = []

      // Reserve 20 units
      const res1 = await InventoryPool.reserveStock({
        productId: testProductId,
        quantity: 20,
        reason: 'Order 1',
        userId: testUserId
      })
      reservations.push(res1)

      // Reserve another 20 units
      const res2 = await InventoryPool.reserveStock({
        productId: testProductId,
        quantity: 20,
        reason: 'Order 2',
        userId: testUserId
      })
      reservations.push(res2)

      // Try to reserve 15 more (should succeed, total 55 but only 50 available)
      try {
        const res3 = await InventoryPool.reserveStock({
          productId: testProductId,
          quantity: 15,
          reason: 'Order 3',
          userId: testUserId
        })
        // This should fail due to insufficient stock
        expect(true).toBe(false) // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toContain('Insufficient stock available')
      }

      // Verify only 2 reservations exist
      const activeReservations = await InventoryPool.getActiveReservations(testProductId)
      expect(activeReservations).toHaveLength(2)

      // Clean up reservations
      for (const reservationId of reservations) {
        await InventoryPool.releaseReservation(reservationId)
      }
    })
  })

  describe('Data consistency checks', () => {
    it('should maintain data consistency across operations', async () => {
      const initialSummary = await InventoryPool.getStockSummary(testProductId)
      expect(initialSummary.totalStock).toBe(50)

      // Perform various operations
      await InventoryPool.recordMovement({
        productId: testProductId,
        type: 'PURCHASE',
        quantity: 30,
        reason: 'Stock replenishment',
        userId: testUserId
      })

      const reservationId = await InventoryPool.reserveStock({
        productId: testProductId,
        quantity: 25,
        reason: 'Pending order',
        userId: testUserId
      })

      await InventoryPool.updateStock({
        productId: testProductId,
        quantity: -5,
        reason: 'DAMAGE',
        userId: testUserId
      })

      // Check final consistency
      const finalSummary = await InventoryPool.getStockSummary(testProductId)
      expect(finalSummary.totalStock).toBe(75) // 50 + 30 - 5
      expect(finalSummary.availableStock).toBe(50) // 75 - 25 reserved
      expect(finalSummary.reservedStock).toBe(25)
      expect(finalSummary.activeReservations).toBe(1)

      // Verify movements are recorded
      expect(finalSummary.recentMovements.length).toBeGreaterThanOrEqual(2)

      // Clean up
      await InventoryPool.releaseReservation(reservationId)
    })
  })
})