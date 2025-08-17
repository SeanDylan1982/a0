import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NotificationManager } from '@/lib/services/notification-manager'
import { AccessControlManager } from '@/lib/services/access-control-manager'

const notificationManager = new NotificationManager()
const accessControl = new AccessControlManager()

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission to cleanup notifications (admin only)
    const hasPermission = await accessControl.hasPermission(session.user.id, {
      module: 'notifications',
      action: 'cleanup'
    })

    if (!hasPermission) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const deletedCount = await notificationManager.cleanupExpiredNotifications()

    return NextResponse.json({ 
      success: true, 
      deletedCount,
      message: `Cleaned up ${deletedCount} expired notifications`
    })
  } catch (error) {
    console.error('Error cleaning up notifications:', error)
    return NextResponse.json({ error: 'Failed to cleanup notifications' }, { status: 500 })
  }
}