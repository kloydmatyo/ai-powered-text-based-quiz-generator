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
  sourceText?: string;
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
  const [regeneratingQuestionId, setRegeneratingQuestionId] = useState<string | null>(null);
  const [showRegenerateModal, setShowRegenerateModal] = useState(false);
  const [questionToRegenerate, setQuestionToRegenerate] = useState<string | null>(null);
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
          questionType: 'multiple-choice',
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
          questionType: editingQuestion.questionType,
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

  const openRegenerateModal = (questionId: string) => {
    setQuestionToRegenerate(questionId);
    setShowRegenerateModal(true);
  };

  const closeRegenerateModal = () => {
    setShowRegenerateModal(false);
    setQuestionToRegenerate(null);
  };

  const confirmRegenerateQuestion = async () => {
    if (!questionToRegenerate) return;

    setShowRegenerateModal(false);
    setRegeneratingQuestionId(questionToRegenerate);
    
    try {
      const token = localStorage.getItem('token');
      const question = questions.find(q => q._id === questionToRegenerate);
      
      if (!question) {
        throw new Error('Question not found');
      }

      // Use the original source text if available, otherwise build context from quiz info
      let context: string;
      
      console.log('📋 Quiz sourceText available:', !!quiz.sourceText, 'Length:', quiz.sourceText?.length || 0);
      
      if (quiz.sourceText && quiz.sourceText.length >= 50) {
        // Use the original PDF/document content for best results
        context = quiz.sourceText;
        console.log('✅ Using original source text for regeneration');
        console.log('🔄 Source text preview:', context.substring(0, 200) + '...');
      } else {
        // Fallback: Build context from quiz info and existing questions
        let contextParts = [quiz.title];
        
        if (quiz.description) {
          contextParts.push(quiz.description);
        }
        
        // Add the current question as context to help AI understand the topic
        contextParts.push(`Example question: ${question.questionText}`);
        
        // Add other questions as additional context
        const otherQuestions = questions
          .filter(q => q._id !== questionToRegenerate)
          .slice(0, 3) // Use up to 3 other questions for context
          .map(q => q.questionText);
        
        if (otherQuestions.length > 0) {
          contextParts.push(`Related topics: ${otherQuestions.join('. ')}`);
        }
        
        // Ensure we have enough text (minimum 50 characters required by API)
        context = contextParts.join('. ');
        if (context.length < 50) {
          context = `${context}. This is an educational quiz about ${quiz.title}. Generate relevant questions that test understanding of this topic.`;
        }
        
        console.log('🔄 Regenerating question with fallback context:', context.substring(0, 100) + '...');
      }
      
      // Determine question types to request based on current question type
      let questionTypes: string[] = [];
      if (question.questionType === 'multiple-choice') {
        questionTypes = ['multipleChoice'];
      } else if (question.questionType === 'true-false') {
        questionTypes = ['trueFalse'];
      } else if (question.questionType === 'fill-in-blank') {
        questionTypes = ['fillInTheBlank'];
      }

      // Call AI to generate a new question
      const aiResponse = await fetch('/api/analyze-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          text: context,
          questionTypes: questionTypes,
          numberOfQuestions: 1,
          difficulty: 'moderate'
        }),
      });

      if (!aiResponse.ok) {
        const errorData = await aiResponse.json();
        throw new Error(errorData.error || 'Failed to generate question');
      }

      const aiData = await aiResponse.json();
      console.log('📊 AI Response:', aiData);
      
      // Extract the generated question based on type
      let newQuestionData;
      if (question.questionType === 'multiple-choice') {
        if (aiData.questions?.multipleChoice?.length > 0) {
          newQuestionData = aiData.questions.multipleChoice[0];
          console.log('✅ Got multiple choice question from AI');
        } else if (aiData.questions?.identification?.length > 0) {
          // AI generated identification instead of multiple choice
          // We need to create proper distractors from the context
          const identQuestion = aiData.questions.identification[0];
          console.warn('⚠️ AI generated identification question instead of multiple choice, converting...');
          
          // Extract the correct answer
          const correctAnswer = identQuestion.answer;
          
          // Try to extract other potential answers from the context to create distractors
          // This is a simple approach - ideally the AI should generate proper MCQs
          const words = context.split(/\s+/);
          const potentialDistractors = words
            .filter(w => w.length > 3 && w !== correctAnswer && /^[A-Z]/.test(w))
            .slice(0, 3);
          
          // Create options with the correct answer and distractors
          const options = [
            correctAnswer,
            ...potentialDistractors,
            'None of the above'
          ].slice(0, 4);
          
          // Shuffle options
          const shuffledOptions = options.sort(() => Math.random() - 0.5);
          const correctIndex = shuffledOptions.indexOf(correctAnswer);
          
          newQuestionData = {
            question: identQuestion.question.replace('Identify', 'What is'),
            options: shuffledOptions,
            correctAnswerIndex: correctIndex
          };
          
          console.log('🔄 Converted to MCQ with options:', shuffledOptions);
        }
      } else if (question.questionType === 'true-false') {
        if (aiData.questions?.trueFalse?.length > 0) {
          newQuestionData = aiData.questions.trueFalse[0];
        } else if (aiData.questions?.identification?.length > 0) {
          // Fallback: Convert identification to true/false
          const identQuestion = aiData.questions.identification[0];
          newQuestionData = {
            question: identQuestion.question,
            answer: 'True'
          };
        }
      } else if (question.questionType === 'fill-in-blank') {
        if (aiData.questions?.fillInTheBlank?.length > 0) {
          newQuestionData = aiData.questions.fillInTheBlank[0];
        } else if (aiData.questions?.identification?.length > 0) {
          // Fallback: Convert identification to fill-in-blank
          const identQuestion = aiData.questions.identification[0];
          newQuestionData = {
            question: identQuestion.question,
            answer: identQuestion.answer || 'Answer'
          };
        }
      }

      if (!newQuestionData) {
        console.error('No question data found in response:', aiData);
        throw new Error('AI could not generate a question. The quiz topic might need more context. Try adding a description to your quiz.');
      }

      console.log('✨ Generated question data:', newQuestionData);

      // Prepare the update data based on question type
      let updateData: any = {
        questionText: newQuestionData.question || newQuestionData.questionText || '',
        questionType: question.questionType,
      };

      if (question.questionType === 'fill-in-blank') {
        updateData.answerChoices = [];
        updateData.correctAnswer = newQuestionData.answer || newQuestionData.correctAnswer || '';
        
        if (!updateData.correctAnswer) {
          throw new Error('Generated question is missing the answer');
        }
      } else if (question.questionType === 'true-false') {
        updateData.answerChoices = ['True', 'False'];
        const answer = newQuestionData.answer || newQuestionData.correctAnswer;
        updateData.correctAnswer = (answer === 'True' || answer === true || answer === 0) ? 0 : 1;
      } else {
        // multiple-choice
        updateData.answerChoices = newQuestionData.options || newQuestionData.answerChoices || [];
        updateData.correctAnswer = newQuestionData.correctAnswerIndex ?? newQuestionData.correctAnswer ?? 0;
        
        if (!updateData.answerChoices || updateData.answerChoices.length < 2) {
          throw new Error('Generated question is missing answer choices');
        }
      }

      if (!updateData.questionText) {
        throw new Error('Generated question is missing question text');
      }

      console.log('💾 Updating question with data:', updateData);

      // Update the question with new AI-generated content
      const updateResponse = await fetch(`/api/questions/${questionToRegenerate}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(updateData),
      });

      if (updateResponse.ok) {
        const data = await updateResponse.json();
        setQuestions(questions.map(q => q._id === questionToRegenerate ? data.question : q));
        alert('✅ Question regenerated successfully!');
      } else {
        const errorData = await updateResponse.json();
        throw new Error(errorData.error || 'Failed to update question');
      }
    } catch (error: any) {
      console.error('Error regenerating question:', error);
      alert(`❌ Failed to regenerate question: ${error.message}\n\nTip: Try adding a description to your quiz for better AI generation.`);
    } finally {
      setRegeneratingQuestionId(null);
      setQuestionToRegenerate(null);
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
        const currentAnswer = typeof editingQuestion.correctAnswer === 'number' ? editingQuestion.correctAnswer : 0;
        setEditingQuestion({
          ...editingQuestion,
          answerChoices: newChoices,
          correctAnswer: currentAnswer >= newChoices.length ? 0 : currentAnswer
        });
      }
    } else {
      if (newQuestion.answerChoices.length > 2) {
        const newChoices = newQuestion.answerChoices.filter((_, i) => i !== index);
        const currentAnswer = typeof newQuestion.correctAnswer === 'number' ? newQuestion.correctAnswer : 0;
        setNewQuestion({
          ...newQuestion,
          answerChoices: newChoices,
          correctAnswer: currentAnswer >= newChoices.length ? 0 : currentAnswer
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
      const questionType = question.questionType === 'fill-in-blank' ? '[Fill in the Blank]' :
                          question.questionType === 'true-false' ? '[True/False]' : '[Multiple Choice]';
      doc.text(`${index + 1}. ${questionType} ${question.questionText}`, 20, yPosition);
      yPosition += 10;
      
      if (question.questionType === 'fill-in-blank') {
        doc.setFontSize(12);
        doc.text(`✓ Answer: ${question.correctAnswer}`, 25, yPosition);
        yPosition += 8;
      } else {
        question.answerChoices.forEach((choice, choiceIndex) => {
          const prefix = question.correctAnswer === choiceIndex ? '✓' : ' ';
          doc.setFontSize(12);
          doc.text(`${prefix} ${String.fromCharCode(65 + choiceIndex)}. ${choice}`, 25, yPosition);
          yPosition += 8;
        });
      }
      
      yPosition += 5;
    });
    
    doc.save(`${quiz.title}.pdf`);
  };

  const exportToCSV = () => {
    const csvContent = [
      ['Question Type', 'Question', 'Choice A', 'Choice B', 'Choice C', 'Choice D', 'Choice E', 'Choice F', 'Correct Answer'],
      ...questions.map(question => {
        const row = [
          question.questionType === 'fill-in-blank' ? 'Fill in the Blank' :
          question.questionType === 'true-false' ? 'True/False' : 'Multiple Choice',
          question.questionText
        ];
        // Add answer choices (pad with empty strings if less than 6)
        for (let i = 0; i < 6; i++) {
          row.push(question.answerChoices[i] || '');
        }
        // Add correct answer
        if (question.questionType === 'fill-in-blank') {
          row.push(String(question.correctAnswer));
        } else {
          row.push(String.fromCharCode(65 + (typeof question.correctAnswer === 'number' ? question.correctAnswer : 0)));
        }
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
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Question Type
                  </label>
                  <select
                    value={editingQuestion ? editingQuestion.questionType : newQuestion.questionType}
                    onChange={(e) => {
                      const type = e.target.value as 'multiple-choice' | 'true-false' | 'fill-in-blank';
                      if (editingQuestion) {
                        setEditingQuestion({
                          ...editingQuestion,
                          questionType: type,
                          answerChoices: type === 'true-false' ? ['True', 'False'] : type === 'fill-in-blank' ? [] : ['', ''],
                          correctAnswer: type === 'fill-in-blank' ? '' : 0
                        });
                      } else {
                        setNewQuestion({
                          ...newQuestion,
                          questionType: type,
                          answerChoices: type === 'true-false' ? ['True', 'False'] : type === 'fill-in-blank' ? [] : ['', ''],
                          correctAnswer: type === 'fill-in-blank' ? '' : 0
                        });
                      }
                    }}
                    className="block w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-white focus:outline-none focus:ring-primary focus:border-primary"
                  >
                    <option value="multiple-choice">Multiple Choice</option>
                    <option value="true-false">True/False</option>
                    <option value="fill-in-blank">Fill in the Blank</option>
                  </select>
                </div>

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

                {/* Answer section based on question type */}
                {(editingQuestion ? editingQuestion.questionType : newQuestion.questionType) === 'fill-in-blank' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Correct Answer
                    </label>
                    <input
                      type="text"
                      required
                      value={editingQuestion ? String(editingQuestion.correctAnswer) : String(newQuestion.correctAnswer)}
                      onChange={(e) => {
                        if (editingQuestion) {
                          setEditingQuestion({ ...editingQuestion, correctAnswer: e.target.value });
                        } else {
                          setNewQuestion({ ...newQuestion, correctAnswer: e.target.value });
                        }
                      }}
                      className="block w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-white focus:outline-none focus:ring-primary focus:border-primary"
                      placeholder="Enter the correct answer"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Note: Answer comparison is case-insensitive
                    </p>
                  </div>
                ) : (
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
                          disabled={(editingQuestion ? editingQuestion.questionType : newQuestion.questionType) === 'true-false'}
                        />
                        {(editingQuestion ? editingQuestion.questionType : newQuestion.questionType) !== 'true-false' && 
                         (editingQuestion ? editingQuestion.answerChoices.length : newQuestion.answerChoices.length) > 2 && (
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
                    {(editingQuestion ? editingQuestion.questionType : newQuestion.questionType) === 'multiple-choice' &&
                     (editingQuestion ? editingQuestion.answerChoices.length : newQuestion.answerChoices.length) < 6 && (
                      <button
                        type="button"
                        onClick={() => addAnswerChoice(!!editingQuestion)}
                        className="text-primary hover:text-indigo-400 text-sm"
                      >
                        + Add Choice
                      </button>
                    )}
                  </div>
                )}

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
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-medium text-white">
                          {index + 1}. {question.questionText}
                        </h3>
                        <span className="text-xs px-2 py-1 rounded bg-gray-700 text-gray-300">
                          {question.questionType === 'fill-in-blank' ? 'Fill in the Blank' :
                           question.questionType === 'true-false' ? 'True/False' :
                           'Multiple Choice'}
                        </span>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => openRegenerateModal(question._id)}
                        disabled={regeneratingQuestionId === question._id}
                        className="bg-accent hover:bg-green-600 text-white px-3 py-1 rounded text-sm flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Regenerate this question with AI"
                      >
                        {regeneratingQuestionId === question._id ? (
                          <>
                            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            <span>Regenerating...</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            <span>Regenerate</span>
                          </>
                        )}
                      </button>
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
                  
                  {question.questionType === 'fill-in-blank' ? (
                    <div className="bg-green-900 text-green-100 p-3 rounded">
                      <span className="font-medium">Correct Answer:</span> {question.correctAnswer}
                      <span className="ml-2 text-green-400">✓</span>
                    </div>
                  ) : (
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
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* Regenerate Confirmation Modal */}
      {showRegenerateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl p-8 max-w-md w-full border-2 border-accent shadow-2xl">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-full bg-accent bg-opacity-20 flex items-center justify-center">
                <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white">Regenerate Question?</h3>
            </div>
            
            <p className="text-gray-300 mb-6 leading-relaxed">
              This will use AI to generate a completely new question based on your quiz topic. 
              The current question will be permanently replaced.
            </p>

            <div className="bg-gray-900 rounded-lg p-4 mb-6 border border-gray-700">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div className="text-sm text-gray-400">
                  <p className="font-medium text-gray-300 mb-1">What happens:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>AI generates a new question</li>
                    <li>Same question type is maintained</li>
                    <li>Original question is replaced</li>
                    {quiz.sourceText ? (
                      <li className="text-green-400">✓ Using original document content</li>
                    ) : (
                      <li className="text-yellow-400">⚠ Using quiz context (no source document)</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={closeRegenerateModal}
                className="flex-1 px-6 py-3 rounded-xl font-semibold text-gray-300 bg-gray-700 hover:bg-gray-600 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={confirmRegenerateQuestion}
                className="flex-1 px-6 py-3 rounded-xl font-semibold text-white bg-accent hover:bg-green-600 transition-colors duration-200 flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Regenerate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestionManager;