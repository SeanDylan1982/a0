import { prisma as db } from '@/lib/prisma'
// Socket emit is optional; do not import a non-existent export. We'll emit only if a global io exists.

export interface StockAlert {
  id: string
  productId: string
  product: {
    sku: string
    name: string
    quantity: number
    minStock: number
    category: string
  }
  type: 'LOW_STOCK' | 'CRITICAL_STOCK' | 'OUT_OF_STOCK'
  message: string
  severity: 'warning' | 'error' | 'critical'
  createdAt: Date
}

export class InventoryAlertManager {
  static async checkStockLevels(): Promise<StockAlert[]> {
    const products = await db.product.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        sku: true,
        name: true,
        quantity: true,
        minStock: true,
        category: true
      }
    })

    const alerts: StockAlert[] = []

    for (const product of products) {
      const alert = this.generateStockAlert(product)
      if (alert) {
        alerts.push(alert)
        await this.sendAlert(alert)
      }
    }

    return alerts
  }

  private static generateStockAlert(product: any): StockAlert | null {
    const { id, sku, name, quantity, minStock, category } = product

    if (quantity <= 0) {
      return {
        id: `${id}-out-of-stock`,
        productId: id,
        product: { sku, name, quantity, minStock, category },
        type: 'OUT_OF_STOCK',
        message: `${name} (${sku}) is OUT OF STOCK`,
        severity: 'critical',
        createdAt: new Date()
      }
    }

    if (quantity <= Math.floor(minStock * 0.5)) {
      return {
        id: `${id}-critical`,
        productId: id,
        product: { sku, name, quantity, minStock, category },
        type: 'CRITICAL_STOCK',
        message: `${name} (${sku}) is critically low: ${quantity} units remaining`,
        severity: 'error',
        createdAt: new Date()
      }
    }

    if (quantity <= minStock) {
      return {
        id: `${id}-low`,
        productId: id,
        product: { sku, name, quantity, minStock, category },
        type: 'LOW_STOCK',
        message: `${name} (${sku}) is below minimum stock: ${quantity}/${minStock} units`,
        severity: 'warning',
        createdAt: new Date()
      }
    }

    return null
  }

  private static async sendAlert(alert: StockAlert) {
    // Send real-time notification via Socket.IO
    try {
      const g: any = (globalThis as any)
      if (g && g.io && typeof g.io.emit === 'function') {
        g.io.emit('inventory-alert', alert)
      }
    } catch (_) {
      // no-op if socket not available
    }

    // Create calendar event for critical alerts
    if (alert.severity === 'critical' || alert.severity === 'error') {
      await this.createCalendarAlert(alert)
    }

    // Log alert for audit trail
    console.log(`[INVENTORY ALERT] ${alert.severity.toUpperCase()}: ${alert.message}`)
  }

  private static async createCalendarAlert(alert: StockAlert) {
    try {
      await db.event.create({
        data: {
          title: `URGENT: ${alert.product.name} Stock Alert`,
          description: alert.message,
          startDate: new Date(),
          endDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
          type: 'DEADLINE',
          isAllDay: false,
          attendees: [] // Will be populated with management user IDs
        }
      })
    } catch (error) {
      console.error('Failed to create calendar alert:', error)
    }
  }

  static async validateStockAvailability(productId: string, requestedQuantity: number): Promise<{
    available: boolean
    currentStock: number
    message: string
  }> {
    const product = await db.product.findUnique({
      where: { id: productId },
      select: { quantity: true, name: true, sku: true }
    })

    if (!product) {
      return {
        available: false,
        currentStock: 0,
        message: 'Product not found'
      }
    }

    if (product.quantity < requestedQuantity) {
      return {
        available: false,
        currentStock: product.quantity,
        message: `Insufficient stock. Available: ${product.quantity}, Requested: ${requestedQuantity}`
      }
    }

    return {
      available: true,
      currentStock: product.quantity,
      message: 'Stock available'
    }
  }

  static async updateStock(productId: string, quantityChange: number, reason: string, userId: string) {
    // Import InventoryPool dynamically to avoid circular dependency
    const { InventoryPool } = await import('./services/inventory-pool')
    
    try {
      if (quantityChange > 0) {
        // For positive changes, record as purchase
        await InventoryPool.recordMovement({
          productId,
          type: 'PURCHASE',
          quantity: quantityChange,
          reason,
          userId,
          reference: `AUTO-${Date.now()}`
        })
      } else {
        // For negative changes, record as adjustment
        await InventoryPool.updateStock({
          productId,
          quantity: quantityChange,
          reason,
          userId
        })
      }

      // Get updated quantity
      const product = await db.product.findUnique({
        where: { id: productId },
        select: { quantity: true }
      })

      return product?.quantity || 0
    } catch (error) {
      // Fallback to old method if InventoryPool fails
      console.warn('InventoryPool update failed, using fallback method:', error)
      
      const product = await db.product.findUnique({
        where: { id: productId }
      })

      if (!product) {
        throw new Error('Product not found')
      }

      const newQuantity = product.quantity + quantityChange

      if (newQuantity < 0) {
        throw new Error('Cannot reduce stock below zero')
      }

      // Update product quantity
      await db.product.update({
        where: { id: productId },
        data: { quantity: newQuantity }
      })

      // Log inventory change
      await db.inventoryLog.create({
        data: {
          productId,
          userId,
          type: quantityChange > 0 ? 'STOCK_IN' : 'STOCK_OUT',
          quantity: Math.abs(quantityChange),
          reason,
          reference: `AUTO-${Date.now()}`
        }
      })

      // Check for alerts after stock update
      const updatedProduct = await db.product.findUnique({
        where: { id: productId },
        select: {
          id: true,
          sku: true,
          name: true,
          quantity: true,
          minStock: true,
          category: true
        }
      })

      if (updatedProduct) {
        const alert = this.generateStockAlert(updatedProduct)
        if (alert) {
          await this.sendAlert(alert)
        }
      }

      return newQuantity
    }
  }
}