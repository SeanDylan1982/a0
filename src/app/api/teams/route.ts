import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const teams = await db.team.findMany({
      include: {
        leader: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          }
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({ teams })
  } catch (error) {
    console.error('Get teams error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, description, leaderId } = await request.json()

    if (!name || !leaderId) {
      return NextResponse.json(
        { error: 'Name and leader are required' },
        { status: 400 }
      )
    }

    // Check if leader exists
    const leader = await db.user.findUnique({
      where: { id: leaderId }
    })

    if (!leader) {
      return NextResponse.json(
        { error: 'Leader not found' },
        { status: 404 }
      )
    }

    // Create team
    const team = await db.team.create({
      data: {
        name,
        description,
        leaderId,
      },
      include: {
        leader: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          }
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              }
            }
          }
        }
      }
    })

    return NextResponse.json({
      message: 'Team created successfully',
      team
    })

  } catch (error) {
    console.error('Create team error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}