import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Question from '@/models/Question';
import Quiz from '@/models/Quiz';
import { authenticateRequest } from '@/lib/auth-middleware';

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
    const { questionText, answerChoices, correctAnswer } = await request.json();

    // Validation
    if (!questionText || !answerChoices || correctAnswer === undefined) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    if (answerChoices.length < 2 || answerChoices.length > 6) {
      return NextResponse.json(
        { error: 'Must have between 2 and 6 answer choices' },
        { status: 400 }
      );
    }

    if (correctAnswer < 0 || correctAnswer >= answerChoices.length) {
      return NextResponse.json(
        { error: 'Invalid correct answer index' },
        { status: 400 }
      );
    }

    // Find the question and verify ownership through quiz
    const question = await Question.findById(id).populate('quizId');
    if (!question) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      );
    }

    // Verify quiz belongs to user
    const quiz = await Quiz.findOne({ _id: question.quizId, userId: auth.userId });
    if (!quiz) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Update question
    question.questionText = questionText;
    question.answerChoices = answerChoices;
    question.correctAnswer = correctAnswer;
    
    await question.save();
    
    return NextResponse.json(
      { 
        message: 'Question updated successfully',
        question
      },
      { status: 200 }
    );

  } catch (error: any) {
    console.error('Question update error:', error);
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

    // Find the question and verify ownership through quiz
    const question = await Question.findById(id).populate('quizId');
    if (!question) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      );
    }

    // Verify quiz belongs to user
    const quiz = await Quiz.findOne({ _id: question.quizId, userId: auth.userId });
    if (!quiz) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    await Question.findByIdAndDelete(id);
    
    return NextResponse.json(
      { message: 'Question deleted successfully' },
      { status: 200 }
    );

  } catch (error: any) {
    console.error('Question deletion error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}