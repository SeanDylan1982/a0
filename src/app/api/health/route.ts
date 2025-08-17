import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const startTime = Date.now()
  
  try {
    // Test database connection
    await db.user.count()
    const latency = Date.now() - startTime
    
    return NextResponse.json({
      status: 'healthy',
      database: 'connected',
      latency,
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    })
  } catch (error) {
    const latency = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    console.error('Health check error:', error)
    
    return NextResponse.json({
      status: 'error',
      database: 'error',
      latency,
      timestamp: new Date().toISOString(),
      error: errorMessage,
      uptime: process.uptime()
    }, { status: 500 })
  }
}