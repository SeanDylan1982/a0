import { NextRequest, NextResponse } from 'next/server'
import { InventoryPool } from '@/lib/services/inventory-pool'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'

const reserveStockSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  quantity: z.number().positive('Quantity must be positive'),
  reason: z.string().min(1, 'Reason is required'),
  expirationMinutes: z.number().positive().optional()
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = reserveStockSchema.parse(body)

    const reservationId = await InventoryPool.reserveStock({
      ...validatedData,
      userId: session.user.id
    })

    return NextResponse.json({
      success: true,
      data: { reservationId }
    })
  } catch (error) {
    console.error('Error reserving stock:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const reservationId = searchParams.get('reservationId')

    if (!reservationId) {
      return NextResponse.json({ error: 'Reservation ID is required' }, { status: 400 })
    }

    await InventoryPool.releaseReservation(reservationId)

    return NextResponse.json({
      success: true,
      message: 'Reservation released successfully'
    })
  } catch (error) {
    console.error('Error releasing reservation:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}