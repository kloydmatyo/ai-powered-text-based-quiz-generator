'use client';

import React, { useState, useEffect } from 'react';
import Modal from './Modal';

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
  deadline?: string;
  timeLimit?: number;
}

interface QuizTakerProps {
  quiz: Quiz;
  onBack: () => void;
}

const QuizTaker: React.FC<QuizTakerProps> = ({ quiz, onBack }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(() => {
    // Try to restore current question index from localStorage
    const indexKey = `quiz_index_${quiz._id}`;
    const savedIndex = localStorage.getItem(indexKey);
    if (savedIndex) {
      const index = parseInt(savedIndex, 10);
      console.log('📍 Restored question index:', index);
      return index;
    }
    return 0;
  });
  const [userAnswers, setUserAnswers] = useState<{ [key: string]: number | string }>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [alreadyCompleted, setAlreadyCompleted] = useState(false);
  const [previousSubmission, setPreviousSubmission] = useState<any>(null);
  const [timeRemaining, setTimeRemaining] = useState(() => {
    // Try to restore timer from localStorage
    const timerKey = `quiz_timer_${quiz._id}`;
    const savedTimer = localStorage.getItem(timerKey);
    if (savedTimer) {
      const { timeRemaining: savedTime, timestamp } = JSON.parse(savedTimer);
      const elapsed = Math.floor((Date.now() - timestamp) / 1000);
      const remaining = Math.max(0, savedTime - elapsed);
      console.log('⏱️ Restored timer:', remaining, 'seconds remaining');
      return remaining;
    }
    return (quiz.timeLimit || 30) * 60; // Convert minutes to seconds
  });
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [showConfirmNext, setShowConfirmNext] = useState(false);
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  });

  const showModal = (title: string, message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    setModalConfig({
      isOpen: true,
      title,
      message,
      type
    });
  };

  const closeModal = () => {
    setModalConfig(prev => ({ ...prev, isOpen: false }));
  };

  useEffect(() => {
    // Check previous submission first
    checkPreviousSubmission();
    
    // Check if quiz deadline has passed (but still allow viewing results)
    if (quiz.deadline) {
      const deadline = new Date(quiz.deadline);
      const now = new Date();
      if (now > deadline && !alreadyCompleted) {
        // Only show warning if they haven't submitted yet
        showModal('Quiz Unavailable', 'The deadline for this quiz has passed. You can no longer submit answers.', 'warning');
        setAlreadyCompleted(true);
      }
    }
  }, [quiz._id]);

  useEffect(() => {
    // Auto-save progress to localStorage
    if (!submitted && !alreadyCompleted && Object.keys(userAnswers).length > 0) {
      const progressKey = `quiz_progress_${quiz._id}`;
      localStorage.setItem(progressKey, JSON.stringify(userAnswers));
      console.log('💾 Progress auto-saved');
    }
  }, [userAnswers, submitted, alreadyCompleted, quiz._id]);

  useEffect(() => {
    // Auto-save current question index to localStorage
    if (!submitted && !alreadyCompleted) {
      const indexKey = `quiz_index_${quiz._id}`;
      localStorage.setItem(indexKey, currentQuestionIndex.toString());
    }
  }, [currentQuestionIndex, submitted, alreadyCompleted, quiz._id]);

  // Timer countdown with persistence
  useEffect(() => {
    if (!submitted && !alreadyCompleted && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          const newTime = prev - 1;
          
          // Save timer to localStorage
          const timerKey = `quiz_timer_${quiz._id}`;
          localStorage.setItem(timerKey, JSON.stringify({
            timeRemaining: newTime,
            timestamp: Date.now()
          }));
          
          if (newTime <= 0) {
            // Auto-submit when timer runs out - submits whatever answers exist
            console.log('⏰ Timer expired - Auto-submitting quiz with answered questions...');
            submitQuizToServer(true);
            return 0;
          }
          return newTime;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [submitted, alreadyCompleted, timeRemaining, userAnswers, questions]);

  // Clear timer and index from localStorage when quiz is submitted
  useEffect(() => {
    if (submitted || alreadyCompleted) {
      const timerKey = `quiz_timer_${quiz._id}`;
      const indexKey = `quiz_index_${quiz._id}`;
      localStorage.removeItem(timerKey);
      localStorage.removeItem(indexKey);
      console.log('🗑️ Cleared saved timer and question index');
    }
  }, [submitted, alreadyCompleted, quiz._id]);

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
          questionType: q.questionType, // IMPORTANT: Include question type!
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

  const handleNextQuestion = () => {
    const currentAnswer = userAnswers[currentQuestion._id];
    const hasAnswer = currentAnswer !== undefined && 
                      currentAnswer !== null && 
                      !(typeof currentAnswer === 'string' && currentAnswer.trim() === '');
    
    if (!hasAnswer) {
      setShowConfirmNext(true);
    } else {
      setCurrentQuestionIndex(prev => Math.min(questions.length - 1, prev + 1));
    }
  };

  const getUnansweredQuestions = () => {
    return questions.filter(q => {
      const answer = userAnswers[q._id];
      return answer === undefined || answer === null || (typeof answer === 'string' && answer.trim() === '');
    });
  };

  const handleSubmitClick = () => {
    const unansweredQuestions = getUnansweredQuestions();
    
    if (unansweredQuestions.length > 0) {
      // Show confirmation modal with skipped questions info
      setShowConfirmSubmit(true);
    } else {
      // All questions answered, show regular confirmation
      setShowConfirmSubmit(true);
    }
  };

  const submitQuizToServer = async (isAutoSubmit = false) => {
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
        
        // Clear saved progress, timer, and index
        const progressKey = `quiz_progress_${quiz._id}`;
        const timerKey = `quiz_timer_${quiz._id}`;
        const indexKey = `quiz_index_${quiz._id}`;
        localStorage.removeItem(progressKey);
        localStorage.removeItem(timerKey);
        localStorage.removeItem(indexKey);
        console.log('🗑️ Cleared saved progress, timer, and index');
        
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

        if (isAutoSubmit) {
          const answeredCount = Object.keys(userAnswers).length;
          const totalCount = questions.length;
          showModal(
            'Time\'s Up!', 
            `The quiz time has expired. Your quiz has been automatically submitted with ${answeredCount} out of ${totalCount} questions answered.`, 
            'warning'
          );
        }
      } else {
        showModal('Error', 'Failed to submit quiz. Please try again.', 'error');
      }
    } catch (error) {
      console.error('Error submitting quiz:', error);
      showModal('Error', 'An error occurred while submitting the quiz.', 'error');
    }
  };

  const handleSubmit = async () => {
    const unansweredQuestions = getUnansweredQuestions();

    if (unansweredQuestions.length > 0) {
      showModal('Incomplete Quiz', 'Please answer all questions before submitting.', 'warning');
      return;
    }

    await submitQuizToServer(false);
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
  
  // Check if all questions have valid answers
  const allQuestionsAnswered = questions.every(q => {
    const answer = userAnswers[q._id];
    return answer !== undefined && answer !== null && !(typeof answer === 'string' && answer.trim() === '');
  });

  // <View></View>
  if (submitted && showResults) {
    const correctAnswers = questions.filter((q) => {
      const userAnswer = userAnswers[q._id];
      return q.questionType === 'fill-in-blank' 
        ? userAnswer === q.correctAnswer
        : userAnswer === q.correctAnswer;
    }).length;
    const totalQuestions = questions.length;
    const percentage = score || 0;

    return (
      <div className="min-h-screen" style={{ backgroundColor: '#0F172A' }}>
        {/* Modern Top Bar */}
        <div 
          className="border-b-2 backdrop-blur-xl sticky top-0 z-50"
          style={{
            background: 'rgba(15, 23, 42, 0.95)',
            borderColor: 'rgba(79, 70, 229, 0.3)',
            boxShadow: '0 4px 24px rgba(0, 0, 0, 0.2)'
          }}
        >
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, #4F46E5 0%, #8B5CF6 100%)',
                    boxShadow: '0 4px 12px rgba(79, 70, 229, 0.4)'
                  }}
                >
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h1 className="text-xl md:text-2xl font-bold text-white">{quiz.title}</h1>
              </div>
              <button 
                onClick={onBack} 
                className="px-4 py-2 rounded-xl font-semibold transition-all duration-200 hover:scale-105 flex items-center gap-2"
                style={{
                  backgroundColor: 'rgba(139, 92, 246, 0.2)',
                  border: '2px solid rgba(139, 92, 246, 0.3)',
                  color: '#A78BFA'
                }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back
              </button>
            </div>
          </div>
        </div>

        {/* Results Content */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 md:py-12">
          {/* Hero Score Card */}
          <div 
            className="rounded-3xl p-8 md:p-12 text-center mb-12 border-2 relative overflow-hidden"
            style={{
              background: percentage >= 80 
                ? 'linear-gradient(135deg, rgba(52, 211, 153, 0.2) 0%, rgba(16, 185, 129, 0.2) 100%)'
                : percentage >= 60
                  ? 'linear-gradient(135deg, rgba(79, 70, 229, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)'
                  : 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(220, 38, 38, 0.2) 100%)',
              borderColor: percentage >= 80 ? 'rgba(52, 211, 153, 0.4)' : percentage >= 60 ? 'rgba(79, 70, 229, 0.4)' : 'rgba(239, 68, 68, 0.4)',
              boxShadow: percentage >= 80 
                ? '0 20px 50px rgba(52, 211, 153, 0.3)'
                : percentage >= 60
                  ? '0 20px 50px rgba(79, 70, 229, 0.3)'
                  : '0 20px 50px rgba(239, 68, 68, 0.3)'
            }}
          >
            <div className="relative z-10">
              <div className="text-7xl md:text-8xl mb-6">
                {percentage >= 80 ? '🎉' : percentage >= 60 ? '👏' : '📚'}
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
                {percentage >= 80 ? 'Outstanding!' : percentage >= 60 ? 'Well Done!' : 'Keep Learning!'}
              </h2>
              <div className="flex items-center justify-center gap-4 mb-6">
                <div 
                  className="text-6xl md:text-7xl font-black"
                  style={{
                    background: percentage >= 80 
                      ? 'linear-gradient(135deg, #34D399 0%, #10B981 100%)'
                      : percentage >= 60
                        ? 'linear-gradient(135deg, #4F46E5 0%, #8B5CF6 100%)'
                        : 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                  }}
                >
                  {percentage}%
                </div>
              </div>
              <p className="text-xl text-gray-300 mb-8">
                You answered <span className="font-bold text-white">{correctAnswers}</span> out of <span className="font-bold text-white">{totalQuestions}</span> questions correctly
              </p>
              
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
                <div 
                  className="rounded-2xl p-6 border-2"
                  style={{
                    backgroundColor: 'rgba(15, 23, 42, 0.6)',
                    borderColor: 'rgba(52, 211, 153, 0.3)'
                  }}
                >
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <svg className="w-6 h-6 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-3xl font-bold text-white">{correctAnswers}</span>
                  </div>
                  <p className="text-sm text-gray-400 font-semibold">Correct</p>
                </div>
                
                <div 
                  className="rounded-2xl p-6 border-2"
                  style={{
                    backgroundColor: 'rgba(15, 23, 42, 0.6)',
                    borderColor: 'rgba(239, 68, 68, 0.3)'
                  }}
                >
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <svg className="w-6 h-6 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <span className="text-3xl font-bold text-white">{totalQuestions - correctAnswers}</span>
                  </div>
                  <p className="text-sm text-gray-400 font-semibold">Incorrect</p>
                </div>
                
                <div 
                  className="rounded-2xl p-6 border-2"
                  style={{
                    backgroundColor: 'rgba(15, 23, 42, 0.6)',
                    borderColor: 'rgba(79, 70, 229, 0.3)'
                  }}
                >
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <svg className="w-6 h-6 text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                      <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                    </svg>
                    <span className="text-3xl font-bold text-white">{totalQuestions}</span>
                  </div>
                  <p className="text-sm text-gray-400 font-semibold">Total</p>
                </div>
              </div>
            </div>
          </div>

          {/* Review Section Header */}
          <div className="flex items-center gap-4 mb-8">
            <div 
              className="w-14 h-14 rounded-xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)',
                boxShadow: '0 4px 12px rgba(139, 92, 246, 0.4)'
              }}
            >
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <div>
              <h3 className="text-3xl font-bold text-white">Review Your Answers</h3>
              <p className="text-gray-400">See what you got right and where you can improve</p>
            </div>
          </div>

          {/* Questions Review */}
          <div className="space-y-6">
            {questions.map((question, index) => {
              const userAnswer = userAnswers[question._id];
              const isCorrect = question.questionType === 'fill-in-blank' 
                ? userAnswer === question.correctAnswer
                : userAnswer === question.correctAnswer;
              
              return (
                <div 
                  key={question._id} 
                  className="rounded-2xl p-6 md:p-8 border-2 transition-all duration-300 hover:scale-[1.01]"
                  style={{
                    background: 'rgba(15, 23, 42, 0.6)',
                    borderColor: isCorrect ? 'rgba(52, 211, 153, 0.4)' : 'rgba(239, 68, 68, 0.4)',
                    boxShadow: isCorrect 
                      ? '0 8px 24px rgba(52, 211, 153, 0.2)'
                      : '0 8px 24px rgba(239, 68, 68, 0.2)'
                  }}
                >
                  <div className="flex items-start gap-4 mb-6">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg flex-shrink-0"
                      style={{
                        backgroundColor: isCorrect ? 'rgba(52, 211, 153, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                        color: isCorrect ? '#34D399' : '#F87171'
                      }}
                    >
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <h4 className="text-xl font-bold text-white mb-2">
                        {question.questionText}
                      </h4>
                      <span 
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold"
                        style={{
                          backgroundColor: isCorrect ? 'rgba(52, 211, 153, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                          color: isCorrect ? '#34D399' : '#F87171'
                        }}
                      >
                        {isCorrect ? (
                          <>
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            Correct
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                            Incorrect
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                  
                  {question.questionType === 'fill-in-blank' ? (
                    <div className="space-y-4 ml-16">
                      <div 
                        className="p-4 rounded-xl border-2"
                        style={{
                          backgroundColor: 'rgba(30, 41, 59, 0.5)',
                          borderColor: 'rgba(79, 70, 229, 0.3)'
                        }}
                      >
                        <p className="text-sm text-gray-400 mb-1">Your Answer:</p>
                        <p className="text-lg font-semibold text-white">{userAnswer as string || '(No answer)'}</p>
                      </div>
                      <div 
                        className="p-4 rounded-xl border-2"
                        style={{
                          backgroundColor: 'rgba(52, 211, 153, 0.1)',
                          borderColor: 'rgba(52, 211, 153, 0.4)'
                        }}
                      >
                        <p className="text-sm text-emerald-400 mb-1">Correct Answer:</p>
                        <p className="text-lg font-bold text-white">{question.correctAnswer as string}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 ml-16">
                      {question.answerChoices.map((choice, idx) => {
                        const isUserAnswer = userAnswer === idx;
                        const isCorrectAnswer = question.correctAnswer === idx;
                        
                        return (
                          <div 
                            key={idx} 
                            className="p-4 rounded-xl border-2 transition-all duration-200"
                            style={{
                              backgroundColor: isCorrectAnswer 
                                ? 'rgba(52, 211, 153, 0.1)'
                                : isUserAnswer 
                                  ? 'rgba(239, 68, 68, 0.1)'
                                  : 'rgba(30, 41, 59, 0.5)',
                              borderColor: isCorrectAnswer 
                                ? 'rgba(52, 211, 153, 0.4)'
                                : isUserAnswer 
                                  ? 'rgba(239, 68, 68, 0.4)'
                                  : 'rgba(79, 70, 229, 0.2)'
                            }}
                          >
                            <div className="flex items-center gap-3">
                              <span 
                                className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm"
                                style={{
                                  backgroundColor: isCorrectAnswer 
                                    ? 'rgba(52, 211, 153, 0.3)'
                                    : isUserAnswer 
                                      ? 'rgba(239, 68, 68, 0.3)'
                                      : 'rgba(79, 70, 229, 0.2)',
                                  color: isCorrectAnswer 
                                    ? '#34D399'
                                    : isUserAnswer 
                                      ? '#F87171'
                                      : '#6B7280'
                                }}
                              >
                                {String.fromCharCode(65 + idx)}
                              </span>
                              <span className={`flex-1 ${isCorrectAnswer || isUserAnswer ? 'text-white font-semibold' : 'text-gray-400'}`}>
                                {choice}
                              </span>
                              {isCorrectAnswer && (
                                <svg className="w-6 h-6 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                              )}
                              {isUserAnswer && !isCorrectAnswer && (
                                <svg className="w-6 h-6 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
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
    <div className="min-h-screen" style={{ backgroundColor: '#0F172A' }}>
      {/* Modern Top Bar */}
      <div 
        className="border-b-2 backdrop-blur-xl sticky top-0 z-50"
        style={{
          background: 'rgba(15, 23, 42, 0.95)',
          borderColor: 'rgba(79, 70, 229, 0.3)',
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.2)'
        }}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
            {/* Quiz Title */}
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition-all duration-200 hover:scale-105"
                style={{
                  color: '#A5B4FC',
                  backgroundColor: 'rgba(79, 70, 229, 0.2)',
                  border: '2px solid rgba(79, 70, 229, 0.3)'
                }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back
              </button>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-white">{quiz.title}</h1>
                {quiz.deadline && (
                  <p className="text-sm text-gray-400 mt-1">
                    Deadline: {new Date(quiz.deadline).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
            
            {/* Progress & Timer */}
            <div className="flex items-center gap-3">
              <div 
                className="px-4 py-2 rounded-xl font-semibold text-sm md:text-base"
                style={{
                  backgroundColor: 'rgba(139, 92, 246, 0.2)',
                  border: '2px solid rgba(139, 92, 246, 0.3)',
                  color: '#A78BFA'
                }}
              >
                {currentQuestionIndex + 1} / {questions.length}
              </div>
              {!submitted && !alreadyCompleted && (
                <div 
                  className={`px-4 py-2 rounded-xl font-bold text-sm md:text-base flex items-center gap-2 ${timeRemaining <= 60 ? 'animate-pulse' : ''}`}
                  style={{
                    backgroundColor: timeRemaining < 300 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(79, 70, 229, 0.2)',
                    border: timeRemaining < 300 ? '2px solid rgba(239, 68, 68, 0.4)' : '2px solid rgba(79, 70, 229, 0.3)',
                    color: timeRemaining < 300 ? '#F87171' : '#A5B4FC'
                  }}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {formatTime(timeRemaining)}
                  {timeRemaining <= 60 && timeRemaining > 0 && (
                    <span className="text-xs ml-1">(Time’s almost up—auto-submit in…)</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Modern Progress Bar */}
          <div 
            className="h-3 rounded-full overflow-hidden"
            style={{ backgroundColor: 'rgba(30, 41, 59, 0.5)' }}
          >
            <div 
              className="h-full transition-all duration-500 ease-out"
              style={{ 
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #4F46E5 0%, #8B5CF6 50%, #34D399 100%)'
              }}
            />
          </div>
        </div>
      </div>

      {/* Main Question Area */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 md:py-12">
        {alreadyCompleted && (
          <div 
            className="mb-8 p-6 rounded-2xl border-2"
            style={{
              backgroundColor: 'rgba(79, 70, 229, 0.1)',
              borderColor: 'rgba(79, 70, 229, 0.4)',
              boxShadow: '0 8px 24px rgba(79, 70, 229, 0.2)'
            }}
          >
            <div className="flex items-center gap-3 justify-center">
              <svg className="w-6 h-6 text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>l
              <p className="text-indigo-200 text-center font-semibold text-lg">
                You have already completed this quiz. Reviewing your submission.
              </p>
            </div>
          </div>
        )}

        {currentQuestion && (
          <div className="space-y-8">
            {/* Modern Question Card */}
            <div 
              className="rounded-3xl p-8 md:p-12 border-2"
              style={{
                background: 'rgba(15, 23, 42, 0.6)',
                borderColor: 'rgba(79, 70, 229, 0.3)',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)'
              }}
            >
              <div className="flex items-start gap-6 mb-8">
                <div 
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-2xl flex-shrink-0"
                  style={{
                    background: 'linear-gradient(135deg, #4F46E5 0%, #8B5CF6 100%)',
                    boxShadow: '0 8px 24px rgba(79, 70, 229, 0.3)'
                  }}
                >
                  {currentQuestionIndex + 1}
                </div>
                <div className="flex-1">
                  <span 
                    className="inline-block text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-lg mb-3"
                    style={{
                      backgroundColor: currentQuestion.questionType === 'fill-in-blank' ? 'rgba(52, 211, 153, 0.2)' :
                                      currentQuestion.questionType === 'true-false' ? 'rgba(139, 92, 246, 0.2)' :
                                      'rgba(79, 70, 229, 0.2)',
                      color: currentQuestion.questionType === 'fill-in-blank' ? '#34D399' :
                             currentQuestion.questionType === 'true-false' ? '#A78BFA' :
                             '#A5B4FC'
                    }}
                  >
                    {currentQuestion.questionType === 'fill-in-blank' ? 'Fill in the Blank' :
                     currentQuestion.questionType === 'true-false' ? 'True or False' :
                     'Multiple Choice'}
                  </span>
                  <h2 className="text-2xl md:text-4xl font-bold text-white leading-relaxed">
                    {currentQuestion.questionText}
                  </h2>
                </div>
              </div>

              {/* Answer Options */}
              <div className="space-y-4">
                {currentQuestion.questionType === 'fill-in-blank' ? (
                  <div className="space-y-4">
                    <input
                      type="text"
                      value={(userAnswers[currentQuestion._id] as string) || ''}
                      onChange={(e) => setUserAnswers({ ...userAnswers, [currentQuestion._id]: e.target.value })}
                      disabled={submitted || alreadyCompleted}
                      placeholder="Type your answer here..."
                      className="w-full px-6 py-5 rounded-2xl text-white text-lg placeholder-gray-500 focus:outline-none transition-all duration-200 disabled:opacity-50"
                      style={{
                        backgroundColor: 'rgba(30, 41, 59, 0.5)',
                        borderWidth: '2px',
                        borderStyle: 'solid',
                        borderColor: 'rgba(79, 70, 229, 0.3)',
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#4F46E5';
                        e.target.style.boxShadow = '0 0 0 4px rgba(79, 70, 229, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = 'rgba(79, 70, 229, 0.3)';
                        e.target.style.boxShadow = 'none';
                      }}
                      autoFocus
                    />
                    {userAnswers[currentQuestion._id] && (userAnswers[currentQuestion._id] as string).trim() !== '' && (
                      <div 
                        className="flex items-center gap-2 px-4 py-3 rounded-xl"
                        style={{
                          backgroundColor: 'rgba(52, 211, 153, 0.1)',
                          border: '2px solid rgba(52, 211, 153, 0.3)'
                        }}
                      >
                        <svg className="w-5 h-5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-emerald-300 font-medium">Answer entered ({(userAnswers[currentQuestion._id] as string).length} characters)</span>
                      </div>
                    )}
                    {!submitted && !alreadyCompleted && (
                      <p className="text-gray-400 text-sm flex items-center gap-2">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        Type your answer and click "Next" to continue
                      </p>
                    )}
                  </div>
                ) : (
                  currentQuestion.answerChoices.map((choice, idx) => {
                    const isSelected = userAnswers[currentQuestion._id] === idx;
                    return (
                      <button
                        key={idx}
                        onClick={() => !submitted && !alreadyCompleted && setUserAnswers({ ...userAnswers, [currentQuestion._id]: idx })}
                        disabled={submitted || alreadyCompleted}
                        className="w-full text-left p-6 rounded-2xl border-2 transition-all duration-200 disabled:cursor-not-allowed"
                        style={{
                          backgroundColor: isSelected ? 'rgba(79, 70, 229, 0.2)' : 'rgba(30, 41, 59, 0.5)',
                          borderColor: isSelected ? '#4F46E5' : 'rgba(79, 70, 229, 0.2)',
                          transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                          boxShadow: isSelected ? '0 8px 24px rgba(79, 70, 229, 0.3)' : 'none'
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected && !submitted && !alreadyCompleted) {
                            e.currentTarget.style.borderColor = 'rgba(79, 70, 229, 0.4)';
                            e.currentTarget.style.backgroundColor = 'rgba(30, 41, 59, 0.7)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.borderColor = 'rgba(79, 70, 229, 0.2)';
                            e.currentTarget.style.backgroundColor = 'rgba(30, 41, 59, 0.5)';
                          }
                        }}
                      >
                        <div className="flex items-center gap-4">
                          <div 
                            className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg flex-shrink-0"
                            style={{
                              backgroundColor: isSelected ? 'rgba(79, 70, 229, 0.3)' : 'rgba(79, 70, 229, 0.1)',
                              color: isSelected ? '#A5B4FC' : '#6B7280'
                            }}
                          >
                            {String.fromCharCode(65 + idx)}
                          </div>
                          <span className={`text-lg ${isSelected ? 'text-white font-semibold' : 'text-gray-300'}`}>
                            {choice}
                          </span>
                          {isSelected && (
                            <svg className="w-6 h-6 text-indigo-400 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Navigation Buttons */}
              <div className="flex gap-4 mt-8">
                {currentQuestionIndex > 0 && (
                  <button
                    onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                    disabled={submitted || alreadyCompleted}
                    className="px-6 py-3 rounded-xl font-semibold transition-all duration-200 hover:scale-105 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      backgroundColor: 'rgba(139, 92, 246, 0.2)',
                      border: '2px solid rgba(139, 92, 246, 0.3)',
                      color: '#A78BFA'
                    }}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Previous
                  </button>
                )}
                
                {currentQuestionIndex < questions.length - 1 ? (
                  <button
                    onClick={handleNextQuestion}
                    disabled={submitted || alreadyCompleted}
                    className="flex-1 px-6 py-3 rounded-xl font-semibold text-white transition-all duration-200 hover:scale-105 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      background: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)',
                      boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)'
                    }}
                  >
                    Next
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ) : (
                  <button
                    onClick={handleSubmitClick}
                    disabled={submitted || alreadyCompleted}
                    className="flex-1 px-6 py-3 rounded-xl font-semibold text-white transition-all duration-200 hover:scale-105 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      background: 'linear-gradient(135deg, #34D399 0%, #10B981 100%)',
                      boxShadow: '0 4px 12px rgba(52, 211, 153, 0.3)'
                    }}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Submit Quiz
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Confirm Next Modal (Unanswered Question) */}
      {showConfirmNext && (
        <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div 
            className="rounded-3xl p-8 max-w-md w-full border-2 shadow-2xl"
            style={{
              background: 'rgba(15, 23, 42, 0.95)',
              borderColor: 'rgba(251, 191, 36, 0.4)',
              boxShadow: '0 25px 50px rgba(251, 191, 36, 0.2)'
            }}
          >
            <div className="flex items-center gap-4 mb-6">
              <div 
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)'
                }}
              >
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white">Question Not Answered</h3>
            </div>
            
            <p className="text-gray-300 mb-6 leading-relaxed">
              You haven't answered this question yet. Are you sure you want to skip it and move to the next question?
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmNext(false)}
                className="flex-1 px-6 py-3 rounded-xl font-semibold transition-all duration-200 hover:scale-105"
                style={{
                  backgroundColor: 'rgba(139, 92, 246, 0.2)',
                  border: '2px solid rgba(139, 92, 246, 0.3)',
                  color: '#A78BFA'
                }}
              >
                Stay Here
              </button>
              <button
                onClick={() => {
                  setShowConfirmNext(false);
                  setCurrentQuestionIndex(prev => Math.min(questions.length - 1, prev + 1));
                }}
                className="flex-1 px-6 py-3 rounded-xl font-semibold text-white transition-all duration-200 hover:scale-105"
                style={{
                  background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                  boxShadow: '0 4px 12px rgba(251, 191, 36, 0.3)'
                }}
              >
                Skip Question
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Submit Modal */}
      {showConfirmSubmit && (() => {
        const unansweredQuestions = getUnansweredQuestions();
        const hasSkipped = unansweredQuestions.length > 0;
        
        return (
          <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div 
              className="rounded-3xl p-8 max-w-md w-full border-2 shadow-2xl"
              style={{
                background: 'rgba(15, 23, 42, 0.95)',
                borderColor: hasSkipped ? 'rgba(251, 191, 36, 0.4)' : 'rgba(52, 211, 153, 0.4)',
                boxShadow: hasSkipped ? '0 25px 50px rgba(251, 191, 36, 0.2)' : '0 25px 50px rgba(52, 211, 153, 0.2)'
              }}
            >
              <div className="flex items-center gap-4 mb-6">
                <div 
                  className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{
                    background: hasSkipped 
                      ? 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)'
                      : 'linear-gradient(135deg, #34D399 0%, #10B981 100%)'
                  }}
                >
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {hasSkipped ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    )}
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white">
                  {hasSkipped ? 'Incomplete Quiz!' : 'Submit Quiz?'}
                </h3>
              </div>
              
              {hasSkipped ? (
                <div className="mb-6">
                  <div 
                    className="p-4 rounded-xl mb-4 border-2"
                    style={{
                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                      borderColor: 'rgba(239, 68, 68, 0.3)'
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <span className="text-red-300 font-bold">
                        {unansweredQuestions.length} {unansweredQuestions.length === 1 ? 'Question' : 'Questions'} Unanswered
                      </span>
                    </div>
                    <p className="text-sm text-gray-400">
                      Question {unansweredQuestions.map((q, idx) => 
                        questions.findIndex(qu => qu._id === q._id) + 1
                      ).join(', ')}
                    </p>
                  </div>
                  <p className="text-gray-300 leading-relaxed">
                    You have skipped {unansweredQuestions.length} {unansweredQuestions.length === 1 ? 'question' : 'questions'}. 
                    Unanswered questions will be marked as incorrect. Do you want to submit anyway?
                  </p>
                </div>
              ) : (
                <p className="text-gray-300 mb-6 leading-relaxed">
                  Are you sure you want to submit your quiz? You won't be able to change your answers after submission.
                </p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmSubmit(false)}
                  className="flex-1 px-6 py-3 rounded-xl font-semibold transition-all duration-200 hover:scale-105"
                  style={{
                    backgroundColor: 'rgba(139, 92, 246, 0.2)',
                    border: '2px solid rgba(139, 92, 246, 0.3)',
                    color: '#A78BFA'
                  }}
                >
                  {hasSkipped ? 'Review Quiz' : 'Cancel'}
                </button>
                <button
                  onClick={() => {
                    setShowConfirmSubmit(false);
                    handleSubmit();
                  }}
                  className="flex-1 px-6 py-3 rounded-xl font-semibold text-white transition-all duration-200 hover:scale-105"
                  style={{
                    background: hasSkipped 
                      ? 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)'
                      : 'linear-gradient(135deg, #34D399 0%, #10B981 100%)',
                    boxShadow: hasSkipped 
                      ? '0 4px 12px rgba(251, 191, 36, 0.3)'
                      : '0 4px 12px rgba(52, 211, 153, 0.3)'
                  }}
                >
                  Submit Anyway
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Global Modal */}
      <Modal
        isOpen={modalConfig.isOpen}
        onClose={closeModal}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
      />
    </div>
  );
};

export default QuizTaker;
