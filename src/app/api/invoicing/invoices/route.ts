import { NextRequest, NextResponse } from 'next/server'
import { executeWithRetry, getDb } from '@/lib/db-manager'
import { quickMigrate } from '@/lib/middleware/route-migrator'
import { AuthenticatedRequest } from '@/lib/middleware/auth-middleware'
import { SalesIntegrationService } from '@/lib/services/sales-integration-service'

const salesService = new SalesIntegrationService()

async function handleGET(request: AuthenticatedRequest) {
  try {
    const db = await getDb()
    const invoices = await executeWithRetry(
      () =>
        db.invoice.findMany({
          include: {
            customer: {
              select: { id: true, firstName: true, lastName: true, company: true },
            },
            payments: true,
          },
          orderBy: { createdAt: 'desc' },
        }),
      'Get Invoices Query'
    )
    return NextResponse.json({ invoices })
  } catch (error) {
    console.error('Get invoices error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch invoices' },
      { status: 500 }
    )
  }
}

async function handlePOST(request: AuthenticatedRequest) {
  try {
    const body = await request.json()
    const { customerId, dueDate, notes, items } = body as {
      customerId: string
      dueDate?: string
      notes?: string
      items: Array<{ productId: string; quantity: number; price: number; total?: number }>
    }

    if (!customerId || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Customer and at least one item are required' },
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

    // Create invoice using integration service
    const invoice = await salesService.createInvoice({
      customerId,
      items,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      notes,
      userId: request.user?.id || 'system',
      activityContext
    })

    return NextResponse.json({ message: 'Invoice created successfully', invoice })
  } catch (error) {
    console.error('Create invoice error:', error)
    throw error // Let middleware handle error translation
  }
}

// Apply middleware
const { GET, POST } = quickMigrate('sales', {
  GET: handleGET,
  POST: handlePOST
})

export { GET, POST }
