import mongoose, { Document, Schema } from 'mongoose';

export interface IQuizSubmission extends Document {
  quizId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  answers: { [key: string]: number }; // questionId: answerIndex
  score: number;
  submittedAt: Date;
}

const QuizSubmissionSchema: Schema = new Schema({
  quizId: {
    type: Schema.Types.ObjectId,
    ref: 'Quiz',
    required: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  answers: {
    type: Map,
    of: Number,
    required: true
  },
  score: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  submittedAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
QuizSubmissionSchema.index({ quizId: 1, userId: 1 });

export default mongoose.models.QuizSubmission || mongoose.model<IQuizSubmission>('QuizSubmission', QuizSubmissionSchema);
