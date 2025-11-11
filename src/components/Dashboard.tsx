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

interface DashboardStats {
  totalQuizzes: number;
  totalPlays: number;
  averageScore: number;
  engagement: number;
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
  const [activeView, setActiveView] = useState<'home' | 'quizzes' | 'create' | 'analytics' | 'settings'>('home');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    totalQuizzes: 0,
    totalPlays: 0,
    averageScore: 0,
    engagement: 0
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    fetchQuizzes();
    fetchStats();
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
        setStats(prev => ({ ...prev, totalQuizzes: data.quizzes.length }));
      }
    } catch (error) {
      console.error('Error fetching quizzes:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/quiz-submissions', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        const submissions = data.submissions || [];
        const avgScore = submissions.length > 0 
          ? submissions.reduce((acc: number, sub: any) => acc + sub.score, 0) / submissions.length 
          : 0;
        setStats(prev => ({
          ...prev,
          totalPlays: submissions.length,
          averageScore: Math.round(avgScore),
          engagement: submissions.length > 0 && quizzes.length > 0 ? Math.min(100, (submissions.length / quizzes.length) * 20) : 0
        }));
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
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
        console.log('📤 Sending to AI:', { 
          textLength: text.length, 
          difficulty,
          numberOfQuestions,
          questionTypes: selectedQuestionTypes 
        });
        
        // Generate questions using AI with selected difficulty, number, and types
        const response = await fetch('/api/analyze-text', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            text,
            difficulty,
            numberOfQuestions,
            questionTypes: selectedQuestionTypes 
          }),
        });

        console.log('📡 API Response:', response.status);

        if (!response.ok) {
          const errorData = await response.json();
          console.error('❌ API Error:', errorData);
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

  // Sidebar Navigation Component
  const Sidebar = () => {
    // Role-based navigation items
    const navItems = user?.role === 'instructor' 
      ? [
          { id: 'home', icon: '🏠', label: 'Home' },
          { id: 'quizzes', icon: '📝', label: 'My Quizzes' },
          { id: 'create', icon: '➕', label: 'Create Quiz' },
          { id: 'analytics', icon: '📊', label: 'Analytics' },
          { id: 'settings', icon: '⚙️', label: 'Settings' },
        ]
      : [
          { id: 'home', icon: '🏠', label: 'Home' },
          { id: 'quizzes', icon: '📝', label: 'Available Quizzes' },
          { id: 'settings', icon: '⚙️', label: 'Settings' },
        ];

    return (
      <>
        {/* Mobile Overlay */}
        {mobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-30 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}
        
        {/* Sidebar */}
        <aside className={`fixed left-0 top-0 h-full bg-gray-900 border-r border-gray-800 transition-all duration-300 z-40 
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} 
          md:translate-x-0
          ${sidebarCollapsed ? 'w-20' : 'w-64'}`}>
          <div className="flex flex-col h-full">
            <div className="p-4 md:p-6 border-b border-gray-800">
              <div className="flex items-center justify-between">
                {!sidebarCollapsed && (
                  <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    QuizMate
                  </h1>
                )}
                <button
                  onClick={() => {
                    setSidebarCollapsed(!sidebarCollapsed);
                    setMobileMenuOpen(false);
                  }}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  {sidebarCollapsed ? '→' : '←'}
                </button>
              </div>
            </div>
          <nav className="flex-1 p-4 space-y-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id as any)}
                className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg transition-all ${
                  activeView === item.id
                    ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-lg'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                <span className="text-2xl">{item.icon}</span>
                {!sidebarCollapsed && <span className="font-medium">{item.label}</span>}
              </button>
            ))}
          </nav>
          <div className="p-4 border-t border-gray-800">
            <div className={`flex items-center gap-3 ${sidebarCollapsed ? 'justify-center' : ''}`}>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold">
                {user?.username?.charAt(0).toUpperCase()}
              </div>
              {!sidebarCollapsed && (
                <div className="flex-1">
                  <p className="text-white font-medium text-sm">{user?.username}</p>
                  <p className="text-gray-400 text-xs">{user?.role}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>
      </>
    );
  };

  // Top Header Component
  const TopHeader = () => (
    <header className="fixed top-0 right-0 left-0 h-16 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800 z-30 md:ml-0"
      style={{ marginLeft: window.innerWidth >= 768 ? (sidebarCollapsed ? '5rem' : '16rem') : '0' }}>
      <div className="h-full px-4 md:px-6 flex items-center justify-between gap-2 md:gap-4">
        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-gray-400 hover:text-white transition-colors"
        >
          <span className="text-2xl">☰</span>
        </button>

        <div className="flex-1 max-w-xl">
          <div className="relative hidden sm:block">
            <input
              type="text"
              placeholder="Search quizzes..."
              className="w-full px-4 py-2 pl-10 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary text-sm md:text-base"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          </div>
          <button className="sm:hidden p-2 text-gray-400 hover:text-white">
            <span className="text-xl">🔍</span>
          </button>
        </div>
        <div className="flex items-center gap-4">
          <button className="relative p-2 text-gray-400 hover:text-white transition-colors">
            <span className="text-2xl">🔔</span>
            <span className="absolute top-1 right-1 w-2 h-2 bg-accent rounded-full"></span>
          </button>
          <div className="relative group">
            <button className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold hover:shadow-lg transition-shadow">
              {user?.username?.charAt(0).toUpperCase()}
            </button>
            <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-xl border border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
              <button
                onClick={logout}
                className="w-full px-4 py-2 text-left text-gray-300 hover:bg-gray-700 hover:text-white rounded-lg transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );

  // Stats Card Component
  const StatsCard = ({ icon, label, value, trend, color }: any) => (
    <div className="bg-gray-800 rounded-xl p-4 md:p-6 border border-gray-700 hover:border-gray-600 transition-all hover:shadow-xl">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-gray-400 text-xs md:text-sm font-medium mb-1 truncate">{label}</p>
          <h3 className="text-2xl md:text-3xl font-bold text-white mb-1 md:mb-2">{value}</h3>
          {trend && (
            <p className={`text-xs md:text-sm ${trend > 0 ? 'text-accent' : 'text-red-400'}`}>
              {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
            </p>
          )}
        </div>
        <div className={`w-10 h-10 md:w-12 md:h-12 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center text-xl md:text-2xl flex-shrink-0 ml-2`}>
          {icon}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto mb-4"></div>
          <p className="text-white text-xl">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (viewingSubmissions) {
    return <SubmissionsViewer quiz={viewingSubmissions} />;
  }

  if (selectedQuiz) {
    if (user?.role === 'instructor') {
      return <QuestionManager quiz={selectedQuiz} onBack={() => setSelectedQuiz(null)} />;
    } else {
      return <QuizTaker quiz={selectedQuiz} onBack={() => setSelectedQuiz(null)} />;
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <TopHeader />
      
      <main className="pt-20 md:pt-24 pb-8 px-4 sm:px-6 md:px-8 transition-all duration-300 md:ml-0" 
        style={{ marginLeft: window.innerWidth >= 768 ? (sidebarCollapsed ? '5rem' : '16rem') : '0' }}>
        {activeView === 'home' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-primary to-secondary rounded-xl p-6 md:p-8 text-white">
              <h2 className="text-2xl md:text-3xl font-bold mb-2">Welcome back, {user?.username}! 👋</h2>
              <p className="text-sm md:text-base text-blue-100">
                {user?.role === 'instructor' ? 'Ready to create amazing quizzes today?' : 'Ready to take some quizzes today?'}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              <StatsCard icon="📝" label="Total Quizzes" value={stats.totalQuizzes} trend={12} color="from-primary to-blue-600" />
              <StatsCard icon="🎯" label="Total Plays" value={stats.totalPlays} trend={8} color="from-secondary to-purple-600" />
              <StatsCard icon="⭐" label="Average Score" value={`${stats.averageScore}%`} trend={5} color="from-accent to-green-600" />
              <StatsCard icon="📈" label="Engagement" value={`${stats.engagement}%`} trend={-3} color="from-orange-500 to-red-500" />
            </div>
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">Recent Quizzes</h3>
                <button onClick={() => setActiveView('quizzes')} className="text-primary hover:text-primary/80 text-sm font-medium">
                  View All →
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {quizzes.slice(0, 6).map((quiz) => (
                  <div key={quiz._id} className="bg-gray-900 rounded-lg p-4 border border-gray-700 hover:border-primary transition-all cursor-pointer group"
                    onClick={() => setSelectedQuiz(quiz)}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-2xl">📋</div>
                      <span className="text-xs text-gray-400">{new Date(quiz.createdAt).toLocaleDateString()}</span>
                    </div>
                    <h4 className="text-white font-semibold mb-1 group-hover:text-primary transition-colors">{quiz.title}</h4>
                    <p className="text-gray-400 text-sm line-clamp-2 mb-3">{quiz.description || 'No description'}</p>
                    <div className="flex gap-2">
                      <button className="flex-1 px-3 py-1.5 bg-primary hover:bg-primary/90 text-white text-xs rounded-lg transition-colors">
                        {user?.role === 'instructor' ? 'Edit' : 'Take'}
                      </button>
                      {user?.role === 'instructor' && (
                        <button className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded-lg transition-colors">📊</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {user?.role === 'instructor' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                <button onClick={() => setShowAICreateModal(true)} className="bg-gradient-to-br from-accent to-green-600 rounded-xl p-4 md:p-6 text-white hover:shadow-2xl transition-all group">
                  <div className="text-3xl md:text-4xl mb-2 md:mb-3">🤖</div>
                  <h4 className="text-base md:text-lg font-bold mb-1">AI Quiz Generator</h4>
                  <p className="text-xs md:text-sm text-green-100">Create quizzes from documents</p>
                </button>
                <button onClick={() => setActiveView('analytics')} className="bg-gradient-to-br from-secondary to-purple-600 rounded-xl p-4 md:p-6 text-white hover:shadow-2xl transition-all">
                  <div className="text-3xl md:text-4xl mb-2 md:mb-3">📊</div>
                  <h4 className="text-base md:text-lg font-bold mb-1">View Analytics</h4>
                  <p className="text-xs md:text-sm text-purple-100">Track quiz performance</p>
                </button>
                <button onClick={() => setActiveView('settings')} className="bg-gradient-to-br from-primary to-blue-600 rounded-xl p-4 md:p-6 text-white hover:shadow-2xl transition-all">
                  <div className="text-3xl md:text-4xl mb-2 md:mb-3">⚙️</div>
                  <h4 className="text-base md:text-lg font-bold mb-1">Settings</h4>
                  <p className="text-xs md:text-sm text-blue-100">Customize your experience</p>
                </button>
              </div>
            )}
          </div>
        )}

        {activeView === 'quizzes' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">My Quizzes</h2>
              {user?.role === 'instructor' && (
                <button onClick={() => setShowAICreateModal(true)} className="px-6 py-3 bg-accent hover:bg-accent/90 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all">
                  ➕ Create New Quiz
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {quizzes.map((quiz) => (
                <div key={quiz._id} className="bg-gray-800 rounded-xl p-4 md:p-6 border border-gray-700 hover:border-primary transition-all hover:shadow-xl">
                  <div className="flex items-start justify-between mb-3 md:mb-4">
                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-2xl md:text-3xl">📋</div>
                    <span className="text-xs text-gray-400 bg-gray-900 px-2 py-1 rounded">{new Date(quiz.createdAt).toLocaleDateString()}</span>
                  </div>
                  <h3 className="text-lg md:text-xl font-bold text-white mb-2">{quiz.title}</h3>
                  <p className="text-gray-400 text-xs md:text-sm mb-3 md:mb-4 line-clamp-2">{quiz.description || 'No description available'}</p>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => setSelectedQuiz(quiz)} className="flex-1 px-3 md:px-4 py-2 bg-primary hover:bg-primary/90 text-white font-medium rounded-lg transition-colors text-sm md:text-base">
                      {user?.role === 'instructor' ? 'Manage' : 'Take Quiz'}
                    </button>
                    {user?.role === 'instructor' && (
                      <>
                        <button onClick={() => setEditingQuiz(quiz)} className="px-3 md:px-4 py-2 bg-secondary hover:bg-secondary/90 text-white rounded-lg transition-colors text-sm md:text-base">✏️</button>
                        <button onClick={() => setViewingSubmissions(quiz)} className="px-3 md:px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded-lg transition-colors text-sm md:text-base">📊</button>
                        <button onClick={() => deleteQuiz(quiz._id)} className="px-3 md:px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm md:text-base">🗑️</button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeView === 'analytics' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Analytics Dashboard</h2>
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-lg font-bold text-white mb-4">Quiz Performance</h3>
              <div className="h-64 flex items-end justify-around gap-2">
                {[65, 78, 82, 71, 88, 75, 92].map((value, index) => (
                  <div key={index} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full bg-gray-700 rounded-t-lg overflow-hidden" style={{ height: '200px' }}>
                      <div className="w-full bg-gradient-to-t from-primary to-secondary rounded-t-lg transition-all" style={{ height: `${value}%` }}></div>
                    </div>
                    <span className="text-xs text-gray-400">Day {index + 1}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <h3 className="text-lg font-bold text-white mb-4">Top Performing Quizzes</h3>
                <div className="space-y-3">
                  {quizzes.slice(0, 5).map((quiz, index) => (
                    <div key={quiz._id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '📝'}</span>
                        <span className="text-white">{quiz.title}</span>
                      </div>
                      <span className="text-accent font-semibold">{Math.floor(Math.random() * 100)}%</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <h3 className="text-lg font-bold text-white mb-4">Participation Trends</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-400">This Week</span>
                      <span className="text-white font-semibold">87%</span>
                    </div>
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-accent to-green-600 rounded-full" style={{ width: '87%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-400">Last Week</span>
                      <span className="text-white font-semibold">72%</span>
                    </div>
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-secondary to-purple-600 rounded-full" style={{ width: '72%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-400">Last Month</span>
                      <span className="text-white font-semibold">65%</span>
                    </div>
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-primary to-blue-600 rounded-full" style={{ width: '65%' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeView === 'settings' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Settings</h2>
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-lg font-bold text-white mb-4">Profile Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Username</label>
                  <input type="text" value={user?.username} disabled className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Email</label>
                  <input type="email" value={user?.email} disabled className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Role</label>
                  <input type="text" value={user?.role} disabled className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white capitalize" />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeView === 'create' && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🚀</div>
            <h2 className="text-2xl font-bold text-white mb-4">Create New Quiz</h2>
            <button onClick={() => setShowAICreateModal(true)} className="px-8 py-4 bg-accent hover:bg-accent/90 text-white font-bold rounded-xl shadow-lg hover:shadow-2xl transition-all">
              Start with AI Generator
            </button>
          </div>
        )}
      </main>

      {/* AI Quiz Creation Modal */}
      {showAICreateModal && <AIQuizCreationModal />}

      {/* AI Quiz Preview */}
      {showAIPreview && aiQuizData && <AIQuizPreview />}

      {/* Edit Quiz Modal */}
      {editingQuiz && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-2xl p-8 max-w-2xl w-full mx-4 border border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-white">Edit Quiz</h3>
              <button onClick={() => setEditingQuiz(null)} className="text-gray-400 hover:text-white text-2xl">✕</button>
            </div>
            <form onSubmit={updateQuiz} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Quiz Title</label>
                <input
                  type="text"
                  required
                  value={editingQuiz.title}
                  onChange={(e) => setEditingQuiz({ ...editingQuiz, title: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                <textarea
                  value={editingQuiz.description}
                  onChange={(e) => setEditingQuiz({ ...editingQuiz, description: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  rows={3}
                />
              </div>
              <div className="flex gap-3">
                <button type="submit" className="flex-1 px-6 py-3 bg-accent hover:bg-accent/90 text-white font-semibold rounded-lg">
                  Save Quiz
                </button>
                <button type="button" onClick={() => setEditingQuiz(null)} className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;