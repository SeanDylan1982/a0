import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // In a real app, this would fetch from database
    // For now, return default settings
    const settings = {
      companyName: process.env.COMPANY_NAME || 'Demo Company Ltd',
      country: process.env.COMPANY_COUNTRY || 'ZA'
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error fetching company settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch company settings' },
      { status: 500 }
    )
  }
}