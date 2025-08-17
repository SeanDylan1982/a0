import { NextResponse } from 'next/server'
import { quickMigrate } from '@/lib/middleware/route-migrator'
import { AuthenticatedRequest } from '@/lib/middleware/auth-middleware'
import { prisma } from '@/lib/prisma'

async function handleGET(request: AuthenticatedRequest) {
  try {
    // Try to fetch from database first
    const settings = await prisma.setting.findMany({
      where: {
        category: 'company'
      }
    }).catch(() => null)

    if (settings && settings.length > 0) {
      // Convert settings array to object
      const settingsObj = settings.reduce((acc, setting) => {
        acc[setting.key] = setting.value
        return acc
      }, {} as Record<string, any>)

      return NextResponse.json(settingsObj)
    }

    // Fallback to environment variables
    const fallbackSettings = {
      companyName: process.env.COMPANY_NAME || 'Demo Company Ltd',
      country: process.env.COMPANY_COUNTRY || 'ZA',
      currency: 'ZAR',
      taxRate: 15,
      language: 'en'
    }

    return NextResponse.json(fallbackSettings)
  } catch (error) {
    console.error('Error fetching company settings:', error)
    throw error // Let middleware handle error translation
  }
}

async function handlePUT(request: AuthenticatedRequest) {
  try {
    const settings = await request.json()

    // Update or create settings in database
    const updatePromises = Object.entries(settings).map(([key, value]) =>
      prisma.setting.upsert({
        where: {
          key_category: {
            key,
            category: 'company'
          }
        },
        update: {
          value: String(value)
        },
        create: {
          key,
          value: String(value),
          category: 'company'
        }
      })
    )

    await Promise.all(updatePromises)

    return NextResponse.json({
      message: 'Company settings updated successfully',
      settings
    })
  } catch (error) {
    console.error('Error updating company settings:', error)
    throw error // Let middleware handle error translation
  }
}

// Apply middleware to handlers
const { GET, PUT } = quickMigrate('settings', {
  GET: handleGET,
  PUT: handlePUT
})

export { GET, PUT }