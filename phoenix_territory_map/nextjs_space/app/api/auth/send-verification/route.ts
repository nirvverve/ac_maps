import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { prisma } from '@/lib/db';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Check if user exists in the seeded list
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Email not authorized. Please contact your administrator.' },
        { status: 403 }
      );
    }

    // Check if user has already registered
    if (user.hasRegistered) {
      return NextResponse.json(
        { error: 'This email has already been registered. Please login instead.' },
        { status: 400 }
      );
    }

    // Generate 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Set expiry to 15 minutes from now
    const codeExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

    // Update user with verification code
    await prisma.user.update({
      where: { email: email.toLowerCase() },
      data: {
        verificationCode,
        codeExpiresAt,
        emailVerified: false,
      },
    });

    // Send email with verification code
    try {
      await resend.emails.send({
        from: 'Phoenix Territory Map <noreply@phoenixnewlocations.aps-serv.pro>',
        to: email,
        subject: 'Your Verification Code - Phoenix Territory Map',
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 28px;">Phoenix Territory Map</h1>
              </div>
              
              <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0;">
                <h2 style="color: #333; margin-top: 0;">Email Verification</h2>
                
                <p>Hello,</p>
                
                <p>You are registering for the Phoenix Territory Map application. To verify your email address, please use the following verification code:</p>
                
                <div style="background: white; border: 2px solid #667eea; border-radius: 8px; padding: 20px; text-align: center; margin: 25px 0;">
                  <div style="font-size: 36px; font-weight: bold; color: #667eea; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                    ${verificationCode}
                  </div>
                </div>
                
                <p style="color: #666; font-size: 14px;">
                  <strong>This code will expire in 15 minutes.</strong>
                </p>
                
                <p>If you did not request this verification code, please ignore this email or contact your administrator.</p>
                
                <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 25px 0;">
                
                <p style="color: #999; font-size: 12px; text-align: center;">
                  This is an automated message from Phoenix Territory Map.<br>
                  Please do not reply to this email.
                </p>
              </div>
            </body>
          </html>
        `,
      });
    } catch (emailError) {
      console.error('Error sending email:', emailError);
      return NextResponse.json(
        { error: 'Failed to send verification email. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        message: 'Verification code sent successfully',
        email: email.toLowerCase()
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in send-verification:', error);
    return NextResponse.json(
      { error: 'An error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
