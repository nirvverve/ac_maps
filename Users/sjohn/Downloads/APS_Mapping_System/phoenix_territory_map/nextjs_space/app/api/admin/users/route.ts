import { getServerSession } from 'next-auth'
import { PrismaClient } from '@prisma/client'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'

const prisma = new PrismaClient()

export const dynamic = 'force-dynamic'

// GET - List all users (admin only)
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || (session.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        hasRegistered: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({ users }, { status: 200 })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}

// POST - Create new user (admin only)
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || (session.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { email, role } = await req.json()

    if (!email || !role) {
      return NextResponse.json(
        { error: 'Email and role are required' },
        { status: 400 }
      )
    }

    // Validate role
    if (!['ADMIN', 'LEVEL1', 'LEVEL2'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      )
    }

    // Create new user
    const newUser = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        role,
        hasRegistered: false,
        password: null,
      },
    })

    return NextResponse.json(
      { message: 'User created successfully', user: newUser },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { error: 'An error occurred while creating the user' },
      { status: 500 }
    )
  }
}
