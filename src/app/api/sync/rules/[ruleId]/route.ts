import { NextRequest, NextResponse } from 'next/server'
import { dataSyncManager } from '@/lib/services/data-sync-manager'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: { ruleId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only allow directors and managers to view sync rules
    if (!['DIRECTOR', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const rule = dataSyncManager.getSyncRule(params.ruleId)
    if (!rule) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 })
    }

    return NextResponse.json({ rule })
  } catch (error) {
    console.error('Get sync rule API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { ruleId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only allow directors to delete sync rules
    if (session.user.role !== 'DIRECTOR') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const removed = dataSyncManager.removeSyncRule(params.ruleId)
    if (!removed) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete sync rule API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}