import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NotificationManager } from '@/lib/services/notification-manager'
import { NotificationType } from '@prisma/client'
import { z } from 'zod'

const countQuerySchema = z.object({
  type: z.nativeEnum(NotificationType).optional()
})

const notificationManager = new NotificationManager()

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const queryParams = Object.fromEntries(searchParams.entries())
    
    const validatedParams = countQuerySchema.parse(queryParams)

    const count = await notificationManager.getUnreadCount(
      session.user.id,
      validatedParams.type
    )

    return NextResponse.json({ count })
  } catch (error) {
    console.error('Error fetching notification count:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid query parameters', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to fetch notification count' }, { status: 500 })
  }
}