import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  email: string;
  username: string;
  password?: string;
  role: 'learner' | 'instructor';
  emailVerified: boolean;
  verificationToken?: string | null;
  verificationTokenExpiry?: Date | null;
  googleId?: string;
  image?: string | null;
  createdAt: Date;
}

const UserSchema: Schema = new Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    minlength: [3, 'Username must be at least 3 characters long'],
    maxlength: [20, 'Username cannot exceed 20 characters']
  },
  password: {
    type: String,
    required: function(this: IUser) {
      // Password not required for OAuth users
      return !this.googleId;
    },
    minlength: [6, 'Password must be at least 6 characters long']
  },
  role: {
    type: String,
    enum: ['learner', 'instructor'],
    default: 'learner'
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  verificationToken: {
    type: String,
    default: null
  },
  verificationTokenExpiry: {
    type: Date,
    default: null
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true
  },
  image: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);