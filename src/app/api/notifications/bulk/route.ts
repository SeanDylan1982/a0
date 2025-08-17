import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NotificationManager } from '@/lib/services/notification-manager'
import { NotificationType, NotificationPriority } from '@prisma/client'
import { z } from 'zod'

const bulkCreateSchema = z.object({
  notifications: z.array(z.object({
    userId: z.string(),
    type: z.nativeEnum(NotificationType),
    title: z.string().min(1).max(255),
    message: z.string().min(1).max(1000),
    data: z.record(z.any()).optional(),
    priority: z.nativeEnum(NotificationPriority).optional(),
    expiresAt: z.string().datetime().optional()
  }))
})

const bulkActionSchema = z.object({
  action: z.enum(['mark_read', 'delete']),
  notificationIds: z.array(z.string()).optional(),
  type: z.nativeEnum(NotificationType).optional()
})

const notificationManager = new NotificationManager()

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = bulkCreateSchema.parse(body)

    const notificationsData = validatedData.notifications.map(notification => ({
      ...notification,
      expiresAt: notification.expiresAt ? new Date(notification.expiresAt) : undefined
    }))

    const notifications = await notificationManager.createBulk(notificationsData)

    return NextResponse.json({ notifications, count: notifications.length }, { status: 201 })
  } catch (error) {
    console.error('Error creating bulk notifications:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to create bulk notifications' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = bulkActionSchema.parse(body)

    if (validatedData.action === 'mark_read') {
      let count: number

      if (validatedData.notificationIds) {
        // Mark specific notifications as read
        count = await notificationManager.markMultipleAsRead(
          validatedData.notificationIds,
          session.user.id
        )
      } else {
        // Mark all notifications as read (optionally filtered by type)
        count = await notificationManager.markAllAsRead(
          session.user.id,
          validatedData.type
        )
      }

      return NextResponse.json({ success: true, count })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Error performing bulk action:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to perform bulk action' }, { status: 500 })
  }
}