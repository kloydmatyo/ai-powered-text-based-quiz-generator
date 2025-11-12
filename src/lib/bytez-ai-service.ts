import Bytez from 'bytez.js';

export type DifficultyLevel = 'easy' | 'moderate' | 'challenging';

export interface QuestionSet {
  multipleChoice: MultipleChoiceQuestion[];
  trueFalse: TrueFalseQuestion[];
  fillInTheBlank: FillInTheBlankQuestion[];
  identification: IdentificationQuestion[];
}

export interface MultipleChoiceQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
}

export interface TrueFalseQuestion {
  statement: string;
  answer: boolean;
}

export interface FillInTheBlankQuestion {
  sentence: string;
  answer: string;
}

export interface IdentificationQuestion {
  question: string;
  answer: string;
}

export class BytezAIService {
  private sdk: any;
  private model: any;

  constructor(apiKey: string) {
    console.log('🔧 Initializing Bytez SDK...');
    this.sdk = new Bytez(apiKey);
    console.log('✅ SDK initialized');
    
    // Use GPT-4.1 model via Bytez
    this.model = this.sdk.model('openai/gpt-4.1');
    console.log('✅ Model loaded: openai/gpt-4.1');
    
    // Debug: Log available methods
    console.log('🔍 Available model methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(this.model)));
  }

  async generateQuestions(
    text: string,
    difficulty: DifficultyLevel = 'moderate',
    numberOfQuestions: number = 10,
    questionTypes?: string[]
  ): Promise<{ questions: QuestionSet; method: 'ai' | 'rule-based' }> {
    try {
      // Try using Bytez AI SDK
      console.log('🤖 Attempting AI-powered generation with Bytez.com SDK...');
      console.log('📦 Using model: openai/gpt-4.1');
      const questions = await this.generateWithAI(text, difficulty, numberOfQuestions, questionTypes);
      console.log('✅ SUCCESS: Questions generated using AI (GPT-4.1 via Bytez)');
      return { questions, method: 'ai' };
    } catch (error) {
      console.warn('⚠️ AI generation failed, switching to rule-based fallback');
      console.error('Error details:', error);
      // Fallback to rule-based generation
      const questions = this.generateWithRules(text, difficulty, numberOfQuestions, questionTypes);
      console.log('✅ Questions generated using rule-based method (fallback)');
      return { questions, method: 'rule-based' };
    }
  }

  private async generateWithAI(
    text: string,
    difficulty: DifficultyLevel,
    numberOfQuestions: number,
    questionTypes?: string[]
  ): Promise<QuestionSet> {
    const prompt = this.buildPrompt(text, difficulty, numberOfQuestions, questionTypes);

    console.log('📤 Sending request to Bytez AI...');

    // Use Bytez SDK with correct method: model.run()
    const response = await this.model.run([
      {
        role: 'system',
        content: 'You are an expert educational assessment creator. Generate high-quality questions in valid JSON format only. Do not include any markdown formatting or code blocks.'
      },
      {
        role: 'user',
        content: prompt
      }
    ]);

    console.log('📥 Received response from Bytez AI');

    // Check for errors
    if (response.error) {
      throw new Error(`Bytez API error: ${response.error}`);
    }

    // Extract content from response.output.content
    const content = response?.output?.content;
    
    if (!content || typeof content !== 'string') {
      console.error('❌ Invalid response structure:', response);
      throw new Error('No valid content in AI response');
    }

    console.log('🔍 Parsing AI response...');
    console.log('📝 Content preview:', content.substring(0, 200));
    
    // Parse the JSON response
    const questions = this.parseAIResponse(content);
    return questions;
  }

  private buildPrompt(
    text: string, 
    difficulty: DifficultyLevel,
    numberOfQuestions: number,
    questionTypes?: string[]
  ): string {
    const counts = this.distributeQuestions(numberOfQuestions, questionTypes);
    
    // Build the counts list only for requested types
    const countsList: string[] = [];
    if (counts.mcq > 0) countsList.push(`- ${counts.mcq} Multiple Choice Questions (4 options each with specific, relevant answers from the text)`);
    if (counts.trueFalse > 0) countsList.push(`- ${counts.trueFalse} True/False Questions`);
    if (counts.fillBlank > 0) countsList.push(`- ${counts.fillBlank} Fill-in-the-Blank Questions`);
    if (counts.identification > 0) countsList.push(`- ${counts.identification} Identification Questions`);
    
    // Build JSON template only for requested types
    const jsonParts: string[] = [];
    if (counts.mcq > 0) {
      jsonParts.push(`  "multipleChoice": [
    {
      "question": "Question text here?",
      "options": ["Specific answer from text", "Another specific answer", "Third specific answer", "Fourth specific answer"],
      "correctAnswer": 0
    }
  ]`);
    }
    if (counts.trueFalse > 0) {
      jsonParts.push(`  "trueFalse": [
    {
      "statement": "Statement here",
      "answer": true
    }
  ]`);
    }
    if (counts.fillBlank > 0) {
      jsonParts.push(`  "fillInTheBlank": [
    {
      "sentence": "Sentence with ______ blank",
      "answer": "correct word"
    }
  ]`);
    }
    if (counts.identification > 0) {
      jsonParts.push(`  "identification": [
    {
      "question": "Identify the person/concept described...",
      "answer": "Correct identification"
    }
  ]`);
    }
    
    return `Analyze the following text and generate a structured questionnaire with exactly these counts:
${countsList.join('\n')}

Total Questions Required: ${numberOfQuestions}
Difficulty Level: ${difficulty}

Text to analyze:
"""
${text.substring(0, 3000)}
"""

Generate questions in this EXACT JSON format (no markdown, no code blocks):
{
  "multipleChoice": [${counts.mcq > 0 ? `
    {
      "question": "Question text here?",
      "options": ["Specific answer from text", "Another specific answer", "Third specific answer", "Fourth specific answer"],
      "correctAnswer": 0
    }` : ''}
  ],
  "trueFalse": [${counts.trueFalse > 0 ? `
    {
      "statement": "Statement here",
      "answer": true
    }` : ''}
  ],
  "fillInTheBlank": [${counts.fillBlank > 0 ? `
    {
      "sentence": "Sentence with ______ blank",
      "answer": "correct word"
    }` : ''}
  ],
  "identification": [${counts.identification > 0 ? `
    {
      "question": "Identify the person/concept described...",
      "answer": "Correct identification"
    }` : ''}
  ]
}

CRITICAL Requirements:
- Generate EXACTLY ${numberOfQuestions} question(s) total with the distribution shown above
- All questions must be directly based on the provided text content
- Multiple choice: Use SPECIFIC, RELEVANT answers extracted from the text, NOT generic placeholders like "Option A/B/C/D"
- Multiple choice: Each option should be a distinct, plausible answer from the text
- Multiple choice: correctAnswer is the index (0-3) of the correct option
- True/False: answer must be boolean (true or false)
- Fill-in-the-blank: use "______" for blanks
- Identification: ask to identify people, concepts, terms, or entities from the text
- Ensure questions match the ${difficulty} difficulty level
- Include all four arrays (multipleChoice, trueFalse, fillInTheBlank, identification) even if some are empty
- Return ONLY valid JSON with the exact structure shown above, no additional text or formatting`;
  }

  private parseAIResponse(content: string): QuestionSet {
    try {
      // Remove markdown code blocks if present
      let jsonStr = content.trim();
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      }
      
      const parsed = JSON.parse(jsonStr);
      
      // Validate and return
      return {
        multipleChoice: parsed.multipleChoice || [],
        trueFalse: parsed.trueFalse || [],
        fillInTheBlank: parsed.fillInTheBlank || [],
        identification: parsed.identification || []
      };
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      console.error('Raw content:', content);
      throw new Error('Invalid JSON response from AI');
    }
  }

  private distributeQuestions(
    total: number,
    questionTypes?: string[]
  ): {
    mcq: number;
    trueFalse: number;
    fillBlank: number;
    identification: number;
  } {
    // If no question types specified, distribute evenly across all types
    if (!questionTypes || questionTypes.length === 0) {
      const perType = Math.floor(total / 4);
      const remainder = total % 4;
      return {
        mcq: perType + (remainder > 0 ? 1 : 0),
        trueFalse: perType + (remainder > 1 ? 1 : 0),
        fillBlank: perType + (remainder > 2 ? 1 : 0),
        identification: perType
      };
    }

    // Distribute based on selected question types
    const counts = { mcq: 0, trueFalse: 0, fillBlank: 0, identification: 0 };
    const perType = Math.floor(total / questionTypes.length);
    const remainder = total % questionTypes.length;
    
    let extraAssigned = 0;
    questionTypes.forEach((type) => {
      const extra = extraAssigned < remainder ? 1 : 0;
      extraAssigned += extra;
      
      switch (type) {
        case 'multiple-choice':
          counts.mcq = perType + extra;
          break;
        case 'true-false':
          counts.trueFalse = perType + extra;
          break;
        case 'fill-in-blank':
          counts.fillBlank = perType + extra;
          break;
        case 'identification':
          counts.identification = perType + extra;
          break;
      }
    });

    return counts;
  }

  // Fallback rule-based generation (simplified version)
  private generateWithRules(
    text: string, 
    difficulty: DifficultyLevel,
    numberOfQuestions: number,
    questionTypes?: string[]
  ): QuestionSet {
    const cleanText = text.replace(/\s+/g, ' ').trim();
    const sentences = cleanText.split(/[.!?]+/).filter(s => s.trim().length > 20);
    const words = cleanText.toLowerCase().match(/\b\w+\b/g) || [];
    
    // Extract key terms
    const keyTerms = this.extractKeyTerms(words);
    const counts = this.distributeQuestions(numberOfQuestions, questionTypes);

    return {
      multipleChoice: this.generateMCQs(sentences, keyTerms, counts.mcq),
      trueFalse: this.generateTrueFalse(sentences, keyTerms, counts.trueFalse),
      fillInTheBlank: this.generateFillBlanks(sentences, keyTerms, counts.fillBlank),
      identification: this.generateIdentification(sentences, keyTerms, counts.identification)
    };
  }

  private extractKeyTerms(words: string[]): string[] {
    const frequency: { [key: string]: number } = {};
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were']);

    words.forEach(word => {
      if (word.length > 3 && !stopWords.has(word)) {
        frequency[word] = (frequency[word] || 0) + 1;
      }
    });

    return Object.entries(frequency)
      .filter(([, count]) => count >= 2)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word);
  }

  private generateMCQs(sentences: string[], keyTerms: string[], count: number): MultipleChoiceQuestion[] {
    return sentences.slice(0, count).map((sentence, i) => ({
      question: `According to the text, what is mentioned about ${keyTerms[i] || 'the topic'}?`,
      options: [
        sentence.trim(),
        `${keyTerms[0] || 'The concept'} has different characteristics`,
        `${keyTerms[1] || 'The subject'} is not related to this topic`,
        `The text does not discuss ${keyTerms[i] || 'this concept'}`
      ],
      correctAnswer: 0
    }));
  }

  private generateTrueFalse(sentences: string[], keyTerms: string[], count: number): TrueFalseQuestion[] {
    const questions: TrueFalseQuestion[] = [];
    
    sentences.slice(0, Math.ceil(count / 2)).forEach(sentence => {
      questions.push({ statement: sentence.trim(), answer: true });
      questions.push({
        statement: `${keyTerms[0] || 'The topic'} is not mentioned in the text`,
        answer: false
      });
    });

    return questions.slice(0, count);
  }

  private generateFillBlanks(sentences: string[], keyTerms: string[], count: number): FillInTheBlankQuestion[] {
    return sentences.slice(0, count).map((sentence, i) => {
      const term = keyTerms[i] || 'concept';
      const regex = new RegExp(`\\b${term}\\b`, 'i');
      return {
        sentence: sentence.replace(regex, '______').trim(),
        answer: term
      };
    });
  }

  private generateIdentification(sentences: string[], keyTerms: string[], count: number): IdentificationQuestion[] {
    return keyTerms.slice(0, count).map(term => ({
      question: `Identify the key concept that is frequently discussed in the text and relates to: "${term}"`,
      answer: term
    }));
  }
}

// Export singleton instance
export const bytezAI = new BytezAIService(process.env.AI_API_KEY || '');
