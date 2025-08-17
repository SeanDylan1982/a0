import { NextRequest, NextResponse } from 'next/server'
import { dataSyncManager } from '@/lib/services/data-sync-manager'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { sourceModule, action, data } = body

    if (!sourceModule || !action || !data) {
      return NextResponse.json(
        { error: 'Missing required fields: sourceModule, action, data' },
        { status: 400 }
      )
    }

    await dataSyncManager.syncData(sourceModule, action, data, session.user.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Sync API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const entityId = searchParams.get('entityId')

    if (entityId) {
      const status = await dataSyncManager.getSyncStatus(entityId)
      return NextResponse.json({ status })
    }

    const health = await dataSyncManager.getHealthStatus()
    return NextResponse.json({ health })
  } catch (error) {
    console.error('Sync status API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}