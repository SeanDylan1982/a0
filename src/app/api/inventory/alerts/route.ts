import { NextResponse } from 'next/server'
import { InventoryAlertManager } from '@/lib/inventory-alerts'

export async function GET() {
  try {
    const alerts = await InventoryAlertManager.checkStockLevels()
    
    return NextResponse.json({
      success: true,
      alerts,
      count: alerts.length
    })
  } catch (error) {
    console.error('Error fetching inventory alerts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch inventory alerts' },
      { status: 500 }
    )
  }
}