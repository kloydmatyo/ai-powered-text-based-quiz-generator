import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { sendPasswordResetEmail } from '@/lib/email';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Find user
    const user = await User.findOne({ email });
    
    // Don't reveal if user exists or not for security
    if (!user) {
      return NextResponse.json(
        { message: 'If an account exists with this email, a password reset link has been sent.' },
        { status: 200 }
      );
    }

    // Check if user uses OAuth (Google)
    if (user.googleId && !user.password) {
      return NextResponse.json(
        { error: 'This account uses Google Sign-In. Please sign in with Google.' },
        { status: 400 }
      );
    }

    // Generate password reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const now = Date.now();
    const resetTokenExpiry = new Date(now + 60 * 60 * 1000); // 1 hour from now
    
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpiry = resetTokenExpiry;
    await user.save();
    
    // Verify the token was saved by fetching the user again
    const verifyUser = await User.findOne({ email });
    console.log('✅ Password reset token generated for:', email);
    console.log('Token:', resetToken);
    console.log('Current time (ms):', now);
    console.log('Current time (Date):', new Date(now));
    console.log('Expires (ms):', now + 60 * 60 * 1000);
    console.log('Expires (Date):', resetTokenExpiry);
    console.log('Verification - Token in DB:', verifyUser?.resetPasswordToken);
    console.log('Verification - Expiry in DB:', verifyUser?.resetPasswordExpiry);

    // Send password reset email
    try {
      await sendPasswordResetEmail(email, resetToken);
      console.log('✅ Password reset email sent successfully');
    } catch (emailError) {
      console.error('❌ Failed to send password reset email:', emailError);
      return NextResponse.json(
        { error: 'Failed to send password reset email. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Password reset link has been sent to your email.' },
      { status: 200 }
    );

  } catch (error: any) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
