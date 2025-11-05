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

    console.log(`Processing file: ${file.name}, Type: ${fileType}, Size: ${file.size} bytes`);

    try {
      if (fileType === 'text/plain' || fileName.endsWith('.txt')) {
        console.log('Processing as TXT file');
        text = await extractFromTxt(file);
      } else if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
        console.log('Processing as PDF file');
        // Check if PDF processing is available in this environment
        if (process.env.NODE_ENV === 'production' && !process.env.ENABLE_PDF_PROCESSING) {
          throw new Error('PDF processing is not available in this deployment environment. Please convert your PDF to DOCX or TXT format.');
        }
        text = await extractFromPdf(file);
      } else if (
        fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        fileName.endsWith('.docx')
      ) {
        console.log('Processing as DOCX file');
        text = await extractFromDocx(file);
      } else {
        console.log(`Unsupported file type: ${fileType} for file: ${fileName}`);
        return NextResponse.json(
          { error: `Unsupported file type: ${fileType}. Please upload .txt, .pdf, or .docx files.` },
          { status: 400 }
        );
      }
    } catch (error) {
      console.error('File processing error:', error);
      return NextResponse.json(
        { error: `Failed to process ${fileName.split('.').pop()?.toUpperCase()} file. Please ensure the file contains readable text.` },
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
  console.log(`Processing PDF file: ${file.name}, size: ${file.size} bytes`);
  
  // Check if we're in a server environment that supports PDF processing
  if (typeof window !== 'undefined') {
    throw new Error('PDF processing is only available on the server. Please refresh the page and try again.');
  }
  
  try {
    // Set up canvas polyfills for pdf-parse
    if (typeof global !== 'undefined') {
      // Polyfill canvas dependencies for server environment
      try {
        const canvas = await import('canvas').catch(() => null);
        if (canvas) {
          const { createCanvas, ImageData } = canvas;
          (global as any).HTMLCanvasElement = createCanvas(1, 1).constructor;
          (global as any).ImageData = ImageData;
          (global as any).DOMMatrix = class {
            constructor() {
              (this as any).a = 1; (this as any).b = 0; (this as any).c = 0; 
              (this as any).d = 1; (this as any).e = 0; (this as any).f = 0;
            }
          };
          (global as any).Path2D = class {};
          console.log('Canvas polyfills set up successfully');
        } else {
          console.log('Canvas not available, PDF processing may be limited');
        }
      } catch (canvasError: any) {
        console.log('Canvas polyfill setup failed, continuing without:', canvasError.message);
      }
    }
    
    // Get file as array buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    console.log(`PDF buffer created: ${buffer.length} bytes`);
    
    // Validate buffer
    if (buffer.length === 0) {
      throw new Error('Empty PDF file detected');
    }
    
    // Check if it looks like a PDF (starts with %PDF)
    const pdfHeader = buffer.slice(0, 4).toString();
    if (pdfHeader !== '%PDF') {
      throw new Error('File does not appear to be a valid PDF (missing PDF header)');
    }
    
    // Try to load pdf-parse with better error handling
    let pdfParse;
    try {
      // Use dynamic import for better compatibility
      const pdfParseModule = await import('pdf-parse').catch(() => {
        // Fallback to require if dynamic import fails
        try {
          return require('pdf-parse');
        } catch {
          return null;
        }
      });
      
      if (!pdfParseModule) {
        throw new Error('PDF processing library not available');
      }
      
      pdfParse = pdfParseModule.default || pdfParseModule;
      console.log('PDF-parse loaded successfully, type:', typeof pdfParse);
    } catch (requireError: any) {
      console.error('PDF-parse loading failed:', requireError.message);
      throw new Error('PDF processing is temporarily unavailable. Please convert your PDF to DOCX or TXT format.');
    }
    
    // Parse PDF with options to minimize compatibility issues
    console.log('Starting PDF text extraction...');
    
    const data = await pdfParse(buffer, {
      max: 0, // Parse all pages
      normalizeWhitespace: false,
      disableCombineTextItems: false
    });
    
    console.log('PDF parsing raw result:', typeof data, Object.keys(data || {}));
    
    console.log(`PDF parsing completed. Pages: ${data.numpages || 'unknown'}, Raw text length: ${data.text?.length || 0}`);
    
    // Validate extracted text
    if (!data.text) {
      throw new Error('PDF parsing returned no text content');
    }
    
    // Clean and normalize the extracted text
    const cleanText = data.text
      .replace(/\r\n/g, '\n')  // Normalize line endings
      .replace(/\n\s*\n\s*\n/g, '\n\n')  // Clean up excessive line breaks
      .replace(/\s+/g, ' ')  // Normalize whitespace
      .trim();
    
    if (cleanText.length === 0) {
      throw new Error('PDF contains no readable text content');
    }
    
    console.log(`PDF processing successful. Final text length: ${cleanText.length} characters`);
    return cleanText;
    
  } catch (error: any) {
    console.error('PDF processing error:', error);
    
    // Handle specific error types with user-friendly messages
    if (error.message.includes('DOMMatrix') || error.message.includes('canvas') || error.message.includes('HTMLCanvasElement')) {
      throw new Error('PDF processing has compatibility issues in this environment. Please convert your PDF to DOCX or TXT format.');
    }
    
    if (error.message.includes('Invalid PDF') || error.message.includes('not a valid PDF') || error.message.includes('PDF header')) {
      throw new Error('Invalid or corrupted PDF file. Please ensure the file is a valid PDF document.');
    }
    
    if (error.message.includes('password') || error.message.includes('encrypted') || error.message.includes('decrypt')) {
      throw new Error('Password-protected or encrypted PDF detected. Please remove protection and try again.');
    }
    
    if (error.message.includes('no readable text') || error.message.includes('no text content')) {
      throw new Error('No text found in PDF. This might be a scanned document or image-only PDF. Please convert to text format or use OCR.');
    }
    
    if (error.message.includes('Empty PDF')) {
      throw new Error('The PDF file appears to be empty or corrupted.');
    }
    
    if (error.message.includes('library not available')) {
      throw new Error('PDF processing is temporarily unavailable. Please convert to DOCX or TXT format.');
    }
    
    // Generic error with helpful context
    throw new Error(`PDF processing failed. Please try converting to DOCX or TXT format. Technical details: ${error.message}`);
  }
}

async function extractFromDocx(file: File): Promise<string> {
  console.log(`Processing DOCX file: ${file.name}, size: ${file.size} bytes`);
  
  try {
    // Import mammoth library
    const mammoth = await import('mammoth');
    
    // Get file as array buffer
    const arrayBuffer = await file.arrayBuffer();
    console.log(`DOCX arrayBuffer size: ${arrayBuffer.byteLength} bytes`);
    
    // Validate that we have data
    if (arrayBuffer.byteLength === 0) {
      throw new Error('Empty file detected');
    }
    
    // Convert to Buffer for mammoth (it expects a Buffer, not ArrayBuffer)
    const buffer = Buffer.from(arrayBuffer);
    console.log(`DOCX buffer created: ${buffer.length} bytes`);
    
    // Extract raw text from DOCX using buffer
    const result = await mammoth.extractRawText({ buffer });
    
    console.log(`DOCX extraction completed. Text length: ${result.value?.length || 0} characters`);
    
    // Log any processing messages (warnings, etc.)
    if (result.messages && result.messages.length > 0) {
      const messages = result.messages.map(m => `${m.type}: ${m.message}`);
      console.log('DOCX processing messages:', messages);
    }
    
    // Check if we got any text
    if (!result.value) {
      throw new Error('No text content extracted from DOCX file');
    }
    
    // Clean and validate the extracted text
    const cleanText = result.value
      .replace(/\r\n/g, '\n')  // Normalize line endings
      .replace(/\n\s*\n\s*\n/g, '\n\n')  // Clean up excessive line breaks
      .replace(/\s+/g, ' ')  // Normalize spaces
      .trim();
    
    if (cleanText.length === 0) {
      throw new Error('DOCX file contains no readable text content');
    }
    
    console.log(`DOCX processing successful. Final text length: ${cleanText.length} characters`);
    return cleanText;
    
  } catch (error: any) {
    console.error('DOCX processing error:', error);
    
    // Handle specific error types with user-friendly messages
    if (error.message.includes('not a valid zip file') || error.message.includes('zip')) {
      throw new Error('Invalid DOCX file. The file appears to be corrupted or is not a valid Word document.');
    }
    
    if (error.message.includes('Cannot read properties') || error.message.includes('undefined')) {
      throw new Error('Corrupted DOCX file structure. Please try re-saving the document and uploading again.');
    }
    
    if (error.message.includes('Empty file') || error.message.includes('no readable text')) {
      throw new Error('The DOCX file is empty or contains no text. Please ensure the document has written content.');
    }
    
    if (error.message.includes('No text content extracted')) {
      throw new Error('Unable to extract text from DOCX. The document might contain only images, tables, or unsupported content.');
    }
    
    if (error.message.includes('Could not find file')) {
      throw new Error('DOCX file format issue. Please ensure the file is a valid Word document and try again.');
    }
    
    // For any other error, provide a helpful generic message
    throw new Error(`DOCX processing failed. Please ensure the file is a valid Word document (.docx) with readable text content. Error: ${error.message}`);
  }
}