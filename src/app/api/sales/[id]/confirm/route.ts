import { NextRequest, NextResponse } from 'next/server'
import { quickMigrate } from '@/lib/middleware/route-migrator'
import { AuthenticatedRequest } from '@/lib/middleware/auth-middleware'
import { SalesIntegrationService } from '@/lib/services/sales-integration-service'

const salesService = new SalesIntegrationService()

async function handlePOST(request: AuthenticatedRequest, { params }: { params: { id: string } }) {
  try {
    const saleId = params.id

    if (!saleId) {
      return NextResponse.json(
        { error: 'Sale ID is required' },
        { status: 400 }
      )
    }

    // Get activity context from request
    const activityContext = {
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    }

    // Confirm sale using integration service
    const sale = await salesService.confirmSale(
      saleId,
      request.user?.id || 'system',
      activityContext
    )

    return NextResponse.json({
      message: 'Sale confirmed successfully',
      sale
    })

  } catch (error) {
    console.error('Confirm sale error:', error)
    throw error // Let middleware handle error translation
  }
}

// Apply middleware
const { POST } = quickMigrate('sales', {
  POST: handlePOST
})

export { POST }