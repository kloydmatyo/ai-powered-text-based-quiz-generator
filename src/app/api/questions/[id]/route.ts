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
    const { questionText, questionType, answerChoices, correctAnswer } = await request.json();

    // Validation
    if (!questionText || correctAnswer === undefined) {
      return NextResponse.json(
        { error: 'Question text and correct answer are required' },
        { status: 400 }
      );
    }

    // Validate based on question type
    if (questionType === 'fill-in-blank') {
      // Fill-in-blank: correctAnswer should be a string
      if (typeof correctAnswer !== 'string' || correctAnswer.trim() === '') {
        return NextResponse.json(
          { error: 'Fill-in-blank questions require a text answer' },
          { status: 400 }
        );
      }
    } else {
      // Multiple choice or true/false: need answer choices
      if (!answerChoices || answerChoices.length < 2) {
        return NextResponse.json(
          { error: 'Must have at least 2 answer choices' },
          { status: 400 }
        );
      }

      if (questionType === 'true-false' && answerChoices.length !== 2) {
        return NextResponse.json(
          { error: 'True/False questions must have exactly 2 choices' },
          { status: 400 }
        );
      }

      if (questionType === 'multiple-choice' && answerChoices.length > 6) {
        return NextResponse.json(
          { error: 'Multiple choice questions cannot have more than 6 choices' },
          { status: 400 }
        );
      }

      if (typeof correctAnswer !== 'number' || correctAnswer < 0 || correctAnswer >= answerChoices.length) {
        return NextResponse.json(
          { error: 'Invalid correct answer index' },
          { status: 400 }
        );
      }
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
    if (questionType) {
      question.questionType = questionType;
    }
    question.answerChoices = answerChoices || [];
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