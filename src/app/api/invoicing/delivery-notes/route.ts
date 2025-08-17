import { NextRequest, NextResponse } from 'next/server'
import { executeWithRetry, getDb } from '@/lib/db-manager'

export async function GET() {
  try {
    const db = await getDb()
    const deliveryNotes = await executeWithRetry(
      () =>
        db.deliveryNote.findMany({
          include: {
            customer: { select: { id: true, firstName: true, lastName: true, company: true } },
            invoice: { select: { id: true, number: true } },
            user: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
        }),
      'Get Delivery Notes Query'
    )
    return NextResponse.json({ deliveryNotes })
  } catch (error) {
    console.error('Get delivery notes error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch delivery notes' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { invoiceId, customerId, deliveryDate, deliveryAddress, notes } = body as {
      invoiceId: string
      customerId: string
      deliveryDate: string
      deliveryAddress?: string
      notes?: string
    }

    if (!invoiceId || !customerId || !deliveryDate) {
      return NextResponse.json(
        { error: 'invoiceId, customerId and deliveryDate are required' },
        { status: 400 }
      )
    }

    const db = await getDb()

    const deliveryNote = await executeWithRetry(
      () =>
        db.deliveryNote.create({
          data: {
            invoiceId,
            customerId,
            status: 'PENDING',
            deliveryDate: new Date(deliveryDate),
            deliveryAddress,
            notes,
          },
          include: {
            customer: { select: { id: true, firstName: true, lastName: true, company: true } },
            invoice: { select: { id: true, number: true } },
            user: { select: { id: true, name: true } },
          },
        }),
      'Create Delivery Note'
    )

    return NextResponse.json({ message: 'Delivery note created successfully', deliveryNote })
  } catch (error) {
    console.error('Create delivery note error:', error)
    return NextResponse.json(
      { error: 'Failed to create delivery note' },
      { status: 500 }
    )
  }
}
