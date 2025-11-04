import { NextRequest, NextResponse } from 'next/server';
import { aiAnalyzer } from '@/lib/ai-service';

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

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

    if (text.length > 10000) {
      return NextResponse.json(
        { error: 'Text is too long. Please limit to 10,000 characters.' },
        { status: 400 }
      );
    }

    // Analyze the text and generate questions
    const questions = await aiAnalyzer.analyzeText(text);

    return NextResponse.json({
      success: true,
      questions,
      metadata: {
        textLength: text.length,
        wordCount: text.split(/\s+/).length,
        generatedAt: new Date().toISOString()
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