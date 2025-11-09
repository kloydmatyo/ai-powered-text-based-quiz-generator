import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Question from '@/models/Question';
import Quiz from '@/models/Quiz';
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

    const { questionText, questionType, answerChoices, correctAnswer, quizId } = await request.json();

    // Validation
    if (!questionText || correctAnswer === undefined || !quizId) {
      return NextResponse.json(
        { error: 'Required fields: questionText, correctAnswer, quizId' },
        { status: 400 }
      );
    }

    // Validate question type
    const validQuestionTypes = ['multiple-choice', 'true-false', 'fill-in-blank'];
    if (questionType && !validQuestionTypes.includes(questionType)) {
      return NextResponse.json(
        { error: 'Invalid question type. Must be: multiple-choice, true-false, or fill-in-blank' },
        { status: 400 }
      );
    }

    // Verify the quiz exists and belongs to the user
    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return NextResponse.json(
        { error: 'Quiz not found' },
        { status: 404 }
      );
    }

    // Check if user owns the quiz (only instructors can add questions)
    if (quiz.userId.toString() !== auth.userId.toString()) {
      return NextResponse.json(
        { error: 'You do not have permission to add questions to this quiz' },
        { status: 403 }
      );
    }

    // Validate answer choices based on question type
    const qType = questionType || 'multiple-choice';
    
    if (qType === 'fill-in-blank') {
      // Fill-in-blank doesn't need answer choices, just the correct answer as string
      if (typeof correctAnswer !== 'string') {
        return NextResponse.json(
          { error: 'Fill-in-blank questions require correct answer as string' },
          { status: 400 }
        );
      }
    } else {
      // Multiple choice and true/false need answer choices
      if (!Array.isArray(answerChoices) || answerChoices.length < 2) {
        return NextResponse.json(
          { error: 'Answer choices must be an array with at least 2 options' },
          { status: 400 }
        );
      }

      if (qType === 'true-false' && answerChoices.length !== 2) {
        return NextResponse.json(
          { error: 'True/False questions must have exactly 2 answer choices' },
          { status: 400 }
        );
      }

      if (qType === 'multiple-choice' && (answerChoices.length < 2 || answerChoices.length > 6)) {
        return NextResponse.json(
          { error: 'Multiple choice questions must have 2-6 answer choices' },
          { status: 400 }
        );
      }

      // Validate correct answer index
      if (typeof correctAnswer === 'number' && (correctAnswer < 0 || correctAnswer >= answerChoices.length)) {
        return NextResponse.json(
          { error: 'Correct answer index is out of range' },
          { status: 400 }
        );
      }
    }

    // Create the question
    const question = new Question({
      questionText,
      questionType: qType,
      answerChoices: answerChoices || [],
      correctAnswer,
      quizId
    });

    await question.save();
    
    return NextResponse.json(
      { 
        message: 'Question added successfully',
        question
      },
      { status: 201 }
    );

  } catch (error: any) {
    console.error('Question creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
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

    // Get quizId from query parameters
    const { searchParams } = new URL(request.url);
    const quizId = searchParams.get('quizId');

    if (!quizId) {
      return NextResponse.json(
        { error: 'quizId parameter is required' },
        { status: 400 }
      );
    }

    // Verify the quiz exists
    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return NextResponse.json(
        { error: 'Quiz not found' },
        { status: 404 }
      );
    }

    // Get all questions for this quiz
    const questions = await Question.find({ quizId })
      .sort({ createdAt: 1 });
    
    return NextResponse.json(
      { questions },
      { status: 200 }
    );

  } catch (error: any) {
    console.error('Question fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
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

    // Get questionId from query parameters
    const { searchParams } = new URL(request.url);
    const questionId = searchParams.get('questionId');

    if (!questionId) {
      return NextResponse.json(
        { error: 'questionId parameter is required' },
        { status: 400 }
      );
    }

    // Find the question
    const question = await Question.findById(questionId);
    if (!question) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      );
    }

    // Verify the quiz belongs to the user
    const quiz = await Quiz.findById(question.quizId);
    if (!quiz) {
      return NextResponse.json(
        { error: 'Associated quiz not found' },
        { status: 404 }
      );
    }

    if (quiz.userId.toString() !== auth.userId.toString()) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this question' },
        { status: 403 }
      );
    }

    // Delete the question
    await Question.findByIdAndDelete(questionId);
    
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
