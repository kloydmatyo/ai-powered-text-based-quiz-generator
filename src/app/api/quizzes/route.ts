import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Quiz from '@/models/Quiz';
import User from '@/models/User';
import { authenticateRequest } from '@/lib/auth-middleware';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    // Authenticate the request
    const auth = await authenticateRequest(request);
    if (!auth) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { title, description } = await request.json();

    // Check if user is an instructor
    if (auth.user.role !== 'instructor') {
      return NextResponse.json(
        { error: 'Only instructors can create quizzes' },
        { status: 403 }
      );
    }

    // Validation
    if (!title) {
      return NextResponse.json(
        { error: 'Quiz title is required' },
        { status: 400 }
      );
    }

    const quiz = new Quiz({
      title,
      description,
      userId: auth.userId
    });

    await quiz.save();
    
    return NextResponse.json(
      { 
        message: 'Quiz created successfully',
        quiz
      },
      { status: 201 }
    );

  } catch (error: any) {
    console.error('Quiz creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    // Authenticate the request
    const auth = await authenticateRequest(request);
    if (!auth) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    let quizzes;
    if (auth.user.role === 'instructor') {
      // Instructors see only their own quizzes
      quizzes = await Quiz.find({ userId: auth.userId })
        .sort({ createdAt: -1 })
        .populate('userId', 'username email');
    } else {
      // Learners see all quizzes
      quizzes = await Quiz.find({})
        .sort({ createdAt: -1 })
        .populate('userId', 'username email');
    }
    
    return NextResponse.json(
      { quizzes },
      { status: 200 }
    );

  } catch (error: any) {
    console.error('Quiz fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}