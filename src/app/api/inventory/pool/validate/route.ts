import { NextRequest, NextResponse } from 'next/server'
import { InventoryPool } from '@/lib/services/inventory-pool'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'

const validateStockSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  quantity: z.number().positive('Quantity must be positive'),
  operation: z.enum(['reserve', 'reduce'])
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = validateStockSchema.parse(body)

    const validation = await InventoryPool.validateStockOperation(
      validatedData.productId,
      validatedData.quantity,
      validatedData.operation
    )

    return NextResponse.json({
      success: true,
      data: validation
    })
  } catch (error) {
    console.error('Error validating stock operation:', error)
    
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