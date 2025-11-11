import { NextRequest, NextResponse } from 'next/server';
import { bytezAI, DifficultyLevel } from '@/lib/bytez-ai-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, difficulty = 'moderate', numberOfQuestions, questionTypes } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text content is required' },
        { status: 400 }
      );
    }

    if (text.length < 50) {
      return NextResponse.json(
        { error: 'Text must be at least 50 characters long for meaningful analysis' },
        { status: 400 }
      );
    }

    if (text.length > 15000) {
      return NextResponse.json(
        { error: 'Text is too long. Please limit to 15,000 characters.' },
        { status: 400 }
      );
    }

    // Validate difficulty level
    const validDifficulties: DifficultyLevel[] = ['easy', 'moderate', 'challenging'];
    if (!validDifficulties.includes(difficulty)) {
      return NextResponse.json(
        { error: 'Invalid difficulty level. Must be: easy, moderate, or challenging' },
        { status: 400 }
      );
    }

    // Validate numberOfQuestions if provided
    const numQuestions = numberOfQuestions || 10;
    if (numQuestions < 1 || numQuestions > 100) {
      return NextResponse.json(
        { error: 'Number of questions must be between 1 and 100' },
        { status: 400 }
      );
    }

    console.log(`📝 Generating ${numQuestions} questions with difficulty: ${difficulty}`);
    console.log(`📄 Text length: ${text.length} characters`);

    // Use Bytez AI service (with automatic fallback to rule-based generation)
    const result = await bytezAI.generateQuestions(
      text, 
      difficulty as DifficultyLevel,
      numQuestions,
      questionTypes
    );
    const { questions, method } = result;

    const totalQuestions = 
      questions.multipleChoice.length +
      questions.trueFalse.length +
      questions.fillInTheBlank.length +
      questions.identification.length;

    console.log(`✅ Generated ${totalQuestions} questions successfully using ${method.toUpperCase()} method`);

    return NextResponse.json({
      success: true,
      questions,
      metadata: {
        difficulty,
        textLength: text.length,
        wordCount: text.split(/\s+/).length,
        totalQuestions,
        generatedAt: new Date().toISOString(),
        generationMethod: method, // 'ai' or 'rule-based'
        aiPowered: method === 'ai'
      }
    });

  } catch (error) {
    console.error('Text analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze text. Please try again.' },
      { status: 500 }
    );
  }
}
