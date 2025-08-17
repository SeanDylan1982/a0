import { NextRequest, NextResponse } from 'next/server'
import { quickMigrate } from '@/lib/middleware/route-migrator'
import { AuthenticatedRequest } from '@/lib/middleware/auth-middleware'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

async function handleGET(request: AuthenticatedRequest) {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({ users })
  } catch (error) {
    console.error('Get users error:', error)
    throw error // Let middleware handle error translation
  }
}

async function handlePOST(request: AuthenticatedRequest) {
  try {
    const { email, name, role, password } = await request.json()

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      )
    }

    // Generate a temporary password if none provided
    const tempPassword = password || Math.random().toString(36).slice(-8)
    const hashedPassword = await bcrypt.hash(tempPassword, 12)

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role,
        status: 'ACTIVE'
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        createdAt: true,
      }
    })

    return NextResponse.json({
      message: 'User created successfully',
      user,
      tempPassword: password ? undefined : tempPassword // Only return temp password if we generated it
    })

  } catch (error) {
    console.error('Create user error:', error)
    throw error // Let middleware handle error translation
  }
}

// Apply middleware to handlers
const { GET, POST } = quickMigrate('admin', {
  GET: handleGET,
  POST: handlePOST
})

export { GET, POST }