import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const suppliers = await db.supplier.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({ suppliers })
  } catch (error) {
    console.error('Get suppliers error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const {
      name,
      email,
      phone,
      address,
      city,
      state,
      country,
      postalCode,
      contactPerson,
      notes
    } = await request.json()

    if (!name) {
      return NextResponse.json(
        { error: 'Supplier name is required' },
        { status: 400 }
      )
    }

    // Create supplier
    const supplier = await db.supplier.create({
      data: {
        name,
        email,
        phone,
        address,
        city,
        state,
        country,
        postalCode,
        contactPerson,
        notes,
        status: 'ACTIVE',
      }
    })

    return NextResponse.json({
      message: 'Supplier created successfully',
      supplier
    })

  } catch (error) {
    console.error('Create supplier error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}