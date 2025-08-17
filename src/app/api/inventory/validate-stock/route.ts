import { NextRequest, NextResponse } from 'next/server'
import { InventoryAlertManager } from '@/lib/inventory-alerts'

export async function POST(request: NextRequest) {
  try {
    const { productId, quantity } = await request.json()

    if (!productId || !quantity) {
      return NextResponse.json(
        { error: 'Product ID and quantity are required' },
        { status: 400 }
      )
    }

    const validation = await InventoryAlertManager.validateStockAvailability(
      productId,
      parseInt(quantity)
    )

    return NextResponse.json(validation)
  } catch (error) {
    console.error('Error validating stock:', error)
    // Graceful fallback: allow action to proceed in offline mode
    return NextResponse.json({
      available: true,
      currentStock: 0,
      message: 'Stock validation skipped - database unavailable',
      databaseError: true
    })
  }
}