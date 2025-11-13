# QuizMate - AI-Powered Quiz Generation & Management System

A comprehensive quiz generation and management platform built with Next.js, Tailwind CSS, MongoDB, and AI integration. QuizMate enables instructors to create intelligent quizzes from text content and manage classes, while learners can take timed quizzes, track progress, and receive instant feedback.

## Features

### 🤖 AI-Powered Quiz Generation
- **Intelligent Question Generation** using Bytez.com AI (GPT-4.1)
- Generate questions from uploaded text, PDFs, or pasted content
- Support for multiple question types:
  - Multiple Choice (with randomized answer positions)
  - True/False
  - Fill-in-the-Blank
  - Identification
- Configurable difficulty levels (Easy, Moderate, Challenging)
- Customizable number of questions (1-100)
- Automatic answer randomization to prevent AI bias
- Rule-based fallback generation when AI is unavailable

### 👥 Authentication & User Management
- Separate registration for learners and instructors
- Secure password hashing with bcrypt (12 salt rounds)
- JWT-based authentication with 7-day token expiration
- Profile management with username updates
- Role-based access control

### 📚 Class Management (Instructors)
- Create and manage multiple classes
- Generate unique 6-character class codes
- Add/remove learners from classes
- Assign quizzes to specific classes
- Track class enrollment and activity
- View learner submissions and scores

### 📝 Quiz Management
- **For Instructors:**
  - Create quizzes manually or with AI assistance
  - Set quiz deadlines and time limits (1-480 minutes)
  - Edit quiz details, questions, and answers
  - Assign quizzes to classes
  - View learner submissions and scores
  - Delete quizzes and questions
  - Real-time quiz updates

- **For Learners:**
  - Browse available quizzes by class
  - Take timed quizzes with countdown timer
  - Persistent timer across page refreshes
  - Auto-save progress during quiz attempts
  - Resume quizzes from last question
  - View submission history and scores
  - Review correct/incorrect answers after submission

### ⏱️ Advanced Quiz Taking Features
- **Persistent State Management:**
  - Timer persists across browser sessions
  - Progress auto-saved to localStorage
  - Resume from last question when returning
  - All state cleared upon submission

- **Smart Confirmations:**
  - Warning when navigating without answering
  - Submission confirmation with unanswered question alerts
  - Visual indicators for skipped questions
  - Question number highlighting for incomplete answers

- **Real-time Features:**
  - Live countdown timer with visual warnings
  - Auto-submit when time expires
  - Instant score calculation
  - Immediate feedback on answers

### 🔔 Notification System
- Real-time notifications for:
  - Quiz assignments
  - Quiz submissions
  - Class enrollments
  - New quizzes available
  - Grade postings
- Unread notification badges
- Auto-polling for live updates (10-second intervals)
- Mark as read functionality

### 📊 Results & Analytics
- Instant score calculation (percentage-based)
- Detailed answer review with correct/incorrect indicators
- Question-by-question breakdown
- Submission history tracking
- Performance statistics

### 🎨 Modern UI/UX
- Responsive design for all devices
- Gradient-based color scheme
- Smooth animations and transitions
- Modal confirmations for critical actions
- Toast notifications for user feedback
- Loading states and error handling
- Accessibility-compliant components

## Tech Stack

### Frontend
- **Next.js 15** - React framework with App Router
- **React 19** - UI library with hooks and context
- **Tailwind CSS** - Utility-first CSS framework
- **TypeScript** - Type safety and better development experience

### Backend
- **Next.js API Routes** - Server-side API endpoints
- **MongoDB** - NoSQL database for data storage
- **Mongoose** - MongoDB object modeling and validation

### AI Integration
- **Bytez.com SDK** - AI model orchestration platform
- **GPT-4.1** - Advanced language model for question generation
- **Custom AI Service** - Intelligent question generation with fallback logic

### Authentication & Security
- **bcryptjs** - Password hashing with salt rounds
- **jsonwebtoken** - JWT token generation and verification
- **HTTP-only cookies** - Secure token storage

### File Processing
- **PDF.js** - PDF text extraction
- **File Upload API** - Document processing for quiz generation

### State Management
- **React Context API** - Global state management
- **localStorage** - Client-side persistence for quiz progress

## Getting Started

### Prerequisites
- Node.js 18+ installed
- MongoDB installed and running locally, or MongoDB Atlas account

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd quiz-system
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file in the root directory:
   ```env
   MONGODB_URI=mongodb://localhost:27017/quizmate
   # Or use MongoDB Atlas:
   # MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/quizmate
   
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-min-32-chars
   
   # Bytez.com AI API Key (required for AI quiz generation)
   AI_API_KEY=your-bytez-api-key-from-bytez-com
   
   # Optional: NextAuth (if using OAuth)
   NEXTAUTH_SECRET=your-nextauth-secret-key
   NEXTAUTH_URL=http://localhost:3000
   ```
   
   **Getting a Bytez.com API Key:**
   1. Visit [Bytez.com](https://bytez.com)
   2. Sign up for an account
   3. Navigate to API settings
   4. Generate a new API key
   5. Add it to your `.env.local` file

4. **Start MongoDB**
   Make sure MongoDB is running on your system:
   ```bash
   # For local MongoDB installation
   mongod
   
   # Or use MongoDB Atlas connection string in MONGODB_URI
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Usage Guide

### Getting Started

#### For New Users
1. Click "Sign up" on the landing page
2. Choose your role:
   - **Learner** - Take quizzes and track progress
   - **Instructor** - Create quizzes and manage classes
3. Fill in email, username, and password
4. Click "Sign up" to register
5. You'll be redirected to login page

#### For Existing Users
1. Enter your email and password
2. Click "Sign in" to access dashboard

---

### For Instructors

#### Creating Classes
1. Navigate to "My Classes" section
2. Click "Create New Class"
3. Enter class name and description
4. System generates unique 6-character class code
5. Share code with learners for enrollment

#### Managing Classes
- View enrolled learners
- Assign quizzes to classes
- Remove learners if needed
- Track class activity and submissions

#### Creating Quizzes with AI
1. Click "Generate with AI" button
2. Choose input method:
   - **Upload PDF** - Extract text from documents
   - **Paste Text** - Copy/paste content directly
3. Configure quiz settings:
   - Title and description
   - Difficulty level (Easy/Moderate/Challenging)
   - Number of questions (1-100)
   - Question types (Multiple Choice, True/False, Fill-in-Blank, Identification)
   - Time limit (1-480 minutes)
   - Deadline (optional)
4. Click "Generate Questions"
5. Review and edit generated questions
6. Assign to classes

#### Creating Quizzes Manually
1. Click "Create New Quiz"
2. Enter title, description, and settings
3. Add questions one by one:
   - Enter question text
   - Add answer choices (2-6 for multiple choice)
   - Select correct answer
   - Choose question type
4. Save and assign to classes

#### Managing Questions
- Edit question text and answers
- Regenerate individual questions with AI
- Delete questions
- Reorder questions
- Update quiz details (title, deadline, time limit)

#### Viewing Results
- See all learner submissions
- View individual scores and answers
- Track completion rates
- Monitor class performance

---

### For Learners

#### Joining Classes
1. Click "Join Class" button
2. Enter 6-character class code from instructor
3. Confirm enrollment
4. Access class quizzes

#### Taking Quizzes
1. Browse "Available Quizzes" section
2. Filter by class (optional)
3. Click "Take Quiz" to start
4. Quiz features:
   - **Timer** - Countdown displayed at top
   - **Progress Bar** - Visual progress indicator
   - **Auto-Save** - Answers saved automatically
   - **Navigation** - Move between questions freely
   - **Warnings** - Alerts for unanswered questions

#### Quiz Taking Tips
- Answer all questions before submitting
- Use "Previous" and "Next" buttons to navigate
- Timer persists if you close the browser
- Quiz resumes from last question when reopened
- Review all answers before final submission

#### Viewing Results
1. After submission, see instant score
2. Review correct/incorrect answers
3. See detailed explanations
4. Track submission history in "My Quizzes"
5. View percentage scores and completion status

#### Managing Profile
1. Click profile icon
2. Update username
3. View account details
4. Logout when finished

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user (learner/instructor)
- `POST /api/auth/login` - Authenticate user and return JWT
- `POST /api/auth/logout` - Clear authentication token
- `GET /api/auth/me` - Get current user profile
- `PUT /api/auth/me` - Update user profile

### Quizzes
- `GET /api/quizzes` - Get all quizzes for authenticated user
- `POST /api/quizzes` - Create a new quiz
- `GET /api/quizzes/[id]` - Get specific quiz details
- `PUT /api/quizzes/[id]` - Update quiz (title, description, deadline, timeLimit)
- `DELETE /api/quizzes/[id]` - Delete quiz and associated questions

### Questions
- `POST /api/questions` - Create a new question
- `GET /api/questions/quiz/[quizId]` - Get all questions for a quiz
- `PUT /api/questions/[id]` - Update question text, answers, or type
- `DELETE /api/questions/[id]` - Delete specific question
- `POST /api/questions/regenerate` - Regenerate question with AI

### AI Generation
- `POST /api/generate-quiz` - Generate quiz questions using AI
  - Accepts text content or PDF upload
  - Returns structured question set
  - Supports multiple question types and difficulty levels

### Classes
- `GET /api/classes` - Get all classes (instructor: owned, learner: enrolled)
- `POST /api/classes` - Create new class (instructors only)
- `GET /api/classes/[id]` - Get class details with learners and quizzes
- `PUT /api/classes/[id]` - Update class details
- `DELETE /api/classes/[id]` - Delete class (instructors only)
- `POST /api/classes/join` - Join class using class code (learners)
- `POST /api/classes/[id]/assign-quiz` - Assign quiz to class
- `DELETE /api/classes/[id]/learners/[learnerId]` - Remove learner from class

### Quiz Submissions
- `POST /api/quiz-submissions` - Submit quiz answers and get score
- `GET /api/quiz-submissions?quizId=[id]` - Get user's submission for specific quiz
- `GET /api/quiz-submissions/quiz/[quizId]` - Get all submissions for quiz (instructors)

### Notifications
- `GET /api/notifications` - Get user's notifications
- `PUT /api/notifications/[id]/read` - Mark notification as read
- `PUT /api/notifications/mark-all-read` - Mark all notifications as read
- `DELETE /api/notifications/[id]` - Delete notification

## Database Schema

### Users Collection
```javascript
{
  _id: ObjectId,
  email: String (required, unique, lowercase, validated),
  username: String (required, unique, 3-20 chars),
  password: String (required, hashed with bcrypt, min 6 chars),
  role: String (enum: ['learner', 'instructor'], default: 'learner'),
  createdAt: Date (default: now)
}
```

### Quizzes Collection
```javascript
{
  _id: ObjectId,
  title: String (required, max 100 chars),
  description: String (max 500 chars),
  difficulty: String (enum: ['easy', 'moderate', 'challenging'], default: 'moderate'),
  questionTypes: [String] (default: ['multiple-choice']),
  numberOfQuestions: Number (1-100, default: 10),
  sourceText: String (max 1,000,000 chars, optional),
  deadline: Date (optional),
  timeLimit: Number (1-480 minutes, default: 30),
  userId: ObjectId (ref: User, required),
  createdAt: Date (default: now),
  updatedAt: Date (default: now)
}
```

### Questions Collection
```javascript
{
  _id: ObjectId,
  questionText: String (required, max 500 chars),
  questionType: String (enum: ['multiple-choice', 'true-false', 'fill-in-blank']),
  answerChoices: [String] (2-6 choices for MC, 2 for T/F, empty for fill-in),
  correctAnswer: Mixed (Number for MC/T/F index, String for fill-in-blank),
  quizId: ObjectId (ref: Quiz, required),
  createdAt: Date (default: now)
}
```

### Classes Collection
```javascript
{
  _id: ObjectId,
  name: String (required, trimmed),
  description: String (default: ''),
  classCode: String (required, unique, 6 chars uppercase, indexed),
  instructorId: ObjectId (ref: User, required),
  learners: [ObjectId] (ref: User),
  quizzes: [ObjectId] (ref: Quiz),
  isActive: Boolean (default: true),
  createdAt: Date (default: now),
  updatedAt: Date (default: now)
}
```

### QuizSubmissions Collection
```javascript
{
  _id: ObjectId,
  quizId: ObjectId (ref: Quiz, required, indexed),
  userId: ObjectId (ref: User, required, indexed),
  answers: Map<String, Mixed> (questionId -> answer index or text),
  score: Number (0-100, required),
  submittedAt: Date (default: now)
}
// Compound index: { quizId: 1, userId: 1 }
```

### Notifications Collection
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User, required, indexed),
  type: String (enum: ['quiz_assigned', 'quiz_submitted', 'class_joined', 'new_quiz', 'grade_posted']),
  title: String (required),
  message: String (required),
  relatedId: ObjectId (refPath: relatedModel, optional),
  relatedModel: String (enum: ['Quiz', 'Class', 'QuizSubmission']),
  read: Boolean (default: false),
  createdAt: Date (default: now, indexed)
}
// Compound index: { userId: 1, read: 1, createdAt: -1 }
```

### Results Collection (Legacy)
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User, required),
  quizId: ObjectId (ref: Quiz, required),
  score: Number (0-100, required),
  answers: [Number] (answer indices),
  completedAt: Date (default: now)
}
```

## Design System

### Color Palette
- **Primary**: `#4F46E5` (Indigo) - Primary buttons, links, active states
- **Secondary**: `#8B5CF6` (Violet) - Highlights, secondary actions, badges
- **Success**: `#34D399` (Emerald) - Success states, correct answers, submit buttons
- **Warning**: `#F59E0B` (Amber) - Warnings, skipped questions, alerts
- **Error**: `#EF4444` (Red) - Errors, incorrect answers, delete actions
- **Background**: `#0F172A` (Slate) - Main background, dark theme
- **Surface**: `rgba(15, 23, 42, 0.6)` - Cards, modals, elevated surfaces
- **Text Primary**: `#FFFFFF` (White) - Primary text on dark backgrounds
- **Text Secondary**: `#9CA3AF` (Gray) - Secondary text, descriptions

### Gradients
- **Primary Gradient**: `linear-gradient(135deg, #4F46E5 0%, #8B5CF6 100%)`
- **Success Gradient**: `linear-gradient(135deg, #34D399 0%, #10B981 100%)`
- **Warning Gradient**: `linear-gradient(135deg, #F59E0B 0%, #D97706 100%)`
- **Progress Gradient**: `linear-gradient(90deg, #4F46E5 0%, #8B5CF6 50%, #34D399 100%)`

### Typography
- **Font Family**: System fonts (sans-serif)
- **Headings**: Bold, 2xl-5xl sizes
- **Body**: Regular, base-lg sizes
- **Labels**: Semibold, sm-base sizes

### Components
- **Buttons**: Rounded-xl, gradient backgrounds, hover scale effects
- **Cards**: Rounded-2xl/3xl, backdrop blur, border accents
- **Modals**: Fixed overlay, centered, backdrop blur
- **Inputs**: Rounded-xl, focus ring effects, validation states
- **Badges**: Rounded-lg, colored backgrounds, icon support

## Security Features

### Authentication & Authorization
- **Password Security**:
  - Bcrypt hashing with 12 salt rounds
  - Minimum 6 characters required
  - Password strength validation on client
  - Never stored in plain text

- **JWT Tokens**:
  - 7-day expiration
  - HTTP-only cookies (when applicable)
  - Secure token storage in localStorage
  - Automatic token refresh

- **API Protection**:
  - Middleware authentication on protected routes
  - Role-based access control (RBAC)
  - User ownership verification
  - Request validation and sanitization

### Data Validation
- **Client-Side**:
  - Form validation with error messages
  - Type checking with TypeScript
  - Input length restrictions
  - Email format validation

- **Server-Side**:
  - Mongoose schema validation
  - Custom validators for complex rules
  - Sanitization of user inputs
  - Error handling and logging

### Best Practices
- Environment variables for sensitive data
- No sensitive data in client-side code
- CORS configuration for API security
- Rate limiting (recommended for production)
- Regular dependency updates
- Secure MongoDB connection strings

## Development

### Project Structure
```
quizmate/
├── src/
│   ├── app/
│   │   ├── api/                    # API Routes
│   │   │   ├── auth/              # Authentication endpoints
│   │   │   ├── classes/           # Class management
│   │   │   ├── quizzes/           # Quiz CRUD operations
│   │   │   ├── questions/         # Question management
│   │   │   ├── quiz-submissions/  # Submission handling
│   │   │   ├── notifications/     # Notification system
│   │   │   └── generate-quiz/     # AI generation endpoint
│   │   ├── globals.css            # Global styles and Tailwind
│   │   ├── layout.tsx             # Root layout with providers
│   │   └── page.tsx               # Landing page
│   │
│   ├── components/                 # React Components
│   │   ├── Dashboard.tsx          # Main dashboard with tabs
│   │   ├── QuizTaker.tsx          # Quiz taking interface
│   │   ├── QuestionManager.tsx    # Question CRUD interface
│   │   ├── LandingPage.tsx        # Public landing page
│   │   └── Modal.tsx              # Reusable modal component
│   │
│   ├── contexts/                   # React Context Providers
│   │   └── AuthContext.tsx        # Authentication state
│   │
│   ├── lib/                        # Utility Functions
│   │   ├── mongodb.ts             # MongoDB connection
│   │   ├── auth.ts                # Auth helpers
│   │   └── bytez-ai-service.ts    # AI service integration
│   │
│   ├── models/                     # Mongoose Models
│   │   ├── User.ts                # User schema
│   │   ├── Quiz.ts                # Quiz schema
│   │   ├── Question.ts            # Question schema
│   │   ├── Class.ts               # Class schema
│   │   ├── QuizSubmission.ts      # Submission schema
│   │   ├── Notification.ts        # Notification schema
│   │   └── Result.ts              # Legacy result schema
│   │
│   └── types/                      # TypeScript Definitions
│       └── index.ts               # Shared type definitions
│
├── public/                         # Static Assets
├── .env.local                      # Environment variables (not in git)
├── .gitignore                      # Git ignore rules
├── next.config.js                  # Next.js configuration
├── tailwind.config.ts              # Tailwind CSS configuration
├── tsconfig.json                   # TypeScript configuration
├── package.json                    # Dependencies and scripts
└── README.md                       # This file
```

### Available Scripts
- `npm run dev` - Start development server (http://localhost:3000)
- `npm run build` - Build optimized production bundle
- `npm run start` - Start production server
- `npm run lint` - Run ESLint for code quality
- `npm run type-check` - Run TypeScript compiler check

### Development Workflow
1. **Start MongoDB** - Ensure MongoDB is running locally or use Atlas
2. **Install Dependencies** - Run `npm install`
3. **Configure Environment** - Set up `.env.local` with required variables
4. **Start Dev Server** - Run `npm run dev`
5. **Make Changes** - Edit files and see hot-reload in action
6. **Test Features** - Use the UI to test functionality
7. **Check Types** - Run `npm run type-check` before committing
8. **Build for Production** - Run `npm run build` to verify build success

### Key Development Features
- **Hot Module Replacement** - Instant updates without full reload
- **TypeScript** - Type safety and IntelliSense support
- **ESLint** - Code quality and consistency checks
- **Tailwind CSS** - Utility-first styling with JIT compilation
- **API Routes** - Serverless functions for backend logic
- **MongoDB Integration** - Mongoose ODM with schema validation

## Deployment

### Vercel (Recommended)
1. Push code to GitHub repository
2. Import project in Vercel dashboard
3. Configure environment variables:
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `AI_API_KEY`
4. Deploy automatically on push to main branch

### Environment Variables for Production
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/quizmate
JWT_SECRET=your-production-jwt-secret-min-32-characters-long
AI_API_KEY=your-bytez-production-api-key
NODE_ENV=production
```

### Build Optimization
- Next.js automatically optimizes images
- Static pages are pre-rendered
- API routes are serverless functions
- Tailwind CSS purges unused styles
- TypeScript compiled to optimized JavaScript

## Troubleshooting

### Common Issues

**MongoDB Connection Failed**
- Verify `MONGODB_URI` in `.env.local`
- Check MongoDB is running (local) or accessible (Atlas)
- Ensure IP whitelist includes your address (Atlas)

**AI Generation Not Working**
- Verify `AI_API_KEY` is set correctly
- Check Bytez.com API quota and status
- Review console logs for specific errors
- Fallback to rule-based generation if AI fails

**Authentication Issues**
- Clear browser localStorage and cookies
- Verify `JWT_SECRET` is set
- Check token expiration (7 days default)
- Ensure API routes have auth middleware

**Quiz Timer Not Persisting**
- Check browser localStorage is enabled
- Verify localStorage keys: `quiz_timer_${quizId}`
- Clear old quiz data if corrupted

**Build Errors**
- Run `npm run type-check` to find TypeScript errors
- Ensure all dependencies are installed
- Check Node.js version (18+ required)
- Clear `.next` folder and rebuild

## Performance Optimization

### Client-Side
- React Context for global state (minimal re-renders)
- localStorage for offline persistence
- Debounced auto-save for quiz progress
- Lazy loading for heavy components
- Optimized images and assets

### Server-Side
- MongoDB indexes on frequently queried fields
- Efficient Mongoose queries with projections
- API route caching where applicable
- Serverless function optimization
- Connection pooling for database

### Database Indexes
```javascript
// Recommended indexes for production
Users: { email: 1 }, { username: 1 }
Quizzes: { userId: 1, createdAt: -1 }
Questions: { quizId: 1 }
Classes: { classCode: 1 }, { instructorId: 1 }
QuizSubmissions: { quizId: 1, userId: 1 }
Notifications: { userId: 1, read: 1, createdAt: -1 }
```

## Future Enhancements

### Planned Features
- [ ] Quiz analytics dashboard for instructors
- [ ] Leaderboards and gamification
- [ ] Question bank and reusable templates
- [ ] Collaborative quiz creation
- [ ] Advanced question types (matching, ordering)
- [ ] Mobile app (React Native)
- [ ] Email notifications
- [ ] Quiz scheduling and automation
- [ ] Export results to CSV/Excel
- [ ] Integration with LMS platforms
- [ ] Multi-language support
- [ ] Accessibility improvements (WCAG 2.1 AA)

### Community Contributions Welcome
- Bug fixes and improvements
- New question types
- UI/UX enhancements
- Documentation updates
- Test coverage
- Performance optimizations

## Contributing

We welcome contributions! Here's how to get started:

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make your changes**
   - Follow existing code style
   - Add TypeScript types
   - Update documentation
4. **Test thoroughly**
   - Test all affected features
   - Check for TypeScript errors
   - Verify responsive design
5. **Commit your changes**
   ```bash
   git commit -m "Add amazing feature"
   ```
6. **Push to your fork**
   ```bash
   git push origin feature/amazing-feature
   ```
7. **Submit a Pull Request**
   - Describe your changes
   - Reference any related issues
   - Include screenshots if UI changes

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Contact the development team
- Check documentation and troubleshooting guide

## Acknowledgments

- **Next.js** - React framework
- **Bytez.com** - AI model orchestration
- **MongoDB** - Database platform
- **Tailwind CSS** - Styling framework
- **Vercel** - Deployment platform

---

**Built with ❤️ for educators and learners worldwide**