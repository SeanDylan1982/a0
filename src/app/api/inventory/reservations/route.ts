import { NextRequest, NextResponse } from 'next/server'
import { InventoryPool } from '@/lib/services/inventory-pool'
import { quickMigrate, COMMON_NOTIFICATIONS } from '@/lib/middleware/route-migrator'
import { AuthenticatedRequest } from '@/lib/middleware/auth-middleware'

async function handleGET(request: AuthenticatedRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')
    const userId = searchParams.get('userId')

    let reservations

    if (productId) {
      reservations = await InventoryPool.getActiveReservations(productId)
    } else if (userId) {
      reservations = await InventoryPool.getUserReservations(userId)
    } else {
      // Get user's own reservations by default
      reservations = await InventoryPool.getUserReservations(request.user.id)
    }

    return NextResponse.json({
      success: true,
      reservations
    })

  } catch (error) {
    console.error('Get reservations error:', error)
    throw error // Let middleware handle error translation
  }
}

async function handlePOST(request: AuthenticatedRequest) {
  try {
    const { productId, quantity, reason, expirationMinutes } = await request.json()

    if (!productId || !quantity || !reason) {
      return NextResponse.json(
        { error: 'Product ID, quantity, and reason are required' },
        { status: 400 }
      )
    }

    if (quantity <= 0) {
      return NextResponse.json(
        { error: 'Quantity must be positive' },
        { status: 400 }
      )
    }

    const reservationId = await InventoryPool.reserveStock({
      productId,
      quantity,
      reason,
      userId: request.user.id,
      expirationMinutes: expirationMinutes || 30
    })

    return NextResponse.json({
      success: true,
      message: 'Stock reserved successfully',
      reservationId
    })

  } catch (error) {
    console.error('Stock reservation error:', error)
    throw error // Let middleware handle error translation
  }
}

async function handleDELETE(request: AuthenticatedRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const reservationId = searchParams.get('reservationId')

    if (!reservationId) {
      return NextResponse.json(
        { error: 'Reservation ID is required' },
        { status: 400 }
      )
    }

    await InventoryPool.releaseReservation(reservationId)

    return NextResponse.json({
      success: true,
      message: 'Reservation released successfully'
    })

  } catch (error) {
    console.error('Release reservation error:', error)
    throw error // Let middleware handle error translation
  }
}

// Apply middleware to handlers
const { GET, POST, DELETE } = quickMigrate('inventory', {
  GET: handleGET,
  POST: handlePOST,
  DELETE: handleDELETE
}, {
  notifications: {
    triggers: [COMMON_NOTIFICATIONS.stockReservation]
  }
})

export { GET, POST, DELETE }