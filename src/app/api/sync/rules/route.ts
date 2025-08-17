import { NextRequest, NextResponse } from 'next/server'
import { dataSyncManager } from '@/lib/services/data-sync-manager'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only allow directors and managers to view sync rules
    if (!['DIRECTOR', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const rules = dataSyncManager.getAllSyncRules()
    return NextResponse.json({ rules })
  } catch (error) {
    console.error('Sync rules API error:', error)
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

    // Only allow directors to create sync rules
    if (session.user.role !== 'DIRECTOR') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const rule = await request.json()
    
    // Validate required fields
    if (!rule.id || !rule.sourceModule || !rule.targetModules || !rule.trigger) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    dataSyncManager.registerSyncRule(rule)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Create sync rule API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}