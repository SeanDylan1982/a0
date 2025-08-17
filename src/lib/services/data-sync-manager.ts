import { prisma } from '@/lib/prisma'
import { ActivityLogger } from './activity-logger'
import { NotificationManager } from './notification-manager'
import { EventEmitter } from 'events'

export interface SyncRule {
  id: string
  sourceModule: string
  targetModules: string[]
  trigger: string
  transformer: (data: any) => any
  condition?: (data: any) => boolean
  priority: number
  enabled: boolean
}

export interface SyncStatus {
  entityId: string
  entityType: string
  status: 'pending' | 'syncing' | 'completed' | 'failed'
  lastSyncAt?: Date
  errorMessage?: string
  affectedModules: string[]
}

export interface SyncEvent {
  sourceModule: string
  action: string
  entityType: string
  entityId: string
  data: any
  userId: string
  timestamp: Date
}

export interface SyncConflict {
  id: string
  entityId: string
  entityType: string
  sourceModule: string
  targetModule: string
  conflictType: 'version' | 'constraint' | 'dependency'
  sourceData: any
  targetData: any
  resolution?: 'source_wins' | 'target_wins' | 'merge' | 'manual'
  resolvedAt?: Date
  resolvedBy?: string
}

export class DataSyncManager extends EventEmitter {
  private syncRules: Map<string, SyncRule> = new Map()
  private syncQueue: SyncEvent[] = []
  private isProcessing = false
  private activityLogger: ActivityLogger
  private notificationManager: NotificationManager

  constructor() {
    super()
    this.activityLogger = new ActivityLogger()
    this.notificationManager = new NotificationManager()
    this.initializeDefaultRules()
  }

  private initializeDefaultRules() {
    // Sales to Inventory sync rule
    this.registerSyncRule({
      id: 'sales-to-inventory',
      sourceModule: 'sales',
      targetModules: ['inventory', 'accounting'],
      trigger: 'sale_created',
      transformer: (data) => ({
        productId: data.productId,
        quantity: -data.quantity, // Negative for stock reduction
        reason: `Sale #${data.saleId}`,
        reference: data.saleId,
        type: 'SALE'
      }),
      condition: (data) => data.quantity > 0 && data.productId,
      priority: 1,
      enabled: true
    })

    // Inventory to Sales sync rule
    this.registerSyncRule({
      id: 'inventory-to-sales',
      sourceModule: 'inventory',
      targetModules: ['sales'],
      trigger: 'stock_updated',
      transformer: (data) => ({
        productId: data.productId,
        availableQuantity: data.newQuantity,
        lastUpdated: new Date()
      }),
      condition: (data) => data.productId && typeof data.newQuantity === 'number',
      priority: 2,
      enabled: true
    })

    // Sales to Accounting sync rule
    this.registerSyncRule({
      id: 'sales-to-accounting',
      sourceModule: 'sales',
      targetModules: ['accounting'],
      trigger: 'invoice_created',
      transformer: (data) => ({
        transactionType: 'revenue',
        amount: data.total,
        reference: data.invoiceNumber,
        customerId: data.customerId,
        date: data.createdAt
      }),
      condition: (data) => data.total > 0 && data.invoiceNumber,
      priority: 1,
      enabled: true
    })

    // Purchase to Inventory sync rule
    this.registerSyncRule({
      id: 'purchase-to-inventory',
      sourceModule: 'purchasing',
      targetModules: ['inventory', 'accounting'],
      trigger: 'purchase_received',
      transformer: (data) => ({
        productId: data.productId,
        quantity: data.quantity,
        reason: `Purchase Order #${data.purchaseOrderId}`,
        reference: data.purchaseOrderId,
        type: 'PURCHASE'
      }),
      condition: (data) => data.quantity > 0 && data.productId,
      priority: 1,
      enabled: true
    })
  }

  registerSyncRule(rule: SyncRule): void {
    this.syncRules.set(rule.id, rule)
    this.emit('rule_registered', rule)
  }

  removeSyncRule(ruleId: string): boolean {
    const removed = this.syncRules.delete(ruleId)
    if (removed) {
      this.emit('rule_removed', ruleId)
    }
    return removed
  }

  getSyncRule(ruleId: string): SyncRule | undefined {
    return this.syncRules.get(ruleId)
  }

  getAllSyncRules(): SyncRule[] {
    return Array.from(this.syncRules.values())
  }

  async syncData(sourceModule: string, action: string, data: any, userId: string): Promise<void> {
    const syncEvent: SyncEvent = {
      sourceModule,
      action,
      entityType: data.entityType || 'unknown',
      entityId: data.entityId || data.id,
      data,
      userId,
      timestamp: new Date()
    }

    // Add to queue
    this.syncQueue.push(syncEvent)
    
    // Log the sync initiation
    await this.activityLogger.log({
      userId,
      module: 'data-sync',
      action: 'sync_initiated',
      entityType: 'sync_event',
      entityId: syncEvent.entityId,
      entityName: `${sourceModule}:${action}`,
      details: {
        sourceModule,
        action,
        queueLength: this.syncQueue.length
      }
    })

    // Process queue if not already processing
    if (!this.isProcessing) {
      await this.processQueue()
    }
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.syncQueue.length === 0) {
      return
    }

    this.isProcessing = true
    this.emit('queue_processing_started')

    try {
      while (this.syncQueue.length > 0) {
        const event = this.syncQueue.shift()!
        await this.processSyncEvent(event)
      }
    } catch (error) {
      console.error('Error processing sync queue:', error)
      this.emit('queue_processing_error', error)
    } finally {
      this.isProcessing = false
      this.emit('queue_processing_completed')
    }
  }

  private async processSyncEvent(event: SyncEvent): Promise<void> {
    const applicableRules = this.getApplicableRules(event)
    
    if (applicableRules.length === 0) {
      return
    }

    // Sort by priority (lower number = higher priority)
    applicableRules.sort((a, b) => a.priority - b.priority)

    for (const rule of applicableRules) {
      try {
        await this.applySyncRule(rule, event)
      } catch (error) {
        await this.handleSyncError(rule, event, error as Error)
      }
    }
  }

  private getApplicableRules(event: SyncEvent): SyncRule[] {
    return Array.from(this.syncRules.values()).filter(rule => {
      if (!rule.enabled) return false
      if (rule.sourceModule !== event.sourceModule) return false
      if (rule.trigger !== event.action) return false
      if (rule.condition && !rule.condition(event.data)) return false
      return true
    })
  }

  private async applySyncRule(rule: SyncRule, event: SyncEvent): Promise<void> {
    const transformedData = rule.transformer(event.data)
    
    // Update sync status to syncing
    await this.updateSyncStatus(event.entityId, event.entityType, {
      status: 'syncing',
      affectedModules: rule.targetModules
    })

    // Apply sync to each target module
    for (const targetModule of rule.targetModules) {
      try {
        await this.syncToModule(targetModule, transformedData, event)
        
        // Log successful sync
        await this.activityLogger.log({
          userId: event.userId,
          module: 'data-sync',
          action: 'sync_completed',
          entityType: event.entityType,
          entityId: event.entityId,
          entityName: `${event.sourceModule} → ${targetModule}`,
          details: {
            rule: rule.id,
            sourceModule: event.sourceModule,
            targetModule,
            transformedData
          }
        })
      } catch (error) {
        await this.handleModuleSyncError(rule, event, targetModule, error as Error)
      }
    }

    // Update sync status to completed
    await this.updateSyncStatus(event.entityId, event.entityType, {
      status: 'completed',
      lastSyncAt: new Date(),
      affectedModules: rule.targetModules
    })

    this.emit('sync_completed', { rule, event })
  }

  private async syncToModule(targetModule: string, data: any, event: SyncEvent): Promise<void> {
    switch (targetModule) {
      case 'inventory':
        await this.syncToInventory(data, event)
        break
      case 'accounting':
        await this.syncToAccounting(data, event)
        break
      case 'sales':
        await this.syncToSales(data, event)
        break
      default:
        throw new Error(`Unknown target module: ${targetModule}`)
    }
  }

  private async syncToInventory(data: any, event: SyncEvent): Promise<void> {
    if (data.type === 'SALE' || data.type === 'PURCHASE') {
      // Update product stock
      const product = await prisma.product.findUnique({
        where: { id: data.productId }
      })

      if (!product) {
        throw new Error(`Product not found: ${data.productId}`)
      }

      const newQuantity = Math.max(0, product.quantity + data.quantity)
      
      await prisma.product.update({
        where: { id: data.productId },
        data: { quantity: newQuantity }
      })

      // Create stock movement record
      await prisma.stockMovement.create({
        data: {
          productId: data.productId,
          type: data.type,
          quantity: Math.abs(data.quantity),
          reason: data.reason,
          reference: data.reference,
          userId: event.userId,
          beforeQty: product.quantity,
          afterQty: newQuantity
        }
      })
    }
  }

  private async syncToAccounting(data: any, event: SyncEvent): Promise<void> {
    if (data.transactionType === 'revenue') {
      // Create accounting transaction
      await prisma.transaction.create({
        data: {
          type: 'INCOME',
          amount: data.amount,
          description: `Sales Revenue - ${data.reference}`,
          reference: data.reference,
          date: data.date || new Date(),
          customerId: data.customerId
        }
      })
    }
  }

  private async syncToSales(data: any, event: SyncEvent): Promise<void> {
    if (data.availableQuantity !== undefined) {
      // Update product availability in sales context
      // This could involve updating cached product data or triggering UI updates
      this.emit('product_availability_updated', {
        productId: data.productId,
        availableQuantity: data.availableQuantity,
        lastUpdated: data.lastUpdated
      })
    }
  }

  async getSyncStatus(entityId: string): Promise<SyncStatus | null> {
    try {
      const status = await prisma.syncStatus.findUnique({
        where: { entityId }
      })

      if (!status) return null

      return {
        entityId: status.entityId,
        entityType: status.entityType,
        status: status.status as any,
        lastSyncAt: status.lastSyncAt || undefined,
        errorMessage: status.errorMessage || undefined,
        affectedModules: status.affectedModules
      }
    } catch (error) {
      console.error('Error getting sync status:', error)
      return null
    }
  }

  private async updateSyncStatus(entityId: string, entityType: string, updates: Partial<SyncStatus>): Promise<void> {
    try {
      await prisma.syncStatus.upsert({
        where: { entityId },
        update: {
          status: updates.status,
          lastSyncAt: updates.lastSyncAt,
          errorMessage: updates.errorMessage,
          affectedModules: updates.affectedModules || []
        },
        create: {
          entityId,
          entityType,
          status: updates.status || 'pending',
          lastSyncAt: updates.lastSyncAt,
          errorMessage: updates.errorMessage,
          affectedModules: updates.affectedModules || []
        }
      })
    } catch (error) {
      console.error('Error updating sync status:', error)
    }
  }

  private async handleSyncError(rule: SyncRule, event: SyncEvent, error: Error): Promise<void> {
    await this.updateSyncStatus(event.entityId, event.entityType, {
      status: 'failed',
      errorMessage: error.message,
      affectedModules: rule.targetModules
    })

    // Log the error
    await this.activityLogger.log({
      userId: event.userId,
      module: 'data-sync',
      action: 'sync_failed',
      entityType: event.entityType,
      entityId: event.entityId,
      entityName: `${event.sourceModule} sync error`,
      details: {
        rule: rule.id,
        error: error.message,
        targetModules: rule.targetModules
      }
    })

    // Notify administrators
    await this.notificationManager.create({
      userId: 'system', // Will be sent to all admins
      type: 'SYSTEM',
      title: 'Data Sync Error',
      message: `Failed to sync data from ${event.sourceModule}: ${error.message}`,
      priority: 'high',
      data: {
        rule: rule.id,
        entityId: event.entityId,
        error: error.message
      }
    })

    this.emit('sync_error', { rule, event, error })
  }

  private async handleModuleSyncError(rule: SyncRule, event: SyncEvent, targetModule: string, error: Error): Promise<void> {
    // Log module-specific sync error
    await this.activityLogger.log({
      userId: event.userId,
      module: 'data-sync',
      action: 'module_sync_failed',
      entityType: event.entityType,
      entityId: event.entityId,
      entityName: `${event.sourceModule} → ${targetModule} sync error`,
      details: {
        rule: rule.id,
        targetModule,
        error: error.message
      }
    })

    this.emit('module_sync_error', { rule, event, targetModule, error })
  }

  async detectConflicts(entityId: string, entityType: string): Promise<SyncConflict[]> {
    // This is a simplified conflict detection
    // In a real implementation, this would check for version conflicts,
    // constraint violations, and dependency issues
    const conflicts: SyncConflict[] = []

    try {
      // Check for version conflicts (simplified example)
      const syncStatuses = await prisma.syncStatus.findMany({
        where: {
          entityId,
          status: 'failed'
        }
      })

      for (const status of syncStatuses) {
        if (status.errorMessage?.includes('version') || status.errorMessage?.includes('conflict')) {
          conflicts.push({
            id: `${entityId}-${Date.now()}`,
            entityId,
            entityType,
            sourceModule: 'unknown',
            targetModule: 'unknown',
            conflictType: 'version',
            sourceData: {},
            targetData: {},
            resolution: undefined
          })
        }
      }
    } catch (error) {
      console.error('Error detecting conflicts:', error)
    }

    return conflicts
  }

  async resolveConflict(conflictId: string, resolution: SyncConflict['resolution'], userId: string): Promise<void> {
    // Log conflict resolution
    await this.activityLogger.log({
      userId,
      module: 'data-sync',
      action: 'conflict_resolved',
      entityType: 'sync_conflict',
      entityId: conflictId,
      entityName: `Conflict Resolution: ${resolution}`,
      details: {
        conflictId,
        resolution
      }
    })

    this.emit('conflict_resolved', { conflictId, resolution, userId })
  }

  // Health check method
  async getHealthStatus(): Promise<{
    isHealthy: boolean
    queueLength: number
    isProcessing: boolean
    activeRules: number
    lastProcessedAt?: Date
  }> {
    return {
      isHealthy: this.syncQueue.length < 1000, // Arbitrary threshold
      queueLength: this.syncQueue.length,
      isProcessing: this.isProcessing,
      activeRules: Array.from(this.syncRules.values()).filter(r => r.enabled).length,
      lastProcessedAt: undefined // Could track this if needed
    }
  }
}

// Singleton instance
export const dataSyncManager = new DataSyncManager()