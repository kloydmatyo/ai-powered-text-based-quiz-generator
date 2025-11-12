import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import QuizSubmission from '@/models/QuizSubmission';
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

    // Only learners can submit quizzes
    if (auth.user.role !== 'learner') {
      return NextResponse.json(
        { error: 'Only learners can submit quiz answers' },
        { status: 403 }
      );
    }

    const { quizId, answers } = await request.json();

    // Validation
    if (!quizId || !answers) {
      return NextResponse.json(
        { error: 'Quiz ID and answers are required' },
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
    const questions = await Question.find({ quizId });
    
    if (questions.length === 0) {
      return NextResponse.json(
        { error: 'This quiz has no questions' },
        { status: 400 }
      );
    }

    // Calculate score
    let correctAnswers = 0;
    const totalQuestions = questions.length;

    questions.forEach((question) => {
      const userAnswer = answers[question._id.toString()];
      if (userAnswer !== undefined) {
        let isCorrect = false;
        
        // Handle different question types
        if (question.questionType === 'fill-in-blank') {
          // Case-insensitive comparison for fill-in-blank
          const userAnswerStr = String(userAnswer).trim().toLowerCase();
          const correctAnswerStr = String(question.correctAnswer).trim().toLowerCase();
          isCorrect = userAnswerStr === correctAnswerStr;
        } else {
          // Exact match for multiple-choice and true-false
          isCorrect = userAnswer === question.correctAnswer;
        }
        
        if (isCorrect) {
          correctAnswers++;
        }
      }
    });

    const score = Math.round((correctAnswers / totalQuestions) * 100);

    // Save submission
    const submission = new QuizSubmission({
      quizId,
      userId: auth.userId,
      answers,
      score,
      submittedAt: new Date()
    });

    await submission.save();

    // Return score and correct answers for review
    const results = questions.map((question) => {
      const userAnswer = answers[question._id.toString()];
      let isCorrect = false;
      
      if (userAnswer !== undefined) {
        if (question.questionType === 'fill-in-blank') {
          // Case-insensitive comparison for fill-in-blank
          const userAnswerStr = String(userAnswer).trim().toLowerCase();
          const correctAnswerStr = String(question.correctAnswer).trim().toLowerCase();
          isCorrect = userAnswerStr === correctAnswerStr;
        } else {
          // Exact match for multiple-choice and true-false
          isCorrect = userAnswer === question.correctAnswer;
        }
      }
      
      return {
        questionId: question._id,
        correctAnswer: question.correctAnswer,
        userAnswer,
        isCorrect
      };
    });

    return NextResponse.json(
      {
        message: 'Quiz submitted successfully',
        score,
        correctAnswers,
        totalQuestions,
        results,
        submissionId: submission._id
      },
      { status: 201 }
    );

  } catch (error: any) {
    console.error('Quiz submission error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error name:', error.name);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error.message,
        errorName: error.name,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
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

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const quizId = searchParams.get('quizId');
    const userId = searchParams.get('userId');

    let query: any = {};

    // Learners can only see their own submissions
    if (auth.user.role === 'learner') {
      query.userId = auth.userId;
    } else if (auth.user.role === 'instructor') {
      // Instructors can see all submissions for their quizzes
      if (quizId) {
        // Verify the quiz belongs to the instructor
        const quiz = await Quiz.findById(quizId);
        if (!quiz) {
          return NextResponse.json(
            { error: 'Quiz not found' },
            { status: 404 }
          );
        }
        if (quiz.userId.toString() !== auth.userId.toString()) {
          return NextResponse.json(
            { error: 'You do not have permission to view these submissions' },
            { status: 403 }
          );
        }
        query.quizId = quizId;
      }
      if (userId) {
        query.userId = userId;
      }
    }

    if (quizId && auth.user.role === 'learner') {
      query.quizId = quizId;
    }

    const submissions = await QuizSubmission.find(query)
      .populate('quizId', 'title description')
      .populate('userId', 'username email')
      .sort({ submittedAt: -1 });

    return NextResponse.json(
      { submissions },
      { status: 200 }
    );

  } catch (error: any) {
    console.error('Submission fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
