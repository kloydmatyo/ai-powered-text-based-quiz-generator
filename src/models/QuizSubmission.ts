import mongoose, { Document, Schema } from 'mongoose';

export interface IQuizSubmission extends Document {
  quizId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  answers: { [key: string]: number | string }; // questionId: answerIndex (number) or answer text (string)
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
    of: Schema.Types.Mixed, // Allow both numbers (for multiple-choice) and strings (for fill-in-blank)
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
