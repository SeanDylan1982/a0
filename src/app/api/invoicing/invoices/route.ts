import { NextRequest, NextResponse } from 'next/server'
import { executeWithRetry, getDb } from '@/lib/db-manager'

export async function GET() {
  try {
    const db = await getDb()
    const invoices = await executeWithRetry(
      () =>
        db.invoice.findMany({
          include: {
            customer: {
              select: { id: true, firstName: true, lastName: true, company: true },
            },
            items: true,
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

export async function POST(request: NextRequest) {
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

    // Calculate totals
    let subtotal = 0
    for (const it of items) {
      if (!it.productId || !it.quantity || !it.price) {
        return NextResponse.json(
          { error: 'Each item must have productId, quantity, and price' },
          { status: 400 }
        )
      }
      subtotal += it.quantity * it.price
    }
    const tax = subtotal * 0.15
    const total = subtotal + tax

    const db = await getDb()

    const invoice = await executeWithRetry(
      () =>
        db.invoice.create({
          data: {
            customerId,
            status: 'DRAFT',
            subtotal,
            tax,
            total,
            dueDate,
            notes,
            items: {
              create: items.map((it) => ({
                productId: it.productId,
                quantity: it.quantity,
                price: it.price,
                total: it.total ?? it.quantity * it.price,
              })),
            },
          },
          include: {
            customer: { select: { id: true, firstName: true, lastName: true, company: true } },
            items: true,
            payments: true,
          },
        }),
      'Create Invoice'
    )

    return NextResponse.json({ message: 'Invoice created successfully', invoice })
  } catch (error) {
    console.error('Create invoice error:', error)
    return NextResponse.json(
      { error: 'Failed to create invoice' },
      { status: 500 }
    )
  }
}
