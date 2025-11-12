'use client';

import React, { useState, useEffect } from 'react';

interface Question {
  _id: string;
  questionText: string;
  questionType: 'multiple-choice' | 'true-false' | 'fill-in-blank';
  answerChoices: string[];
  correctAnswer: number | string;
  quizId: string;
}

interface Quiz {
  _id: string;
  title: string;
  description: string;
}

interface QuestionManagerProps {
  quiz: Quiz;
  onBack: () => void;
}

const QuestionManager: React.FC<QuestionManagerProps> = ({ quiz, onBack }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [editingQuiz, setEditingQuiz] = useState(false);
  const [quizData, setQuizData] = useState({ title: quiz.title, description: quiz.description });
  const [newQuestion, setNewQuestion] = useState({
    questionText: '',
    questionType: 'multiple-choice' as 'multiple-choice' | 'true-false' | 'fill-in-blank',
    answerChoices: ['', ''],
    correctAnswer: 0 as number | string
  });

  useEffect(() => {
    fetchQuestions();
  }, [quiz._id]);

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
        setQuestions(data.questions);
      } else {
        const errorData = await response.json();
        console.error('❌ Error response:', errorData);
      }
    } catch (error) {
      console.error('❌ Error fetching questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const createQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...newQuestion,
          quizId: quiz._id
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setQuestions([...questions, data.question]);
        setNewQuestion({
          questionText: '',
          answerChoices: ['', ''],
          correctAnswer: 0
        });
        setShowCreateForm(false);
      }
    } catch (error) {
      console.error('Error creating question:', error);
    }
  };

  const updateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/quizzes/${quiz._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(quizData),
      });

      if (response.ok) {
        const data = await response.json();
        quiz.title = data.quiz.title;
        quiz.description = data.quiz.description;
        setEditingQuiz(false);
        alert('Quiz updated successfully!');
      } else {
        alert('Failed to update quiz');
      }
    } catch (error) {
      console.error('Error updating quiz:', error);
      alert('Error updating quiz');
    }
  };

  const updateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuestion) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/questions/${editingQuestion._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          questionText: editingQuestion.questionText,
          answerChoices: editingQuestion.answerChoices,
          correctAnswer: editingQuestion.correctAnswer
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setQuestions(questions.map(q => q._id === editingQuestion._id ? data.question : q));
        setEditingQuestion(null);
      }
    } catch (error) {
      console.error('Error updating question:', error);
    }
  };

  const deleteQuestion = async (questionId: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/questions/${questionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setQuestions(questions.filter(q => q._id !== questionId));
      }
    } catch (error) {
      console.error('Error deleting question:', error);
    }
  };

  const addAnswerChoice = (isEditing = false) => {
    if (isEditing && editingQuestion) {
      if (editingQuestion.answerChoices.length < 6) {
        setEditingQuestion({
          ...editingQuestion,
          answerChoices: [...editingQuestion.answerChoices, '']
        });
      }
    } else {
      if (newQuestion.answerChoices.length < 6) {
        setNewQuestion({
          ...newQuestion,
          answerChoices: [...newQuestion.answerChoices, '']
        });
      }
    }
  };

  const removeAnswerChoice = (index: number, isEditing = false) => {
    if (isEditing && editingQuestion) {
      if (editingQuestion.answerChoices.length > 2) {
        const newChoices = editingQuestion.answerChoices.filter((_, i) => i !== index);
        setEditingQuestion({
          ...editingQuestion,
          answerChoices: newChoices,
          correctAnswer: editingQuestion.correctAnswer >= newChoices.length ? 0 : editingQuestion.correctAnswer
        });
      }
    } else {
      if (newQuestion.answerChoices.length > 2) {
        const newChoices = newQuestion.answerChoices.filter((_, i) => i !== index);
        setNewQuestion({
          ...newQuestion,
          answerChoices: newChoices,
          correctAnswer: newQuestion.correctAnswer >= newChoices.length ? 0 : newQuestion.correctAnswer
        });
      }
    }
  };

  const exportToPDF = async () => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text(quiz.title, 20, 30);
    
    if (quiz.description) {
      doc.setFontSize(12);
      doc.text(quiz.description, 20, 45);
    }
    
    let yPosition = 60;
    
    questions.forEach((question, index) => {
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 30;
      }
      
      doc.setFontSize(14);
      doc.text(`${index + 1}. ${question.questionText}`, 20, yPosition);
      yPosition += 10;
      
      question.answerChoices.forEach((choice, choiceIndex) => {
        const prefix = question.correctAnswer === choiceIndex ? '✓' : ' ';
        doc.setFontSize(12);
        doc.text(`${prefix} ${String.fromCharCode(65 + choiceIndex)}. ${choice}`, 25, yPosition);
        yPosition += 8;
      });
      
      yPosition += 5;
    });
    
    doc.save(`${quiz.title}.pdf`);
  };

  const exportToCSV = () => {
    const csvContent = [
      ['Question', 'Choice A', 'Choice B', 'Choice C', 'Choice D', 'Choice E', 'Choice F', 'Correct Answer'],
      ...questions.map(question => {
        const row = [question.questionText];
        // Add answer choices (pad with empty strings if less than 6)
        for (let i = 0; i < 6; i++) {
          row.push(question.answerChoices[i] || '');
        }
        // Add correct answer letter
        row.push(String.fromCharCode(65 + question.correctAnswer));
        return row;
      })
    ];

    const csvString = csvContent
      .map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${quiz.title}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-white text-xl">Loading questions...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={onBack}
                className="text-gray-300 hover:text-white"
              >
                ← Back to Quizzes
              </button>
              <h1 className="text-2xl font-bold text-white">{quiz.title}</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setEditingQuiz(true)}
                className="bg-secondary hover:bg-secondary/90 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                ✏️ Edit Quiz
              </button>
              <button
                onClick={exportToCSV}
                className="bg-accent hover:bg-accent/90 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Export CSV
              </button>
              <button
                onClick={exportToPDF}
                className="bg-secondary hover:bg-secondary/90 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Export PDF
              </button>
              <button
                onClick={() => setShowCreateForm(true)}
                className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Add Question
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Edit Quiz Form */}
          {editingQuiz && (
            <div className="bg-gray-800 rounded-lg p-6 mb-6 border-2 border-secondary">
              <h3 className="text-lg font-medium text-white mb-4">
                ✏️ Edit Quiz Details
              </h3>
              <form onSubmit={updateQuiz} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Quiz Title
                  </label>
                  <input
                    type="text"
                    required
                    value={quizData.title}
                    onChange={(e) => setQuizData({ ...quizData, title: e.target.value })}
                    className="block w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-white focus:outline-none focus:ring-secondary focus:border-secondary"
                    placeholder="Enter quiz title"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Description (Optional)
                  </label>
                  <textarea
                    value={quizData.description}
                    onChange={(e) => setQuizData({ ...quizData, description: e.target.value })}
                    className="block w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-white focus:outline-none focus:ring-secondary focus:border-secondary"
                    rows={3}
                    placeholder="Enter quiz description"
                  />
                </div>
                <div className="flex space-x-3">
                  <button
                    type="submit"
                    className="bg-accent hover:bg-accent/90 text-white px-4 py-2 rounded-md text-sm font-medium"
                  >
                    💾 Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingQuiz(false);
                      setQuizData({ title: quiz.title, description: quiz.description });
                    }}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Create/Edit Question Form */}
          {(showCreateForm || editingQuestion) && (
            <div className="bg-gray-800 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-medium text-white mb-4">
                {editingQuestion ? 'Edit Question' : 'Add New Question'}
              </h3>
              <form onSubmit={editingQuestion ? updateQuestion : createQuestion} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300">
                    Question Text
                  </label>
                  <textarea
                    required
                    value={editingQuestion ? editingQuestion.questionText : newQuestion.questionText}
                    onChange={(e) => {
                      if (editingQuestion) {
                        setEditingQuestion({ ...editingQuestion, questionText: e.target.value });
                      } else {
                        setNewQuestion({ ...newQuestion, questionText: e.target.value });
                      }
                    }}
                    className="mt-1 block w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-white focus:outline-none focus:ring-primary focus:border-primary"
                    rows={3}
                    placeholder="Enter your question"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Answer Choices
                  </label>
                  {(editingQuestion ? editingQuestion.answerChoices : newQuestion.answerChoices).map((choice, index) => (
                    <div key={index} className="flex items-center space-x-2 mb-2">
                      <input
                        type="radio"
                        name="correctAnswer"
                        checked={(editingQuestion ? editingQuestion.correctAnswer : newQuestion.correctAnswer) === index}
                        onChange={() => {
                          if (editingQuestion) {
                            setEditingQuestion({ ...editingQuestion, correctAnswer: index });
                          } else {
                            setNewQuestion({ ...newQuestion, correctAnswer: index });
                          }
                        }}
                        className="text-primary"
                      />
                      <input
                        type="text"
                        required
                        value={choice}
                        onChange={(e) => {
                          const newChoices = [...(editingQuestion ? editingQuestion.answerChoices : newQuestion.answerChoices)];
                          newChoices[index] = e.target.value;
                          if (editingQuestion) {
                            setEditingQuestion({ ...editingQuestion, answerChoices: newChoices });
                          } else {
                            setNewQuestion({ ...newQuestion, answerChoices: newChoices });
                          }
                        }}
                        className="flex-1 px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-white focus:outline-none focus:ring-primary focus:border-primary"
                        placeholder={`Choice ${index + 1}`}
                      />
                      {(editingQuestion ? editingQuestion.answerChoices.length : newQuestion.answerChoices.length) > 2 && (
                        <button
                          type="button"
                          onClick={() => removeAnswerChoice(index, !!editingQuestion)}
                          className="text-red-400 hover:text-red-300"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                  {(editingQuestion ? editingQuestion.answerChoices.length : newQuestion.answerChoices.length) < 6 && (
                    <button
                      type="button"
                      onClick={() => addAnswerChoice(!!editingQuestion)}
                      className="text-primary hover:text-indigo-400 text-sm"
                    >
                      + Add Choice
                    </button>
                  )}
                </div>

                <div className="flex space-x-3">
                  <button
                    type="submit"
                    className="bg-accent hover:bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium"
                  >
                    {editingQuestion ? 'Update Question' : 'Add Question'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateForm(false);
                      setEditingQuestion(null);
                    }}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Questions List */}
          <div className="space-y-4">
            {questions.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400 text-lg">No questions added yet.</p>
                <p className="text-gray-500 text-sm mt-2">Click "Add Question" to get started!</p>
              </div>
            ) : (
              questions.map((question, index) => (
                <div key={question._id} className="bg-gray-800 rounded-lg p-6">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-medium text-white">
                      {index + 1}. {question.questionText}
                    </h3>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setEditingQuestion(question)}
                        className="bg-secondary hover:bg-purple-700 text-white px-3 py-1 rounded text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteQuestion(question._id)}
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {question.answerChoices.map((choice, choiceIndex) => (
                      <div
                        key={choiceIndex}
                        className={`p-2 rounded ${
                          question.correctAnswer === choiceIndex
                            ? 'bg-green-900 text-green-100'
                            : 'bg-gray-700 text-gray-300'
                        }`}
                      >
                        {String.fromCharCode(65 + choiceIndex)}. {choice}
                        {question.correctAnswer === choiceIndex && (
                          <span className="ml-2 text-green-400">✓ Correct</span>
                        )}
                      </div>
                    ))}
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

export default QuestionManager;