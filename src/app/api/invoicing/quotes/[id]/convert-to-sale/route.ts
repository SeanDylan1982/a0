import { NextRequest, NextResponse } from 'next/server'
import { quickMigrate } from '@/lib/middleware/route-migrator'
import { AuthenticatedRequest } from '@/lib/middleware/auth-middleware'
import { SalesIntegrationService } from '@/lib/services/sales-integration-service'

const salesService = new SalesIntegrationService()

async function handlePOST(request: AuthenticatedRequest, { params }: { params: { id: string } }) {
  try {
    const quoteId = params.id

    if (!quoteId) {
      return NextResponse.json(
        { error: 'Quote ID is required' },
        { status: 400 }
      )
    }

    // Get activity context from request
    const activityContext = {
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    }

    // Convert quote to sale using integration service
    const result = await salesService.convertQuoteToSale(
      quoteId,
      request.user?.id || 'system',
      activityContext
    )

    return NextResponse.json({
      message: 'Quote converted to sale successfully',
      sale: result.sale,
      quote: result.quote
    })

  } catch (error) {
    console.error('Convert quote to sale error:', error)
    throw error // Let middleware handle error translation
  }
}

// Apply middleware
const { POST } = quickMigrate('sales', {
  POST: handlePOST
})

export { POST }