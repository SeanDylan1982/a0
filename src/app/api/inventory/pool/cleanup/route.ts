import { NextRequest, NextResponse } from 'next/server'
import { InventoryPool } from '@/lib/services/inventory-pool'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only allow inventory managers and directors to run cleanup
    const userRole = session.user.role
    if (!['DIRECTOR', 'INVENTORY_MANAGER'].includes(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const cleanedCount = await InventoryPool.cleanupExpiredReservations()

    return NextResponse.json({
      success: true,
      data: {
        cleanedReservations: cleanedCount,
        message: `Cleaned up ${cleanedCount} expired reservations`
      }
    })
  } catch (error) {
    console.error('Error cleaning up expired reservations:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}