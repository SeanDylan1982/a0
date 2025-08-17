import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { connectToDatabase } from '@/lib/db-manager'

// This function can be marked `async` if using `await` inside
export async function dbMiddleware(request: NextRequest) {
  try {
    // Ensure database is connected before proceeding
    const isConnected = await connectToDatabase()
    if (!isConnected) {
      console.error('Database connection failed')
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 500 }
      )
    }
    
    return null // Continue with the request
  } catch (error) {
    console.error('Database middleware error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
