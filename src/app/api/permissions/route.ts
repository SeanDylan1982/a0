import { NextResponse } from 'next/server'
import { withAuth, withAdminRole, PERMISSIONS, AuthenticatedRequest } from '@/lib/middleware/auth-middleware'
import { accessControlManager } from '@/lib/services/access-control-manager'
import { UserRole } from '@prisma/client'

/**
 * GET /api/permissions - Get user's permissions
 * Requires authentication
 */
export const GET = withAuth(async (req: AuthenticatedRequest) => {
  try {
    if (!req.user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 400 }
      )
    }

    const permissions = await accessControlManager.getUserPermissions(req.user.id)
    
    return NextResponse.json({
      permissions,
      role: req.user.role
    })
  } catch (error) {
    console.error('Error fetching permissions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch permissions' },
      { status: 500 }
    )
  }
})

/**
 * POST /api/permissions - Grant permission to a user
 * Requires admin role (Director or Manager)
 */
export const POST = withAdminRole(async (req: AuthenticatedRequest) => {
  try {
    const body = await req.json()
    const { userId, module, action, resource, conditions } = body

    if (!userId || !module || !action) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, module, action' },
        { status: 400 }
      )
    }

    if (!req.user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 400 }
      )
    }

    await accessControlManager.grantPermission(
      userId,
      { module, action, resource, conditions },
      req.user.id
    )

    return NextResponse.json({
      message: 'Permission granted successfully'
    })
  } catch (error) {
    console.error('Error granting permission:', error)
    return NextResponse.json(
      { error: 'Failed to grant permission' },
      { status: 500 }
    )
  }
})

/**
 * DELETE /api/permissions - Revoke permission from a user
 * Requires admin role (Director or Manager)
 */
export const DELETE = withAdminRole(async (req: AuthenticatedRequest) => {
  try {
    const body = await req.json()
    const { userId, module, action, resource } = body

    if (!userId || !module || !action) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, module, action' },
        { status: 400 }
      )
    }

    await accessControlManager.revokePermission(
      userId,
      { module, action, resource }
    )

    return NextResponse.json({
      message: 'Permission revoked successfully'
    })
  } catch (error) {
    console.error('Error revoking permission:', error)
    return NextResponse.json(
      { error: 'Failed to revoke permission' },
      { status: 500 }
    )
  }
})