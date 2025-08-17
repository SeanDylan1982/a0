import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NotificationManager, NotificationFilters } from '@/lib/services/notification-manager'
import { NotificationType, NotificationPriority } from '@prisma/client'
import { z } from 'zod'

const createNotificationSchema = z.object({
  userId: z.string().optional(), // If not provided, use current user
  type: z.nativeEnum(NotificationType),
  title: z.string().min(1).max(255),
  message: z.string().min(1).max(1000),
  data: z.record(z.any()).optional(),
  priority: z.nativeEnum(NotificationPriority).optional(),
  expiresAt: z.string().datetime().optional()
})

const getNotificationsSchema = z.object({
  type: z.nativeEnum(NotificationType).optional(),
  priority: z.nativeEnum(NotificationPriority).optional(),
  read: z.string().transform(val => val === 'true').optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.string().transform(val => parseInt(val)).optional(),
  offset: z.string().transform(val => parseInt(val)).optional()
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
    
    const validatedParams = getNotificationsSchema.parse(queryParams)
    
    const filters: NotificationFilters = {
      type: validatedParams.type,
      priority: validatedParams.priority,
      read: validatedParams.read,
      startDate: validatedParams.startDate ? new Date(validatedParams.startDate) : undefined,
      endDate: validatedParams.endDate ? new Date(validatedParams.endDate) : undefined,
      limit: validatedParams.limit,
      offset: validatedParams.offset
    }

    const notifications = await notificationManager.getNotifications(session.user.id, filters)
    
    return NextResponse.json({ notifications })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid query parameters', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createNotificationSchema.parse(body)

    // Use current user if userId not provided
    const targetUserId = validatedData.userId || session.user.id

    const notification = await notificationManager.create({
      userId: targetUserId,
      type: validatedData.type,
      title: validatedData.title,
      message: validatedData.message,
      data: validatedData.data,
      priority: validatedData.priority,
      expiresAt: validatedData.expiresAt ? new Date(validatedData.expiresAt) : undefined
    })

    return NextResponse.json({ notification }, { status: 201 })
  } catch (error) {
    console.error('Error creating notification:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 })
  }
}