import { NextRequest, NextResponse } from 'next/server'
import { InventoryPool } from '@/lib/services/inventory-pool'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'
import { StockMovementType } from '@prisma/client'

const recordMovementSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  type: z.nativeEnum(StockMovementType),
  quantity: z.number().positive('Quantity must be positive'),
  reason: z.string().min(1, 'Reason is required'),
  reference: z.string().optional()
})

const updateStockSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  quantity: z.number().int('Quantity must be an integer'),
  reason: z.string().min(1, 'Reason is required'),
  requireApproval: z.boolean().optional()
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, ...data } = body

    if (action === 'record') {
      const validatedData = recordMovementSchema.parse(data)
      const movement = await InventoryPool.recordMovement({
        ...validatedData,
        userId: session.user.id
      })

      return NextResponse.json({
        success: true,
        data: movement
      })
    } else if (action === 'adjust') {
      const validatedData = updateStockSchema.parse(data)
      const movement = await InventoryPool.updateStock({
        ...validatedData,
        userId: session.user.id
      })

      return NextResponse.json({
        success: true,
        data: movement
      })
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error processing stock movement:', error)
    
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

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')
    const fromDate = searchParams.get('from')
    const toDate = searchParams.get('to')

    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 })
    }

    let dateRange: { from: Date; to: Date } | undefined

    if (fromDate && toDate) {
      dateRange = {
        from: new Date(fromDate),
        to: new Date(toDate)
      }
    }

    const movements = await InventoryPool.getStockMovements(productId, dateRange)

    return NextResponse.json({
      success: true,
      data: movements
    })
  } catch (error) {
    console.error('Error getting stock movements:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}