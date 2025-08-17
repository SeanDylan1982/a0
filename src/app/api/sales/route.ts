import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { quickMigrate, COMMON_NOTIFICATIONS } from '@/lib/middleware/route-migrator'
import { AuthenticatedRequest } from '@/lib/middleware/auth-middleware'

async function handleGET(request: AuthenticatedRequest) {
  try {
    const sales = await prisma.sale.findMany({
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            company: true,
          }
        },
        user: {
          select: {
            id: true,
            name: true,
          }
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({ sales })
  } catch (error) {
    console.error('Get sales error:', error)
    throw error // Let middleware handle error translation
  }
}

async function handlePOST(request: AuthenticatedRequest) {
  try {
    const { customerId, items, notes } = await request.json()

    if (!customerId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Customer and items are required' },
        { status: 400 }
      )
    }

    // Calculate totals
    let subtotal = 0
    for (const item of items) {
      if (!item.productId || !item.quantity || !item.price) {
        return NextResponse.json(
          { error: 'Each item must have productId, quantity, and price' },
          { status: 400 }
        )
      }
      subtotal += item.quantity * item.price
    }

    // Calculate VAT (15% for South Africa)
    const tax = subtotal * 0.15
    const total = subtotal + tax

    // Create sale
    const sale = await prisma.sale.create({
      data: {
        customerId,
        userId: request.user?.id || 'system', // Get from authenticated request
        status: 'DRAFT',
        subtotal,
        tax,
        total,
        notes,
        items: {
          create: items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
            total: item.quantity * item.price,
          }))
        }
      },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            company: true,
          }
        },
        user: {
          select: {
            id: true,
            name: true,
          }
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
              }
            }
          }
        }
      }
    })

    return NextResponse.json({
      message: 'Sale created successfully',
      sale
    })

  } catch (error) {
    console.error('Create sale error:', error)
    throw error // Let middleware handle error translation
  }
}

// Apply middleware to handlers with large transaction notifications
const { GET, POST } = quickMigrate('sales', {
  GET: handleGET,
  POST: handlePOST
}, {
  notifications: {
    triggers: [COMMON_NOTIFICATIONS.largeTransaction(10000)]
  }
})

export { GET, POST }