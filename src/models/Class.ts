import mongoose from 'mongoose';

const ClassSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  classCode: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    index: true
  },
  instructorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  learners: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  quizzes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz'
  }],
  isActive: {
    type: Boolean,
    default: true
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

// Generate unique class code
ClassSchema.statics.generateClassCode = async function() {
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude similar looking characters
  let code = '';
  let isUnique = false;
  
  while (!isUnique) {
    code = '';
    for (let i = 0; i < 6; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    
    // Check if code already exists
    const existing = await this.findOne({ classCode: code });
    if (!existing) {
      isUnique = true;
    }
  }
  
  return code;
};

// Update timestamp on save
ClassSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.models.Class || mongoose.model('Class', ClassSchema);
