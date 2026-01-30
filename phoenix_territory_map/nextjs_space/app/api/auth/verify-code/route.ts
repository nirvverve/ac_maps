import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { email, code } = await request.json();

    if (!email || !code) {
      return NextResponse.json(
        { error: 'Email and verification code are required' },
        { status: 400 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user has already registered
    if (user.hasRegistered) {
      return NextResponse.json(
        { error: 'This email has already been registered' },
        { status: 400 }
      );
    }

    // Check if verification code exists
    if (!user.verificationCode) {
      return NextResponse.json(
        { error: 'No verification code found. Please request a new code.' },
        { status: 400 }
      );
    }

    // Check if code has expired
    if (user.codeExpiresAt && new Date() > user.codeExpiresAt) {
      return NextResponse.json(
        { error: 'Verification code has expired. Please request a new code.' },
        { status: 400 }
      );
    }

    // Verify the code
    if (user.verificationCode !== code) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 400 }
      );
    }

    // Mark email as verified
    await prisma.user.update({
      where: { email: email.toLowerCase() },
      data: {
        emailVerified: true,
        verificationCode: null, // Clear the code after successful verification
        codeExpiresAt: null,
      },
    });

    return NextResponse.json(
      { 
        message: 'Email verified successfully',
        verified: true
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in verify-code:', error);
    return NextResponse.json(
      { error: 'An error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
