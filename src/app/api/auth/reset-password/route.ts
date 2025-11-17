import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { hashPassword, validatePassword } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token and password are required' },
        { status: 400 }
      );
    }

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        { error: passwordValidation.message },
        { status: 400 }
      );
    }

    // Find user with this token first
    const userWithToken = await User.findOne({ resetPasswordToken: token });
    
    if (!userWithToken) {
      console.log('❌ Reset password - Token not found in database:', token);
      return NextResponse.json(
        { error: 'Invalid reset token. Please request a new password reset.' },
        { status: 400 }
      );
    }
    
    // Check if token is expired
    const now = new Date();
    const expiryDate = new Date(userWithToken.resetPasswordExpiry);
    
    console.log('🔍 Token validation:');
    console.log('Current time:', now);
    console.log('Current time (ms):', now.getTime());
    console.log('Token expiry:', expiryDate);
    console.log('Token expiry (ms):', expiryDate.getTime());
    console.log('Is expired?', now > expiryDate);
    
    if (now > expiryDate) {
      console.log('❌ Token has expired');
      return NextResponse.json(
        { error: 'Reset token has expired. Please request a new password reset.' },
        { status: 400 }
      );
    }
    
    const user = userWithToken;

    // Hash new password and update user
    const hashedPassword = await hashPassword(password);
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpiry = undefined;
    await user.save();

    return NextResponse.json(
      { message: 'Password reset successful. You can now sign in with your new password.' },
      { status: 200 }
    );

  } catch (error: any) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
