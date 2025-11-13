'use client';

import React, { useState, useEffect } from 'react';
import Modal from './Modal';

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
  deadline?: string;
  timeLimit?: number;
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
  const [quizData, setQuizData] = useState<{
    title: string;
    description: string;
    deadline: string;
    timeLimit: number | string;
  }>({ 
    title: quiz.title, 
    description: quiz.description,
    deadline: quiz.deadline ? new Date(quiz.deadline).toISOString().slice(0, 16) : '',
    timeLimit: quiz.timeLimit || 30
  });
  const [regeneratingQuestionId, setRegeneratingQuestionId] = useState<string | null>(null);
  const [showRegenerateModal, setShowRegenerateModal] = useState(false);
  const [questionToRegenerate, setQuestionToRegenerate] = useState<string | null>(null);
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info' | 'confirm' | 'danger';
    onConfirm?: () => void;
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
    
    // Show confirmation modal
    setModalConfig({
      isOpen: true,
      title: 'Save Quiz Changes',
      message: 'Are you sure you want to save these changes to the quiz details?',
      type: 'confirm',
      onConfirm: async () => {
        try {
          const token = localStorage.getItem('token');
          
          // Prepare the data, converting empty deadline to null and ensuring timeLimit is a number
          const updatePayload = {
            ...quizData,
            deadline: quizData.deadline || null,
            timeLimit: typeof quizData.timeLimit === 'string' ? parseInt(quizData.timeLimit) || 30 : quizData.timeLimit
          };
          
          console.log('Sending quiz data:', updatePayload);
          const response = await fetch(`/api/quizzes/${quiz._id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(updatePayload),
          });

          if (response.ok) {
            const data = await response.json();
            quiz.title = data.quiz.title;
            quiz.description = data.quiz.description;
            quiz.deadline = data.quiz.deadline;
            quiz.timeLimit = data.quiz.timeLimit;
            setEditingQuiz(false);
            showModal('Success', 'Quiz updated successfully!', 'success');
          } else {
            showModal('Error', 'Failed to update quiz', 'error');
          }
        } catch (error) {
          console.error('Error updating quiz:', error);
          showModal('Error', 'Error updating quiz', 'error');
        }
      }
    });
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
    // Show danger confirmation modal
    setModalConfig({
      isOpen: true,
      title: 'Delete Question',
      message: 'Are you sure you want to delete this question? This action cannot be undone.',
      type: 'danger',
      onConfirm: async () => {
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
            showModal('Success', 'Question deleted successfully!', 'success');
          } else {
            showModal('Error', 'Failed to delete question', 'error');
          }
        } catch (error) {
          console.error('Error deleting question:', error);
          showModal('Error', 'Error deleting question', 'error');
        }
      }
    });
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
        showModal('Success', 'Question regenerated successfully!', 'success');
      } else {
        const errorData = await updateResponse.json();
        throw new Error(errorData.error || 'Failed to update question');
      }
    } catch (error: any) {
      console.error('Error regenerating question:', error);
      showModal('Error', `Failed to regenerate question: ${error.message}\n\nTip: Try adding a description to your quiz for better AI generation.`, 'error');
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
    
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    
    // Colors
    const primaryColor: [number, number, number] = [79, 70, 229]; // Indigo
    const successColor: [number, number, number] = [16, 185, 129]; // Emerald
    const textColor: [number, number, number] = [15, 23, 42]; // Dark slate
    const grayColor: [number, number, number] = [148, 163, 184]; // Gray
    
    let yPosition = margin;
    
    // Header with gradient effect (simulated with rectangles)
    doc.setFillColor(79, 70, 229);
    doc.rect(0, 0, pageWidth, 50, 'F');
    doc.setFillColor(139, 92, 246);
    doc.rect(0, 40, pageWidth, 10, 'F');
    
    // Title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    const titleLines = doc.splitTextToSize(quiz.title, contentWidth);
    doc.text(titleLines, pageWidth / 2, 25, { align: 'center' });
    
    yPosition = 65;
    
    // Description
    if (quiz.description) {
      doc.setTextColor(...grayColor);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'italic');
      const descLines = doc.splitTextToSize(quiz.description, contentWidth);
      doc.text(descLines, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += (descLines.length * 6) + 10;
    }
    
    // Quiz Info Box
    doc.setDrawColor(...primaryColor);
    doc.setFillColor(79, 70, 229, 10);
    doc.roundedRect(margin, yPosition, contentWidth, 15, 3, 3, 'FD');
    doc.setTextColor(...primaryColor);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Questions: ${questions.length}`, margin + 5, yPosition + 10);
    doc.text(`Quiz Type: Mixed`, pageWidth - margin - 5, yPosition + 10, { align: 'right' });
    
    yPosition += 25;
    
    // Questions
    questions.forEach((question, index) => {
      // Check if we need a new page
      const estimatedHeight = 40 + (question.answerChoices.length * 8);
      if (yPosition + estimatedHeight > pageHeight - margin) {
        doc.addPage();
        yPosition = margin;
      }
      
      // Question number and type badge
      doc.setFillColor(...primaryColor);
      doc.circle(margin + 5, yPosition + 3, 5, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(String(index + 1), margin + 5, yPosition + 5, { align: 'center' });
      
      // Question type badge
      const questionType = question.questionType === 'fill-in-blank' ? 'Fill in the Blank' :
                          question.questionType === 'true-false' ? 'True/False' : 'Multiple Choice';
      doc.setFillColor(139, 92, 246, 30);
      doc.setDrawColor(139, 92, 246);
      const badgeWidth = doc.getTextWidth(questionType) + 8;
      doc.roundedRect(margin + 15, yPosition - 2, badgeWidth, 8, 2, 2, 'FD');
      doc.setTextColor(139, 92, 246);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(questionType, margin + 19, yPosition + 3);
      
      yPosition += 12;
      
      // Question text
      doc.setTextColor(...textColor);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      const questionLines = doc.splitTextToSize(question.questionText, contentWidth - 10);
      doc.text(questionLines, margin + 5, yPosition);
      yPosition += (questionLines.length * 6) + 5;
      
      // Answers
      if (question.questionType === 'fill-in-blank') {
        // Fill in the blank answer
        doc.setFillColor(...successColor);
        doc.setDrawColor(...successColor);
        doc.roundedRect(margin + 10, yPosition - 3, contentWidth - 15, 10, 2, 2, 'D');
        
        doc.setTextColor(...successColor);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('✓ Answer:', margin + 15, yPosition + 3);
        
        doc.setFont('helvetica', 'normal');
        const answerText = String(question.correctAnswer);
        const answerLines = doc.splitTextToSize(answerText, contentWidth - 50);
        doc.text(answerLines, margin + 40, yPosition + 3);
        yPosition += 12;
      } else {
        // Multiple choice or true/false
        question.answerChoices.forEach((choice, choiceIndex) => {
          const isCorrect = question.correctAnswer === choiceIndex;
          const letter = String.fromCharCode(65 + choiceIndex);
          
          // Choice background
          if (isCorrect) {
            doc.setFillColor(...successColor, 15);
            doc.setDrawColor(...successColor);
            doc.roundedRect(margin + 10, yPosition - 3, contentWidth - 15, 10, 2, 2, 'FD');
          }
          
          // Letter badge
          if (isCorrect) {
            doc.setFillColor(...successColor);
            doc.circle(margin + 15, yPosition + 2, 4, 'F');
            doc.setTextColor(255, 255, 255);
          } else {
            doc.setDrawColor(...grayColor);
            doc.circle(margin + 15, yPosition + 2, 4, 'D');
            doc.setTextColor(...grayColor);
          }
          
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.text(letter, margin + 15, yPosition + 3.5, { align: 'center' });
          
          // Choice text
          doc.setTextColor(isCorrect ? successColor[0] : textColor[0], 
                          isCorrect ? successColor[1] : textColor[1], 
                          isCorrect ? successColor[2] : textColor[2]);
          doc.setFontSize(10);
          doc.setFont('helvetica', isCorrect ? 'bold' : 'normal');
          const choiceLines = doc.splitTextToSize(choice, contentWidth - 35);
          doc.text(choiceLines, margin + 23, yPosition + 3);
          
          // Checkmark for correct answer
          if (isCorrect) {
            doc.setTextColor(...successColor);
            doc.setFontSize(12);
            doc.text('✓', contentWidth + margin - 5, yPosition + 3);
          }
          
          yPosition += Math.max(10, choiceLines.length * 5 + 2);
        });
      }
      
      // Separator line
      yPosition += 5;
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 10;
    });
    
    // Footer on each page
    const pageCount = doc.internal.pages.length - 1;
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(...grayColor);
      doc.setFont('helvetica', 'italic');
      doc.text(`${quiz.title} - Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
      doc.text('Generated by QuizMate', pageWidth - margin, pageHeight - 10, { align: 'right' });
    }
    
    doc.save(`${quiz.title}.pdf`);
    showModal('Success', `Quiz exported successfully! File: ${quiz.title}.pdf`, 'success');
  };

  const exportToDOCX = async () => {
    try {
      const { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle, Table, TableRow, TableCell, WidthType, VerticalAlign, Packer } = await import('docx');
      const { saveAs } = await import('file-saver');

      const children: any[] = [];

      // Title
      children.push(
        new Paragraph({
          text: quiz.title,
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 }
        })
      );

      // Description
      if (quiz.description) {
        children.push(
          new Paragraph({
            text: quiz.description,
            alignment: AlignmentType.CENTER,
            spacing: { after: 600 }
          })
        );
      }

      // Quiz Info
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `Total Questions: ${questions.length}`,
              bold: true
            })
          ],
          spacing: { after: 400 }
        })
      );

      // Add each question
      questions.forEach((question, index) => {
        // Question number and type
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `Question ${index + 1}`,
                bold: true,
                size: 28
              }),
              new TextRun({
                text: ` (${question.questionType === 'fill-in-blank' ? 'Fill in the Blank' : question.questionType === 'true-false' ? 'True/False' : 'Multiple Choice'})`,
                italics: true,
                size: 24
              })
            ],
            spacing: { before: 400, after: 200 }
          })
        );

        // Question text
        children.push(
          new Paragraph({
            text: question.questionText,
            spacing: { after: 200 }
          })
        );

        // Answer choices or fill-in-blank answer
        if (question.questionType === 'fill-in-blank') {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: 'Answer: ',
                  bold: true
                }),
                new TextRun({
                  text: String(question.correctAnswer),
                  color: '10B981'
                })
              ],
              spacing: { after: 200 }
            })
          );
        } else {
          // Multiple choice or true/false
          question.answerChoices.forEach((choice, choiceIndex) => {
            const isCorrect = question.correctAnswer === choiceIndex;
            children.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: `${String.fromCharCode(65 + choiceIndex)}. `,
                    bold: true
                  }),
                  new TextRun({
                    text: choice,
                    color: isCorrect ? '10B981' : '000000',
                    bold: isCorrect
                  }),
                  ...(isCorrect ? [new TextRun({ text: ' ✓', color: '10B981', bold: true })] : [])
                ],
                spacing: { after: 100 }
              })
            );
          });
        }

        // Add spacing after question
        children.push(
          new Paragraph({
            text: '',
            spacing: { after: 200 },
            border: {
              bottom: {
                color: 'E5E7EB',
                space: 1,
                style: BorderStyle.SINGLE,
                size: 6
              }
            }
          })
        );
      });

      // Create document
      const doc = new Document({
        sections: [{
          properties: {},
          children: children
        }]
      });

      // Generate and save
      const blob = await Packer.toBlob(doc);
      saveAs(blob, `${quiz.title}.docx`);
      
      showModal('Success', `Quiz exported successfully! File: ${quiz.title}_quiz.docx`, 'success');
    } catch (error) {
      console.error('Error exporting to DOCX:', error);
      showModal('Error', 'Failed to export to DOCX. Please try again.', 'error');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-white text-xl">Loading questions...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0F172A' }}>
      {/* Modern Header */}
      <header 
        className="border-b-2 backdrop-blur-xl sticky top-0 z-50"
        style={{
          background: 'rgba(15, 23, 42, 0.8)',
          borderColor: 'rgba(79, 70, 229, 0.3)',
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.2)'
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between py-6 gap-4">
            {/* Left Section */}
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
                <h1 className="text-2xl md:text-3xl font-bold text-white">{quiz.title}</h1>
                {quiz.description && (
                  <p className="text-sm text-gray-400 mt-1">{quiz.description}</p>
                )}
              </div>
            </div>

            {/* Right Section - Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setEditingQuiz(true)}
                className="px-4 py-2 rounded-xl font-semibold text-white transition-all duration-200 hover:scale-105 flex items-center gap-2"
                style={{
                  background: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)',
                  boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)'
                }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit Quiz
              </button>
              <button
                onClick={exportToDOCX}
                className="px-4 py-2 rounded-xl font-semibold transition-all duration-200 hover:scale-105 flex items-center gap-2"
                style={{
                  backgroundColor: 'rgba(52, 211, 153, 0.2)',
                  border: '2px solid rgba(52, 211, 153, 0.3)',
                  color: '#34D399'
                }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                DOCX
              </button>
              <button
                onClick={exportToPDF}
                className="px-4 py-2 rounded-xl font-semibold transition-all duration-200 hover:scale-105 flex items-center gap-2"
                style={{
                  backgroundColor: 'rgba(139, 92, 246, 0.2)',
                  border: '2px solid rgba(139, 92, 246, 0.3)',
                  color: '#A78BFA'
                }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                PDF
              </button>
              <button
                onClick={() => setShowCreateForm(true)}
                className="px-6 py-2 rounded-xl font-semibold text-white transition-all duration-200 hover:scale-105 flex items-center gap-2"
                style={{
                  background: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)',
                  boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)'
                }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
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
            <div 
              className="rounded-2xl p-8 mb-8 border-2"
              style={{
                background: 'rgba(15, 23, 42, 0.6)',
                borderColor: 'rgba(139, 92, 246, 0.4)',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 8px 32px rgba(139, 92, 246, 0.2)'
              }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)' }}
                >
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white">
                  Edit Quiz Details
                </h3>
              </div>
              <form onSubmit={updateQuiz} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    Quiz Title
                  </label>
                  <input
                    type="text"
                    required
                    value={quizData.title}
                    onChange={(e) => setQuizData({ ...quizData, title: e.target.value })}
                    className="block w-full px-4 py-3 rounded-xl text-white transition-all duration-200 focus:outline-none focus:ring-2"
                    style={{
                      backgroundColor: 'rgba(30, 41, 59, 0.5)',
                      borderWidth: '2px',
                      borderStyle: 'solid',
                      borderColor: 'rgba(79, 70, 229, 0.3)',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#4F46E5';
                      e.target.style.boxShadow = '0 0 0 3px rgba(79, 70, 229, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(79, 70, 229, 0.3)';
                      e.target.style.boxShadow = 'none';
                    }}
                    placeholder="Enter quiz title"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    Description (Optional)
                  </label>
                  <textarea
                    value={quizData.description}
                    onChange={(e) => setQuizData({ ...quizData, description: e.target.value })}
                    className="block w-full px-4 py-3 rounded-xl text-white transition-all duration-200 focus:outline-none focus:ring-2"
                    style={{
                      backgroundColor: 'rgba(30, 41, 59, 0.5)',
                      borderWidth: '2px',
                      borderStyle: 'solid',
                      borderColor: 'rgba(79, 70, 229, 0.3)',
                    }}
                    rows={3}
                    placeholder="Enter quiz description"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                      Deadline (Optional)
                    </label>
                    <input
                      type="datetime-local"
                      value={quizData.deadline}
                      min={new Date().toISOString().slice(0, 16)}
                      onChange={(e) => setQuizData({ ...quizData, deadline: e.target.value })}
                      className="block w-full px-4 py-3 rounded-xl text-white transition-all duration-200 focus:outline-none focus:ring-2"
                      style={{
                        backgroundColor: 'rgba(30, 41, 59, 0.5)',
                        borderWidth: '2px',
                        borderStyle: 'solid',
                        borderColor: 'rgba(79, 70, 229, 0.3)',
                      }}
                    />
                    <p className="text-xs text-gray-400 mt-1">Learners cannot submit after this date</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                      Time Limit (minutes)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="480"
                      value={quizData.timeLimit}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Allow empty string while typing, otherwise parse the number
                        setQuizData({ ...quizData, timeLimit: value === '' ? '' : parseInt(value) || 1 });
                      }}
                      onBlur={(e) => {
                        // On blur, if empty, set to default 30
                        if (e.target.value === '') {
                          setQuizData({ ...quizData, timeLimit: 30 });
                        }
                      }}
                      className="block w-full px-4 py-3 rounded-xl text-white transition-all duration-200 focus:outline-none focus:ring-2"
                      style={{
                        backgroundColor: 'rgba(30, 41, 59, 0.5)',
                        borderWidth: '2px',
                        borderStyle: 'solid',
                        borderColor: 'rgba(79, 70, 229, 0.3)',
                      }}
                      placeholder="30"
                    />
                    <p className="text-xs text-gray-400 mt-1">Time allowed once quiz is started</p>
                  </div>
                </div>
                
                <div className="flex space-x-3">
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:scale-105"
                    style={{
                      background: 'linear-gradient(135deg, #34D399 0%, #10B981 100%)',
                      boxShadow: '0 4px 12px rgba(52, 211, 153, 0.3)'
                    }}
                  >
                    💾 Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingQuiz(false);
                      setQuizData({ 
                        title: quiz.title, 
                        description: quiz.description,
                        deadline: quiz.deadline ? new Date(quiz.deadline).toISOString().slice(0, 16) : '',
                        timeLimit: quiz.timeLimit || 30
                      });
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
                    className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:scale-105"
                    style={{
                      background: 'linear-gradient(135deg, #34D399 0%, #10B981 100%)',
                      boxShadow: '0 4px 12px rgba(52, 211, 153, 0.3)'
                    }}
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
          <div className="space-y-6">
            {questions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div 
                  className="w-24 h-24 rounded-full flex items-center justify-center mb-6"
                  style={{
                    background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)',
                    border: '2px solid rgba(79, 70, 229, 0.3)'
                  }}
                >
                  <svg className="w-12 h-12 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">No Questions Yet</h3>
                <p className="text-gray-400 text-center max-w-md mb-6">
                  Click "Add Question" to get started building your quiz!
                </p>
              </div>
            ) : (
              questions.map((question, index) => (
                <div 
                  key={question._id}
                  className="group relative overflow-hidden rounded-2xl border-2 backdrop-blur-xl transition-all duration-300 hover:shadow-2xl"
                  style={{
                    background: 'rgba(15, 23, 42, 0.6)',
                    borderColor: 'rgba(79, 70, 229, 0.2)',
                    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.2)'
                  }}
                >
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{
                      background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%)'
                    }}
                  />
                  
                  <div className="relative p-6">
                    {/* Question Header */}
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
                      <div className="flex-1">
                        <div className="flex items-start gap-4 mb-3">
                          <div 
                            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-white"
                            style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #8B5CF6 100%)' }}
                          >
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <h3 className="text-xl font-bold text-white mb-2">
                              {question.questionText}
                            </h3>
                            <span 
                              className="inline-block text-xs px-3 py-1 rounded-lg font-semibold"
                              style={{
                                backgroundColor: question.questionType === 'fill-in-blank' ? 'rgba(52, 211, 153, 0.2)' :
                                                question.questionType === 'true-false' ? 'rgba(139, 92, 246, 0.2)' :
                                                'rgba(79, 70, 229, 0.2)',
                                color: question.questionType === 'fill-in-blank' ? '#34D399' :
                                       question.questionType === 'true-false' ? '#A78BFA' :
                                       '#A5B4FC'
                              }}
                            >
                              {question.questionType === 'fill-in-blank' ? 'Fill in the Blank' :
                               question.questionType === 'true-false' ? 'True/False' :
                               'Multiple Choice'}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => openRegenerateModal(question._id)}
                          disabled={regeneratingQuestionId === question._id}
                          className="px-4 py-2 rounded-xl font-semibold transition-all duration-200 hover:scale-105 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{
                            backgroundColor: 'rgba(52, 211, 153, 0.2)',
                            border: '2px solid rgba(52, 211, 153, 0.3)',
                            color: '#34D399'
                          }}
                          title="Regenerate this question with AI"
                        >
                          {regeneratingQuestionId === question._id ? (
                            <>
                              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                              <span className="hidden sm:inline">Regenerating...</span>
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                              <span className="hidden sm:inline">Regenerate</span>
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => setEditingQuestion(question)}
                          className="px-4 py-2 rounded-xl font-semibold transition-all duration-200 hover:scale-105 flex items-center gap-2"
                          style={{
                            backgroundColor: 'rgba(139, 92, 246, 0.2)',
                            border: '2px solid rgba(139, 92, 246, 0.3)',
                            color: '#A78BFA'
                          }}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          <span className="hidden sm:inline">Edit</span>
                        </button>
                        <button
                          onClick={() => deleteQuestion(question._id)}
                          className="px-4 py-2 rounded-xl font-semibold transition-all duration-200 hover:scale-105 flex items-center gap-2"
                          style={{
                            backgroundColor: 'rgba(239, 68, 68, 0.2)',
                            border: '2px solid rgba(239, 68, 68, 0.3)',
                            color: '#F87171'
                          }}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          <span className="hidden sm:inline">Delete</span>
                        </button>
                      </div>
                    </div>
                    
                    {/* Answer Display */}
                    {question.questionType === 'fill-in-blank' ? (
                      <div 
                        className="p-4 rounded-xl border-2"
                        style={{
                          backgroundColor: 'rgba(52, 211, 153, 0.1)',
                          borderColor: 'rgba(52, 211, 153, 0.3)'
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <svg className="w-5 h-5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span className="font-semibold text-emerald-300">Correct Answer:</span>
                          <span className="text-white font-medium">{question.correctAnswer}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {question.answerChoices.map((choice, choiceIndex) => (
                          <div
                            key={choiceIndex}
                            className="p-4 rounded-xl border-2 transition-all duration-200"
                            style={{
                              backgroundColor: question.correctAnswer === choiceIndex 
                                ? 'rgba(52, 211, 153, 0.1)' 
                                : 'rgba(30, 41, 59, 0.5)',
                              borderColor: question.correctAnswer === choiceIndex 
                                ? 'rgba(52, 211, 153, 0.4)' 
                                : 'rgba(79, 70, 229, 0.2)'
                            }}
                          >
                            <div className="flex items-center gap-3">
                              <span 
                                className="w-8 h-8 rounded-lg flex items-center justify-center font-bold flex-shrink-0"
                                style={{
                                  backgroundColor: question.correctAnswer === choiceIndex 
                                    ? 'rgba(52, 211, 153, 0.3)' 
                                    : 'rgba(79, 70, 229, 0.2)',
                                  color: question.correctAnswer === choiceIndex 
                                    ? '#34D399' 
                                    : '#A5B4FC'
                                }}
                              >
                                {String.fromCharCode(65 + choiceIndex)}
                              </span>
                              <span className={question.correctAnswer === choiceIndex ? 'text-white font-medium' : 'text-gray-300'}>
                                {choice}
                              </span>
                              {question.correctAnswer === choiceIndex && (
                                <svg className="w-5 h-5 text-emerald-400 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* Regenerate Confirmation Modal */}
      {showRegenerateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div 
            className="rounded-3xl p-8 max-w-md w-full border-2 shadow-2xl"
            style={{
              background: 'rgba(15, 23, 42, 0.95)',
              borderColor: 'rgba(52, 211, 153, 0.4)',
              boxShadow: '0 25px 50px rgba(52, 211, 153, 0.2)'
            }}
          >
            <div className="flex items-center gap-4 mb-6">
              <div 
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, #34D399 0%, #10B981 100%)'
                }}
              >
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                className="flex-1 px-6 py-3 rounded-xl font-semibold text-white transition-all duration-200 hover:scale-105 flex items-center justify-center gap-2"
                style={{
                  background: 'linear-gradient(135deg, #34D399 0%, #10B981 100%)',
                  boxShadow: '0 4px 12px rgba(52, 211, 153, 0.3)'
                }}
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

      {/* Global Modal */}
      <Modal
        isOpen={modalConfig.isOpen}
        onClose={closeModal}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        onConfirm={modalConfig.onConfirm}
      />
    </div>
  );
};

export default QuestionManager;