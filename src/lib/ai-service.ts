interface QuestionSet {
  multipleChoice: MultipleChoiceQuestion[];
  trueFalse: TrueFalseQuestion[];
  fillInTheBlank: FillInTheBlankQuestion[];
}

interface MultipleChoiceQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
}

interface TrueFalseQuestion {
  statement: string;
  answer: boolean;
}

interface FillInTheBlankQuestion {
  sentence: string;
  answer: string;
}

export class AITextAnalyzer {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async analyzeText(text: string): Promise<QuestionSet> {
    // Simulate AI analysis - replace with actual AI API call
    const questions = this.generateQuestionsFromText(text);
    return questions;
  }

  private generateQuestionsFromText(text: string): QuestionSet {
    // Clean and prepare text
    const cleanText = this.cleanText(text);
    const sentences = this.extractSentences(cleanText);
    const paragraphs = this.extractParagraphs(cleanText);
    const words = cleanText.toLowerCase().match(/\b\w+\b/g) || [];
    const keyTerms = this.extractKeyTerms(words);
    const namedEntities = this.extractNamedEntities(cleanText);

    return {
      multipleChoice: this.generateMultipleChoice(sentences, paragraphs, keyTerms, namedEntities),
      trueFalse: this.generateTrueFalse(sentences, keyTerms),
      fillInTheBlank: this.generateFillInTheBlank(sentences, keyTerms, namedEntities)
    };
  }

  private cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s.,!?;:()-]/g, '')
      .trim();
  }

  private extractSentences(text: string): string[] {
    return text
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 15 && s.split(' ').length >= 4);
  }

  private extractParagraphs(text: string): string[] {
    return text
      .split(/\n\s*\n/)
      .map(p => p.trim())
      .filter(p => p.length > 50);
  }

  private extractKeyTerms(words: string[]): string[] {
    const frequency: { [key: string]: number } = {};
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did',
      'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those',
      'they', 'them', 'their', 'there', 'then', 'than', 'when', 'where', 'why', 'how', 'what',
      'who', 'which', 'while', 'during', 'before', 'after', 'above', 'below', 'up', 'down',
      'out', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there',
      'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'only',
      'own', 'same', 'so', 'than', 'too', 'very', 'just', 'now'
    ]);

    words.forEach(word => {
      if (word.length > 3 && !stopWords.has(word) && /^[a-zA-Z]+$/.test(word)) {
        frequency[word] = (frequency[word] || 0) + 1;
      }
    });

    return Object.entries(frequency)
      .filter(([, count]) => count >= 2)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 15)
      .map(([word]) => word);
  }

  private extractNamedEntities(text: string): string[] {
    // Simple named entity extraction (capitalized words/phrases)
    const entities = new Set<string>();
    const words = text.split(/\s+/);
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i].replace(/[^\w]/g, '');
      if (word.length > 2 && /^[A-Z][a-z]+$/.test(word)) {
        entities.add(word);
        
        // Check for multi-word entities
        if (i < words.length - 1) {
          const nextWord = words[i + 1].replace(/[^\w]/g, '');
          if (/^[A-Z][a-z]+$/.test(nextWord)) {
            entities.add(`${word} ${nextWord}`);
          }
        }
      }
    }
    
    return Array.from(entities).slice(0, 10);
  }

  private generateMultipleChoice(
    sentences: string[], 
    paragraphs: string[], 
    keyTerms: string[], 
    namedEntities: string[]
  ): MultipleChoiceQuestion[] {
    const questions: MultipleChoiceQuestion[] = [];
    
    // Generate questions from key sentences
    const importantSentences = sentences
      .filter(s => keyTerms.some(term => s.toLowerCase().includes(term.toLowerCase())))
      .slice(0, 4);

    importantSentences.forEach((sentence, index) => {
      const relevantTerm = keyTerms.find(term => 
        sentence.toLowerCase().includes(term.toLowerCase())
      ) || keyTerms[0];

      const questionTypes = [
        `According to the text, what is true about ${relevantTerm}?`,
        `Based on the information provided, which statement about ${relevantTerm} is correct?`,
        `The text indicates that ${relevantTerm}:`,
        `Which of the following best describes ${relevantTerm} according to the passage?`
      ];

      const question = questionTypes[index % questionTypes.length];
      const correctOption = this.simplifyStatement(sentence);
      const wrongOptions = this.generateBetterWrongOptions(correctOption, keyTerms, namedEntities);
      
      const allOptions = [correctOption, ...wrongOptions];
      const shuffledOptions = this.shuffleArray([...allOptions]);
      
      questions.push({
        question,
        options: shuffledOptions,
        correctAnswer: shuffledOptions.indexOf(correctOption)
      });
    });

    return questions.slice(0, 3);
  }

  private simplifyStatement(sentence: string): string {
    return sentence
      .replace(/^(However|Moreover|Furthermore|Additionally|Therefore|Thus|Hence),?\s*/i, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  private generateTrueFalse(sentences: string[], keyTerms: string[]): TrueFalseQuestion[] {
    const questions: TrueFalseQuestion[] = [];
    
    // Select sentences with key terms for better relevance
    const relevantSentences = sentences
      .filter(s => keyTerms.some(term => s.toLowerCase().includes(term.toLowerCase())))
      .slice(0, 3);

    relevantSentences.forEach(sentence => {
      // Create true statement
      questions.push({
        statement: this.simplifyStatement(sentence),
        answer: true
      });

      // Create false statement by modifying the original
      const modifiedSentence = this.createFalseStatement(sentence, keyTerms);
      if (modifiedSentence !== sentence) {
        questions.push({
          statement: modifiedSentence,
          answer: false
        });
      }
    });

    // Add some general false statements
    const generalFalseStatements = [
      `${keyTerms[0] || 'The main topic'} is not mentioned in the text`,
      `The text provides no information about ${keyTerms[1] || 'the subject'}`,
      `${keyTerms[2] || 'The concept'} is described as having no significance`
    ];

    generalFalseStatements.forEach(statement => {
      questions.push({
        statement,
        answer: false
      });
    });

    return questions.slice(0, 6);
  }

  private generateFillInTheBlank(
    sentences: string[], 
    keyTerms: string[], 
    namedEntities: string[]
  ): FillInTheBlankQuestion[] {
    const questions: FillInTheBlankQuestion[] = [];
    const allTerms = [...keyTerms, ...namedEntities];
    
    // Find sentences with important terms
    const relevantSentences = sentences
      .filter(s => allTerms.some(term => s.toLowerCase().includes(term.toLowerCase())))
      .slice(0, 5);

    relevantSentences.forEach(sentence => {
      // Find the best term to blank out in this sentence
      const termsInSentence = allTerms.filter(term => 
        sentence.toLowerCase().includes(term.toLowerCase())
      );

      if (termsInSentence.length > 0 && questions.length < 4) {
        // Choose the most important term (first in the list)
        const termToBlank = termsInSentence[0];
        const regex = new RegExp(`\\b${this.escapeRegex(termToBlank)}\\b`, 'gi');
        const blankedSentence = sentence.replace(regex, '______');
        
        if (blankedSentence !== sentence) {
          questions.push({
            sentence: this.simplifyStatement(blankedSentence),
            answer: termToBlank
          });
        }
      }
    });

    return questions;
  }

  private escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private generateBetterWrongOptions(correctOption: string, keyTerms: string[], namedEntities: string[]): string[] {
    const wrongOptions: string[] = [];
    
    // Generate plausible but incorrect alternatives
    const templates = [
      `${keyTerms[0] || 'The subject'} is primarily used for different purposes than described`,
      `${namedEntities[0] || 'The entity'} has opposite characteristics to those mentioned`,
      `The relationship between ${keyTerms[0] || 'concepts'} and ${keyTerms[1] || 'elements'} is inverse`,
      `${keyTerms[1] || 'The topic'} functions differently than stated in the passage`,
      `The process involving ${keyTerms[2] || 'the subject'} occurs in reverse order`,
      `${namedEntities[1] || 'The mentioned entity'} has contradictory properties`
    ];

    // Select 3 random templates
    const selectedTemplates = templates
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);

    return selectedTemplates;
  }

  private createFalseStatement(sentence: string, keyTerms: string[]): string {
    const modifications = [
      (s: string) => s.replace(/\bis\b/gi, 'is not'),
      (s: string) => s.replace(/\bare\b/gi, 'are not'),
      (s: string) => s.replace(/\bcan\b/gi, 'cannot'),
      (s: string) => s.replace(/\bwill\b/gi, 'will not'),
      (s: string) => s.replace(/\balways\b/gi, 'never'),
      (s: string) => s.replace(/\bnever\b/gi, 'always'),
      (s: string) => s.replace(/\bincreases?\b/gi, 'decreases'),
      (s: string) => s.replace(/\bdecreases?\b/gi, 'increases'),
      (s: string) => s.replace(/\bimproves?\b/gi, 'worsens'),
      (s: string) => s.replace(/\benhances?\b/gi, 'reduces'),
      (s: string) => s.replace(/\bpositive\b/gi, 'negative'),
      (s: string) => s.replace(/\bnegative\b/gi, 'positive'),
      (s: string) => s.replace(/\bhigh\b/gi, 'low'),
      (s: string) => s.replace(/\blow\b/gi, 'high'),
      (s: string) => s.replace(/\bmore\b/gi, 'less'),
      (s: string) => s.replace(/\bless\b/gi, 'more')
    ];

    // Try modifications in random order
    const shuffledModifications = this.shuffleArray(modifications);
    
    for (const modify of shuffledModifications) {
      const modified = modify(sentence);
      if (modified !== sentence) {
        return this.simplifyStatement(modified);
      }
    }

    // If no simple modification works, create a contradictory statement
    const term = keyTerms[0] || 'the subject';
    return `${term} has no relevance to the topics discussed in the text`;
  }
}

export const aiAnalyzer = new AITextAnalyzer(process.env.AI_API_KEY || '');