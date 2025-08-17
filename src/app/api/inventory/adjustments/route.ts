import { NextRequest, NextResponse } from 'next/server'
import { InventoryPool } from '@/lib/services/inventory-pool'
import { quickMigrate, COMMON_NOTIFICATIONS } from '@/lib/middleware/route-migrator'
import { AuthenticatedRequest } from '@/lib/middleware/auth-middleware'

async function handlePOST(request: AuthenticatedRequest) {
  try {
    const { productId, quantity, reason, notes, requireApproval } = await request.json()

    if (!productId || quantity === undefined || !reason) {
      return NextResponse.json(
        { error: 'Product ID, quantity, and reason are required' },
        { status: 400 }
      )
    }

    // For large adjustments requiring approval, we would typically:
    // 1. Create a pending adjustment record
    // 2. Send notification to management
    // 3. Wait for approval before applying
    // For now, we'll just log the requirement and proceed
    if (requireApproval) {
      console.log(`Large adjustment requiring approval: ${Math.abs(quantity)} units for product ${productId}`)
      // TODO: Implement approval workflow
    }

    const movement = await InventoryPool.updateStock({
      productId,
      quantity,
      reason,
      userId: request.user.id,
      requireApproval
    })

    return NextResponse.json({
      success: true,
      message: requireApproval 
        ? 'Stock adjustment submitted for approval'
        : 'Stock adjustment completed successfully',
      movement: {
        id: movement.id,
        beforeQty: movement.beforeQty,
        afterQty: movement.afterQty,
        quantity: Math.abs(quantity),
        timestamp: movement.timestamp
      }
    })

  } catch (error) {
    console.error('Stock adjustment error:', error)
    throw error // Let middleware handle error translation
  }
}

// Apply middleware to handlers
const { POST } = quickMigrate('inventory', {
  POST: handlePOST
}, {
  notifications: {
    triggers: [COMMON_NOTIFICATIONS.stockAdjustment]
  }
})

export { POST }