import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { quickMigrate, COMMON_NOTIFICATIONS } from '@/lib/middleware/route-migrator'
import { AuthenticatedRequest } from '@/lib/middleware/auth-middleware'

async function handleGET(request: AuthenticatedRequest) {
  try {
    console.log('Customers API: Starting data fetch...')
    
    // Execute query with prisma client
    const customers = await prisma.customer.findMany({
      include: {
        contacts: true,
        sales: {
          select: {
            id: true,
            status: true,
            total: true,
            createdAt: true,
          }
        },
        invoices: {
          select: {
            id: true,
            status: true,
            total: true,
            createdAt: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    console.log('Customers API: Data fetched successfully')
    return NextResponse.json({ customers })
  } catch (error) {
    console.error('Get customers error:', error)
    
    // Return fallback data when database is not available
    console.log('Customers API: Returning fallback data due to database error')
    
    return NextResponse.json({ 
      customers: [
        {
          id: 'fallback-1',
          firstName: 'System',
          lastName: 'Offline',
          email: 'offline@accountzero.co.za',
          phone: '+27 11 000 0000',
          company: 'Account Zero',
          address: 'Database Connection Unavailable',
          city: 'Offline Mode',
          state: 'N/A',
          country: 'South Africa',
          postalCode: '0000',
          taxId: 'N/A',
          notes: 'This is fallback data shown when database is unavailable',
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          contacts: [],
          sales: [],
          invoices: []
        }
      ],
      databaseError: true,
      message: 'Showing fallback data - database connection unavailable'
    })
  }
}

async function handlePOST(request: AuthenticatedRequest) {
  try {
    console.log('Customers API: Creating new customer...')
    
    const {
      firstName,
      lastName,
      email,
      phone,
      company,
      address,
      city,
      state,
      country,
      postalCode,
      taxId,
      notes
    } = await request.json()

    if (!firstName || !lastName) {
      return NextResponse.json(
        { error: 'First name and last name are required' },
        { status: 400 }
      )
    }

    // Create customer
    const customer = await prisma.customer.create({
      data: {
        firstName,
        lastName,
        email,
        phone,
        company,
        address,
        city,
        state,
        country: country || 'South Africa',
        postalCode,
        taxId,
        notes,
        status: 'ACTIVE',
      },
      include: {
        contacts: true,
        sales: {
          select: {
            id: true,
            status: true,
            total: true,
            createdAt: true,
          }
        },
        invoices: {
          select: {
            id: true,
            status: true,
            total: true,
            createdAt: true,
          }
        }
      }
    })

    console.log('Customers API: Customer created successfully')
    return NextResponse.json({
      message: 'Customer created successfully',
      customer
    })

  } catch (error) {
    console.error('Create customer error:', error)
    throw error // Let middleware handle error translation
  }
}

// Apply middleware to handlers
const { GET, POST } = quickMigrate('customers', {
  GET: handleGET,
  POST: handlePOST
}, {
  notifications: {
    triggers: [COMMON_NOTIFICATIONS.newCustomer]
  }
})

export { GET, POST }