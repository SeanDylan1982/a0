import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { quickMigrate, COMMON_NOTIFICATIONS } from '@/lib/middleware/route-migrator'
import { AuthenticatedRequest } from '@/lib/middleware/auth-middleware'

async function handleGET(request: AuthenticatedRequest) {
  try {
    const products = await prisma.product.findMany({
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
    throw error // Let middleware handle error translation
  }
}

async function handlePOST(request: AuthenticatedRequest) {
  try {
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
    const existingProduct = await prisma.product.findUnique({
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
    const product = await prisma.product.create({
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

    return NextResponse.json({
      message: 'Product created successfully',
      product
    })

  } catch (error) {
    console.error('Create product error:', error)
    throw error // Let middleware handle error translation
  }
}

// Apply middleware to handlers
const { GET, POST } = quickMigrate('inventory', {
  GET: handleGET,
  POST: handlePOST
}, {
  notifications: {
    triggers: [COMMON_NOTIFICATIONS.lowStock]
  }
})

export { GET, POST }