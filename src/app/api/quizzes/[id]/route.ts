import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Quiz from '@/models/Quiz';
import Question from '@/models/Question';
import User from '@/models/User';
import { authenticateRequest } from '@/lib/auth-middleware';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    let quiz;
    if (auth.user.role === 'instructor') {
      // Instructors can only see their own quizzes
      quiz = await Quiz.findOne({ _id: id, userId: auth.userId })
        .populate('userId', 'username email');
    } else {
      // Learners can only see quizzes from classes they've joined
      const Class = (await import('@/models/Class')).default;
      
      // Find if the learner has access to this quiz through any joined class
      const hasAccess = await Class.findOne({
        learners: auth.userId,
        quizzes: id,
        isActive: true
      });
      
      if (!hasAccess) {
        return NextResponse.json(
          { error: 'You do not have access to this quiz' },
          { status: 403 }
        );
      }
      
      quiz = await Quiz.findById(id)
        .populate('userId', 'username email');
    }

    if (!quiz) {
      return NextResponse.json(
        { error: 'Quiz not found' },
        { status: 404 }
      );
    }

    // Get questions for this quiz
    const questions = await Question.find({ quizId: id });
    
    return NextResponse.json(
      { quiz, questions },
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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    console.log('PUT route hit - Quiz ID:', id);
    const body = await request.json();
    const { title, description, deadline, timeLimit } = body;
    console.log('Received data:', { title, description, deadline, timeLimit });

    // Check if user is an instructor
    if (auth.user.role !== 'instructor') {
      return NextResponse.json(
        { error: 'Only instructors can update quizzes' },
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

    // First check if quiz exists
    const existingQuiz = await Quiz.findById(id);
    if (!existingQuiz) {
      return NextResponse.json(
        { error: 'Quiz not found' },
        { status: 404 }
      );
    }

    // Check if user owns the quiz
    if (existingQuiz.userId.toString() !== auth.userId) {
      return NextResponse.json(
        { error: 'You do not have permission to update this quiz' },
        { status: 403 }
      );
    }

    const updateData: any = { 
      title, 
      description,
      deadline: deadline !== undefined ? (deadline || null) : undefined,
      timeLimit: timeLimit !== undefined ? timeLimit : undefined,
      updatedAt: new Date() 
    };
    
    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });
    
    console.log('Final updateData:', updateData);
    
    const quiz = await Quiz.findOneAndUpdate(
      { _id: id, userId: auth.userId },
      { $set: updateData },
      { new: true, runValidators: true, strict: false }
    );

    if (!quiz) {
      return NextResponse.json(
        { error: 'Failed to update quiz' },
        { status: 500 }
      );
    }
    
    console.log('Updated quiz full object:', quiz.toObject());
    console.log('Updated quiz deadline:', quiz.deadline);
    console.log('Updated quiz timeLimit:', quiz.timeLimit);
    
    return NextResponse.json(
      { 
        message: 'Quiz updated successfully',
        quiz
      },
      { status: 200 }
    );

  } catch (error: any) {
    console.error('Quiz update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    console.log('DELETE route hit - Quiz ID:', id);

    // Check if user is an instructor
    if (auth.user.role !== 'instructor') {
      return NextResponse.json(
        { error: 'Only instructors can delete quizzes' },
        { status: 403 }
      );
    }

    const quiz = await Quiz.findOneAndDelete({ _id: id, userId: auth.userId });

    if (!quiz) {
      return NextResponse.json(
        { error: 'Quiz not found or you do not have permission to delete it' },
        { status: 404 }
      );
    }

    // Delete all questions associated with this quiz
    await Question.deleteMany({ quizId: id });
    
    return NextResponse.json(
      { message: 'Quiz deleted successfully' },
      { status: 200 }
    );

  } catch (error: any) {
    console.error('Quiz deletion error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}