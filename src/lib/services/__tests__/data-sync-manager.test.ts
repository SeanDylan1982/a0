import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest'
import { DataSyncManager, SyncRule } from '../data-sync-manager'
import { ActivityLogger } from '../activity-logger'
import { NotificationManager } from '../notification-manager'

// Mock dependencies
vi.mock('../activity-logger')
vi.mock('../notification-manager')
vi.mock('@/lib/prisma', () => ({
  prisma: {
    product: {
      findUnique: vi.fn(),
      update: vi.fn(),
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
  },
}))

const mockActivityLogger = {
  log: vi.fn(),
} as any

const mockNotificationManager = {
  create: vi.fn(),
} as any

describe('DataSyncManager', () => {
  let syncManager: DataSyncManager
  let mockPrisma: any

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock the constructors
    ;(ActivityLogger as Mock).mockImplementation(() => mockActivityLogger)
    ;(NotificationManager as Mock).mockImplementation(() => mockNotificationManager)
    
    syncManager = new DataSyncManager()
    
    // Get the mocked prisma
    mockPrisma = require('@/lib/prisma').prisma
  })

  afterEach(() => {
    syncManager.removeAllListeners()
  })

  describe('Sync Rule Management', () => {
    it('should register a sync rule', () => {
      const rule: SyncRule = {
        id: 'test-rule',
        sourceModule: 'sales',
        targetModules: ['inventory'],
        trigger: 'sale_created',
        transformer: (data) => data,
        priority: 1,
        enabled: true,
      }

      syncManager.registerSyncRule(rule)
      const retrievedRule = syncManager.getSyncRule('test-rule')
      
      expect(retrievedRule).toEqual(rule)
    })

    it('should remove a sync rule', () => {
      const rule: SyncRule = {
        id: 'test-rule',
        sourceModule: 'sales',
        targetModules: ['inventory'],
        trigger: 'sale_created',
        transformer: (data) => data,
        priority: 1,
        enabled: true,
      }

      syncManager.registerSyncRule(rule)
      const removed = syncManager.removeSyncRule('test-rule')
      
      expect(removed).toBe(true)
      expect(syncManager.getSyncRule('test-rule')).toBeUndefined()
    })

    it('should return all sync rules', () => {
      const rule1: SyncRule = {
        id: 'rule-1',
        sourceModule: 'sales',
        targetModules: ['inventory'],
        trigger: 'sale_created',
        transformer: (data) => data,
        priority: 1,
        enabled: true,
      }

      const rule2: SyncRule = {
        id: 'rule-2',
        sourceModule: 'inventory',
        targetModules: ['sales'],
        trigger: 'stock_updated',
        transformer: (data) => data,
        priority: 2,
        enabled: true,
      }

      syncManager.registerSyncRule(rule1)
      syncManager.registerSyncRule(rule2)
      
      const allRules = syncManager.getAllSyncRules()
      expect(allRules).toHaveLength(6) // 4 default rules + 2 test rules
      expect(allRules.find(r => r.id === 'rule-1')).toEqual(rule1)
      expect(allRules.find(r => r.id === 'rule-2')).toEqual(rule2)
    })
  })

  describe('Data Synchronization', () => {
    beforeEach(() => {
      // Mock product data
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
      mockPrisma.transaction.create.mockResolvedValue({
        id: 'transaction-1',
      })
      mockPrisma.syncStatus.upsert.mockResolvedValue({})
    })

    it('should sync sales data to inventory', async () => {
      const salesData = {
        entityType: 'sale',
        entityId: 'sale-1',
        productId: 'product-1',
        quantity: 5,
        saleId: 'sale-1',
      }

      await syncManager.syncData('sales', 'sale_created', salesData, 'user-1')

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(mockPrisma.product.findUnique).toHaveBeenCalledWith({
        where: { id: 'product-1' }
      })
      expect(mockPrisma.product.update).toHaveBeenCalledWith({
        where: { id: 'product-1' },
        data: { quantity: 95 } // 100 - 5
      })
      expect(mockPrisma.stockMovement.create).toHaveBeenCalledWith({
        data: {
          productId: 'product-1',
          type: 'SALE',
          quantity: 5,
          reason: 'Sale #sale-1',
          reference: 'sale-1',
          userId: 'user-1',
          beforeQty: 100,
          afterQty: 95,
        }
      })
    })

    it('should sync sales data to accounting', async () => {
      const salesData = {
        entityType: 'invoice',
        entityId: 'invoice-1',
        total: 1000,
        invoiceNumber: 'INV-001',
        customerId: 'customer-1',
        createdAt: new Date(),
      }

      await syncManager.syncData('sales', 'invoice_created', salesData, 'user-1')

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(mockPrisma.transaction.create).toHaveBeenCalledWith({
        data: {
          type: 'INCOME',
          amount: 1000,
          description: 'Sales Revenue - INV-001',
          reference: 'INV-001',
          date: salesData.createdAt,
          customerId: 'customer-1',
        }
      })
    })

    it('should handle sync errors gracefully', async () => {
      mockPrisma.product.findUnique.mockRejectedValue(new Error('Database error'))

      const salesData = {
        entityType: 'sale',
        entityId: 'sale-1',
        productId: 'product-1',
        quantity: 5,
        saleId: 'sale-1',
      }

      await syncManager.syncData('sales', 'sale_created', salesData, 'user-1')

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(mockPrisma.syncStatus.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            status: 'failed',
            errorMessage: 'Database error',
          }),
        })
      )
      expect(mockActivityLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'sync_failed',
        })
      )
      expect(mockNotificationManager.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'SYSTEM',
          title: 'Data Sync Error',
          priority: 'high',
        })
      )
    })

    it('should not sync if condition is not met', async () => {
      const salesData = {
        entityType: 'sale',
        entityId: 'sale-1',
        productId: 'product-1',
        quantity: 0, // Condition requires quantity > 0
        saleId: 'sale-1',
      }

      await syncManager.syncData('sales', 'sale_created', salesData, 'user-1')

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(mockPrisma.product.findUnique).not.toHaveBeenCalled()
      expect(mockPrisma.product.update).not.toHaveBeenCalled()
    })

    it('should emit events during sync process', async () => {
      const syncCompletedSpy = vi.fn()
      syncManager.on('sync_completed', syncCompletedSpy)

      const salesData = {
        entityType: 'sale',
        entityId: 'sale-1',
        productId: 'product-1',
        quantity: 5,
        saleId: 'sale-1',
      }

      await syncManager.syncData('sales', 'sale_created', salesData, 'user-1')

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(syncCompletedSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          rule: expect.objectContaining({
            id: 'sales-to-inventory',
          }),
          event: expect.objectContaining({
            sourceModule: 'sales',
            action: 'sale_created',
          }),
        })
      )
    })
  })

  describe('Sync Status Management', () => {
    it('should get sync status for entity', async () => {
      const mockStatus = {
        entityId: 'entity-1',
        entityType: 'sale',
        status: 'completed',
        lastSyncAt: new Date(),
        errorMessage: null,
        affectedModules: ['inventory', 'accounting'],
      }

      mockPrisma.syncStatus.findUnique.mockResolvedValue(mockStatus)

      const status = await syncManager.getSyncStatus('entity-1')

      expect(status).toEqual({
        entityId: 'entity-1',
        entityType: 'sale',
        status: 'completed',
        lastSyncAt: mockStatus.lastSyncAt,
        errorMessage: undefined,
        affectedModules: ['inventory', 'accounting'],
      })
    })

    it('should return null for non-existent entity', async () => {
      mockPrisma.syncStatus.findUnique.mockResolvedValue(null)

      const status = await syncManager.getSyncStatus('non-existent')

      expect(status).toBeNull()
    })
  })

  describe('Conflict Detection and Resolution', () => {
    it('should detect conflicts', async () => {
      mockPrisma.syncStatus.findMany.mockResolvedValue([
        {
          entityId: 'entity-1',
          status: 'failed',
          errorMessage: 'version conflict detected',
        },
      ])

      const conflicts = await syncManager.detectConflicts('entity-1', 'sale')

      expect(conflicts).toHaveLength(1)
      expect(conflicts[0]).toMatchObject({
        entityId: 'entity-1',
        entityType: 'sale',
        conflictType: 'version',
      })
    })

    it('should resolve conflicts', async () => {
      await syncManager.resolveConflict('conflict-1', 'source_wins', 'user-1')

      expect(mockActivityLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'conflict_resolved',
          entityId: 'conflict-1',
        })
      )
    })
  })

  describe('Health Status', () => {
    it('should return health status', async () => {
      const health = await syncManager.getHealthStatus()

      expect(health).toMatchObject({
        isHealthy: expect.any(Boolean),
        queueLength: expect.any(Number),
        isProcessing: expect.any(Boolean),
        activeRules: expect.any(Number),
      })
    })

    it('should indicate unhealthy status when queue is too long', async () => {
      // Add many items to queue to simulate high load
      for (let i = 0; i < 1001; i++) {
        syncManager['syncQueue'].push({
          sourceModule: 'test',
          action: 'test',
          entityType: 'test',
          entityId: `test-${i}`,
          data: {},
          userId: 'user-1',
          timestamp: new Date(),
        })
      }

      const health = await syncManager.getHealthStatus()

      expect(health.isHealthy).toBe(false)
      expect(health.queueLength).toBeGreaterThan(1000)
    })
  })

  describe('Default Sync Rules', () => {
    it('should have default sync rules initialized', () => {
      const rules = syncManager.getAllSyncRules()
      
      expect(rules.find(r => r.id === 'sales-to-inventory')).toBeDefined()
      expect(rules.find(r => r.id === 'inventory-to-sales')).toBeDefined()
      expect(rules.find(r => r.id === 'sales-to-accounting')).toBeDefined()
      expect(rules.find(r => r.id === 'purchase-to-inventory')).toBeDefined()
    })

    it('should have correct rule configurations', () => {
      const salesToInventoryRule = syncManager.getSyncRule('sales-to-inventory')
      
      expect(salesToInventoryRule).toMatchObject({
        sourceModule: 'sales',
        targetModules: ['inventory', 'accounting'],
        trigger: 'sale_created',
        priority: 1,
        enabled: true,
      })
    })
  })
})