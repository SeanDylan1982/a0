import { NextRequest, NextResponse } from 'next/server'
import { ActivityLogger } from '@/lib/services/activity-logger'
import { extractUserIdFromRequest } from '@/lib/middleware/activity-middleware'
import { PrismaClient } from '@prisma/client'
import { canViewActivities } from '@/lib/utils/activity-utils'

const prisma = new PrismaClient()

interface RouteParams {
  params: {
    entityType: string
    entityId: string
  }
}

// GET /api/activities/[entityType]/[entityId] - Get activities for a specific entity
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const userId = extractUserIdFromRequest(request)

    if (!userId) {
      return NextResponse.json(
        { error: 'User authentication required' },
        { status: 401 }
      )
    }

    // Get user details to determine role
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const { entityType, entityId } = params
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')

    // Get activities for the specific entity
    const activities = await ActivityLogger.getEntityActivities(
      entityType,
      entityId,
      limit
    )

    // Filter activities based on user role and permissions
    const filteredActivities = activities.filter(activity => 
      canViewActivities(
        user.role,
        activity.module,
        activity.userId,
        userId
      )
    )

    return NextResponse.json({
      activities: filteredActivities,
      entityType,
      entityId,
    })
  } catch (error) {
    console.error('Error fetching entity activities:', error)
    return NextResponse.json(
      { error: 'Failed to fetch entity activities' },
      { status: 500 }
    )
  }
}