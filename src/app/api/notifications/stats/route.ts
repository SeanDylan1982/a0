import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NotificationManager } from '@/lib/services/notification-manager'

const notificationManager = new NotificationManager()

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const stats = await notificationManager.getNotificationStats(session.user.id)

    return NextResponse.json({ stats })
  } catch (error) {
    console.error('Error fetching notification stats:', error)
    return NextResponse.json({ error: 'Failed to fetch notification statistics' }, { status: 500 })
  }
}