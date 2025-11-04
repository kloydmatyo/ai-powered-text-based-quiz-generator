# AI Text Analysis & Question Generation Integration

## Overview
This integration adds intelligent text analysis and automatic question generation capabilities to the QuizMate application using the provided AI API key.

## Features

### 📄 Multi-Format File Support
- **Text Files (.txt)**: Direct text processing
- **PDF Files (.pdf)**: Automatic text extraction from PDF documents
- **Word Documents (.docx)**: Text extraction from Microsoft Word files
- **File Size Limit**: 10MB maximum per file

### 🤖 AI-Powered Question Generation
The system automatically generates three types of questions:

#### Multiple-Choice Questions
- Contextually relevant questions based on key concepts
- 4 options per question with one correct answer
- Smart distractor generation for plausible wrong answers

#### True/False Questions
- Statements directly derived from the text
- Intelligent false statement generation through semantic modification
- Mix of true and false statements for balanced assessment

#### Fill-in-the-Blank Questions
- Key terms and named entities identification
- Strategic blank placement for meaningful assessment
- Context-preserved sentence structure

## Technical Implementation

### API Endpoints
- `POST /api/process-file` - Handles file upload and text extraction
- `POST /api/analyze-text` - Processes text and generates questions

### Key Components
- `TextAnalyzer.tsx` - Main UI component for file upload and question display
- `ai-service.ts` - Core AI analysis logic and question generation
- `file-processor.ts` - Multi-format file processing utilities

### AI Analysis Features
- **Key Term Extraction**: Frequency-based analysis with stop word filtering
- **Named Entity Recognition**: Identification of proper nouns and important entities
- **Sentence Importance Scoring**: Context-aware sentence selection
- **Semantic Question Generation**: Intelligent question formulation

## Usage Instructions

### For Instructors
1. Navigate to the Dashboard
2. Click "AI Text Analyzer" button
3. Upload a document (.txt, .pdf, .docx) or paste text directly
4. Click "Generate Questions" to analyze the content
5. Review and use the generated questions for quizzes

### Supported Text Types
- Academic papers and research documents
- Educational materials and textbooks
- Articles and essays
- Training manuals and guides
- Any structured text content

## Configuration

### Environment Variables
```env
AI_API_KEY=f42b8aa0c7c16ad5ad34d1026d4c34b3
```

### Dependencies Added
```json
{
  "pdf-parse": "^1.1.1",
  "mammoth": "^1.6.0",
  "@types/pdf-parse": "^1.1.1"
}
```

## Question Quality Features

### Smart Content Analysis
- Extracts 15 most relevant key terms
- Identifies named entities (people, places, concepts)
- Filters sentences by relevance and complexity
- Maintains context and meaning in generated questions

### Answer Generation
- **Multiple Choice**: Creates plausible distractors based on content
- **True/False**: Uses semantic negation and contradiction techniques
- **Fill-in-the-Blank**: Targets important terms and concepts

### Quality Assurance
- Minimum text length validation (50 characters)
- Maximum text length limit (10,000 characters)
- Duplicate question prevention
- Context preservation in all question types

## Error Handling
- File format validation
- File size restrictions
- Text content validation
- Graceful error messages for users
- Server-side error logging

## Testing
A test script (`test-ai-service.js`) is included to verify the AI service functionality with sample content.

## Future Enhancements
- Integration with external AI APIs for enhanced question generation
- Question difficulty level adjustment
- Custom question type preferences
- Batch processing for multiple files
- Question export functionality

## Security Considerations
- API key stored securely in environment variables
- File upload validation and sanitization
- Content length restrictions to prevent abuse
- Server-side processing for security

This integration transforms QuizMate into an intelligent educational platform capable of automatically generating high-quality assessment questions from any text content.