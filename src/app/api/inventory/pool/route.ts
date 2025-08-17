import { NextRequest, NextResponse } from 'next/server'
import { InventoryPool } from '@/lib/services/inventory-pool'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')

    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 })
    }

    const summary = await InventoryPool.getStockSummary(productId)

    return NextResponse.json({
      success: true,
      data: summary
    })
  } catch (error) {
    console.error('Error getting stock summary:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}