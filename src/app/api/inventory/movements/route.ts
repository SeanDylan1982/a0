import { NextRequest, NextResponse } from 'next/server'
import { InventoryPool } from '@/lib/services/inventory-pool'
import { prisma } from '@/lib/prisma'
import { quickMigrate } from '@/lib/middleware/route-migrator'
import { AuthenticatedRequest } from '@/lib/middleware/auth-middleware'

async function handleGET(request: AuthenticatedRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')
    const fromDate = searchParams.get('from')
    const toDate = searchParams.get('to')
    const limit = parseInt(searchParams.get('limit') || '100')

    let dateRange: { from: Date; to: Date } | undefined

    if (fromDate || toDate) {
      dateRange = {
        from: fromDate ? new Date(fromDate) : new Date(0),
        to: toDate ? new Date(toDate) : new Date()
      }
    }

    let movements

    if (productId) {
      movements = await InventoryPool.getStockMovements(productId, dateRange)
    } else {
      // Get all movements with user and product info
      const whereClause: any = {}
      
      if (dateRange) {
        whereClause.timestamp = {
          gte: dateRange.from,
          lte: dateRange.to
        }
      }

      movements = await prisma.stockMovement.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              unit: true
            }
          }
        },
        orderBy: { timestamp: 'desc' },
        take: limit
      })
    }

    return NextResponse.json({
      success: true,
      movements
    })

  } catch (error) {
    console.error('Get movements error:', error)
    throw error // Let middleware handle error translation
  }
}

async function handlePOST(request: AuthenticatedRequest) {
  try {
    const { productId, type, quantity, reason, reference } = await request.json()

    if (!productId || !type || !quantity || !reason) {
      return NextResponse.json(
        { error: 'Product ID, type, quantity, and reason are required' },
        { status: 400 }
      )
    }

    if (quantity <= 0) {
      return NextResponse.json(
        { error: 'Quantity must be positive' },
        { status: 400 }
      )
    }

    const validTypes = ['PURCHASE', 'SALE', 'TRANSFER', 'RETURN', 'DAMAGE', 'THEFT', 'SPILLAGE', 'BREAKAGE']
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid movement type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    const movement = await InventoryPool.recordMovement({
      productId,
      type,
      quantity,
      reason,
      reference,
      userId: request.user.id
    })

    return NextResponse.json({
      success: true,
      message: 'Stock movement recorded successfully',
      movement: {
        id: movement.id,
        type: movement.type,
        quantity: movement.quantity,
        beforeQty: movement.beforeQty,
        afterQty: movement.afterQty,
        timestamp: movement.timestamp
      }
    })

  } catch (error) {
    console.error('Record movement error:', error)
    throw error // Let middleware handle error translation
  }
}

// Apply middleware to handlers
const { GET, POST } = quickMigrate('inventory', {
  GET: handleGET,
  POST: handlePOST
})

export { GET, POST }