import { NextRequest, NextResponse } from 'next/server'
import { ActivityLogger } from '@/lib/services/activity-logger'
import { extractUserIdFromRequest } from '@/lib/middleware/activity-middleware'
import { PrismaClient, UserRole } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/activities - Get activities with role-based filtering
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    
    // Parse query parameters
    const module = searchParams.get('module') || undefined
    const action = searchParams.get('action') || undefined
    const entityType = searchParams.get('entityType') || undefined
    const startDate = searchParams.get('startDate') 
      ? new Date(searchParams.get('startDate')!) 
      : undefined
    const endDate = searchParams.get('endDate') 
      ? new Date(searchParams.get('endDate')!) 
      : undefined
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Get activities based on user role
    const activities = await ActivityLogger.getActivitiesByRole(
      userId,
      user.role,
      {
        module,
        action,
        entityType,
        startDate,
        endDate,
        limit,
        offset,
      }
    )

    // Get total count for pagination
    const totalCount = await ActivityLogger.getActivityCount({
      module,
      action,
      entityType,
      startDate,
      endDate,
    })

    return NextResponse.json({
      activities,
      pagination: {
        limit,
        offset,
        total: totalCount,
        hasMore: offset + limit < totalCount,
      },
    })
  } catch (error) {
    console.error('Error fetching activities:', error)
    return NextResponse.json(
      { error: 'Failed to fetch activities' },
      { status: 500 }
    )
  }
}

// GET /api/activities/stats - Get activity statistics for dashboard
export async function getStats(request: NextRequest) {
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

    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    // Get activity counts for different time periods
    const [todayCount, weekCount, monthCount, recentActivities] = await Promise.all([
      ActivityLogger.getActivityCount({
        startDate: today,
      }),
      ActivityLogger.getActivityCount({
        startDate: thisWeek,
      }),
      ActivityLogger.getActivityCount({
        startDate: thisMonth,
      }),
      ActivityLogger.getActivitiesByRole(userId, user.role, { limit: 10 }),
    ])

    // Get module-specific activity counts (for directors and managers)
    let moduleStats = []
    if (user.role === UserRole.DIRECTOR || user.role === UserRole.MANAGER) {
      const modules = ['inventory', 'sales', 'customers', 'hr', 'accounting']
      moduleStats = await Promise.all(
        modules.map(async (module) => ({
          module,
          count: await ActivityLogger.getActivityCount({
            module,
            startDate: today,
          }),
          recentActivities: await ActivityLogger.getModuleActivities(module, 3),
        }))
      )
    }

    return NextResponse.json({
      stats: {
        today: todayCount,
        week: weekCount,
        month: monthCount,
      },
      recentActivities,
      moduleStats,
    })
  } catch (error) {
    console.error('Error fetching activity stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch activity statistics' },
      { status: 500 }
    )
  }
}