import { prisma as db } from '@/lib/prisma'
import { StockMovementType } from '@prisma/client'
import { InventoryAlertManager } from '@/lib/inventory-alerts'

export interface StockReservationRequest {
  productId: string
  quantity: number
  reason: string
  userId: string
  expirationMinutes?: number
}

export interface StockMovementRequest {
  productId: string
  type: StockMovementType
  quantity: number
  reason: string
  reference?: string
  userId: string
}

export interface StockAdjustmentRequest {
  productId: string
  quantity: number
  reason: string
  userId: string
  requireApproval?: boolean
}

export interface ReservationInfo {
  id: string
  productId: string
  quantity: number
  reason: string
  userId: string
  expiresAt: Date
  createdAt: Date
}

export interface MovementInfo {
  id: string
  productId: string
  type: StockMovementType
  quantity: number
  reason: string
  reference?: string
  userId: string
  beforeQty: number
  afterQty: number
  timestamp: Date
}

// Valid adjustment reasons for realistic inventory management
export const VALID_ADJUSTMENT_REASONS = [
  'BREAKAGE',
  'THEFT',
  'SPILLAGE',
  'DAMAGE',
  'EXPIRED',
  'LOST',
  'FOUND',
  'RECOUNT',
  'SUPPLIER_ERROR',
  'RETURN_TO_SUPPLIER',
  'QUALITY_CONTROL',
  'SAMPLE_USED',
  'WRITE_OFF'
] as const

export type ValidAdjustmentReason = typeof VALID_ADJUSTMENT_REASONS[number]

export class InventoryPool {
  /**
   * Get available stock for a product (total quantity minus active reservations)
   */
  static async getAvailableStock(productId: string): Promise<number> {
    const product = await db.product.findUnique({
      where: { id: productId },
      select: { quantity: true }
    })

    if (!product) {
      throw new Error('Product not found')
    }

    // Get active reservations
    const activeReservations = await db.stockReservation.aggregate({
      where: {
        productId,
        expiresAt: { gt: new Date() }
      },
      _sum: { quantity: true }
    })

    const reservedQuantity = activeReservations._sum.quantity || 0
    return Math.max(0, product.quantity - reservedQuantity)
  }

  /**
   * Reserve stock for a specific purpose with automatic expiration
   */
  static async reserveStock(request: StockReservationRequest): Promise<string> {
    const { productId, quantity, reason, userId, expirationMinutes = 30 } = request

    if (quantity <= 0) {
      throw new Error('Reservation quantity must be positive')
    }

    // Use transaction to ensure atomic check and reserve
    const result = await db.$transaction(async (tx) => {
      // Get current product state
      const product = await tx.product.findUnique({
        where: { id: productId },
        select: { quantity: true }
      })

      if (!product) {
        throw new Error('Product not found')
      }

      // Get active reservations within transaction
      const activeReservations = await tx.stockReservation.aggregate({
        where: {
          productId,
          expiresAt: { gt: new Date() }
        },
        _sum: { quantity: true }
      })

      const reservedQuantity = activeReservations._sum.quantity || 0
      const availableStock = Math.max(0, product.quantity - reservedQuantity)

      if (availableStock < quantity) {
        throw new Error(`Insufficient stock available. Available: ${availableStock}, Requested: ${quantity}`)
      }

      // Create reservation with expiration
      const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000)
      
      const reservation = await tx.stockReservation.create({
        data: {
          productId,
          quantity,
          reason,
          userId,
          expiresAt
        }
      })

      return reservation.id
    })

    return result
  }

  /**
   * Release a stock reservation
   */
  static async releaseReservation(reservationId: string): Promise<void> {
    const reservation = await db.stockReservation.findUnique({
      where: { id: reservationId }
    })

    if (!reservation) {
      throw new Error('Reservation not found')
    }

    await db.stockReservation.delete({
      where: { id: reservationId }
    })
  }

  /**
   * Clean up expired reservations
   */
  static async cleanupExpiredReservations(): Promise<number> {
    const result = await db.stockReservation.deleteMany({
      where: {
        expiresAt: { lt: new Date() }
      }
    })

    return result.count
  }

  /**
   * Update stock with realistic adjustment validation
   */
  static async updateStock(request: StockAdjustmentRequest): Promise<MovementInfo> {
    const { productId, quantity, reason, userId, requireApproval = false } = request

    // Validate adjustment reason
    if (!VALID_ADJUSTMENT_REASONS.includes(reason as ValidAdjustmentReason)) {
      throw new Error(`Invalid adjustment reason. Must be one of: ${VALID_ADJUSTMENT_REASONS.join(', ')}`)
    }

    // Get current product state
    const product = await db.product.findUnique({
      where: { id: productId },
      select: { quantity: true, name: true, sku: true }
    })

    if (!product) {
      throw new Error('Product not found')
    }

    const beforeQty = product.quantity
    const afterQty = beforeQty + quantity

    if (afterQty < 0) {
      throw new Error('Cannot reduce stock below zero')
    }

    // For large adjustments, require approval (configurable threshold)
    const LARGE_ADJUSTMENT_THRESHOLD = 100 // This could be configurable per product
    if (requireApproval && Math.abs(quantity) > LARGE_ADJUSTMENT_THRESHOLD) {
      throw new Error('Large adjustments require management approval')
    }

    // Perform the update in a transaction
    const result = await db.$transaction(async (tx) => {
      // Update product quantity
      await tx.product.update({
        where: { id: productId },
        data: { quantity: afterQty }
      })

      // Create stock movement record
      const movement = await tx.stockMovement.create({
        data: {
          productId,
          type: 'ADJUSTMENT',
          quantity: Math.abs(quantity),
          reason,
          userId,
          beforeQty,
          afterQty,
          reference: `ADJ-${Date.now()}`
        }
      })

      return movement
    })

    // Trigger inventory alerts check
    await InventoryAlertManager.checkStockLevels()

    // Broadcast stock adjustment via Socket.IO
    try {
      const product = await db.product.findUnique({
        where: { id: productId },
        select: { name: true }
      })

      if (product) {
        const { SocketBroadcaster } = await import('@/lib/socket')
        SocketBroadcaster.broadcastStockMovement({
          id: result.id,
          productId: result.productId,
          productName: product.name,
          type: result.type,
          quantity: result.quantity,
          beforeQty: result.beforeQty,
          afterQty: result.afterQty,
          reason: result.reason,
          userId: result.userId,
          timestamp: result.timestamp
        })
      }
    } catch (socketError) {
      console.warn('Failed to broadcast stock adjustment via socket:', socketError)
      // Don't throw error - adjustment was recorded successfully
    }

    return result
  }

  /**
   * Record stock movement (purchase, sale, transfer, etc.)
   */
  static async recordMovement(request: StockMovementRequest): Promise<MovementInfo> {
    const { productId, type, quantity, reason, reference, userId } = request

    if (quantity <= 0) {
      throw new Error('Movement quantity must be positive')
    }

    // Get current product state
    const product = await db.product.findUnique({
      where: { id: productId },
      select: { quantity: true }
    })

    if (!product) {
      throw new Error('Product not found')
    }

    const beforeQty = product.quantity
    let afterQty: number

    // Calculate new quantity based on movement type
    switch (type) {
      case 'PURCHASE':
      case 'RETURN':
        afterQty = beforeQty + quantity
        break
      case 'SALE':
      case 'DAMAGE':
      case 'THEFT':
      case 'SPILLAGE':
      case 'BREAKAGE':
        afterQty = beforeQty - quantity
        if (afterQty < 0) {
          throw new Error('Insufficient stock for this movement')
        }
        break
      case 'TRANSFER':
        // For transfers, we need additional logic to handle source/destination
        // For now, treat as outbound movement
        afterQty = beforeQty - quantity
        if (afterQty < 0) {
          throw new Error('Insufficient stock for transfer')
        }
        break
      case 'ADJUSTMENT':
        // Adjustments should use updateStock method instead
        throw new Error('Use updateStock method for adjustments')
      default:
        throw new Error(`Unsupported movement type: ${type}`)
    }

    // Perform the update in a transaction
    const result = await db.$transaction(async (tx) => {
      // Update product quantity
      await tx.product.update({
        where: { id: productId },
        data: { quantity: afterQty }
      })

      // Create stock movement record
      const movement = await tx.stockMovement.create({
        data: {
          productId,
          type,
          quantity,
          reason,
          reference: reference || `${type}-${Date.now()}`,
          userId,
          beforeQty,
          afterQty
        }
      })

      return movement
    })

    // Trigger inventory alerts check
    await InventoryAlertManager.checkStockLevels()

    // Broadcast stock movement via Socket.IO
    try {
      const product = await db.product.findUnique({
        where: { id: productId },
        select: { name: true }
      })

      if (product) {
        const { SocketBroadcaster } = await import('@/lib/socket')
        SocketBroadcaster.broadcastStockMovement({
          id: result.id,
          productId: result.productId,
          productName: product.name,
          type: result.type,
          quantity: result.quantity,
          beforeQty: result.beforeQty,
          afterQty: result.afterQty,
          reason: result.reason,
          userId: result.userId,
          timestamp: result.timestamp
        })
      }
    } catch (socketError) {
      console.warn('Failed to broadcast stock movement via socket:', socketError)
      // Don't throw error - movement was recorded successfully
    }

    return result
  }

  /**
   * Get stock movements for a product within a date range
   */
  static async getStockMovements(
    productId: string,
    dateRange?: { from: Date; to: Date }
  ): Promise<MovementInfo[]> {
    const whereClause: any = { productId }

    if (dateRange) {
      whereClause.timestamp = {
        gte: dateRange.from,
        lte: dateRange.to
      }
    }

    const movements = await db.stockMovement.findMany({
      where: whereClause,
      orderBy: { timestamp: 'desc' },
      take: 100 // Limit to prevent large queries
    })

    return movements
  }

  /**
   * Get active reservations for a product
   */
  static async getActiveReservations(productId: string): Promise<ReservationInfo[]> {
    const reservations = await db.stockReservation.findMany({
      where: {
        productId,
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    })

    return reservations
  }

  /**
   * Get all active reservations for a user
   */
  static async getUserReservations(userId: string): Promise<ReservationInfo[]> {
    const reservations = await db.stockReservation.findMany({
      where: {
        userId,
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    })

    return reservations
  }

  /**
   * Validate stock operation before execution
   */
  static async validateStockOperation(
    productId: string,
    requestedQuantity: number,
    operation: 'reserve' | 'reduce'
  ): Promise<{
    valid: boolean
    availableStock: number
    message: string
  }> {
    try {
      const availableStock = await this.getAvailableStock(productId)
      
      if (availableStock < requestedQuantity) {
        return {
          valid: false,
          availableStock,
          message: `Insufficient stock. Available: ${availableStock}, Requested: ${requestedQuantity}`
        }
      }

      return {
        valid: true,
        availableStock,
        message: 'Stock operation valid'
      }
    } catch (error) {
      return {
        valid: false,
        availableStock: 0,
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Get comprehensive stock summary for a product
   */
  static async getStockSummary(productId: string): Promise<{
    productId: string
    totalStock: number
    availableStock: number
    reservedStock: number
    activeReservations: number
    recentMovements: MovementInfo[]
  }> {
    const product = await db.product.findUnique({
      where: { id: productId },
      select: { quantity: true }
    })

    if (!product) {
      throw new Error('Product not found')
    }

    const availableStock = await this.getAvailableStock(productId)
    const reservedStock = product.quantity - availableStock
    
    const activeReservationsCount = await db.stockReservation.count({
      where: {
        productId,
        expiresAt: { gt: new Date() }
      }
    })

    const recentMovements = await this.getStockMovements(productId, {
      from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
      to: new Date()
    })

    return {
      productId,
      totalStock: product.quantity,
      availableStock,
      reservedStock,
      activeReservations: activeReservationsCount,
      recentMovements: recentMovements.slice(0, 10) // Last 10 movements
    }
  }
}