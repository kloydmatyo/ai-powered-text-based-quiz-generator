import mongoose, { Document, Schema } from 'mongoose';

export interface IQuiz extends Document {
  title: string;
  description: string;
  userId: mongoose.Types.ObjectId;
  difficulty: 'easy' | 'moderate' | 'challenging';
  questionTypes: string[];
  numberOfQuestions: number;
  sourceText?: string; // Original text content from PDF/file upload
  deadline?: Date; // Deadline for quiz submission
  timeLimit?: number; // Time limit in minutes
  createdAt: Date;
  updatedAt: Date;
}

const QuizSchema: Schema = new Schema({
  title: {
    type: String,
    required: [true, 'Quiz title is required'],
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  difficulty: {
    type: String,
    enum: ['easy', 'moderate', 'challenging'],
    default: 'moderate'
  },
  questionTypes: {
    type: [String],
    default: ['multiple-choice'],
    validate: {
      validator: function(types: string[]) {
        const validTypes = ['multiple-choice', 'true-false', 'fill-in-blank'];
        return types.every(type => validTypes.includes(type));
      },
      message: 'Invalid question type'
    }
  },
  numberOfQuestions: {
    type: Number,
    default: 10,
    min: [1, 'Must have at least 1 question'],
    max: [100, 'Cannot exceed 100 questions']
  },
  sourceText: {
    type: String,
    maxlength: [1000000, 'Source text cannot exceed 1,000,000 characters']
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  deadline: {
    type: Date,
    default: null
  },
  timeLimit: {
    type: Number,
    default: 30, // Default 30 minutes
    min: [1, 'Time limit must be at least 1 minute'],
    max: [480, 'Time limit cannot exceed 480 minutes (8 hours)']
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Delete cached model to ensure schema updates are applied
if (mongoose.models.Quiz) {
  delete mongoose.models.Quiz;
}

export default mongoose.model<IQuiz>('Quiz', QuizSchema);