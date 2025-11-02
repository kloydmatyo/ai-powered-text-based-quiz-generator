'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import QuestionManager from './QuestionManager';

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
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [newQuiz, setNewQuiz] = useState({ title: '', description: '' });

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

  const createQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/quizzes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(newQuiz),
      });

      if (response.ok) {
        const data = await response.json();
        setQuizzes([data.quiz, ...quizzes]);
        setNewQuiz({ title: '', description: '' });
        setShowCreateForm(false);
      }
    } catch (error) {
      console.error('Error creating quiz:', error);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (selectedQuiz) {
    return (
      <QuestionManager 
        quiz={selectedQuiz} 
        onBack={() => setSelectedQuiz(null)} 
      />
    );
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
            {user?.role === 'instructor' && (
              <button
                onClick={() => setShowCreateForm(true)}
                className="bg-primary hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Create New Quiz
              </button>
            )}
          </div>

          {/* Create/Edit Quiz Form */}
          {(showCreateForm || editingQuiz) && (
            <div className="bg-gray-800 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-medium text-white mb-4">
                {editingQuiz ? 'Edit Quiz' : 'Create New Quiz'}
              </h3>
              <form onSubmit={editingQuiz ? updateQuiz : createQuiz} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300">
                    Quiz Title
                  </label>
                  <input
                    type="text"
                    required
                    value={editingQuiz ? editingQuiz.title : newQuiz.title}
                    onChange={(e) => {
                      if (editingQuiz) {
                        setEditingQuiz({ ...editingQuiz, title: e.target.value });
                      } else {
                        setNewQuiz({ ...newQuiz, title: e.target.value });
                      }
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
                    value={editingQuiz ? editingQuiz.description : newQuiz.description}
                    onChange={(e) => {
                      if (editingQuiz) {
                        setEditingQuiz({ ...editingQuiz, description: e.target.value });
                      } else {
                        setNewQuiz({ ...newQuiz, description: e.target.value });
                      }
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
                    {editingQuiz ? 'Update Quiz' : 'Create Quiz'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateForm(false);
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
                  <div className="flex space-x-2">
                    {user?.role === 'instructor' && (
                      <button 
                        onClick={() => setEditingQuiz(quiz)}
                        className="bg-secondary hover:bg-purple-700 text-white px-3 py-1 rounded text-sm"
                      >
                        Edit
                      </button>
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