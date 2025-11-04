import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be less than 10MB' },
        { status: 400 }
      );
    }

    let text: string;
    const fileName = file.name.toLowerCase();
    const fileType = file.type;

    try {
      if (fileType === 'text/plain' || fileName.endsWith('.txt')) {
        text = await extractFromTxt(file);
      } else if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
        text = await extractFromPdf(file);
      } else if (
        fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        fileName.endsWith('.docx')
      ) {
        text = await extractFromDocx(file);
      } else {
        return NextResponse.json(
          { error: 'Currently only .txt files are supported. PDF and DOCX support coming soon!' },
          { status: 400 }
        );
      }
    } catch (error) {
      console.error('File processing error:', error);
      return NextResponse.json(
        { error: 'Failed to process file. Please try a .txt file or paste text directly.' },
        { status: 500 }
      );
    }

    if (!text || text.trim().length < 50) {
      return NextResponse.json(
        { error: 'File contains insufficient text for analysis (minimum 50 characters required)' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      text: text.trim(),
      metadata: {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        textLength: text.length,
        wordCount: text.split(/\s+/).length
      }
    });

  } catch (error) {
    console.error('File processing error:', error);
    return NextResponse.json(
      { error: 'Failed to process file. Please try again.' },
      { status: 500 }
    );
  }
}

async function extractFromTxt(file: File): Promise<string> {
  const text = await file.text();
  return text;
}

async function extractFromPdf(file: File): Promise<string> {
  try {
    const pdfParse = await import('pdf-parse');
    const arrayBuffer = await file.arrayBuffer();
    const data = await pdfParse.default(Buffer.from(arrayBuffer));
    return data.text;
  } catch (error) {
    throw new Error('PDF processing failed. Please try converting to TXT format.');
  }
}

async function extractFromDocx(file: File): Promise<string> {
  try {
    const mammoth = await import('mammoth');
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  } catch (error) {
    throw new Error('DOCX processing failed. Please try converting to TXT format.');
  }
}