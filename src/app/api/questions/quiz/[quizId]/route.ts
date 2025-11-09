import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Question from '@/models/Question';
import Quiz from '@/models/Quiz';
import { authenticateRequest } from '@/lib/auth-middleware';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ quizId: string }> | { quizId: string } }
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

    // Await params if it's a Promise (Next.js 15+)
    const resolvedParams = await Promise.resolve(params);
    const { quizId } = resolvedParams;

    console.log('📝 Fetching questions for quiz:', quizId);

    if (!quizId) {
      console.error('❌ No quizId provided');
      return NextResponse.json(
        { error: 'Quiz ID is required' },
        { status: 400 }
      );
    }

    // Validate MongoDB ObjectId format
    if (!quizId.match(/^[0-9a-fA-F]{24}$/)) {
      console.error('❌ Invalid quizId format:', quizId);
      return NextResponse.json(
        { error: 'Invalid quiz ID format' },
        { status: 400 }
      );
    }

    // Verify the quiz exists
    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      console.error('❌ Quiz not found:', quizId);
      return NextResponse.json(
        { error: 'Quiz not found' },
        { status: 404 }
      );
    }

    console.log('✅ Quiz found, fetching questions...');

    // Get all questions for this quiz
    const questions = await Question.find({ quizId })
      .sort({ createdAt: 1 });
    
    console.log(`✅ Found ${questions.length} questions`);
    
    return NextResponse.json(
      { questions },
      { status: 200 }
    );

  } catch (error: any) {
    console.error('❌ Question fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
