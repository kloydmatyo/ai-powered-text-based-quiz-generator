import { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';
import User from '@/models/User';
import connectDB from '@/lib/mongodb';

export interface AuthenticatedRequest {
  userId: string;
  user?: any;
}

export async function authenticateRequest(request: NextRequest): Promise<AuthenticatedRequest | null> {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (!decoded) {
      return null;
    }

    // Fetch user data
    await connectDB();
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return null;
    }
    
    return {
      userId: decoded.userId,
      user: user
    };
  } catch (error) {
    console.error('Auth middleware error:', error);
    return null;
  }
}