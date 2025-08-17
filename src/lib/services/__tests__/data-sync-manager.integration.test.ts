import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { DataSyncManager } from '../data-sync-manager'
import { ActivityLogger } from '../activity-logger'
import { NotificationManager } from '../notification-manager'
import { InventoryPool } from '../inventory-pool'
import { prisma } from '@/lib/prisma'

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
  prisma: {
    sale: {
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
    },
    product: {
      update: vi.fn(),
      findUnique: vi.fn(),
    },
    customer: {
      update: vi.fn(),
      findUnique: vi.fn(),
    },
    invoice: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

vi.mock('../activity-logger')
vi.mock('../notification-manager')
vi.mock('../inventory-pool')

describe('DataSyncManager Integration Tests', () => {
  let dataSyncManager: DataSyncManager
  let mockActivityLogger: vi.Mocked<ActivityLogger>
  let mockNotificationManager: vi.Mocked<NotificationManager>
  let mockInventoryPool: vi.Mocked<InventoryPool>

  beforeEach(() => {
    mockActivityLogger = new ActivityLogger() as vi.Mocked<ActivityLogger>
    mockNotificationManager = new NotificationManager() as vi.Mocked<NotificationManager>
    mockInventoryPool = new InventoryPool() as vi.Mocked<InventoryPool>

    dataSyncManager = new DataSyncManager(
      mockActivityLogger,
      mockNotificationManager,
      mockInventoryPool
    )

    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Sales to Inventory Synchronization', () => {
    it('should update inventory when sale is confirmed', async () => {
      const saleData = {
        id: 'sale123',
        customerId: 'customer123',
        items: [
          { productId: 'product123', quantity: 5, price: 100 },
          { productId: 'product456', quantity: 2, price: 200 },
        ],
        total: 900,
        status: 'CONFIRMED',
        userId: 'user123',
      }

      const mockSale = {
        ...saleData,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(prisma.sale.findUnique).mockResolvedValue(mockSale)
      mockInventoryPool.updateStock.mockResolvedValue()
      mockActivityLogger.log.mockResolvedValue()
      mockNotificationManager.create.mockResolvedValue()

      await dataSyncManager.syncData('sales', 'confirm', saleData)

      // Verify inventory updates for each item
      expect(mockInventoryPool.updateStock).toHaveBeenCalledWith(
        'product123',
        -5,
        'Sale confirmation',
        'user123'
      )
      expect(mockInventoryPool.updateStock).toHaveBeenCalledWith(
        'product456',
        -2,
        'Sale confirmation',
        'user123'
      )

      // Verify activity logging
      expect(mockActivityLogger.log).toHaveBeenCalledWith({
        userId: 'user123',
        module: 'sales',
        action: 'confirm',
        entityType: 'sale',
        entityId: 'sale123',
        entityName: 'Sale #sale123',
        details: {
          total: 900,
          itemCount: 2,
          customerId: 'customer123',
        },
      })

      // Verify notification creation
      expect(mockNotificationManager.create).toHaveBeenCalledWith({
        userId: 'user123',
        type: 'ACTIVITY',
        title: 'Sale Confirmed',
        message: 'Sale #sale123 has been confirmed and inventory updated',
        priority: 'MEDIUM',
        data: { saleId: 'sale123', module: 'sales' },
        read: false,
      })
    })

    it('should handle inventory update failures gracefully', async () => {
      const saleData = {
        id: 'sale123',
        items: [{ productId: 'product123', quantity: 10, price: 100 }],
        userId: 'user123',
      }

      mockInventoryPool.updateStock.mockRejectedValue(new Error('Insufficient stock'))

      await expect(
        dataSyncManager.syncData('sales', 'confirm', saleData)
      ).rejects.toThrow('Insufficient stock')

      // Verify error was logged
      expect(mockActivityLogger.log).toHaveBeenCalledWith({
        userId: 'user123',
        module: 'sales',
        action: 'sync_error',
        entityType: 'sale',
        entityId: 'sale123',
        entityName: 'Sale #sale123',
        details: {
          error: 'Insufficient stock',
          targetModule: 'inventory',
        },
      })
    })
  })

  describe('Inventory to Sales Synchronization', () => {
    it('should notify sales when stock levels are low', async () => {
      const inventoryData = {
        productId: 'product123',
        newQuantity: 5,
        threshold: 10,
        productName: 'Test Product',
        userId: 'user123',
      }

      const mockProduct = {
        id: 'product123',
        name: 'Test Product',
        quantity: 5,
        minQuantity: 10,
      }

      vi.mocked(prisma.product.findUnique).mockResolvedValue(mockProduct)
      mockNotificationManager.create.mockResolvedValue()

      await dataSyncManager.syncData('inventory', 'low_stock_alert', inventoryData)

      // Verify notification to sales team
      expect(mockNotificationManager.create).toHaveBeenCalledWith({
        userId: 'user123',
        type: 'INVENTORY_ALERT',
        title: 'Low Stock Alert',
        message: 'Test Product is running low (5 remaining, minimum: 10)',
        priority: 'HIGH',
        data: {
          productId: 'product123',
          currentQuantity: 5,
          minQuantity: 10,
        },
        read: false,
      })

      // Verify activity logging
      expect(mockActivityLogger.log).toHaveBeenCalledWith({
        userId: 'user123',
        module: 'inventory',
        action: 'low_stock_alert',
        entityType: 'product',
        entityId: 'product123',
        entityName: 'Test Product',
        details: {
          currentQuantity: 5,
          threshold: 10,
          alertLevel: 'HIGH',
        },
      })
    })
  })

  describe('Customer Data Synchronization', () => {
    it('should sync customer updates across sales and invoicing modules', async () => {
      const customerData = {
        id: 'customer123',
        name: 'Updated Customer Name',
        email: 'updated@example.com',
        phone: '+27123456789',
        userId: 'user123',
      }

      const mockCustomer = {
        ...customerData,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(prisma.customer.findUnique).mockResolvedValue(mockCustomer)
      vi.mocked(prisma.customer.update).mockResolvedValue(mockCustomer)
      mockActivityLogger.log.mockResolvedValue()

      await dataSyncManager.syncData('customers', 'update', customerData)

      // Verify customer update
      expect(prisma.customer.update).toHaveBeenCalledWith({
        where: { id: 'customer123' },
        data: {
          name: 'Updated Customer Name',
          email: 'updated@example.com',
          phone: '+27123456789',
        },
      })

      // Verify activity logging
      expect(mockActivityLogger.log).toHaveBeenCalledWith({
        userId: 'user123',
        module: 'customers',
        action: 'update',
        entityType: 'customer',
        entityId: 'customer123',
        entityName: 'Updated Customer Name',
        details: {
          changes: {
            name: 'Updated Customer Name',
            email: 'updated@example.com',
            phone: '+27123456789',
          },
        },
      })
    })
  })

  describe('Cross-Module Transaction Handling', () => {
    it('should handle complex multi-module transactions atomically', async () => {
      const transactionData = {
        saleId: 'sale123',
        customerId: 'customer123',
        items: [{ productId: 'product123', quantity: 3, price: 150 }],
        createInvoice: true,
        userId: 'user123',
      }

      const mockSale = {
        id: 'sale123',
        customerId: 'customer123',
        total: 450,
        status: 'CONFIRMED',
      }

      const mockInvoice = {
        id: 'invoice123',
        saleId: 'sale123',
        customerId: 'customer123',
        total: 450,
      }

      vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
        return callback({
          sale: {
            update: vi.fn().mockResolvedValue(mockSale),
          },
          invoice: {
            create: vi.fn().mockResolvedValue(mockInvoice),
          },
        })
      })

      mockInventoryPool.updateStock.mockResolvedValue()
      mockActivityLogger.log.mockResolvedValue()
      mockNotificationManager.create.mockResolvedValue()

      await dataSyncManager.syncData('sales', 'complete_transaction', transactionData)

      // Verify transaction was used
      expect(prisma.$transaction).toHaveBeenCalled()

      // Verify inventory update
      expect(mockInventoryPool.updateStock).toHaveBeenCalledWith(
        'product123',
        -3,
        'Sale completion',
        'user123'
      )

      // Verify multiple activity logs
      expect(mockActivityLogger.log).toHaveBeenCalledTimes(2) // Sale and Invoice creation

      // Verify notification
      expect(mockNotificationManager.create).toHaveBeenCalledWith({
        userId: 'user123',
        type: 'ACTIVITY',
        title: 'Transaction Completed',
        message: 'Sale #sale123 completed with invoice #invoice123',
        priority: 'MEDIUM',
        data: {
          saleId: 'sale123',
          invoiceId: 'invoice123',
          total: 450,
        },
        read: false,
      })
    })

    it('should rollback transaction on failure', async () => {
      const transactionData = {
        saleId: 'sale123',
        items: [{ productId: 'product123', quantity: 100, price: 50 }],
        userId: 'user123',
      }

      vi.mocked(prisma.$transaction).mockRejectedValue(new Error('Transaction failed'))
      mockActivityLogger.log.mockResolvedValue()

      await expect(
        dataSyncManager.syncData('sales', 'complete_transaction', transactionData)
      ).rejects.toThrow('Transaction failed')

      // Verify error was logged
      expect(mockActivityLogger.log).toHaveBeenCalledWith({
        userId: 'user123',
        module: 'sales',
        action: 'transaction_error',
        entityType: 'sale',
        entityId: 'sale123',
        entityName: 'Sale #sale123',
        details: {
          error: 'Transaction failed',
          rollback: true,
        },
      })
    })
  })

  describe('Sync Status Tracking', () => {
    it('should track sync status for entities', async () => {
      const entityId = 'sale123'
      const syncData = {
        id: entityId,
        status: 'CONFIRMED',
        userId: 'user123',
      }

      mockActivityLogger.log.mockResolvedValue()

      await dataSyncManager.syncData('sales', 'confirm', syncData)

      const syncStatus = await dataSyncManager.getSyncStatus(entityId)

      expect(syncStatus).toEqual({
        entityId,
        lastSyncAt: expect.any(Date),
        status: 'SUCCESS',
        modules: ['inventory', 'accounting'],
        errors: [],
      })
    })

    it('should track sync failures', async () => {
      const entityId = 'sale123'
      const syncData = {
        id: entityId,
        items: [{ productId: 'product123', quantity: 1000 }],
        userId: 'user123',
      }

      mockInventoryPool.updateStock.mockRejectedValue(new Error('Insufficient stock'))
      mockActivityLogger.log.mockResolvedValue()

      await expect(
        dataSyncManager.syncData('sales', 'confirm', syncData)
      ).rejects.toThrow('Insufficient stock')

      const syncStatus = await dataSyncManager.getSyncStatus(entityId)

      expect(syncStatus).toEqual({
        entityId,
        lastSyncAt: expect.any(Date),
        status: 'FAILED',
        modules: ['inventory'],
        errors: ['Insufficient stock'],
      })
    })
  })
})