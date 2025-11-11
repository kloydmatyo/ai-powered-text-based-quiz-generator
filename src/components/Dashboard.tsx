'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import QuestionManager from './QuestionManager';
import QuizTaker from './QuizTaker';

interface Quiz {
  _id: string;
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  userId?: {
    _id: string;
    username: string;
    email: string;
  };
}

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAICreateModal, setShowAICreateModal] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [viewingSubmissions, setViewingSubmissions] = useState<Quiz | null>(null);
  const [aiQuizData, setAiQuizData] = useState<{
    title: string;
    description: string;
    difficulty: 'easy' | 'moderate' | 'challenging';
    questionTypes: string[];
    numberOfQuestions: number;
    questions: any[];
    sourceText: string;
  } | null>(null);
  const [showAIPreview, setShowAIPreview] = useState(false);

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const fetchQuizzes = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/quizzes', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setQuizzes(data.quizzes);
      }
    } catch (error) {
      console.error('Error fetching quizzes:', error);
    } finally {
      setLoading(false);
    }
  };



  const updateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuiz) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/quizzes/${editingQuiz._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: editingQuiz.title,
          description: editingQuiz.description
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setQuizzes(quizzes.map(quiz => quiz._id === editingQuiz._id ? data.quiz : quiz));
        setEditingQuiz(null);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Update quiz failed:', response.status, errorData);
        alert(`Failed to update quiz: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error updating quiz:', error);
    }
  };

  const deleteQuiz = async (quizId: string) => {
    if (!confirm('Are you sure you want to delete this quiz?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/quizzes/${quizId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setQuizzes(quizzes.filter(quiz => quiz._id !== quizId));
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Delete quiz failed:', response.status, errorData);
        alert(`Failed to delete quiz: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting quiz:', error);
    }
  };

  const AIQuizCreationModal = () => {
    const [file, setFile] = useState<File | null>(null);
    const [text, setText] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [step, setStep] = useState<'upload' | 'processing' | 'preview'>('upload');
    const [difficulty, setDifficulty] = useState<'easy' | 'moderate' | 'challenging'>('moderate');
    const [selectedQuestionTypes, setSelectedQuestionTypes] = useState<string[]>(['multiple-choice']);
    const [numberOfQuestions, setNumberOfQuestions] = useState<number>(10);

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const uploadedFile = event.target.files?.[0];
      if (!uploadedFile) return;

      setFile(uploadedFile);
      setError('');

      // Validate file
      if (uploadedFile.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }

      // Process file using API
      setLoading(true);
      try {
        const formData = new FormData();
        formData.append('file', uploadedFile);

        const response = await fetch('/api/process-file', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to process file');
        }

        const result = await response.json();
        setText(result.text);
      } catch (err: any) {
        setError(err.message || 'Failed to process file. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    const generateQuiz = async () => {
      if (!text.trim()) {
        setError('No text content found. Please upload a valid file.');
        return;
      }

      if (selectedQuestionTypes.length === 0) {
        setError('Please select at least one question type.');
        return;
      }

      setStep('processing');
      setLoading(true);
      setError('');

      try {
        // Generate questions using AI with selected difficulty
        const response = await fetch('/api/analyze-text', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            text,
            difficulty 
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to generate quiz');
        }

        const result = await response.json();
        
        // Convert AI questions to quiz format based on selected types
        const questions = [];
        
        // Multiple choice questions
        if (selectedQuestionTypes.includes('multiple-choice')) {
          questions.push(...result.questions.multipleChoice.map((q: any) => ({
            questionText: q.question,
            questionType: 'multiple-choice',
            answerChoices: q.options,
            correctAnswer: q.correctAnswer
          })));
        }
        
        // True/False questions
        if (selectedQuestionTypes.includes('true-false')) {
          questions.push(...result.questions.trueFalse.map((q: any) => ({
            questionText: q.statement,
            questionType: 'true-false',
            answerChoices: ['True', 'False'],
            correctAnswer: q.answer ? 0 : 1
          })));
        }
        
        // Fill-in-the-blank questions
        if (selectedQuestionTypes.includes('fill-in-blank')) {
          questions.push(...result.questions.fillInTheBlank.map((q: any) => ({
            questionText: q.sentence,
            questionType: 'fill-in-blank',
            answerChoices: [],
            correctAnswer: q.answer
          })));
        }

        // Limit questions to the selected number
        const limitedQuestions = questions.slice(0, numberOfQuestions);

        setAiQuizData({
          title: file?.name.replace(/\.[^/.]+$/, '') || 'AI Generated Quiz',
          description: `Quiz automatically generated from ${file?.name || 'uploaded content'}`,
          difficulty,
          questionTypes: selectedQuestionTypes,
          numberOfQuestions,
          questions: limitedQuestions,
          sourceText: text
        });

        setStep('preview');
        setShowAIPreview(true);
        setShowAICreateModal(false);

      } catch (err: any) {
        setError(err.message || 'Failed to generate quiz. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Create AI-Generated Quiz</h3>
            <button
              onClick={() => {
                setShowAICreateModal(false);
                setFile(null);
                setText('');
                setError('');
                setStep('upload');
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {step === 'upload' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Text File
                </label>
                <input
                  type="file"
                  accept=".txt,.pdf,.docx"
                  onChange={handleFileUpload}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Supported: .txt, .pdf, .docx files (max 10MB)
                </p>
              </div>

              {text && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Preview Content
                    </label>
                    <textarea
                      value={text.substring(0, 200) + (text.length > 200 ? '...' : '')}
                      readOnly
                      className="w-full h-24 p-2 border border-gray-300 rounded text-sm bg-gray-50"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {text.length} characters, {text.split(/\s+/).length} words
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Difficulty Level
                    </label>
                    <div className="flex gap-2">
                      {(['easy', 'moderate', 'challenging'] as const).map((level) => (
                        <button
                          key={level}
                          type="button"
                          onClick={() => setDifficulty(level)}
                          className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-colors ${
                            difficulty === level
                              ? 'bg-purple-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {level.charAt(0).toUpperCase() + level.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Question Types
                    </label>
                    <div className="space-y-2">
                      {[
                        { value: 'multiple-choice', label: 'Multiple Choice Questions (MCQs)' },
                        { value: 'true-false', label: 'True or False' },
                        { value: 'fill-in-blank', label: 'Fill in the Blank' }
                      ].map((type) => (
                        <label key={type.value} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={selectedQuestionTypes.includes(type.value)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedQuestionTypes([...selectedQuestionTypes, type.value]);
                              } else {
                                setSelectedQuestionTypes(selectedQuestionTypes.filter(t => t !== type.value));
                              }
                            }}
                            className="mr-2 h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                          />
                          <span className="text-sm text-gray-700">{type.label}</span>
                        </label>
                      ))}
                    </div>
                    {selectedQuestionTypes.length === 0 && (
                      <p className="text-xs text-red-600 mt-1">
                        Please select at least one question type
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Number of Questions
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={numberOfQuestions}
                        onChange={(e) => setNumberOfQuestions(Math.max(1, Math.min(50, parseInt(e.target.value) || 10)))}
                        className="w-24 px-3 py-2 border border-gray-300 rounded text-sm focus:ring-purple-500 focus:border-purple-500"
                      />
                      <div className="flex gap-2">
                        {[5, 10, 20].map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => setNumberOfQuestions(num)}
                            className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-100"
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      AI will generate this many questions from your document
                    </p>
                  </div>
                </>
              )}

              {error && (
                <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
                  {error}
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  onClick={generateQuiz}
                  disabled={!text || loading}
                  className="flex-1 bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {loading ? 'Processing...' : 'Generate Quiz'}
                </button>
                <button
                  onClick={() => setShowAICreateModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {step === 'processing' && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <h4 className="text-lg font-medium mb-2">Generating Quiz...</h4>
              <p className="text-gray-600">AI is analyzing your content and creating questions</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const AIQuizPreview = () => {
    if (!aiQuizData) return null;

    const [editableQuiz, setEditableQuiz] = useState(aiQuizData);
    const [saving, setSaving] = useState(false);

    const saveQuiz = async () => {
      setSaving(true);
      try {
        const token = localStorage.getItem('token');
        
        // First create the quiz
        const quizResponse = await fetch('/api/quizzes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: editableQuiz.title,
            description: editableQuiz.description,
            difficulty: editableQuiz.difficulty,
            questionTypes: editableQuiz.questionTypes,
            numberOfQuestions: editableQuiz.numberOfQuestions
          }),
        });

        if (!quizResponse.ok) {
          throw new Error('Failed to create quiz');
        }

        const quizData = await quizResponse.json();
        const quizId = quizData.quiz._id;

        // Then add questions
        for (const question of editableQuiz.questions) {
          await fetch('/api/questions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              questionText: question.questionText,
              questionType: question.questionType,
              answerChoices: question.answerChoices,
              correctAnswer: question.correctAnswer,
              quizId
            }),
          });
        }

        // Refresh quiz list
        await fetchQuizzes();
        
        // Close preview
        setShowAIPreview(false);
        setAiQuizData(null);

      } catch (error) {
        console.error('Error saving quiz:', error);
        alert('Failed to save quiz. Please try again.');
      } finally {
        setSaving(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold">Quiz Preview</h3>
              <button
                onClick={() => {
                  setShowAIPreview(false);
                  setAiQuizData(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Quiz Details */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quiz Title</label>
                <input
                  type="text"
                  value={editableQuiz.title}
                  onChange={(e) => setEditableQuiz({...editableQuiz, title: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={editableQuiz.description}
                  onChange={(e) => setEditableQuiz({...editableQuiz, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  rows={2}
                />
              </div>
            </div>

            {/* Questions Preview */}
            <div>
              <h4 className="text-lg font-medium mb-4">Generated Questions ({editableQuiz.questions.length})</h4>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {editableQuiz.questions.map((question, index) => (
                  <div key={index} className="border border-gray-200 rounded p-4">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm font-medium text-purple-600 uppercase">
                        {(question.questionType || 'multiple-choice').replace('-', ' ')}
                      </span>
                      <span className="text-sm text-gray-500">Question {index + 1}</span>
                    </div>
                    <p className="font-medium mb-2">{question.questionText}</p>
                    
                    {question.questionType === 'fill-in-blank' ? (
                      <div className="text-sm p-2 rounded bg-green-100 text-green-800">
                        Answer: {question.correctAnswer}
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {question.answerChoices?.map((option: string, optIndex: number) => (
                          <div key={optIndex} className={`text-sm p-2 rounded ${optIndex === question.correctAnswer ? 'bg-green-100 text-green-800' : 'bg-gray-50'}`}>
                            {String.fromCharCode(65 + optIndex)}. {option}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-3 pt-4 border-t">
              <button
                onClick={saveQuiz}
                disabled={saving}
                className="bg-purple-600 text-white px-6 py-2 rounded hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Quiz'}
              </button>
              <button
                onClick={() => {
                  setShowAIPreview(false);
                  setAiQuizData(null);
                }}
                className="px-6 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const SubmissionsViewer = ({ quiz }: { quiz: Quiz }) => {
    const [submissions, setSubmissions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      fetchSubmissions();
    }, [quiz._id]);

    const fetchSubmissions = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/quiz-submissions?quizId=${quiz._id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setSubmissions(data.submissions);
        }
      } catch (error) {
        console.error('Error fetching submissions:', error);
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-6xl mx-auto py-8 px-4">
          <button
            onClick={() => setViewingSubmissions(null)}
            className="mb-6 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md"
          >
            ← Back to Quizzes
          </button>

          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h1 className="text-3xl font-bold text-white mb-2">{quiz.title}</h1>
            <p className="text-gray-300">Quiz Submissions</p>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="text-white text-xl">Loading submissions...</div>
            </div>
          ) : submissions.length === 0 ? (
            <div className="bg-gray-800 rounded-lg p-8 text-center">
              <p className="text-gray-300 text-lg">No submissions yet</p>
              <p className="text-gray-400 text-sm mt-2">Learners haven't taken this quiz yet</p>
            </div>
          ) : (
            <div className="bg-gray-800 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Learner
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Score
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Submitted
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {submissions.map((submission) => (
                    <tr key={submission._id} className="hover:bg-gray-750">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                        {submission.userId?.username || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {submission.userId?.email || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`font-semibold ${
                          submission.score >= 80 ? 'text-green-400' :
                          submission.score >= 60 ? 'text-yellow-400' :
                          'text-red-400'
                        }`}>
                          {submission.score}%
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {new Date(submission.submittedAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          submission.score >= 60 ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'
                        }`}>
                          {submission.score >= 60 ? 'Passed' : 'Failed'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (viewingSubmissions) {
    return <SubmissionsViewer quiz={viewingSubmissions} />;
  }

  if (selectedQuiz) {
    // Show QuestionManager for instructors, QuizTaker for learners
    if (user?.role === 'instructor') {
      return (
        <QuestionManager 
          quiz={selectedQuiz} 
          onBack={() => setSelectedQuiz(null)} 
        />
      );
    } else {
      return (
        <QuizTaker 
          quiz={selectedQuiz} 
          onBack={() => setSelectedQuiz(null)} 
        />
      );
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-3xl font-bold text-white">QuizMate</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-300">Welcome, {user?.username}</span>
              <button
                onClick={logout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">My Quizzes</h2>
            <div className="flex space-x-3">
              {user?.role === 'instructor' && (
                <>
                  <a
                    href="/text-analyzer"
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                  >
                    AI Text Analyzer
                  </a>
                  <button
                    onClick={() => setShowAICreateModal(true)}
                    className="bg-primary hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                  >
                    Create New Quiz
                  </button>
                </>
              )}
            </div>
          </div>

          {/* AI Quiz Creation Modal */}
          {showAICreateModal && <AIQuizCreationModal />}

          {/* AI Quiz Preview */}
          {showAIPreview && aiQuizData && <AIQuizPreview />}

          {/* Edit Quiz Form */}
          {editingQuiz && (
            <div className="bg-gray-800 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-medium text-white mb-4">
                Edit Quiz
              </h3>
              <form onSubmit={updateQuiz} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300">
                    Quiz Title
                  </label>
                  <input
                    type="text"
                    required
                    value={editingQuiz.title}
                    onChange={(e) => {
                      setEditingQuiz({ ...editingQuiz, title: e.target.value });
                    }}
                    className="mt-1 block w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-white focus:outline-none focus:ring-primary focus:border-primary"
                    placeholder="Enter quiz title"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300">
                    Description (Optional)
                  </label>
                  <textarea
                    value={editingQuiz.description}
                    onChange={(e) => {
                      setEditingQuiz({ ...editingQuiz, description: e.target.value });
                    }}
                    className="mt-1 block w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-white focus:outline-none focus:ring-primary focus:border-primary"
                    rows={3}
                    placeholder="Enter quiz description"
                  />
                </div>
                <div className="flex space-x-3">
                  <button
                    type="submit"
                    className="bg-accent hover:bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium"
                  >
                    Update Quiz
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingQuiz(null);
                    }}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Quiz List */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {quizzes.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <p className="text-gray-400 text-lg">
                  {user?.role === 'instructor' ? 'No quizzes created yet.' : 'No quizzes available.'}
                </p>
                {user?.role === 'instructor' && (
                  <p className="text-gray-500 text-sm mt-2">Click "Create New Quiz" to get started!</p>
                )}
              </div>
            ) : (
              quizzes.map((quiz) => (
                <div key={quiz._id} className="bg-gray-800 rounded-lg p-6 shadow-lg">
                  <h3 className="text-xl font-semibold text-white mb-2">{quiz.title}</h3>
                  {quiz.description && (
                    <p className="text-gray-300 mb-4">{quiz.description}</p>
                  )}
                  <div className="text-gray-400 text-sm mb-4">
                    <p>Created: {new Date(quiz.createdAt).toLocaleDateString()}</p>
                    {user?.role === 'learner' && quiz.userId && (
                      <p>By: {quiz.userId.username || 'Unknown'}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {user?.role === 'instructor' && (
                      <>
                        <button 
                          onClick={() => setEditingQuiz(quiz)}
                          className="bg-secondary hover:bg-purple-700 text-white px-3 py-1 rounded text-sm"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => setViewingSubmissions(quiz)}
                          className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                        >
                          Submissions
                        </button>
                      </>
                    )}
                    <button 
                      onClick={() => setSelectedQuiz(quiz)}
                      className="bg-primary hover:bg-indigo-700 text-white px-3 py-1 rounded text-sm"
                    >
                      {user?.role === 'instructor' ? 'Questions' : 'Take Quiz'}
                    </button>
                    {user?.role === 'instructor' && (
                      <button
                        onClick={() => deleteQuiz(quiz._id)}
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;