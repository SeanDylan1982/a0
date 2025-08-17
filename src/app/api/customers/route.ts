import { NextRequest, NextResponse } from 'next/server'
import { executeWithRetry, getDb } from '@/lib/db-manager'

export async function GET(request: NextRequest) {
  try {
    console.log('Customers API: Starting data fetch...')
    
    // Get database client with automatic connection management
    const db = await getDb()
    
    // Execute query with retry logic
    const customers = await executeWithRetry(() => 
      db.customer.findMany({
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
      }),
      'Get Customers Query'
    )

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

export async function POST(request: NextRequest) {
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

    // Get database client with automatic connection management
    const db = await getDb()
    
    // Create customer with retry logic
    const customer = await executeWithRetry(() => 
      db.customer.create({
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
      }),
      'Create Customer Query'
    )

    console.log('Customers API: Customer created successfully')
    return NextResponse.json({
      message: 'Customer created successfully',
      customer
    })

  } catch (error) {
    console.error('Create customer error:', error)
    
    // Return error with database status
    return NextResponse.json(
      { 
        error: 'Unable to create customer - database connection unavailable',
        databaseError: true,
        message: 'Please check your database connection and try again'
      },
      { status: 503 } // Service Unavailable
    )
  }
}