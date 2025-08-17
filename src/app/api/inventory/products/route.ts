import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logInventoryActivity } from '@/lib/utils/activity-utils'
import { ACTIVITY_ACTIONS } from '@/lib/utils/activity-utils'
import { extractUserIdFromRequest } from '@/lib/middleware/activity-middleware'

export async function GET(request: NextRequest) {
  try {
    const products = await db.product.findMany({
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({ products })
  } catch (error) {
    console.error('Get products error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = extractUserIdFromRequest(request)
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User authentication required' },
        { status: 401 }
      )
    }

    const {
      sku,
      name,
      description,
      category,
      price,
      cost,
      quantity,
      minStock,
      maxStock,
      unit,
      barcode,
      location,
      supplierId
    } = await request.json()

    if (!sku || !name || !category || !price || !cost || quantity === undefined) {
      return NextResponse.json(
        { error: 'Required fields are missing' },
        { status: 400 }
      )
    }

    // Check if SKU already exists
    const existingProduct = await db.product.findUnique({
      where: { sku }
    })

    if (existingProduct) {
      return NextResponse.json(
        { error: 'Product with this SKU already exists' },
        { status: 409 }
      )
    }

    // Determine product status based on quantity
    let status = 'ACTIVE'
    if (quantity === 0) {
      status = 'OUT_OF_STOCK'
    }

    // Create product
    const product = await db.product.create({
      data: {
        sku,
        name,
        description,
        category,
        price: parseFloat(price),
        cost: parseFloat(cost),
        quantity: parseInt(quantity),
        minStock: parseInt(minStock) || 0,
        maxStock: parseInt(maxStock) || 1000,
        unit: unit || 'pcs',
        barcode,
        location,
        supplierId: supplierId || null,
        status,
      },
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    })

    // Log the activity
    await logInventoryActivity(
      userId,
      ACTIVITY_ACTIONS.CREATE,
      product.id,
      product.name,
      {
        sku: product.sku,
        category: product.category,
        price: product.price,
        quantity: product.quantity,
        status: product.status,
      },
      request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
      request.headers.get('user-agent') || undefined
    )

    return NextResponse.json({
      message: 'Product created successfully',
      product
    })

  } catch (error) {
    console.error('Create product error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}