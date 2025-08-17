import { NextRequest, NextResponse } from 'next/server'
import { executeWithRetry, getDb } from '@/lib/db-manager'

// In-memory cache to hold quotes created while the database is unavailable
// This will reset on server restart, but enables a functional offline flow
const offlineQuotes: any[] = []

export async function GET(request: NextRequest) {
  try {
    const db = await getDb()

    const quotes = await executeWithRetry(() =>
      db.quote.findMany({
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              company: true,
            }
          },
          items: true,
        },
        orderBy: { createdAt: 'desc' }
      }),
      'Get Quotes Query'
    )

    // If DB fetch works, also include any offline quotes captured during outages
    const merged = [
      ...offlineQuotes.map(q => ({
        customer: q.customer ?? {
          id: q.customerId || 'unknown-customer',
          firstName: 'Unknown',
          lastName: 'Customer',
          company: undefined,
        },
        ...q,
      })),
      ...quotes,
    ]
    return NextResponse.json({ quotes: merged })
  } catch (error) {
    console.error('Get quotes error:', error)

    // Fallback data when DB is unavailable or model missing
    const fallbackList = offlineQuotes.length
      ? offlineQuotes.map(q => ({
          // Ensure customer object exists for UI rendering
          customer: q.customer ?? {
            id: q.customerId || 'unknown-customer',
            firstName: 'Unknown',
            lastName: 'Customer',
            company: undefined,
          },
          ...q,
        }))
      : [
          {
            id: 'fallback-quote-1',
            number: 'Q-0001',
            customerId: 'fallback-customer-1',
            status: 'DRAFT',
            subtotal: 0,
            tax: 0,
            total: 0,
            validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            createdAt: new Date().toISOString(),
            customer: {
              id: 'fallback-customer-1',
              firstName: 'System',
              lastName: 'Offline',
              company: 'Account Zero'
            }
          }
        ]

    return NextResponse.json({
      quotes: fallbackList,
      databaseError: true,
      message: 'Showing fallback quotes - database connection unavailable'
    })
  }
}

export async function PATCH(request: NextRequest) {
  // Update an existing quote. Accepts body: { id, customerId?, validUntil?, notes?, items?[] }
  let id: string | undefined
  let body: any
  try {
    body = await request.json()
    id = body.id
    if (!id) {
      return NextResponse.json({ error: 'Quote id is required' }, { status: 400 })
    }

    const updates: any = {}
    if (body.customerId) updates.customerId = body.customerId
    if (typeof body.notes === 'string') updates.notes = body.notes

    let items: Array<{ productId: string; quantity: number; price: number; total?: number }> | undefined
    if (Array.isArray(body.items)) {
      items = body.items
      // Recalculate totals if items provided
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
      updates.subtotal = subtotal
      updates.tax = tax
      updates.total = total
    }

    const db = await getDb()
    const updated = await executeWithRetry(
      () =>
        db.quote.update({
          where: { id },
          data: {
            ...updates,
            ...(body.validUntil ? { validUntil: new Date(body.validUntil) } : {}),
            ...(items
              ? {
                  items: {
                    deleteMany: {},
                    create: (items as Array<{ productId: string; quantity: number; price: number; total?: number }>).map((it) => ({
                      productId: it.productId,
                      quantity: it.quantity,
                      price: it.price,
                      total: it.total ?? it.quantity * it.price,
                    })),
                  },
                }
              : {}),
          },
          include: {
            customer: {
              select: { id: true, firstName: true, lastName: true, company: true },
            },
            items: true,
          },
        }),
      'Update Quote'
    )

    return NextResponse.json({ message: 'Quote updated', quote: updated })
  } catch (error) {
    console.error('Update quote error:', error)
    // Attempt offline update: update in-memory offlineQuotes if exists
    if (id) {
      const idx = offlineQuotes.findIndex((q) => q.id === id)
      if (idx !== -1) {
        const q = offlineQuotes[idx]
        const newItems = body && Array.isArray(body.items) ? body.items : undefined
        let subtotal = q.subtotal
        let tax = q.tax
        let total = q.total
        if (newItems) {
          subtotal = newItems.reduce((s: number, it: any) => s + it.quantity * it.price, 0)
          tax = subtotal * 0.15
          total = subtotal + tax
        }
        const updated = {
          ...q,
          ...(body || {}),
          ...(newItems ? { items: newItems, subtotal, tax, total } : {}),
          ...(body && body.validUntil ? { validUntil: body.validUntil } : {}),
          updatedAt: new Date().toISOString(),
        }
        offlineQuotes[idx] = updated
        return NextResponse.json({ message: 'Quote updated (offline mode)', quote: updated, offline: true })
      }
    }
    return NextResponse.json({ error: 'Failed to update quote' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  // Hoist variables so catch can use them for offline fallback without ReferenceError
  let customerId: string | undefined
  let validUntil: string | undefined
  let notes: string | undefined
  let items: any[] = []
  let customerSnapshot: { id: string; firstName?: string; lastName?: string; company?: string } | undefined
  let subtotal = 0
  let tax = 0
  let total = 0

  try {
    const body = await request.json()
    customerId = body.customerId
    validUntil = body.validUntil
    notes = body.notes
    items = Array.isArray(body.items) ? body.items : []
    customerSnapshot = body.customerSnapshot

    if (!customerId || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Customer and at least one item are required' },
        { status: 400 }
      )
    }

    // Calculate totals
    subtotal = 0
    for (const item of items) {
      if (!item.productId || !item.quantity || !item.price) {
        return NextResponse.json(
          { error: 'Each item must have productId, quantity, and price' },
          { status: 400 }
        )
      }
      subtotal += item.quantity * item.price
    }
    tax = subtotal * 0.15
    total = subtotal + tax

    const db = await getDb()

    const quote = await executeWithRetry(() =>
      db.quote.create({
        data: {
          customerId,
          status: 'DRAFT',
          subtotal,
          tax,
          total,
          validUntil,
          notes,
          items: {
            create: items.map((it: any) => ({
              productId: it.productId,
              quantity: it.quantity,
              price: it.price,
              total: it.total ?? it.quantity * it.price,
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
          items: true,
        }
      }),
      'Create Quote'
    )

    return NextResponse.json({
      message: 'Quote created successfully',
      quote,
    })
  } catch (error) {
    console.error('Create quote error:', error)
    // Graceful fallback: echo back a pseudo-quote so UI can proceed in offline mode
    const now = new Date().toISOString()
    const fallbackQuote = {
      id: `fallback-quote-${Math.random().toString(36).slice(2)}`,
      number: `Q-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(Math.random()*1000).toString().padStart(3,'0')}`,
      customerId: customerId || 'unknown-customer',
      status: 'DRAFT',
      subtotal,
      tax,
      total,
      validUntil: validUntil || now,
      createdAt: now,
      items: items || [],
      customer: customerSnapshot ?? {
        id: customerId || 'unknown-customer',
        firstName: 'Unknown',
        lastName: 'Customer',
        company: undefined,
      },
    }
    // Keep track of offline-created quotes for listing while DB is down
    offlineQuotes.unshift(fallbackQuote)

    return NextResponse.json(
      {
        message: 'Quote created in offline mode (no database connection)',
        quote: fallbackQuote,
        databaseError: true,
        offline: true,
      },
      { status: 200 }
    )
  }
}
