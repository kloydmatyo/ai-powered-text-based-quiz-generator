'use client';

import React, { useState, useEffect } from 'react';

interface Question {
  _id: string;
  questionText: string;
  questionType?: 'multiple-choice' | 'true-false' | 'fill-in-blank';
  answerChoices: string[];
  correctAnswer: number | string;
  quizId: string;
}

interface Quiz {
  _id: string;
  title: string;
  description: string;
}

interface QuizTakerProps {
  quiz: Quiz;
  onBack: () => void;
}

const QuizTaker: React.FC<QuizTakerProps> = ({ quiz, onBack }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<{ [key: string]: number | string }>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [alreadyCompleted, setAlreadyCompleted] = useState(false);
  const [previousSubmission, setPreviousSubmission] = useState<any>(null);
  const [timeRemaining, setTimeRemaining] = useState(1800); // 30 minutes default
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);

  useEffect(() => {
    checkPreviousSubmission();
  }, [quiz._id]);

  useEffect(() => {
    // Auto-save progress to localStorage
    if (!submitted && !alreadyCompleted && Object.keys(userAnswers).length > 0) {
      const progressKey = `quiz_progress_${quiz._id}`;
      localStorage.setItem(progressKey, JSON.stringify(userAnswers));
      console.log('💾 Progress auto-saved');
    }
  }, [userAnswers, submitted, alreadyCompleted, quiz._id]);

  // Timer countdown
  useEffect(() => {
    if (!submitted && !alreadyCompleted && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [submitted, alreadyCompleted, timeRemaining]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const checkPreviousSubmission = async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('🔍 Checking for previous submission...');
      
      const response = await fetch(`/api/quiz-submissions?quizId=${quiz._id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.submissions && data.submissions.length > 0) {
          // User has already completed this quiz
          console.log('⚠️ Quiz already completed');
          setAlreadyCompleted(true);
          setPreviousSubmission(data.submissions[0]);
          setScore(data.submissions[0].score);
          setSubmitted(true);
          
          // Fetch questions with correct answers for review
          await fetchQuestionsForReview(data.submissions[0]);
        } else {
          // No previous submission, load quiz normally
          console.log('✅ No previous submission found');
          await fetchQuestions();
          
          // Restore saved progress if any
          const progressKey = `quiz_progress_${quiz._id}`;
          const savedProgress = localStorage.getItem(progressKey);
          if (savedProgress) {
            const parsedProgress = JSON.parse(savedProgress);
            setUserAnswers(parsedProgress);
            console.log('📂 Restored saved progress:', Object.keys(parsedProgress).length, 'answers');
          }
        }
      }
    } catch (error) {
      console.error('❌ Error checking previous submission:', error);
      await fetchQuestions();
    } finally {
      setLoading(false);
    }
  };

  const fetchQuestionsForReview = async (submission: any) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/questions/quiz/${quiz._id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Include correct answers for review
        setQuestions(data.questions);
        // Set user's previous answers
        const answersMap: { [key: string]: number } = {};
        Object.entries(submission.answers).forEach(([questionId, answerIndex]) => {
          answersMap[questionId] = answerIndex as number;
        });
        setUserAnswers(answersMap);
        setShowResults(true);
      }
    } catch (error) {
      console.error('❌ Error fetching questions for review:', error);
    }
  };

  const fetchQuestions = async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('🔍 Fetching questions for quiz:', quiz._id);
      
      const response = await fetch(`/api/questions/quiz/${quiz._id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log('📡 Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Questions loaded:', data.questions.length);
        // Don't include correct answers in the state for security
        const questionsWithoutAnswers = data.questions.map((q: Question) => ({
          _id: q._id,
          questionText: q.questionText,
          answerChoices: q.answerChoices,
          quizId: q.quizId
        }));
        setQuestions(questionsWithoutAnswers);
      } else {
        const errorData = await response.json();
        console.error('❌ Error response:', errorData);
      }
    } catch (error) {
      console.error('❌ Error fetching questions:', error);
    }
  };

  const handleAnswerSelect = (questionId: string, answer: number | string) => {
    if (!submitted) {
      setUserAnswers({
        ...userAnswers,
        [questionId]: answer
      });
    }
  };

  const handleSubmit = async () => {
    if (Object.keys(userAnswers).length !== questions.length) {
      alert('Please answer all questions before submitting.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/quiz-submissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          quizId: quiz._id,
          answers: userAnswers
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setScore(data.score);
        setSubmitted(true);
        setAlreadyCompleted(true);
        
        // Clear saved progress
        const progressKey = `quiz_progress_${quiz._id}`;
        localStorage.removeItem(progressKey);
        console.log('🗑️ Cleared saved progress');
        
        // Update questions with correct answers for review
        const updatedQuestions = questions.map((q) => {
          const result = data.results.find((r: any) => r.questionId === q._id);
          return {
            ...q,
            correctAnswer: result?.correctAnswer
          };
        });
        setQuestions(updatedQuestions);
        setShowResults(true);
      } else {
        alert('Failed to submit quiz. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting quiz:', error);
      alert('An error occurred while submitting the quiz.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto mb-4"></div>
          <p className="text-white text-xl">Loading quiz...</p>
        </div>
      </div>
    );
  }

  if (questions.length === 0 && !loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">📝</div>
          <p className="text-gray-300 text-xl mb-6">This quiz has no questions yet.</p>
          <button onClick={onBack} className="px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-lg font-semibold">
            ← Back to Quizzes
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const hasAnsweredCurrent = currentQuestion && userAnswers[currentQuestion._id] !== undefined;

  // Results View
  if (submitted && showResults) {
    return (
      <div className="min-h-screen bg-background">
        {/* Top Bar */}
        <div className="bg-gray-900/95 backdrop-blur-sm border-b border-gray-800 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-xl md:text-2xl font-bold text-white">{quiz.title}</h1>
              <button onClick={onBack} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors">
                ← Back
              </button>
            </div>
          </div>
        </div>

        {/* Results Content */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
          {/* Score Card */}
          <div className="bg-gradient-to-br from-primary to-secondary rounded-2xl p-8 text-center text-white mb-8 shadow-2xl">
            <div className="text-6xl mb-4">{score && score >= 60 ? '🎉' : '📊'}</div>
            <h2 className="text-3xl md:text-4xl font-bold mb-2">Quiz Completed!</h2>
            <p className="text-xl md:text-2xl mb-4">Your Score: {score}%</p>
            <p className="text-blue-100">
              {score && score >= 80 ? 'Excellent work!' : score && score >= 60 ? 'Good job!' : 'Keep practicing!'}
            </p>
          </div>

          {/* Review Answers */}
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-white mb-4">Review Your Answers</h3>
            {questions.map((question, index) => {
              const userAnswer = userAnswers[question._id];
              const isCorrect = question.questionType === 'fill-in-blank' 
                ? userAnswer === question.correctAnswer
                : userAnswer === question.correctAnswer;
              
              return (
                <div key={question._id} className="bg-gray-800 rounded-xl p-6 border-2" style={{
                  borderColor: isCorrect ? '#34D399' : '#EF4444'
                }}>
                  <div className="flex items-start justify-between mb-4">
                    <h4 className="text-lg font-semibold text-white flex-1">
                      Question {index + 1}: {question.questionText}
                    </h4>
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      isCorrect ? 'bg-accent/20 text-accent' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {isCorrect ? '✓ Correct' : '✗ Wrong'}
                    </span>
                  </div>
                  
                  {question.questionType === 'fill-in-blank' ? (
                    <div className="space-y-2">
                      <p className="text-gray-400 text-sm">Your Answer: <span className="text-white">{userAnswer as string}</span></p>
                      <p className="text-accent text-sm">Correct Answer: <span className="font-semibold">{question.correctAnswer as string}</span></p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {question.answerChoices.map((choice, idx) => {
                        const isUserAnswer = userAnswer === idx;
                        const isCorrectAnswer = question.correctAnswer === idx;
                        return (
                          <div key={idx} className={`p-3 rounded-lg border-2 ${
                            isCorrectAnswer ? 'bg-accent/10 border-accent' :
                            isUserAnswer ? 'bg-red-500/10 border-red-500' :
                            'bg-gray-900 border-gray-700'
                          }`}>
                            <span className="text-white">{String.fromCharCode(65 + idx)}. {choice}</span>
                            {isCorrectAnswer && <span className="ml-2 text-accent">✓</span>}
                            {isUserAnswer && !isCorrectAnswer && <span className="ml-2 text-red-400">✗</span>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Quiz Taking View
  return (
    <div className="min-h-screen bg-background">
      {/* Top Bar */}
      <div className="bg-gray-900/95 backdrop-blur-sm border-b border-gray-800 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            {/* Quiz Title */}
            <h1 className="text-lg md:text-xl font-bold text-white truncate">{quiz.title}</h1>
            
            {/* Progress & Timer */}
            <div className="flex items-center gap-4">
              <div className="text-gray-300 text-sm md:text-base font-medium">
                Question {currentQuestionIndex + 1} of {questions.length}
              </div>
              {!submitted && !alreadyCompleted && (
                <div className={`px-4 py-2 rounded-lg font-bold text-sm md:text-base ${
                  timeRemaining < 300 ? 'bg-red-500/20 text-red-400' : 'bg-primary/20 text-primary'
                }`}>
                  ⏱️ {formatTime(timeRemaining)}
                </div>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4 h-2 bg-gray-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Question Area */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 md:py-12">
        {alreadyCompleted && (
          <div className="mb-6 p-4 bg-blue-500/20 border-2 border-blue-500 rounded-xl">
            <p className="text-blue-200 text-center font-semibold">
              ✓ You have already completed this quiz. Reviewing your submission.
            </p>
          </div>
        )}

        {currentQuestion && (
          <div className="space-y-8">
            {/* Question Card */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 md:p-10 border border-gray-700 shadow-2xl">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
                  {currentQuestionIndex + 1}
                </div>
                <div className="flex-1">
                  <span className="text-xs font-semibold text-secondary uppercase tracking-wider">
                    {currentQuestion.questionType === 'fill-in-blank' ? 'Fill in the Blank' :
                     currentQuestion.questionType === 'true-false' ? 'True or False' :
                     'Multiple Choice'}
                  </span>
                  <h2 className="text-2xl md:text-3xl font-bold text-white mt-2 leading-relaxed">
                    {currentQuestion.questionText}
                  </h2>
                </div>
              </div>

              {/* Answer Options */}
              <div className="space-y-3 md:space-y-4">
                {currentQuestion.questionType === 'fill-in-blank' ? (
                  <input
                    type="text"
                    value={(userAnswers[currentQuestion._id] as string) || ''}
                    onChange={(e) => setUserAnswers({ ...userAnswers, [currentQuestion._id]: e.target.value })}
                    disabled={submitted || alreadyCompleted}
                    placeholder="Type your answer here..."
                    className="w-full px-6 py-4 bg-gray-900 border-2 border-gray-700 rounded-xl text-white text-lg placeholder-gray-500 focus:border-primary focus:outline-none transition-colors disabled:opacity-50"
                  />
                ) : (
                  currentQuestion.answerChoices.map((choice, idx) => {
                    const isSelected = userAnswers[currentQuestion._id] === idx;
                    return (
                      <button
                        key={idx}
                        onClick={() => !submitted && !alreadyCompleted && setUserAnswers({ ...userAnswers, [currentQuestion._id]: idx })}
                        disabled={submitted || alreadyCompleted}
                        className={`w-full text-left p-4 md:p-6 rounded-xl border-2 transition-all duration-200 ${
                          isSelected
                            ? 'bg-primary/20 border-primary text-white shadow-lg scale-[1.02]'
                            : 'bg-gray-900 border-gray-700 text-gray-300 hover:border-gray-600 hover:bg-gray-800'
                        } ${submitted || alreadyCompleted ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg ${
                            isSelected ? 'bg-primary text-white' : 'bg-gray-800 text-gray-400'
                          }`}>
                            {String.fromCharCode(65 + idx)}
                          </div>
                          <span className="text-base md:text-lg flex-1">{choice}</span>
                          {isSelected && <span className="text-2xl">✓</span>}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Navigation Buttons */}
            {!submitted && !alreadyCompleted && (
              <div className="flex items-center justify-between gap-4">
                <button
                  onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                  disabled={currentQuestionIndex === 0}
                  className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  ← Previous
                </button>

                <button
                  onClick={onBack}
                  className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl font-medium transition-colors"
                >
                  Quit
                </button>

                {isLastQuestion ? (
                  <button
                    onClick={() => setShowConfirmSubmit(true)}
                    disabled={Object.keys(userAnswers).length !== questions.length}
                    className="px-8 py-3 bg-accent hover:bg-accent/90 text-white rounded-xl font-bold text-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Submit Quiz →
                  </button>
                ) : (
                  <button
                    onClick={() => setCurrentQuestionIndex(prev => Math.min(questions.length - 1, prev + 1))}
                    className="px-8 py-3 bg-accent hover:bg-accent/90 text-white rounded-xl font-bold shadow-lg transition-all"
                  >
                    Next →
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Confirm Submit Modal */}
      {showConfirmSubmit && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl p-8 max-w-md w-full border border-gray-700 shadow-2xl">
            <div className="text-center">
              <div className="text-5xl mb-4">🎯</div>
              <h3 className="text-2xl font-bold text-white mb-4">Submit Quiz?</h3>
              <p className="text-gray-300 mb-6">
                You have answered {Object.keys(userAnswers).length} out of {questions.length} questions.
                {Object.keys(userAnswers).length < questions.length && (
                  <span className="block mt-2 text-yellow-400">
                    ⚠️ Some questions are unanswered!
                  </span>
                )}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmSubmit(false)}
                  className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  className="flex-1 px-6 py-3 bg-accent hover:bg-accent/90 text-white rounded-xl font-bold transition-colors"
                >
                  Submit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuizTaker;
