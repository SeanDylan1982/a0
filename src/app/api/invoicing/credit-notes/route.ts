import { NextRequest, NextResponse } from 'next/server'
import { executeWithRetry, getDb } from '@/lib/db-manager'

export async function GET() {
  try {
    const db = await getDb()
    const creditNotes = await executeWithRetry(
      () =>
        db.creditNote.findMany({
          include: {
            customer: { select: { id: true, firstName: true, lastName: true, company: true } },
            invoice: { select: { id: true, number: true } },
            user: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
        }),
      'Get Credit Notes Query'
    )
    return NextResponse.json({ creditNotes })
  } catch (error) {
    console.error('Get credit notes error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch credit notes' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { invoiceId, customerId, amount, reason, notes } = body as {
      invoiceId: string
      customerId: string
      amount: number
      reason: string
      notes?: string
    }

    if (!invoiceId || !customerId || !amount || !reason) {
      return NextResponse.json(
        { error: 'invoiceId, customerId, amount and reason are required' },
        { status: 400 }
      )
    }

    const db = await getDb()

    const creditNote = await executeWithRetry(
      () =>
        db.creditNote.create({
          data: {
            invoiceId,
            customerId,
            amount,
            reason,
            status: 'DRAFT',
            notes,
          },
          include: {
            customer: { select: { id: true, firstName: true, lastName: true, company: true } },
            invoice: { select: { id: true, number: true } },
            user: { select: { id: true, name: true } },
          },
        }),
      'Create Credit Note'
    )

    return NextResponse.json({ message: 'Credit note created successfully', creditNote })
  } catch (error) {
    console.error('Create credit note error:', error)
    return NextResponse.json(
      { error: 'Failed to create credit note' },
      { status: 500 }
    )
  }
}
