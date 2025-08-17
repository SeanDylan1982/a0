import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { DataSyncManager } from '../data-sync-manager'
import { ActivityLogger } from '../activity-logger'
import { NotificationManager } from '../notification-manager'
import { InventoryPool } from '../inventory-pool'

// Mock dependencies
vi.mock('../activity-logger')
vi.mock('../notification-manager')
vi.mock('../inventory-pool')
vi.mock('@/lib/prisma', () => ({
  prisma: {
    product: {
      findUnique: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
    stockMovement: {
      create: vi.fn(),
    },
    transaction: {
      create: vi.fn(),
    },
    syncStatus: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      findMany: vi.fn(),
    },
    sale: {
      create: vi.fn(),
      findUnique: vi.fn(),
    },
    invoice: {
      create: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}))

const mockActivityLogger = {
  log: vi.fn(),
} as any

const mockNotificationManager = {
  create: vi.fn(),
} as any

describe('Data Sync Integration Tests', () => {
  let syncManager: DataSyncManager
  let mockPrisma: any

  beforeEach(async () => {
    vi.clearAllMocks()
    
    // Mock the constructors
    ;(ActivityLogger as any).mockImplementation(() => mockActivityLogger)
    ;(NotificationManager as any).mockImplementation(() => mockNotificationManager)
    
    syncManager = new DataSyncManager()
    const { prisma } = await import('@/lib/prisma')
    mockPrisma = prisma
  })

  afterEach(() => {
    syncManager.removeAllListeners()
  })

  describe('Sales to Inventory Integration', () => {
    it('should maintain data consistency across sales and inventory modules', async () => {
      // Setup mock data
      const initialStock = 100
      const saleQuantity = 15
      const expectedFinalStock = initialStock - saleQuantity

      mockPrisma.product.findUnique.mockResolvedValue({
        id: 'product-1',
        name: 'Test Product',
        quantity: initialStock,
      })

      mockPrisma.product.update.mockResolvedValue({
        id: 'product-1',
        quantity: expectedFinalStock,
      })

      mockPrisma.stockMovement.create.mockResolvedValue({
        id: 'movement-1',
      })

      mockPrisma.syncStatus.upsert.mockResolvedValue({})

      // Simulate a sale
      const saleData = {
        entityType: 'sale',
        entityId: 'sale-123',
        productId: 'product-1',
        quantity: saleQuantity,
        saleId: 'sale-123',
        customerId: 'customer-1',
        total: 150.00,
      }

      // Track sync events
      const syncEvents: any[] = []
      syncManager.on('sync_completed', (event) => syncEvents.push(event))

      // Trigger sync
      await syncManager.syncData('sales', 'sale_created', saleData, 'user-1')

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 200))

      // Verify inventory was updated
      expect(mockPrisma.product.update).toHaveBeenCalledWith({
        where: { id: 'product-1' },
        data: { quantity: expectedFinalStock }
      })

      // Verify stock movement was recorded
      expect(mockPrisma.stockMovement.create).toHaveBeenCalledWith({
        data: {
          productId: 'product-1',
          type: 'SALE',
          quantity: saleQuantity,
          reason: 'Sale #sale-123',
          reference: 'sale-123',
          userId: 'user-1',
          beforeQty: initialStock,
          afterQty: expectedFinalStock,
        }
      })

      // Verify sync status was updated
      expect(mockPrisma.syncStatus.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            status: 'completed',
          }),
        })
      )

      // Verify sync completion event was emitted
      expect(syncEvents).toHaveLength(1)
      expect(syncEvents[0].rule.id).toBe('sales-to-inventory')
    })

    it('should handle insufficient stock gracefully', async () => {
      const initialStock = 5
      const saleQuantity = 10 // More than available

      mockPrisma.product.findUnique.mockResolvedValue({
        id: 'product-1',
        quantity: initialStock,
      })

      mockPrisma.product.update.mockResolvedValue({
        id: 'product-1',
        quantity: 0, // Stock goes to 0, not negative
      })

      mockPrisma.stockMovement.create.mockResolvedValue({
        id: 'movement-1',
      })

      mockPrisma.syncStatus.upsert.mockResolvedValue({})

      const saleData = {
        entityType: 'sale',
        entityId: 'sale-123',
        productId: 'product-1',
        quantity: saleQuantity,
        saleId: 'sale-123',
      }

      await syncManager.syncData('sales', 'sale_created', saleData, 'user-1')
      await new Promise(resolve => setTimeout(resolve, 100))

      // Should update to 0, not negative
      expect(mockPrisma.product.update).toHaveBeenCalledWith({
        where: { id: 'product-1' },
        data: { quantity: 0 }
      })
    })
  })

  describe('Sales to Accounting Integration', () => {
    it('should create accounting transactions for invoices', async () => {
      mockPrisma.transaction.create.mockResolvedValue({
        id: 'transaction-1',
      })

      mockPrisma.syncStatus.upsert.mockResolvedValue({})

      const invoiceData = {
        entityType: 'invoice',
        entityId: 'invoice-123',
        total: 1500.00,
        invoiceNumber: 'INV-2024-001',
        customerId: 'customer-1',
        createdAt: new Date('2024-01-15'),
      }

      await syncManager.syncData('sales', 'invoice_created', invoiceData, 'user-1')
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(mockPrisma.transaction.create).toHaveBeenCalledWith({
        data: {
          type: 'INCOME',
          amount: 1500.00,
          description: 'Sales Revenue - INV-2024-001',
          reference: 'INV-2024-001',
          date: invoiceData.createdAt,
          customerId: 'customer-1',
        }
      })
    })
  })

  describe('Purchase to Inventory Integration', () => {
    it('should update inventory when purchases are received', async () => {
      const initialStock = 50
      const purchaseQuantity = 25
      const expectedFinalStock = initialStock + purchaseQuantity

      mockPrisma.product.findUnique.mockResolvedValue({
        id: 'product-1',
        quantity: initialStock,
      })

      mockPrisma.product.update.mockResolvedValue({
        id: 'product-1',
        quantity: expectedFinalStock,
      })

      mockPrisma.stockMovement.create.mockResolvedValue({
        id: 'movement-1',
      })

      mockPrisma.syncStatus.upsert.mockResolvedValue({})

      const purchaseData = {
        entityType: 'purchase',
        entityId: 'purchase-123',
        productId: 'product-1',
        quantity: purchaseQuantity,
        purchaseOrderId: 'PO-2024-001',
      }

      await syncManager.syncData('purchasing', 'purchase_received', purchaseData, 'user-1')
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(mockPrisma.product.update).toHaveBeenCalledWith({
        where: { id: 'product-1' },
        data: { quantity: expectedFinalStock }
      })

      expect(mockPrisma.stockMovement.create).toHaveBeenCalledWith({
        data: {
          productId: 'product-1',
          type: 'PURCHASE',
          quantity: purchaseQuantity,
          reason: 'Purchase Order #PO-2024-001',
          reference: 'PO-2024-001',
          userId: 'user-1',
          beforeQty: initialStock,
          afterQty: expectedFinalStock,
        }
      })
    })
  })

  describe('Inventory to Sales Integration', () => {
    it('should notify sales module of stock availability changes', async () => {
      const productAvailabilityEvents: any[] = []
      syncManager.on('product_availability_updated', (event) => {
        productAvailabilityEvents.push(event)
      })

      const stockUpdateData = {
        entityType: 'product',
        entityId: 'product-1',
        productId: 'product-1',
        newQuantity: 75,
        lastUpdated: new Date(),
      }

      await syncManager.syncData('inventory', 'stock_updated', stockUpdateData, 'user-1')
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(productAvailabilityEvents).toHaveLength(1)
      expect(productAvailabilityEvents[0]).toMatchObject({
        productId: 'product-1',
        availableQuantity: 75,
        lastUpdated: stockUpdateData.lastUpdated,
      })
    })
  })

  describe('Error Handling and Recovery', () => {
    it('should handle database connection errors', async () => {
      mockPrisma.product.findUnique.mockRejectedValue(new Error('Connection timeout'))
      mockPrisma.syncStatus.upsert.mockResolvedValue({})

      const moduleErrorEvents: any[] = []
      syncManager.on('module_sync_error', (event) => moduleErrorEvents.push(event))

      const saleData = {
        entityType: 'sale',
        entityId: 'sale-123',
        productId: 'product-1',
        quantity: 5,
        saleId: 'sale-123',
      }

      await syncManager.syncData('sales', 'sale_created', saleData, 'user-1')
      await new Promise(resolve => setTimeout(resolve, 200))

      expect(moduleErrorEvents.length).toBeGreaterThan(0)
      expect(moduleErrorEvents[0].error.message).toBe('Connection timeout')

      // Verify activity logger was called with error
      expect(mockActivityLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'module_sync_failed',
          details: expect.objectContaining({
            error: 'Connection timeout',
          }),
        })
      )
    })

    it('should continue processing other sync rules when one fails', async () => {
      // Mock inventory sync to fail
      mockPrisma.product.findUnique.mockRejectedValue(new Error('Inventory sync failed'))
      
      // Mock accounting sync to succeed
      mockPrisma.transaction.create.mockResolvedValue({ id: 'transaction-1' })
      
      mockPrisma.syncStatus.upsert.mockResolvedValue({})

      const moduleErrorEvents: any[] = []
      
      syncManager.on('module_sync_error', (event) => moduleErrorEvents.push(event))

      // This should trigger both inventory and accounting sync rules
      const saleData = {
        entityType: 'sale',
        entityId: 'sale-123',
        productId: 'product-1',
        quantity: 5,
        saleId: 'sale-123',
        total: 100,
        invoiceNumber: 'INV-001',
        customerId: 'customer-1',
        createdAt: new Date(),
      }

      // Trigger both sale_created and invoice_created to test both rules
      await syncManager.syncData('sales', 'sale_created', saleData, 'user-1')
      await syncManager.syncData('sales', 'invoice_created', saleData, 'user-1')
      await new Promise(resolve => setTimeout(resolve, 300))

      // Should have module sync errors
      expect(moduleErrorEvents.length).toBeGreaterThan(0)
      
      // Accounting transaction should still be created despite inventory failure
      expect(mockPrisma.transaction.create).toHaveBeenCalled()
    })
  })

  describe('Concurrent Sync Operations', () => {
    it('should handle multiple concurrent sync operations', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({
        id: 'product-1',
        quantity: 100,
      })

      mockPrisma.product.update.mockResolvedValue({
        id: 'product-1',
        quantity: 90,
      })

      mockPrisma.stockMovement.create.mockResolvedValue({
        id: 'movement-1',
      })

      mockPrisma.syncStatus.upsert.mockResolvedValue({})

      const syncPromises = []

      // Trigger multiple concurrent syncs
      for (let i = 0; i < 5; i++) {
        const saleData = {
          entityType: 'sale',
          entityId: `sale-${i}`,
          productId: 'product-1',
          quantity: 2,
          saleId: `sale-${i}`,
        }

        syncPromises.push(
          syncManager.syncData('sales', 'sale_created', saleData, 'user-1')
        )
      }

      await Promise.all(syncPromises)
      await new Promise(resolve => setTimeout(resolve, 300))

      // All syncs should complete
      expect(mockPrisma.product.findUnique).toHaveBeenCalledTimes(5)
      expect(mockPrisma.product.update).toHaveBeenCalledTimes(5)
      expect(mockPrisma.stockMovement.create).toHaveBeenCalledTimes(5)
    })
  })

  describe('Data Transformation', () => {
    it('should correctly transform data between modules', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({
        id: 'product-1',
        quantity: 100,
      })

      mockPrisma.product.update.mockResolvedValue({
        id: 'product-1',
        quantity: 95,
      })

      mockPrisma.stockMovement.create.mockResolvedValue({
        id: 'movement-1',
      })

      mockPrisma.syncStatus.upsert.mockResolvedValue({})

      const originalSaleData = {
        entityType: 'sale',
        entityId: 'sale-123',
        productId: 'product-1',
        quantity: 5,
        saleId: 'sale-123',
        customerName: 'John Doe',
        saleDate: new Date(),
        notes: 'Rush order',
      }

      await syncManager.syncData('sales', 'sale_created', originalSaleData, 'user-1')
      await new Promise(resolve => setTimeout(resolve, 100))

      // Verify that the transformer correctly converted the data
      expect(mockPrisma.stockMovement.create).toHaveBeenCalledWith({
        data: {
          productId: 'product-1',
          type: 'SALE',
          quantity: 5, // Positive quantity in movement record
          reason: 'Sale #sale-123',
          reference: 'sale-123',
          userId: 'user-1',
          beforeQty: 100,
          afterQty: 95,
        }
      })

      // Verify that the product update used negative quantity for stock reduction
      expect(mockPrisma.product.update).toHaveBeenCalledWith({
        where: { id: 'product-1' },
        data: { quantity: 95 } // 100 - 5
      })
    })
  })
})