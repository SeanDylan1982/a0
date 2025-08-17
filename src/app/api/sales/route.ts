import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const sales = await db.sale.findMany({
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
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
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
    const sale = await db.sale.create({
      data: {
        customerId,
        userId: 'current-user-id', // In real app, get from session
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
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}