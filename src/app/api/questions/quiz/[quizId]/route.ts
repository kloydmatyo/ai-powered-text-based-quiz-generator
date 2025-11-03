import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Question from '@/models/Question';
import Quiz from '@/models/Quiz';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    await connectDB();
    
    const userId = request.headers.get('userId');
    const { quizId } = await params;

    // Verify quiz belongs to user
    const quiz = await Quiz.findOne({ _id: quizId, userId });
    if (!quiz) {
      return NextResponse.json(
        { error: 'Quiz not found' },
        { status: 404 }
      );
    }

    // Get all questions for this quiz
    const questions = await Question.find({ quizId }).sort({ createdAt: 1 });
    
    return NextResponse.json(
      { questions },
      { status: 200 }
    );

  } catch (error: any) {
    console.error('Questions fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}