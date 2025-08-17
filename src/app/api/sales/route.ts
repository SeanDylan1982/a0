import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { quickMigrate, COMMON_NOTIFICATIONS } from '@/lib/middleware/route-migrator'
import { AuthenticatedRequest } from '@/lib/middleware/auth-middleware'
import { SalesIntegrationService } from '@/lib/services/sales-integration-service'

const salesService = new SalesIntegrationService()

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

    // Validate items
    for (const item of items) {
      if (!item.productId || !item.quantity || !item.price) {
        return NextResponse.json(
          { error: 'Each item must have productId, quantity, and price' },
          { status: 400 }
        )
      }
    }

    // Get activity context from request
    const activityContext = {
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    }

    // Create sale using integration service
    const sale = await salesService.createSale({
      customerId,
      items,
      notes,
      userId: request.user?.id || 'system',
      activityContext
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
})

export { GET, POST }