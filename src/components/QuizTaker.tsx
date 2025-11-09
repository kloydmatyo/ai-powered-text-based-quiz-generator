'use client';

import React, { useState, useEffect } from 'react';

interface Question {
  _id: string;
  questionText: string;
  answerChoices: string[];
  correctAnswer: number;
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
  const [userAnswers, setUserAnswers] = useState<{ [key: string]: number }>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [alreadyCompleted, setAlreadyCompleted] = useState(false);
  const [previousSubmission, setPreviousSubmission] = useState<any>(null);

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

  const handleAnswerSelect = (questionId: string, answerIndex: number) => {
    if (!submitted) {
      setUserAnswers({
        ...userAnswers,
        [questionId]: answerIndex
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
        <div className="text-white text-xl">Loading quiz...</div>
      </div>
    );
  }

  if (questions.length === 0 && !loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto py-8 px-4">
          <button
            onClick={onBack}
            className="mb-6 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md"
          >
            ← Back to Quizzes
          </button>
          <div className="bg-gray-800 rounded-lg p-8 text-center">
            <p className="text-gray-300 text-lg">This quiz has no questions yet.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-6 flex justify-between items-center">
          <button
            onClick={onBack}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md"
          >
            ← Back to Quizzes
          </button>
          {!submitted && (
            <div className="text-gray-300">
              Answered: {Object.keys(userAnswers).length} / {questions.length}
            </div>
          )}
        </div>

        {/* Quiz Title */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">{quiz.title}</h1>
          {quiz.description && (
            <p className="text-gray-300">{quiz.description}</p>
          )}
          
          {/* Already Completed Message */}
          {alreadyCompleted && previousSubmission && (
            <div className="mt-4 p-4 bg-blue-900 border-2 border-blue-500 rounded-lg">
              <p className="text-xl font-bold text-white mb-2">
                ✓ You have already completed this quiz
              </p>
              <p className="text-blue-200 text-sm">
                Submitted on: {new Date(previousSubmission.submittedAt).toLocaleString()}
              </p>
              <p className="text-blue-200 text-sm">
                You can review your answers below, but cannot retake this quiz.
              </p>
            </div>
          )}
          
          {/* Score Display */}
          {submitted && score !== null && (
            <div className="mt-4 p-4 bg-green-900 rounded-lg">
              <p className="text-2xl font-bold text-white">
                Score: {score}% ({Math.round((score / 100) * questions.length)} / {questions.length})
              </p>
            </div>
          )}
        </div>

        {/* Questions */}
        <div className="space-y-6">
          {questions.map((question, index) => (
            <div key={question._id} className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">
                Question {index + 1}: {question.questionText}
              </h3>
              <div className="space-y-3">
                {question.answerChoices.map((choice, choiceIndex) => {
                  const isSelected = userAnswers[question._id] === choiceIndex;
                  const isCorrect = showResults && (question as any).correctAnswer === choiceIndex;
                  const isWrong = showResults && isSelected && !isCorrect;

                  return (
                    <button
                      key={choiceIndex}
                      onClick={() => handleAnswerSelect(question._id, choiceIndex)}
                      disabled={submitted}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                        isCorrect && showResults
                          ? 'bg-green-900 border-green-500 text-white'
                          : isWrong
                          ? 'bg-red-900 border-red-500 text-white'
                          : isSelected
                          ? 'bg-indigo-900 border-indigo-500 text-white'
                          : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                      } ${submitted ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <div className="flex items-center">
                        <span className="font-semibold mr-3">
                          {String.fromCharCode(65 + choiceIndex)}.
                        </span>
                        <span>{choice}</span>
                        {showResults && isCorrect && (
                          <span className="ml-auto text-green-400">✓ Correct</span>
                        )}
                        {showResults && isWrong && (
                          <span className="ml-auto text-red-400">✗ Wrong</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Submit Button */}
        {!submitted && !alreadyCompleted && (
          <div className="mt-8 flex justify-center">
            <button
              onClick={handleSubmit}
              disabled={Object.keys(userAnswers).length !== questions.length}
              className={`px-8 py-3 rounded-lg font-semibold text-lg ${
                Object.keys(userAnswers).length === questions.length
                  ? 'bg-green-600 hover:bg-green-700 text-white cursor-pointer'
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
            >
              Submit Quiz
            </button>
          </div>
        )}

        {/* Results Message */}
        {submitted && !alreadyCompleted && (
          <div className="mt-8 bg-gray-800 rounded-lg p-6 text-center">
            <h2 className="text-2xl font-bold text-white mb-4">Quiz Completed!</h2>
            <p className="text-gray-300 mb-4">
              You scored {score}% on this quiz.
            </p>
            <p className="text-gray-400 text-sm mb-4">
              Your submission has been saved. You can review your answers above.
            </p>
            <button
              onClick={onBack}
              className="bg-primary hover:bg-indigo-700 text-white px-6 py-2 rounded-md"
            >
              Back to Quizzes
            </button>
          </div>
        )}
        
        {/* Already Completed - Review Mode */}
        {alreadyCompleted && previousSubmission && (
          <div className="mt-8 bg-gray-800 rounded-lg p-6 text-center">
            <h2 className="text-2xl font-bold text-white mb-4">Review Your Submission</h2>
            <p className="text-gray-300 mb-2">
              You completed this quiz on {new Date(previousSubmission.submittedAt).toLocaleDateString()}
            </p>
            <p className="text-gray-300 mb-4">
              Final Score: {score}%
            </p>
            <p className="text-gray-400 text-sm mb-4">
              You cannot retake this quiz. Review your answers above.
            </p>
            <button
              onClick={onBack}
              className="bg-primary hover:bg-indigo-700 text-white px-6 py-2 rounded-md"
            >
              Back to Quizzes
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuizTaker;
