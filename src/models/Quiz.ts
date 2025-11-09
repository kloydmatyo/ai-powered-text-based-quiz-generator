import mongoose, { Document, Schema } from 'mongoose';

export interface IQuiz extends Document {
  title: string;
  description: string;
  userId: mongoose.Types.ObjectId;
  difficulty: 'easy' | 'moderate' | 'challenging';
  questionTypes: string[];
  numberOfQuestions: number;
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
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
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

export default mongoose.models.Quiz || mongoose.model<IQuiz>('Quiz', QuizSchema);