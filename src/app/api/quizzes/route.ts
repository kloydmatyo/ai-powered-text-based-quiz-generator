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

    const body = await request.json();
    const { title, description, difficulty, questionTypes, numberOfQuestions, sourceText, deadline, timeLimit } = body;
    console.log('Creating quiz with:', { title, deadline, timeLimit });

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

    // Validate difficulty
    const validDifficulties = ['easy', 'moderate', 'challenging'];
    if (difficulty && !validDifficulties.includes(difficulty)) {
      return NextResponse.json(
        { error: 'Invalid difficulty level. Must be: easy, moderate, or challenging' },
        { status: 400 }
      );
    }

    // Validate question types
    const validQuestionTypes = ['multiple-choice', 'true-false', 'fill-in-blank'];
    if (questionTypes && !Array.isArray(questionTypes)) {
      return NextResponse.json(
        { error: 'Question types must be an array' },
        { status: 400 }
      );
    }
    if (questionTypes && !questionTypes.every((type: string) => validQuestionTypes.includes(type))) {
      return NextResponse.json(
        { error: 'Invalid question type. Must be: multiple-choice, true-false, or fill-in-blank' },
        { status: 400 }
      );
    }

    // Validate number of questions
    if (numberOfQuestions && (numberOfQuestions < 1 || numberOfQuestions > 100)) {
      return NextResponse.json(
        { error: 'Number of questions must be between 1 and 100' },
        { status: 400 }
      );
    }

    const quiz = new Quiz({
      title,
      description,
      difficulty: difficulty || 'moderate',
      questionTypes: questionTypes && questionTypes.length > 0 ? questionTypes : ['multiple-choice'],
      numberOfQuestions: numberOfQuestions || 10,
      sourceText: sourceText || '', // Store the original text content for regeneration
      deadline: deadline || null,
      timeLimit: timeLimit || 30,
      userId: auth.userId
    });

    await quiz.save();
    console.log('Quiz saved with:', { deadline: quiz.deadline, timeLimit: quiz.timeLimit });
    
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
      // Learners see only quizzes from classes they've joined
      const Class = (await import('@/models/Class')).default;
      
      // Find all classes the learner has joined
      const joinedClasses = await Class.find({ 
        learners: auth.userId,
        isActive: true 
      }).select('quizzes');
      
      // Extract all quiz IDs from joined classes
      const quizIds = joinedClasses.flatMap(c => c.quizzes);
      
      // Fetch only those quizzes
      quizzes = await Quiz.find({ _id: { $in: quizIds } })
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