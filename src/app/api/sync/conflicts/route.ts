import { NextRequest, NextResponse } from 'next/server'
import { dataSyncManager } from '@/lib/services/data-sync-manager'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only allow directors and managers to view conflicts
    if (!['DIRECTOR', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const entityId = searchParams.get('entityId')
    const entityType = searchParams.get('entityType')

    if (!entityId || !entityType) {
      return NextResponse.json(
        { error: 'Missing required parameters: entityId, entityType' },
        { status: 400 }
      )
    }

    const conflicts = await dataSyncManager.detectConflicts(entityId, entityType)
    return NextResponse.json({ conflicts })
  } catch (error) {
    console.error('Sync conflicts API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only allow directors and managers to resolve conflicts
    if (!['DIRECTOR', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { conflictId, resolution } = await request.json()

    if (!conflictId || !resolution) {
      return NextResponse.json(
        { error: 'Missing required fields: conflictId, resolution' },
        { status: 400 }
      )
    }

    await dataSyncManager.resolveConflict(conflictId, resolution, session.user.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Resolve conflict API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}