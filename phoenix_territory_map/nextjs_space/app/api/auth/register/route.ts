import { hash } from 'bcryptjs'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Password validation regex
const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{9,}$/

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Validate password requirements
    if (!PASSWORD_REGEX.test(password)) {
      return NextResponse.json(
        {
          error:
            'Password must be at least 9 characters long, contain at least 1 uppercase letter and 1 special character',
        },
        { status: 400 }
      )
    }

    // Check if user exists and is pre-provisioned
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })

    if (!user) {
      return NextResponse.json(
        {
          error:
            'Your email has not been authorized. Please contact the administrator.',
        },
        { status: 403 }
      )
    }

    if (user.hasRegistered) {
      return NextResponse.json(
        { error: 'You have already registered. Please log in.' },
        { status: 400 }
      )
    }

    // Check if email has been verified
    if (!user.emailVerified) {
      return NextResponse.json(
        { error: 'Email not verified. Please verify your email first.' },
        { status: 403 }
      )
    }

    // Hash password and update user
    const hashedPassword = await hash(password, 10)

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        hasRegistered: true,
      },
    })

    return NextResponse.json(
      { message: 'Registration successful! You can now log in.' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'An error occurred during registration' },
      { status: 500 }
    )
  }
}
