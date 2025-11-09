import mongoose, { Document, Schema } from 'mongoose';

export interface IQuestion extends Document {
  questionText: string;
  questionType: 'multiple-choice' | 'true-false' | 'fill-in-blank';
  answerChoices: string[];
  correctAnswer: number | string;
  quizId: mongoose.Types.ObjectId;
  createdAt: Date;
}

const QuestionSchema: Schema = new Schema({
  questionText: {
    type: String,
    required: [true, 'Question text is required'],
    maxlength: [500, 'Question text cannot exceed 500 characters']
  },
  questionType: {
    type: String,
    enum: ['multiple-choice', 'true-false', 'fill-in-blank'],
    default: 'multiple-choice'
  },
  answerChoices: {
    type: [String],
    required: function(this: IQuestion) {
      return this.questionType !== 'fill-in-blank';
    },
    validate: {
      validator: function(this: IQuestion, choices: string[]) {
        if (this.questionType === 'fill-in-blank') return true;
        if (this.questionType === 'true-false') return choices.length === 2;
        return choices.length >= 2 && choices.length <= 6;
      },
      message: 'Invalid number of answer choices for question type'
    }
  },
  correctAnswer: {
    type: Schema.Types.Mixed,
    required: [true, 'Correct answer is required']
  },
  quizId: {
    type: Schema.Types.ObjectId,
    ref: 'Quiz',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.models.Question || mongoose.model<IQuestion>('Question', QuestionSchema);