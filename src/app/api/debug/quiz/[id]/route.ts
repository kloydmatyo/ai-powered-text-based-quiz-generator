import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Quiz from '@/models/Quiz';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('Debug - Connecting to DB...');
    await connectDB();
    console.log('Debug - Connected to DB successfully');
    
    const { id } = await params;
    console.log('Debug - Looking for quiz with ID:', id);
    console.log('Debug - ID length:', id.length);
    console.log('Debug - ID type:', typeof id);
    
    // Try to find all quizzes first
    const allQuizzes = await Quiz.find({});
    console.log('Debug - Total quizzes in DB:', allQuizzes.length);
    allQuizzes.forEach((q: any) => console.log('Debug - Quiz in DB:', q._id.toString(), q.title));
    
    const quiz = await Quiz.findById(id);
    console.log('Debug - Quiz found:', !!quiz);
    
    if (quiz) {
      console.log('Debug - Quiz details:', {
        _id: quiz._id,
        title: quiz.title,
        userId: quiz.userId
      });
    }
    
    return NextResponse.json({
      id: id,
      found: !!quiz,
      totalQuizzes: allQuizzes.length,
      allQuizIds: allQuizzes.map((q: any) => q._id.toString()),
      quiz: quiz ? {
        _id: quiz._id,
        title: quiz.title,
        userId: quiz.userId,
        description: quiz.description
      } : null
    });

  } catch (error: any) {
    console.error('Debug quiz error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}