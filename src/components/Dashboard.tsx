'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import QuestionManager from './QuestionManager';
import QuizTaker from './QuizTaker';
import Modal from './Modal';

interface Quiz {
  _id: string;
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  deadline?: string;
  timeLimit?: number;
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
  const { user, logout, updateUser } = useAuth();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAICreateModal, setShowAICreateModal] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [viewingSubmissions, setViewingSubmissions] = useState<Quiz | null>(null);
  const [aiQuizData, setAiQuizData] = useState<{
    title: string;
    description: string;
    difficulty: 'easy' | 'moderate' | 'challenging';
    questionTypes: string[];
    numberOfQuestions: number;
    questions: any[];
    sourceText: string;
    classId?: string;
    deadline?: string;
    timeLimit?: number;
  } | null>(null);
  const [showAIPreview, setShowAIPreview] = useState(false);
  const [activeView, setActiveView] = useState<'home' | 'quizzes' | 'classes' | 'analytics' | 'settings'>(() => {
    // Load saved view from localStorage on initial render
    if (typeof window !== 'undefined') {
      const savedView = localStorage.getItem('dashboardActiveView');
      if (savedView && ['home', 'quizzes', 'classes', 'analytics', 'settings'].includes(savedView)) {
        return savedView as 'home' | 'quizzes' | 'classes' | 'analytics' | 'settings';
      }
    }
    return 'home';
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    totalQuizzes: 0,
    totalPlays: 0,
    averageScore: 0,
    engagement: 0
  });
  const [weeklyPerformance, setWeeklyPerformance] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
  const [quizPerformance, setQuizPerformance] = useState<{ quizId: string; title: string; avgScore: number }[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [editingUsername, setEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [savingUsername, setSavingUsername] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);
  const [showCreateClassModal, setShowCreateClassModal] = useState(false);
  const [showJoinClassModal, setShowJoinClassModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>(() => {
    // Load saved class filter from localStorage on initial render
    if (typeof window !== 'undefined') {
      const savedFilter = localStorage.getItem('dashboardClassFilter');
      return savedFilter || 'all';
    }
    return 'all';
  });
  const [quizSubmissionCounts, setQuizSubmissionCounts] = useState<{ [quizId: string]: number }>({});
  const [learnerSubmissions, setLearnerSubmissions] = useState<{ [quizId: string]: any }>({});
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  const [isSyncing, setIsSyncing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'info' | 'success' } | null>(null);

  
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

  useEffect(() => {
    // Initial fetch
    fetchQuizzes();
    fetchStats();
    fetchClasses();
    fetchNotifications();
    fetchSubmissionCounts();
    fetchLearnerSubmissions();
    calculateAnalytics();
  }, []);

  // Recalculate analytics when switching to analytics view
  useEffect(() => {
    if (activeView === 'analytics') {
      calculateAnalytics();
    }
  }, [activeView]);

  // Separate effect for polling that checks modal state
  useEffect(() => {
    const checkModalState = () => {
      return showAICreateModal || showAIPreview || selectedQuiz || viewingSubmissions || 
             showCreateClassModal || showJoinClassModal || selectedClass || modalConfig.isOpen;
    };
    
    // Real-time polling intervals - pause when modals are open or user is typing
    const notificationInterval = setInterval(() => {
      if (!checkModalState()) {
        fetchNotifications();
      }
    }, 10000); // Every 10 seconds
    
    const quizInterval = setInterval(() => {
      if (!checkModalState()) {
        fetchQuizzes(true);
      }
    }, 15000); // Every 15 seconds
    
    const classInterval = setInterval(() => {
      if (!checkModalState()) {
        fetchClasses();
      }
    }, 20000); // Every 20 seconds
    
    const submissionInterval = setInterval(() => {
      if (!checkModalState()) {
        if (user?.role === 'instructor') {
          fetchSubmissionCounts();
          fetchStats();
        } else if (user?.role === 'learner') {
          fetchLearnerSubmissions();
          fetchStats();
        }
      }
    }, 15000); // Every 15 seconds
    
    return () => {
      clearInterval(notificationInterval);
      clearInterval(quizInterval);
      clearInterval(classInterval);
      clearInterval(submissionInterval);
    };
  }, [user?.role, showAICreateModal, showAIPreview, selectedQuiz, viewingSubmissions, showCreateClassModal, showJoinClassModal, selectedClass, modalConfig.isOpen]);

  // Save activeView to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('dashboardActiveView', activeView);
  }, [activeView]);

  // Save selectedClassFilter to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('dashboardClassFilter', selectedClassFilter);
  }, [selectedClassFilter]);

  // Close notifications dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showNotifications && !target.closest('.notifications-dropdown')) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotifications]);

  const fetchClasses = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/classes', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setClasses(data.classes);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/notifications', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const markNotificationsAsRead = async (notificationIds?: string[]) => {
    try {
      const token = localStorage.getItem('token');
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ notificationIds }),
      });
      
      await fetchNotifications();
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  const fetchSubmissionCounts = async () => {
    if (user?.role !== 'instructor') return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/quiz-submissions', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        const submissions = data.submissions || [];
        
        // Count submissions per quiz
        const counts: { [quizId: string]: number } = {};
        submissions.forEach((sub: any) => {
          const quizId = sub.quizId?._id || sub.quizId;
          if (quizId) {
            counts[quizId] = (counts[quizId] || 0) + 1;
          }
        });
        
        setQuizSubmissionCounts(counts);
      }
    } catch (error) {
      console.error('Error fetching submission counts:', error);
    }
  };

  const fetchLearnerSubmissions = async () => {
    if (user?.role !== 'learner') return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/quiz-submissions', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        const submissions = data.submissions || [];
        
        // Map submissions by quizId
        const submissionMap: { [quizId: string]: any } = {};
        submissions.forEach((sub: any) => {
          const quizId = sub.quizId?._id || sub.quizId;
          if (quizId) {
            submissionMap[quizId] = sub;
          }
        });
        
        setLearnerSubmissions(submissionMap);
      }
    } catch (error) {
      console.error('Error fetching learner submissions:', error);
    }
  };

  const calculateAnalytics = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/quiz-submissions', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        const submissions = data.submissions || [];
        
        // Calculate weekly performance (last 7 days)
        const today = new Date();
        const weeklyScores: number[] = [0, 0, 0, 0, 0, 0, 0];
        const weeklyCounts: number[] = [0, 0, 0, 0, 0, 0, 0];
        
        submissions.forEach((sub: any) => {
          const subDate = new Date(sub.submittedAt || sub.createdAt);
          const daysDiff = Math.floor((today.getTime() - subDate.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysDiff >= 0 && daysDiff < 7) {
            const dayIndex = 6 - daysDiff; // Most recent day is index 6
            weeklyScores[dayIndex] += sub.score || 0;
            weeklyCounts[dayIndex]++;
          }
        });
        
        // Calculate averages
        const weeklyAvg = weeklyScores.map((total, i) => 
          weeklyCounts[i] > 0 ? Math.round(total / weeklyCounts[i]) : 0
        );
        setWeeklyPerformance(weeklyAvg);
        
        // Calculate quiz performance
        const quizScores: { [quizId: string]: { title: string; scores: number[] } } = {};
        
        submissions.forEach((sub: any) => {
          const quizId = sub.quizId?._id || sub.quizId;
          const quizTitle = sub.quizId?.title || 'Unknown Quiz';
          
          if (quizId) {
            if (!quizScores[quizId]) {
              quizScores[quizId] = { title: quizTitle, scores: [] };
            }
            quizScores[quizId].scores.push(sub.score || 0);
          }
        });
        
        // Calculate average scores per quiz
        const quizPerf = Object.entries(quizScores)
          .map(([quizId, data]) => ({
            quizId,
            title: data.title,
            avgScore: Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length)
          }))
          .sort((a, b) => b.avgScore - a.avgScore)
          .slice(0, 5);
        
        setQuizPerformance(quizPerf);
      }
    } catch (error) {
      console.error('Error calculating analytics:', error);
    }
  };

  const showModal = (title: string, message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    setModalConfig({
      isOpen: true,
      title,
      message,
      type
    });
  };

  const showConfirmModal = (title: string, message: string, onConfirm: () => void) => {
    setModalConfig({
      isOpen: true,
      title,
      message,
      type: 'confirm',
      onConfirm
    });
  };

  const showDangerModal = (title: string, message: string, onConfirm: () => void) => {
    setModalConfig({
      isOpen: true,
      title,
      message,
      type: 'danger',
      onConfirm
    });
  };

  const closeModal = () => {
    setModalConfig(prev => ({ ...prev, isOpen: false }));
  };

  const handleLogout = () => {
    showConfirmModal(
      'Confirm Logout',
      'Are you sure you want to log out?',
      () => logout()
    );
  };

  const fetchQuizzes = async (showSync = false) => {
    try {
      if (showSync) setIsSyncing(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/quizzes', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const newQuizzes = data.quizzes;
        
        // Check for new quizzes (only show toast if polling, not initial load)
        if (showSync && quizzes.length > 0 && newQuizzes.length > quizzes.length) {
          const newCount = newQuizzes.length - quizzes.length;
          setToast({
            message: `${newCount} new quiz${newCount > 1 ? 'es' : ''} available!`,
            type: 'info'
          });
          setTimeout(() => setToast(null), 3000);
        }
        
        setQuizzes(newQuizzes);
        setStats(prev => ({ ...prev, totalQuizzes: newQuizzes.length }));
        if (showSync) setLastSyncTime(new Date());
      }
    } catch (error) {
      console.error('Error fetching quizzes:', error);
    } finally {
      setLoading(false);
      if (showSync) {
        setTimeout(() => setIsSyncing(false), 500);
      }
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

  const exportAnalyticsReport = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch all submissions for detailed report
      const response = await fetch('/api/quiz-submissions', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (!response.ok) {
        showModal('Error', 'Failed to fetch analytics data', 'error');
        return;
      }
      
      const data = await response.json();
      const submissions = data.submissions || [];
      
      // Prepare CSV data
      const csvRows = [];
      
      // Header row
      csvRows.push([
        'Quiz Title',
        'Student Name',
        'Student Email',
        'Score (%)',
        'Total Questions',
        'Correct Answers',
        'Submission Date',
        'Time Taken'
      ].join(','));
      
      // Data rows
      for (const submission of submissions) {
        const quizTitle = submission.quizId?.title || 'Unknown Quiz';
        const studentName = submission.userId?.username || 'Unknown';
        const studentEmail = submission.userId?.email || 'N/A';
        const score = submission.score || 0;
        const totalQuestions = Object.keys(submission.answers || {}).length;
        const correctAnswers = Math.round((score / 100) * totalQuestions);
        const submissionDate = new Date(submission.submittedAt).toLocaleString();
        const timeTaken = 'N/A'; // Can be calculated if you track start time
        
        csvRows.push([
          `"${quizTitle}"`,
          `"${studentName}"`,
          `"${studentEmail}"`,
          score,
          totalQuestions,
          correctAnswers,
          `"${submissionDate}"`,
          timeTaken
        ].join(','));
      }
      
      // Add summary statistics
      csvRows.push('');
      csvRows.push('Summary Statistics');
      csvRows.push(`Total Quizzes,${quizzes.length}`);
      csvRows.push(`Total Submissions,${submissions.length}`);
      csvRows.push(`Average Score,${stats.averageScore}%`);
      csvRows.push(`Engagement Rate,${stats.engagement}%`);
      
      // Create CSV content
      const csvContent = csvRows.join('\n');
      
      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `analytics_report_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log('✅ Analytics report exported successfully');
      showModal('Success', `Analytics report exported successfully! File: analytics_report_${new Date().toISOString().split('T')[0]}.csv`, 'success');
    } catch (error) {
      console.error('Error exporting analytics:', error);
      showModal('Error', 'Failed to export analytics report', 'error');
    }
  };

  const deleteQuiz = (quizId: string) => {
    const quizToDelete = quizzes.find(q => q._id === quizId);
    const quizTitle = quizToDelete?.title || 'this quiz';
    
    showDangerModal(
      'Delete Quiz',
      `Are you sure you want to delete "${quizTitle}"? This action cannot be undone.`,
      async () => {
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
            showModal('Success', `Quiz "${quizTitle}" deleted successfully`, 'success');
          } else {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            console.error('Delete quiz failed:', response.status, errorData);
            showModal('Error', `Failed to delete quiz: ${errorData.error || 'Unknown error'}`, 'error');
          }
        } catch (error) {
          console.error('Error deleting quiz:', error);
          showModal('Error', 'An error occurred while deleting the quiz', 'error');
        }
      }
    );
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
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [quizDeadline, setQuizDeadline] = useState<string>('');
    const [quizTimeLimit, setQuizTimeLimit] = useState<number>(30);

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
          sourceText: text,
          classId: selectedClassId || undefined,
          deadline: quizDeadline || undefined,
          timeLimit: quizTimeLimit
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
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 md:p-8">
        <div 
          className="rounded-3xl w-full max-w-4xl border-2 shadow-2xl overflow-hidden"
          style={{
            background: 'rgba(15, 23, 42, 0.98)',
            borderColor: 'rgba(79, 70, 229, 0.4)',
            boxShadow: '0 25px 50px rgba(79, 70, 229, 0.3)',
            maxHeight: '90vh'
          }}
        >
          {/* Header */}
          <div 
            className="p-6 border-b"
            style={{
              background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)',
              borderColor: 'rgba(79, 70, 229, 0.3)'
            }}
          >
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">AI Quiz Generator</h3>
                  <p className="text-sm text-gray-400">Create quizzes from your documents instantly</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowAICreateModal(false);
                  setFile(null);
                  setText('');
                  setError('');
                  setStep('upload');
                }}
                className="p-2 rounded-xl transition-all duration-200 hover:scale-110"
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.2)',
                  border: '2px solid rgba(239, 68, 68, 0.3)',
                  color: '#F87171'
                }}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {step === 'upload' && (
            <div className="p-6 md:p-8 space-y-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 120px)' }}>
              {/* File Upload Section */}
              <div>
                <label className="block text-sm font-semibold text-white mb-3">
                  📄 Upload Document
                </label>
                <div 
                  className="relative border-2 border-dashed rounded-2xl p-6 md:p-8 text-center transition-all duration-200 cursor-pointer hover:scale-[1.02]"
                  style={{
                    borderColor: file ? 'rgba(52, 211, 153, 0.4)' : 'rgba(79, 70, 229, 0.4)',
                    backgroundColor: file ? 'rgba(52, 211, 153, 0.1)' : 'rgba(79, 70, 229, 0.1)'
                  }}
                >
                  <input
                    type="file"
                    accept=".txt,.pdf,.docx"
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  {!file ? (
                    <div>
                      <div 
                        className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                        style={{
                          background: 'linear-gradient(135deg, #4F46E5 0%, #8B5CF6 100%)'
                        }}
                      >
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                      </div>
                      <p className="text-white font-semibold mb-2">Click to upload or drag and drop</p>
                      <p className="text-sm text-gray-400">TXT, PDF, DOCX (max 10MB)</p>
                    </div>
                  ) : (
                    <div>
                      <div 
                        className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                        style={{
                          background: 'linear-gradient(135deg, #34D399 0%, #10B981 100%)'
                        }}
                      >
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <p className="text-white font-semibold mb-2">{file.name}</p>
                      <p className="text-sm text-emerald-400">File uploaded successfully!</p>
                    </div>
                  )}
                </div>
              </div>

              {text && (
                <>
                  {/* Content Preview */}
                  <div>
                    <label className="block text-sm font-semibold text-white mb-3">
                      📖 Content Preview
                    </label>
                    <div 
                      className="rounded-2xl p-4 border-2"
                      style={{
                        backgroundColor: 'rgba(30, 41, 59, 0.5)',
                        borderColor: 'rgba(79, 70, 229, 0.3)'
                      }}
                    >
                      <textarea
                        value={text.substring(0, 300) + (text.length > 300 ? '...' : '')}
                        readOnly
                        className="w-full h-20 md:h-24 bg-transparent text-gray-300 text-sm resize-none focus:outline-none"
                      />
                      <div className="flex items-center gap-4 mt-2 pt-2 border-t" style={{ borderColor: 'rgba(79, 70, 229, 0.2)' }}>
                        <span className="text-xs text-indigo-400 font-medium">
                          📝 {text.length} characters
                        </span>
                        <span className="text-xs text-indigo-400 font-medium">
                          📄 {text.split(/\s+/).length} words
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Class Selection */}
                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-white mb-3">
                      🏫 Assign to Class (Optional)
                    </label>
                    <select
                      value={selectedClassId}
                      onChange={(e) => setSelectedClassId(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl text-white focus:outline-none transition-all duration-200"
                      style={{
                        backgroundColor: 'rgba(79, 70, 229, 0.1)',
                        border: '2px solid rgba(79, 70, 229, 0.3)'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#4F46E5';
                        e.target.style.boxShadow = '0 0 0 4px rgba(79, 70, 229, 0.2)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = 'rgba(79, 70, 229, 0.3)';
                        e.target.style.boxShadow = 'none';
                      }}
                    >
                      <option value="" style={{ backgroundColor: '#0F172A' }}>No class (Personal quiz)</option>
                      {classes.map((classItem) => (
                        <option key={classItem._id} value={classItem._id} style={{ backgroundColor: '#0F172A' }}>
                          {classItem.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-400 mt-2">
                      Select a class to make this quiz available to students, or leave unselected for personal use
                    </p>
                  </div>

                  {/* Settings Grid - Two columns on larger screens */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Difficulty Level */}
                    <div>
                      <label className="block text-sm font-semibold text-white mb-3">
                        🎯 Difficulty Level
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['easy', 'moderate', 'challenging'] as const).map((level) => {
                          const isSelected = difficulty === level;
                          return (
                            <button
                              key={level}
                              type="button"
                              onClick={() => setDifficulty(level)}
                              className="px-3 py-3 rounded-xl font-semibold text-xs transition-all duration-200 hover:scale-105"
                              style={{
                                background: isSelected 
                                  ? 'linear-gradient(135deg, #4F46E5 0%, #8B5CF6 100%)'
                                  : 'rgba(79, 70, 229, 0.1)',
                                border: isSelected 
                                  ? '2px solid rgba(79, 70, 229, 0.6)'
                                  : '2px solid rgba(79, 70, 229, 0.3)',
                                color: isSelected ? '#FFFFFF' : '#A5B4FC',
                                boxShadow: isSelected ? '0 4px 12px rgba(79, 70, 229, 0.3)' : 'none'
                              }}
                            >
                              {level.charAt(0).toUpperCase() + level.slice(1)}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Number of Questions */}
                    <div>
                      <label className="block text-sm font-semibold text-white mb-3">
                        🔢 Number of Questions
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          max="50"
                          value={numberOfQuestions}
                          onChange={(e) => setNumberOfQuestions(Math.max(1, Math.min(50, parseInt(e.target.value) || 10)))}
                          className="w-20 px-3 py-3 rounded-xl text-white font-bold text-center focus:outline-none transition-all duration-200"
                          style={{
                            backgroundColor: 'rgba(79, 70, 229, 0.2)',
                            border: '2px solid rgba(79, 70, 229, 0.4)',
                            boxShadow: '0 2px 8px rgba(79, 70, 229, 0.2)'
                          }}
                          onFocus={(e) => {
                            e.target.style.borderColor = '#4F46E5';
                            e.target.style.boxShadow = '0 0 0 4px rgba(79, 70, 229, 0.2)';
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = 'rgba(79, 70, 229, 0.4)';
                            e.target.style.boxShadow = '0 2px 8px rgba(79, 70, 229, 0.2)';
                          }}
                        />
                        <div className="flex gap-2 flex-1">
                          {[5, 10, 20, 30].map((num) => (
                            <button
                              key={num}
                              type="button"
                              onClick={() => setNumberOfQuestions(num)}
                              className="flex-1 px-2 py-2 rounded-lg font-semibold text-xs transition-all duration-200 hover:scale-105"
                              style={{
                                backgroundColor: numberOfQuestions === num 
                                  ? 'rgba(139, 92, 246, 0.3)'
                                  : 'rgba(79, 70, 229, 0.1)',
                                border: numberOfQuestions === num 
                                  ? '2px solid rgba(139, 92, 246, 0.5)'
                                  : '2px solid rgba(79, 70, 229, 0.2)',
                                color: numberOfQuestions === num ? '#A78BFA' : '#6B7280'
                              }}
                            >
                              {num}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Question Types */}
                  <div>
                    <label className="block text-sm font-semibold text-white mb-3">
                      ❓ Question Types
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {[
                        { value: 'multiple-choice', label: 'Multiple Choice', icon: '📝', color: '#4F46E5' },
                        { value: 'true-false', label: 'True or False', icon: '✓✗', color: '#8B5CF6' },
                        { value: 'fill-in-blank', label: 'Fill in the Blank', icon: '✍️', color: '#34D399' }
                      ].map((type) => {
                        const isSelected = selectedQuestionTypes.includes(type.value);
                        return (
                          <button
                            key={type.value}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                setSelectedQuestionTypes(selectedQuestionTypes.filter(t => t !== type.value));
                              } else {
                                setSelectedQuestionTypes([...selectedQuestionTypes, type.value]);
                              }
                            }}
                            className="w-full flex flex-col md:flex-row items-center gap-3 p-4 rounded-xl transition-all duration-200 hover:scale-[1.02]"
                            style={{
                              background: isSelected 
                                ? `linear-gradient(135deg, ${type.color}20 0%, ${type.color}10 100%)`
                                : 'rgba(30, 41, 59, 0.5)',
                              border: isSelected 
                                ? `2px solid ${type.color}80`
                                : '2px solid rgba(79, 70, 229, 0.2)',
                              boxShadow: isSelected ? `0 4px 12px ${type.color}30` : 'none'
                            }}
                          >
                            <div 
                              className="w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0"
                              style={{
                                backgroundColor: isSelected ? `${type.color}30` : 'rgba(79, 70, 229, 0.2)'
                              }}
                            >
                              {type.icon}
                            </div>
                            <span className={`font-semibold text-sm flex-1 text-left ${isSelected ? 'text-white' : 'text-gray-400'}`}>
                              {type.label}
                            </span>
                            {isSelected && (
                              <div 
                                className="w-6 h-6 rounded-full flex items-center justify-center"
                                style={{ backgroundColor: type.color }}
                              >
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    {selectedQuestionTypes.length === 0 && (
                      <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        Please select at least one question type
                      </p>
                    )}
                  </div>

                </>
              )}

              {/* Error Message */}
              {error && (
                <div 
                  className="p-4 rounded-xl border-2 flex items-start gap-3"
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    borderColor: 'rgba(239, 68, 68, 0.4)'
                  }}
                >
                  <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <p className="text-sm text-red-300 font-medium">{error}</p>
                </div>
              )}

              {/* Deadline and Time Limit */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-white mb-3">
                    📅 Deadline (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={quizDeadline}
                    min={new Date().toISOString().slice(0, 16)}
                    onChange={(e) => setQuizDeadline(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl text-white focus:outline-none transition-all duration-200"
                    style={{
                      backgroundColor: 'rgba(79, 70, 229, 0.1)',
                      border: '2px solid rgba(79, 70, 229, 0.3)'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#4F46E5';
                      e.target.style.boxShadow = '0 0 0 4px rgba(79, 70, 229, 0.2)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(79, 70, 229, 0.3)';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                  <p className="text-xs text-gray-400 mt-2">Learners cannot submit after this date</p>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-white mb-3">
                    ⏰ Time Limit (minutes)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="480"
                    value={quizTimeLimit}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Allow empty string while typing, otherwise parse the number
                      setQuizTimeLimit(value === '' ? '' as any : parseInt(value) || 1);
                    }}
                    onBlur={(e) => {
                      // On blur, if empty, set to default 30
                      if (e.target.value === '') {
                        setQuizTimeLimit(30);
                      }
                      // Reset border styling
                      e.target.style.borderColor = 'rgba(79, 70, 229, 0.3)';
                      e.target.style.boxShadow = 'none';
                    }}
                    className="w-full px-4 py-3 rounded-xl text-white focus:outline-none transition-all duration-200"
                    style={{
                      backgroundColor: 'rgba(79, 70, 229, 0.1)',
                      border: '2px solid rgba(79, 70, 229, 0.3)'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#4F46E5';
                      e.target.style.boxShadow = '0 0 0 4px rgba(79, 70, 229, 0.2)';
                    }}
                    placeholder="30"
                  />
                  <p className="text-xs text-gray-400 mt-2">Time allowed once quiz is started</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowAICreateModal(false)}
                  className="px-6 py-3 rounded-xl font-semibold transition-all duration-200 hover:scale-105"
                  style={{
                    backgroundColor: 'rgba(139, 92, 246, 0.2)',
                    border: '2px solid rgba(139, 92, 246, 0.3)',
                    color: '#A78BFA'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={generateQuiz}
                  disabled={!text || loading || selectedQuestionTypes.length === 0}
                  className="flex-1 px-6 py-3 rounded-xl font-semibold text-white transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
                  style={{
                    background: 'linear-gradient(135deg, #34D399 0%, #10B981 100%)',
                    boxShadow: '0 4px 12px rgba(52, 211, 153, 0.3)'
                  }}
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Generate Quiz
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {step === 'processing' && (
            <div className="p-12 text-center">
              <div className="relative w-24 h-24 mx-auto mb-6">
                <div 
                  className="absolute inset-0 rounded-full animate-spin"
                  style={{
                    border: '4px solid rgba(79, 70, 229, 0.2)',
                    borderTopColor: '#4F46E5'
                  }}
                />
                <div 
                  className="absolute inset-2 rounded-full flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, #4F46E5 0%, #8B5CF6 100%)'
                  }}
                >
                  <svg className="w-10 h-10 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
              </div>
              <h4 className="text-2xl font-bold text-white mb-3">Generating Your Quiz...</h4>
              <p className="text-gray-400 mb-6">AI is analyzing your content and creating questions</p>
              <div className="flex items-center justify-center gap-2">
                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
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
        
        const quizPayload = {
          title: editableQuiz.title,
          description: editableQuiz.description,
          difficulty: editableQuiz.difficulty,
          questionTypes: editableQuiz.questionTypes,
          numberOfQuestions: editableQuiz.numberOfQuestions,
          sourceText: editableQuiz.sourceText || '', // Include the original text for regeneration
          deadline: aiQuizData?.deadline || null,
          timeLimit: aiQuizData?.timeLimit || 30
        };
        
        console.log('Saving quiz with payload:', quizPayload);
        
        // First create the quiz
        const quizResponse = await fetch('/api/quizzes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(quizPayload),
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

        // If a class was selected, add the quiz to that class
        if (aiQuizData?.classId) {
          await fetch(`/api/classes/${aiQuizData.classId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              addQuiz: quizId
            }),
          });
          await fetchClasses(); // Refresh classes list
        }

        // Refresh quiz list
        await fetchQuizzes();
        
        // Show success modal
        const classInfo = aiQuizData?.classId 
          ? ` and assigned to ${classes.find(c => c._id === aiQuizData.classId)?.name || 'class'}`
          : '';
        showModal('Success', `Quiz "${editableQuiz.title}" saved successfully${classInfo}!`, 'success');
        
        // Close preview
        setShowAIPreview(false);
        setAiQuizData(null);

      } catch (error) {
        console.error('Error saving quiz:', error);
        showModal('Error', 'Failed to save quiz. Please try again.', 'error');
      } finally {
        setSaving(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 md:p-8">
        <div 
          className="rounded-3xl w-full max-w-6xl border-2 shadow-2xl overflow-hidden flex flex-col"
          style={{
            background: 'rgba(15, 23, 42, 0.98)',
            borderColor: 'rgba(79, 70, 229, 0.4)',
            boxShadow: '0 25px 50px rgba(79, 70, 229, 0.3)',
            maxHeight: '90vh'
          }}
        >
          {/* Header */}
          <div 
            className="p-6 border-b flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)',
              borderColor: 'rgba(79, 70, 229, 0.3)'
            }}
          >
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">Quiz Preview</h3>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-gray-400">Review and edit before saving</p>
                    {aiQuizData?.classId && (
                      <span 
                        className="px-3 py-1 rounded-lg text-xs font-semibold"
                        style={{
                          background: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)',
                          color: 'white'
                        }}
                      >
                        📚 {classes.find(c => c._id === aiQuizData.classId)?.name || 'Class'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowAIPreview(false);
                  setAiQuizData(null);
                }}
                className="p-2 rounded-xl transition-all duration-200 hover:scale-110"
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.2)',
                  border: '2px solid rgba(239, 68, 68, 0.3)',
                  color: '#F87171'
                }}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="p-6 md:p-8 space-y-6 overflow-y-auto flex-1">
            {/* Quiz Details Card */}
            <div 
              className="rounded-2xl p-6 border-2"
              style={{
                background: 'rgba(30, 41, 59, 0.5)',
                borderColor: 'rgba(79, 70, 229, 0.3)'
              }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, #4F46E5 0%, #8B5CF6 100%)'
                  }}
                >
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <h4 className="text-lg font-bold text-white">Quiz Information</h4>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    📝 Quiz Title
                  </label>
                  <input
                    type="text"
                    value={editableQuiz.title}
                    onChange={(e) => setEditableQuiz({...editableQuiz, title: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl text-white focus:outline-none transition-all duration-200"
                    style={{
                      backgroundColor: 'rgba(79, 70, 229, 0.1)',
                      border: '2px solid rgba(79, 70, 229, 0.3)'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#4F46E5';
                      e.target.style.boxShadow = '0 0 0 4px rgba(79, 70, 229, 0.2)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(79, 70, 229, 0.3)';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    📄 Description
                  </label>
                  <textarea
                    value={editableQuiz.description}
                    onChange={(e) => setEditableQuiz({...editableQuiz, description: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl text-white focus:outline-none transition-all duration-200 resize-none"
                    rows={3}
                    style={{
                      backgroundColor: 'rgba(79, 70, 229, 0.1)',
                      border: '2px solid rgba(79, 70, 229, 0.3)'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#4F46E5';
                      e.target.style.boxShadow = '0 0 0 4px rgba(79, 70, 229, 0.2)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(79, 70, 229, 0.3)';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>
                
                {/* Quiz Stats */}
                <div className="grid grid-cols-3 gap-3 pt-2">
                  <div 
                    className="p-3 rounded-xl text-center"
                    style={{
                      backgroundColor: 'rgba(79, 70, 229, 0.2)',
                      border: '2px solid rgba(79, 70, 229, 0.3)'
                    }}
                  >
                    <p className="text-2xl font-bold text-white">{editableQuiz.questions.length}</p>
                    <p className="text-xs text-gray-400 font-medium">Questions</p>
                  </div>
                  <div 
                    className="p-3 rounded-xl text-center"
                    style={{
                      backgroundColor: 'rgba(139, 92, 246, 0.2)',
                      border: '2px solid rgba(139, 92, 246, 0.3)'
                    }}
                  >
                    <p className="text-2xl font-bold text-white capitalize">{editableQuiz.difficulty}</p>
                    <p className="text-xs text-gray-400 font-medium">Difficulty</p>
                  </div>
                  <div 
                    className="p-3 rounded-xl text-center"
                    style={{
                      backgroundColor: 'rgba(52, 211, 153, 0.2)',
                      border: '2px solid rgba(52, 211, 153, 0.3)'
                    }}
                  >
                    <p className="text-2xl font-bold text-white">{editableQuiz.questionTypes.length}</p>
                    <p className="text-xs text-gray-400 font-medium">Types</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Questions Preview */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)'
                    }}
                  >
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-bold text-white">Generated Questions</h4>
                </div>
                <span 
                  className="px-4 py-2 rounded-xl font-bold text-sm"
                  style={{
                    backgroundColor: 'rgba(139, 92, 246, 0.2)',
                    border: '2px solid rgba(139, 92, 246, 0.3)',
                    color: '#A78BFA'
                  }}
                >
                  {editableQuiz.questions.length} Questions
                </span>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {editableQuiz.questions.map((question, index) => {
                  const typeColors = {
                    'multiple-choice': { bg: '#4F46E5', light: 'rgba(79, 70, 229, 0.2)', border: 'rgba(79, 70, 229, 0.4)' },
                    'true-false': { bg: '#8B5CF6', light: 'rgba(139, 92, 246, 0.2)', border: 'rgba(139, 92, 246, 0.4)' },
                    'fill-in-blank': { bg: '#34D399', light: 'rgba(52, 211, 153, 0.2)', border: 'rgba(52, 211, 153, 0.4)' }
                  };
                  const questionType = question.questionType || 'multiple-choice';
                  const colors = typeColors[questionType as keyof typeof typeColors];
                  
                  return (
                    <div 
                      key={index} 
                      className="rounded-2xl p-5 border-2 transition-all duration-200 hover:scale-[1.02]"
                      style={{
                        background: 'rgba(30, 41, 59, 0.5)',
                        borderColor: colors.border,
                        boxShadow: `0 4px 12px ${colors.light}`
                      }}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <span 
                          className="px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider"
                          style={{
                            backgroundColor: colors.light,
                            color: colors.bg,
                            border: `2px solid ${colors.border}`
                          }}
                        >
                          {questionType.replace('-', ' ')}
                        </span>
                        <span 
                          className="px-3 py-1 rounded-lg text-xs font-bold"
                          style={{
                            backgroundColor: 'rgba(79, 70, 229, 0.2)',
                            color: '#A5B4FC'
                          }}
                        >
                          #{index + 1}
                        </span>
                      </div>
                      
                      <p className="text-white font-semibold mb-3 leading-relaxed">
                        {question.questionText}
                      </p>
                      
                      {question.questionType === 'fill-in-blank' ? (
                        <div 
                          className="p-3 rounded-xl flex items-center gap-2"
                          style={{
                            backgroundColor: 'rgba(52, 211, 153, 0.2)',
                            border: '2px solid rgba(52, 211, 153, 0.4)'
                          }}
                        >
                          <svg className="w-5 h-5 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-sm font-semibold text-emerald-300">
                            Answer: {question.correctAnswer}
                          </span>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {question.answerChoices?.map((option: string, optIndex: number) => {
                            const isCorrect = optIndex === question.correctAnswer;
                            return (
                              <div 
                                key={optIndex} 
                                className="p-3 rounded-xl flex items-center gap-3 transition-all duration-200"
                                style={{
                                  backgroundColor: isCorrect ? 'rgba(52, 211, 153, 0.2)' : 'rgba(79, 70, 229, 0.1)',
                                  border: isCorrect ? '2px solid rgba(52, 211, 153, 0.4)' : '2px solid rgba(79, 70, 229, 0.2)'
                                }}
                              >
                                <span 
                                  className="w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0"
                                  style={{
                                    backgroundColor: isCorrect ? 'rgba(52, 211, 153, 0.3)' : 'rgba(79, 70, 229, 0.2)',
                                    color: isCorrect ? '#34D399' : '#A5B4FC'
                                  }}
                                >
                                  {String.fromCharCode(65 + optIndex)}
                                </span>
                                <span className={`text-sm flex-1 ${isCorrect ? 'text-emerald-300 font-semibold' : 'text-gray-400'}`}>
                                  {option}
                                </span>
                                {isCorrect && (
                                  <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
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

          {/* Fixed Footer with Actions */}
          <div 
            className="p-6 border-t flex-shrink-0"
            style={{
              background: 'rgba(15, 23, 42, 0.98)',
              borderColor: 'rgba(79, 70, 229, 0.3)'
            }}
          >
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowAIPreview(false);
                  setAiQuizData(null);
                }}
                className="px-6 py-3 rounded-xl font-semibold transition-all duration-200 hover:scale-105"
                style={{
                  backgroundColor: 'rgba(139, 92, 246, 0.2)',
                  border: '2px solid rgba(139, 92, 246, 0.3)',
                  color: '#A78BFA'
                }}
              >
                Cancel
              </button>
              <button
                onClick={saveQuiz}
                disabled={saving}
                className="flex-1 px-6 py-3 rounded-xl font-semibold text-white transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
                style={{
                  background: 'linear-gradient(135deg, #34D399 0%, #10B981 100%)',
                  boxShadow: '0 4px 12px rgba(52, 211, 153, 0.3)'
                }}
              >
                {saving ? (
                  <>
                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving Quiz...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Save Quiz
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Create Class Modal Component
  const CreateClassModal = () => {
    const [className, setClassName] = useState('');
    const [classDescription, setClassDescription] = useState('');
    const [creating, setCreating] = useState(false);

    const handleCreateClass = async () => {
      if (!className.trim()) {
        showModal('Validation Error', 'Please enter a class name', 'warning');
        return;
      }

      setCreating(true);
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/classes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: className,
            description: classDescription
          }),
        });

        if (response.ok) {
          const data = await response.json();
          await fetchClasses();
          setShowCreateClassModal(false);
          setClassName('');
          setClassDescription('');
          // Show success with class code
          showModal('Success', `Class created successfully! Class Code: ${data.class.classCode}`, 'success');
        } else {
          const errorData = await response.json();
          showModal('Error', errorData.error || 'Failed to create class', 'error');
        }
      } catch (error) {
        console.error('Error creating class:', error);
        showModal('Error', 'An error occurred while creating the class', 'error');
      } finally {
        setCreating(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div 
          className="rounded-3xl w-full max-w-lg border-2 shadow-2xl"
          style={{
            background: 'rgba(15, 23, 42, 0.98)',
            borderColor: 'rgba(79, 70, 229, 0.4)',
            boxShadow: '0 25px 50px rgba(79, 70, 229, 0.3)'
          }}
        >
          {/* Header */}
          <div 
            className="p-6 border-b"
            style={{
              background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)',
              borderColor: 'rgba(79, 70, 229, 0.3)'
            }}
          >
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">Create New Class</h3>
                  <p className="text-sm text-gray-400">Set up a class for your students</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowCreateClassModal(false);
                  setClassName('');
                  setClassDescription('');
                }}
                className="p-2 rounded-xl transition-all duration-200 hover:scale-110"
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.2)',
                  border: '2px solid rgba(239, 68, 68, 0.3)',
                  color: '#F87171'
                }}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-semibold text-white mb-3">
                🏫 Class Name
              </label>
              <input
                type="text"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                placeholder="e.g., Computer Science 101"
                className="w-full px-4 py-3 rounded-xl text-white focus:outline-none transition-all duration-200"
                style={{
                  backgroundColor: 'rgba(79, 70, 229, 0.1)',
                  border: '2px solid rgba(79, 70, 229, 0.3)'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#4F46E5';
                  e.target.style.boxShadow = '0 0 0 4px rgba(79, 70, 229, 0.2)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(79, 70, 229, 0.3)';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-white mb-3">
                📝 Description (Optional)
              </label>
              <textarea
                value={classDescription}
                onChange={(e) => setClassDescription(e.target.value)}
                placeholder="Brief description of the class..."
                rows={3}
                className="w-full px-4 py-3 rounded-xl text-white focus:outline-none transition-all duration-200 resize-none"
                style={{
                  backgroundColor: 'rgba(79, 70, 229, 0.1)',
                  border: '2px solid rgba(79, 70, 229, 0.3)'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#4F46E5';
                  e.target.style.boxShadow = '0 0 0 4px rgba(79, 70, 229, 0.2)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(79, 70, 229, 0.3)';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            <div 
              className="p-4 rounded-xl flex items-start gap-3"
              style={{
                backgroundColor: 'rgba(52, 211, 153, 0.1)',
                border: '2px solid rgba(52, 211, 153, 0.3)'
              }}
            >
              <svg className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <p className="text-sm text-emerald-300">
                A unique 6-character class code will be automatically generated for students to join.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div 
            className="p-6 border-t"
            style={{
              borderColor: 'rgba(79, 70, 229, 0.3)'
            }}
          >
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCreateClassModal(false);
                  setClassName('');
                  setClassDescription('');
                }}
                className="px-6 py-3 rounded-xl font-semibold transition-all duration-200 hover:scale-105"
                style={{
                  backgroundColor: 'rgba(139, 92, 246, 0.2)',
                  border: '2px solid rgba(139, 92, 246, 0.3)',
                  color: '#A78BFA'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateClass}
                disabled={creating || !className.trim()}
                className="flex-1 px-6 py-3 rounded-xl font-semibold text-white transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
                style={{
                  background: 'linear-gradient(135deg, #34D399 0%, #10B981 100%)',
                  boxShadow: '0 4px 12px rgba(52, 211, 153, 0.3)'
                }}
              >
                {creating ? (
                  <>
                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create Class
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Join Class Modal Component (for learners)
  const JoinClassModal = () => {
    const [classCode, setClassCode] = useState('');
    const [joining, setJoining] = useState(false);

    const handleJoinClass = async () => {
      if (!classCode.trim()) {
        showModal('Validation Error', 'Please enter a class code', 'warning');
        return;
      }

      setJoining(true);
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/classes/join', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ classCode: classCode.trim().toUpperCase() }),
        });

        const data = await response.json();

        if (response.ok) {
          await fetchClasses();
          setShowJoinClassModal(false);
          setClassCode('');
          showModal('Success', `Successfully joined ${data.class.name}!`, 'success');
        } else {
          showModal('Error', data.error || 'Failed to join class', 'error');
        }
      } catch (error) {
        console.error('Error joining class:', error);
        showModal('Error', 'An error occurred while joining the class', 'error');
      } finally {
        setJoining(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div 
          className="rounded-3xl w-full max-w-lg border-2 shadow-2xl"
          style={{
            background: 'rgba(15, 23, 42, 0.98)',
            borderColor: 'rgba(52, 211, 153, 0.4)',
            boxShadow: '0 25px 50px rgba(52, 211, 153, 0.3)'
          }}
        >
          {/* Header */}
          <div 
            className="p-6 border-b"
            style={{
              background: 'linear-gradient(135deg, rgba(52, 211, 153, 0.2) 0%, rgba(16, 185, 129, 0.2) 100%)',
              borderColor: 'rgba(52, 211, 153, 0.3)'
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, #34D399 0%, #10B981 100%)',
                    boxShadow: '0 4px 12px rgba(52, 211, 153, 0.4)'
                  }}
                >
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">Join a Class</h3>
                  <p className="text-sm text-gray-400">Enter your class code</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowJoinClassModal(false);
                  setClassCode('');
                }}
                className="p-2 rounded-xl transition-all duration-200 hover:scale-110"
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.2)',
                  border: '2px solid rgba(239, 68, 68, 0.3)',
                  color: '#F87171'
                }}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-semibold text-white mb-3">
                🔑 Class Code
              </label>
              <input
                type="text"
                value={classCode}
                onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                placeholder="Enter 6-character code"
                maxLength={6}
                className="w-full px-4 py-4 rounded-xl text-white text-center text-2xl font-bold tracking-widest focus:outline-none transition-all duration-200 uppercase"
                style={{
                  backgroundColor: 'rgba(52, 211, 153, 0.1)',
                  border: '2px solid rgba(52, 211, 153, 0.3)'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#34D399';
                  e.target.style.boxShadow = '0 0 0 4px rgba(52, 211, 153, 0.2)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(52, 211, 153, 0.3)';
                  e.target.style.boxShadow = 'none';
                }}
              />
              <p className="text-xs text-gray-400 mt-2 text-center">
                Ask your instructor for the class code
              </p>
            </div>
          </div>

          {/* Footer */}
          <div 
            className="p-6 border-t"
            style={{
              borderColor: 'rgba(52, 211, 153, 0.3)'
            }}
          >
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowJoinClassModal(false);
                  setClassCode('');
                }}
                className="px-6 py-3 rounded-xl font-semibold transition-all duration-200 hover:scale-105"
                style={{
                  backgroundColor: 'rgba(139, 92, 246, 0.2)',
                  border: '2px solid rgba(139, 92, 246, 0.3)',
                  color: '#A78BFA'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleJoinClass}
                disabled={joining || classCode.length !== 6}
                className="flex-1 px-6 py-3 rounded-xl font-semibold text-white transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
                style={{
                  background: 'linear-gradient(135deg, #34D399 0%, #10B981 100%)',
                  boxShadow: '0 4px 12px rgba(52, 211, 153, 0.3)'
                }}
              >
                {joining ? (
                  <>
                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Joining...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                    Join Class
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Class Details Modal Component
  const ClassDetailsModal = () => {
    if (!selectedClass) return null;

    const isInstructor = user?.role === 'instructor';

    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div 
          className="rounded-3xl w-full max-w-4xl border-2 shadow-2xl max-h-[90vh] overflow-y-auto"
          style={{
            background: 'rgba(15, 23, 42, 0.98)',
            borderColor: 'rgba(139, 92, 246, 0.4)',
            boxShadow: '0 25px 50px rgba(139, 92, 246, 0.3)'
          }}
        >
          {/* Header */}
          <div 
            className="p-6 border-b sticky top-0 z-10"
            style={{
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(79, 70, 229, 0.2) 100%)',
              borderColor: 'rgba(139, 92, 246, 0.3)',
              backdropFilter: 'blur(20px)'
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div 
                  className="w-14 h-14 rounded-xl flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)',
                    boxShadow: '0 4px 12px rgba(139, 92, 246, 0.4)'
                  }}
                >
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">{selectedClass.name}</h3>
                  <p className="text-sm text-gray-400">{selectedClass.description || 'No description'}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedClass(null)}
                className="p-2 rounded-xl transition-all duration-200 hover:scale-110"
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.2)',
                  border: '2px solid rgba(239, 68, 68, 0.3)',
                  color: '#F87171'
                }}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Class Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {isInstructor && (
                <div 
                  className="rounded-2xl p-6 border-2"
                  style={{
                    background: 'rgba(52, 211, 153, 0.1)',
                    borderColor: 'rgba(52, 211, 153, 0.3)'
                  }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                    <span className="text-sm font-semibold text-gray-400">Class Code</span>
                  </div>
                  <div 
                    className="text-3xl font-bold tracking-wider cursor-pointer hover:scale-105 transition-transform text-center py-2 rounded-lg"
                    style={{ 
                      backgroundColor: 'rgba(52, 211, 153, 0.2)',
                      color: '#34D399'
                    }}
                    onClick={() => {
                      navigator.clipboard.writeText(selectedClass.classCode);
                      showModal('Success', 'Class code copied to clipboard!', 'success');
                    }}
                    title="Click to copy"
                  >
                    {selectedClass.classCode}
                  </div>
                </div>
              )}
              
              <div 
                className="rounded-2xl p-6 border-2"
                style={{
                  background: 'rgba(79, 70, 229, 0.1)',
                  borderColor: 'rgba(79, 70, 229, 0.3)'
                }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <span className="text-sm font-semibold text-gray-400">Students</span>
                </div>
                <p className="text-3xl font-bold text-white">{selectedClass.learners?.length || 0}</p>
              </div>

              <div 
                className="rounded-2xl p-6 border-2"
                style={{
                  background: 'rgba(139, 92, 246, 0.1)',
                  borderColor: 'rgba(139, 92, 246, 0.3)'
                }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <svg className="w-6 h-6 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-sm font-semibold text-gray-400">Quizzes</span>
                </div>
                <p className="text-3xl font-bold text-white">
                  {selectedClass.quizzes?.filter((quizId: string) => 
                    quizzes.some(q => q._id === quizId)
                  ).length || 0}
                </p>
              </div>
            </div>

            {/* Instructor Info (for learners) */}
            {!isInstructor && selectedClass.instructorId && (
              <div 
                className="rounded-2xl p-6 border-2"
                style={{
                  background: 'rgba(15, 23, 42, 0.6)',
                  borderColor: 'rgba(139, 92, 246, 0.3)'
                }}
              >
                <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Instructor
                </h4>
                <div className="flex items-center gap-4">
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg"
                    style={{
                      background: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)'
                    }}
                  >
                    {selectedClass.instructorId.username?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-white font-semibold">{selectedClass.instructorId.username}</p>
                    <p className="text-gray-400 text-sm">{selectedClass.instructorId.email}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Students List (for instructors) */}
            {isInstructor && (
              <div 
                className="rounded-2xl p-6 border-2"
                style={{
                  background: 'rgba(15, 23, 42, 0.6)',
                  borderColor: 'rgba(79, 70, 229, 0.3)'
                }}
              >
                <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  Enrolled Students
                </h4>
                {selectedClass.learners && selectedClass.learners.length > 0 ? (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {selectedClass.learners.map((learner: any) => (
                      <div 
                        key={learner._id}
                        className="flex items-center gap-3 p-3 rounded-xl transition-all duration-200 hover:scale-[1.02]"
                        style={{
                          backgroundColor: 'rgba(79, 70, 229, 0.1)',
                          border: '1px solid rgba(79, 70, 229, 0.2)'
                        }}
                      >
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                          style={{
                            background: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)'
                          }}
                        >
                          {learner.username?.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <p className="text-white font-semibold">{learner.username}</p>
                          <p className="text-gray-400 text-sm">{learner.email}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div 
                      className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3"
                      style={{
                        background: 'rgba(79, 70, 229, 0.2)',
                        border: '2px solid rgba(79, 70, 229, 0.3)'
                      }}
                    >
                      <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                    <p className="text-gray-400">No students enrolled yet</p>
                    <p className="text-gray-500 text-sm mt-1">Share the class code to get students</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div 
            className="p-6 border-t"
            style={{
              borderColor: 'rgba(139, 92, 246, 0.3)'
            }}
          >
            <div className="flex gap-3">
              {selectedClass.quizzes && selectedClass.quizzes.length > 0 && (() => {
                // Count only quizzes that actually exist
                const existingQuizCount = selectedClass.quizzes.filter((quizId: string) => 
                  quizzes.some(q => q._id === quizId)
                ).length;
                
                return existingQuizCount > 0 ? (
                  <button
                    onClick={async () => {
                      setSelectedClassFilter(selectedClass._id);
                      setActiveView('quizzes');
                      setSelectedClass(null);
                      // Fetch quizzes to ensure they're loaded
                      await fetchQuizzes();
                    }}
                    className="flex-1 px-6 py-3 rounded-xl font-semibold text-white transition-all duration-200 hover:scale-105 flex items-center justify-center gap-2"
                    style={{
                      background: 'linear-gradient(135deg, #34D399 0%, #10B981 100%)',
                      boxShadow: '0 4px 12px rgba(52, 211, 153, 0.3)'
                    }}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    View Quizzes ({existingQuizCount})
                  </button>
                ) : null;
              })()}
              <button
                onClick={() => setSelectedClass(null)}
                className={`px-6 py-3 rounded-xl font-semibold text-white transition-all duration-200 hover:scale-105 ${selectedClass.quizzes && selectedClass.quizzes.length > 0 ? '' : 'w-full'}`}
                style={{
                  background: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)',
                  boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)'
                }}
              >
                Close
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

    // Calculate statistics
    const avgScore = submissions.length > 0 
      ? Math.round(submissions.reduce((acc, sub) => acc + sub.score, 0) / submissions.length)
      : 0;
    const passRate = submissions.length > 0
      ? Math.round((submissions.filter(sub => sub.score >= 60).length / submissions.length) * 100)
      : 0;
    const highestScore = submissions.length > 0
      ? Math.max(...submissions.map(sub => sub.score))
      : 0;

    // Export to CSV function
    const exportToCSV = () => {
      if (submissions.length === 0) {
        showModal('No Data', 'No submissions to export', 'warning');
        return;
      }

      // CSV Header
      const csvContent = [
        ['Learner', 'Email', 'Score (%)', 'Status', 'Submitted Date', 'Submitted Time'],
        ...submissions.map(submission => {
          const date = new Date(submission.submittedAt);
          return [
            submission.userId?.username || 'Unknown',
            submission.userId?.email || 'N/A',
            submission.score,
            submission.score >= 60 ? 'Passed' : 'Failed',
            date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
          ];
        })
      ];

      // Add summary statistics at the end
      csvContent.push([]);
      csvContent.push(['Summary Statistics']);
      csvContent.push(['Total Submissions', submissions.length]);
      csvContent.push(['Average Score', `${avgScore}%`]);
      csvContent.push(['Pass Rate', `${passRate}%`]);
      csvContent.push(['Highest Score', `${highestScore}%`]);

      // Convert to CSV string
      const csvString = csvContent
        .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');

      // Create and download file
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${quiz.title}_submissions_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showModal('Success', `Submissions exported successfully! File: ${quiz.title}_submissions_${new Date().toISOString().split('T')[0]}.csv`, 'success');
    };

    return (
      <div className="min-h-screen" style={{ backgroundColor: '#0F172A' }}>
        {/* Header */}
        <div 
          className="border-b backdrop-blur-xl sticky top-0 z-10"
          style={{
            background: 'rgba(15, 23, 42, 0.95)',
            borderColor: 'rgba(79, 70, 229, 0.2)',
            boxShadow: '0 4px 24px rgba(0, 0, 0, 0.2)'
          }}
        >
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setViewingSubmissions(null)}
                  className="p-2 rounded-xl transition-all duration-200 hover:scale-110"
                  style={{
                    backgroundColor: 'rgba(79, 70, 229, 0.2)',
                    border: '2px solid rgba(79, 70, 229, 0.3)',
                    color: '#A5B4FC'
                  }}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </button>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-white">{quiz.title}</h1>
                  <p className="text-gray-400 text-sm">Quiz Submissions & Analytics</p>
                </div>
              </div>
              <button 
                onClick={exportToCSV}
                disabled={submissions.length === 0}
                className="px-6 py-3 rounded-xl font-semibold text-white transition-all duration-200 hover:scale-105 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                style={{
                  background: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)',
                  boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)'
                }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export to CSV
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div 
                  className="w-16 h-16 rounded-full mx-auto mb-4 animate-spin"
                  style={{
                    border: '4px solid rgba(79, 70, 229, 0.2)',
                    borderTopColor: '#4F46E5'
                  }}
                />
                <p className="text-white text-xl">Loading submissions...</p>
              </div>
            </div>
          ) : submissions.length === 0 ? (
            <div 
              className="rounded-3xl p-12 text-center border-2"
              style={{
                background: 'rgba(15, 23, 42, 0.6)',
                borderColor: 'rgba(79, 70, 229, 0.2)',
                backdropFilter: 'blur(20px)'
              }}
            >
              <div 
                className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6"
                style={{
                  background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)',
                  border: '2px solid rgba(79, 70, 229, 0.3)'
                }}
              >
                <svg className="w-12 h-12 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">No Submissions Yet</h3>
              <p className="text-gray-400">Learners haven't taken this quiz yet. Share it to get started!</p>
            </div>
          ) : (
            <>
              {/* Statistics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                {/* Total Submissions */}
                <div 
                  className="rounded-2xl p-6 border-2 transition-all duration-200 hover:scale-[1.02]"
                  style={{
                    background: 'rgba(15, 23, 42, 0.6)',
                    borderColor: 'rgba(79, 70, 229, 0.3)',
                    backdropFilter: 'blur(20px)',
                    boxShadow: '0 4px 16px rgba(79, 70, 229, 0.2)'
                  }}
                >
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{
                        background: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)'
                      }}
                    >
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-white">{submissions.length}</p>
                      <p className="text-sm text-gray-400 font-medium">Total Submissions</p>
                    </div>
                  </div>
                </div>

                {/* Average Score */}
                <div 
                  className="rounded-2xl p-6 border-2 transition-all duration-200 hover:scale-[1.02]"
                  style={{
                    background: 'rgba(15, 23, 42, 0.6)',
                    borderColor: 'rgba(139, 92, 246, 0.3)',
                    backdropFilter: 'blur(20px)',
                    boxShadow: '0 4px 16px rgba(139, 92, 246, 0.2)'
                  }}
                >
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{
                        background: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)'
                      }}
                    >
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-white">{avgScore}%</p>
                      <p className="text-sm text-gray-400 font-medium">Average Score</p>
                    </div>
                  </div>
                </div>

                {/* Pass Rate */}
                <div 
                  className="rounded-2xl p-6 border-2 transition-all duration-200 hover:scale-[1.02]"
                  style={{
                    background: 'rgba(15, 23, 42, 0.6)',
                    borderColor: 'rgba(52, 211, 153, 0.3)',
                    backdropFilter: 'blur(20px)',
                    boxShadow: '0 4px 16px rgba(52, 211, 153, 0.2)'
                  }}
                >
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{
                        background: 'linear-gradient(135deg, #34D399 0%, #10B981 100%)'
                      }}
                    >
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-white">{passRate}%</p>
                      <p className="text-sm text-gray-400 font-medium">Pass Rate</p>
                    </div>
                  </div>
                </div>

                {/* Highest Score */}
                <div 
                  className="rounded-2xl p-6 border-2 transition-all duration-200 hover:scale-[1.02]"
                  style={{
                    background: 'rgba(15, 23, 42, 0.6)',
                    borderColor: 'rgba(251, 191, 36, 0.3)',
                    backdropFilter: 'blur(20px)',
                    boxShadow: '0 4px 16px rgba(251, 191, 36, 0.2)'
                  }}
                >
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{
                        background: 'linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%)'
                      }}
                    >
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-white">{highestScore}%</p>
                      <p className="text-sm text-gray-400 font-medium">Highest Score</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Submissions Table */}
              <div 
                className="rounded-3xl overflow-hidden border-2"
                style={{
                  background: 'rgba(15, 23, 42, 0.6)',
                  borderColor: 'rgba(79, 70, 229, 0.2)',
                  backdropFilter: 'blur(20px)'
                }}
              >
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr 
                        style={{
                          background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)',
                          borderBottom: '2px solid rgba(79, 70, 229, 0.3)'
                        }}
                      >
                        <th className="px-6 py-4 text-left text-xs font-bold text-indigo-300 uppercase tracking-wider">
                          Learner
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-indigo-300 uppercase tracking-wider">
                          Email
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-indigo-300 uppercase tracking-wider">
                          Score
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-indigo-300 uppercase tracking-wider">
                          Submitted
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-indigo-300 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {submissions.map((submission, index) => (
                        <tr 
                          key={submission._id}
                          className="transition-all duration-200 hover:scale-[1.01]"
                          style={{
                            borderBottom: index < submissions.length - 1 ? '1px solid rgba(79, 70, 229, 0.1)' : 'none',
                            backgroundColor: 'transparent'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(79, 70, 229, 0.1)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div 
                                className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold"
                                style={{
                                  background: 'linear-gradient(135deg, #4F46E5 0%, #8B5CF6 100%)'
                                }}
                              >
                                {(submission.userId?.username || 'U').charAt(0).toUpperCase()}
                              </div>
                              <span className="text-white font-semibold">
                                {submission.userId?.username || 'Unknown'}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-gray-300">
                            {submission.userId?.email || 'N/A'}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div 
                                className="px-4 py-2 rounded-xl font-bold"
                                style={{
                                  backgroundColor: submission.score >= 80 
                                    ? 'rgba(52, 211, 153, 0.2)' 
                                    : submission.score >= 60 
                                    ? 'rgba(251, 191, 36, 0.2)' 
                                    : 'rgba(239, 68, 68, 0.2)',
                                  border: `2px solid ${
                                    submission.score >= 80 
                                      ? 'rgba(52, 211, 153, 0.4)' 
                                      : submission.score >= 60 
                                      ? 'rgba(251, 191, 36, 0.4)' 
                                      : 'rgba(239, 68, 68, 0.4)'
                                  }`,
                                  color: submission.score >= 80 
                                    ? '#34D399' 
                                    : submission.score >= 60 
                                    ? '#FBBF24' 
                                    : '#EF4444'
                                }}
                              >
                                {submission.score}%
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-gray-300 text-sm">
                            {new Date(submission.submittedAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </td>
                          <td className="px-6 py-4">
                            <span 
                              className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider"
                              style={{
                                backgroundColor: submission.score >= 60 
                                  ? 'rgba(52, 211, 153, 0.2)' 
                                  : 'rgba(239, 68, 68, 0.2)',
                                border: `2px solid ${
                                  submission.score >= 60 
                                    ? 'rgba(52, 211, 153, 0.4)' 
                                    : 'rgba(239, 68, 68, 0.4)'
                                }`,
                                color: submission.score >= 60 ? '#34D399' : '#EF4444'
                              }}
                            >
                              {submission.score >= 60 ? '✓ Passed' : '✗ Failed'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  // Sidebar Navigation Component
  const Sidebar = () => {
    // Role-based navigation items with modern icons
    const navItems = user?.role === 'instructor' 
      ? [
          { 
            id: 'home', 
            label: 'Home',
            icon: (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            )
          },
          { 
            id: 'classes', 
            label: 'My Classes',
            icon: (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            )
          },
          { 
            id: 'quizzes', 
            label: 'My Quizzes',
            icon: (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            )
          },
          { 
            id: 'analytics', 
            label: 'Analytics',
            icon: (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            )
          },
          { 
            id: 'settings', 
            label: 'Settings',
            icon: (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            )
          },
        ]
      : [
          { 
            id: 'home', 
            label: 'Home',
            icon: (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            )
          },
          { 
            id: 'classes', 
            label: 'My Classes',
            icon: (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            )
          },
          { 
            id: 'quizzes', 
            label: 'Available Quizzes',
            icon: (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            )
          },
          { 
            id: 'settings', 
            label: 'Settings',
            icon: (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            )
          },
        ];

    return (
      <>
        {/* Mobile Overlay */}
        {mobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-30 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}
        
        {/* Modern Sidebar */}
        <aside 
          className={`fixed left-0 top-0 h-full border-r backdrop-blur-xl transition-all duration-300 z-40 
            ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} 
            md:translate-x-0
            ${sidebarCollapsed ? 'w-20' : 'w-72'}`}
          style={{
            background: 'rgba(15, 23, 42, 0.95)',
            borderColor: 'rgba(79, 70, 229, 0.2)',
            boxShadow: '4px 0 24px rgba(0, 0, 0, 0.3)'
          }}
        >
          <div className="flex flex-col h-full">
            {/* Logo Section */}
            <div 
              className="p-6 border-b"
              style={{
                borderColor: 'rgba(79, 70, 229, 0.2)'
              }}
            >
              <div className="flex items-center justify-between">
                {!sidebarCollapsed && (
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{
                        background: 'linear-gradient(135deg, #4F46E5 0%, #8B5CF6 100%)',
                        boxShadow: '0 4px 12px rgba(79, 70, 229, 0.4)'
                      }}
                    >
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                    <div>
                      <h1 
                        className="text-xl font-bold"
                        style={{
                          background: 'linear-gradient(135deg, #4F46E5 0%, #8B5CF6 100%)',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          backgroundClip: 'text'
                        }}
                      >
                        QuizMate
                      </h1>
                      <p className="text-xs text-gray-400">AI-Powered Learning</p>
                    </div>
                  </div>
                )}
                <button
                  onClick={() => {
                    setSidebarCollapsed(!sidebarCollapsed);
                    setMobileMenuOpen(false);
                  }}
                  className="p-2 rounded-lg transition-all duration-200 hover:scale-110"
                  style={{
                    backgroundColor: 'rgba(79, 70, 229, 0.1)',
                    color: '#A5B4FC'
                  }}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {sidebarCollapsed ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                    )}
                  </svg>
                </button>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
              {navItems.map((item) => {
                const isActive = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveView(item.id as any);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-200 group relative overflow-hidden ${
                      sidebarCollapsed ? 'justify-center' : ''
                    }`}
                    style={{
                      background: isActive 
                        ? 'linear-gradient(135deg, rgba(79, 70, 229, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)'
                        : 'transparent',
                      border: isActive 
                        ? '2px solid rgba(79, 70, 229, 0.4)'
                        : '2px solid transparent',
                      color: isActive ? '#A5B4FC' : '#9CA3AF',
                      boxShadow: isActive ? '0 4px 12px rgba(79, 70, 229, 0.2)' : 'none'
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = 'rgba(79, 70, 229, 0.1)';
                        e.currentTarget.style.borderColor = 'rgba(79, 70, 229, 0.2)';
                        e.currentTarget.style.color = '#C7D2FE';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.borderColor = 'transparent';
                        e.currentTarget.style.color = '#9CA3AF';
                      }
                    }}
                  >
                    {isActive && (
                      <div 
                        className="absolute inset-0 opacity-20"
                        style={{
                          background: 'linear-gradient(135deg, #4F46E5 0%, #8B5CF6 100%)'
                        }}
                      />
                    )}
                    <div className={`relative ${isActive ? 'scale-110' : 'group-hover:scale-110'} transition-transform duration-200`}>
                      {item.icon}
                    </div>
                    {!sidebarCollapsed && (
                      <span className="relative font-semibold text-sm">
                        {item.label}
                      </span>
                    )}
                    {isActive && !sidebarCollapsed && (
                      <div 
                        className="ml-auto w-2 h-2 rounded-full"
                        style={{
                          background: 'linear-gradient(135deg, #34D399 0%, #10B981 100%)',
                          boxShadow: '0 0 8px rgba(52, 211, 153, 0.6)'
                        }}
                      />
                    )}
                  </button>
                );
              })}
            </nav>

            {/* User Profile Section */}
            <div 
              className="p-4 border-t"
              style={{
                borderColor: 'rgba(79, 70, 229, 0.2)'
              }}
            >
              <div 
                className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-200 cursor-pointer ${
                  sidebarCollapsed ? 'justify-center' : ''
                }`}
                style={{
                  background: 'rgba(79, 70, 229, 0.1)',
                  border: '2px solid rgba(79, 70, 229, 0.2)'
                }}
              >
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0"
                  style={{
                    background: 'linear-gradient(135deg, #4F46E5 0%, #8B5CF6 100%)',
                    boxShadow: '0 4px 12px rgba(79, 70, 229, 0.4)'
                  }}
                >
                  {user?.username?.charAt(0).toUpperCase()}
                </div>
                {!sidebarCollapsed && (
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm truncate">{user?.username}</p>
                    <p 
                      className="text-xs font-medium capitalize truncate"
                      style={{ color: '#A5B4FC' }}
                    >
                      {user?.role}
                    </p>
                  </div>
                )}
                {!sidebarCollapsed && (
                  <button
                    onClick={handleLogout}
                    className="p-2 rounded-lg transition-all duration-200 hover:scale-110"
                    style={{
                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                      color: '#F87171'
                    }}
                    title="Logout"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </button>
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
    <header 
      className={`fixed top-0 right-0 left-0 h-20 backdrop-blur-xl border-b z-30 transition-all duration-300 ${sidebarCollapsed ? 'md:ml-20' : 'md:ml-72'}`}
      style={{ 
        background: 'rgba(15, 23, 42, 0.95)',
        borderColor: 'rgba(79, 70, 229, 0.2)',
        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.2)'
      }}
    >
      <div className="h-full px-4 md:px-8 flex items-center gap-4">
        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2.5 rounded-xl transition-all duration-200 hover:scale-110"
          style={{
            backgroundColor: 'rgba(79, 70, 229, 0.2)',
            border: '2px solid rgba(79, 70, 229, 0.3)',
            color: '#A5B4FC'
          }}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Spacer to push right side to the far right */}
        <div className="flex-1"></div>

        {/* Right Side Actions */}
        <div className="flex items-center gap-3">
          {/* Real-time Sync Indicator */}
          <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl" style={{
            backgroundColor: 'rgba(79, 70, 229, 0.05)',
            border: '1px solid rgba(79, 70, 229, 0.1)'
          }}>
            {isSyncing ? (
              <>
                <svg className="w-4 h-4 animate-spin text-indigo-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-xs text-indigo-400 font-medium">Syncing...</span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                <span className="text-xs text-gray-400 font-medium">Live</span>
              </>
            )}
          </div>
          
          {/* Notifications */}
          <div className="relative hidden sm:block notifications-dropdown">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2.5 rounded-xl transition-all duration-200 hover:scale-110"
              style={{
                backgroundColor: 'rgba(79, 70, 229, 0.1)',
                border: '2px solid rgba(79, 70, 229, 0.2)',
                color: '#A5B4FC'
              }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unreadCount > 0 && (
                <span 
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{
                    background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                    boxShadow: '0 0 8px rgba(239, 68, 68, 0.6)'
                  }}
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div 
                className="absolute right-0 mt-2 w-96 rounded-2xl border-2 shadow-2xl z-50 max-h-[32rem] overflow-hidden flex flex-col"
                style={{
                  background: 'rgba(15, 23, 42, 0.98)',
                  borderColor: 'rgba(79, 70, 229, 0.3)',
                  boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)'
                }}
              >
                {/* Header */}
                <div 
                  className="p-4 border-b flex items-center justify-between"
                  style={{
                    background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)',
                    borderColor: 'rgba(79, 70, 229, 0.3)'
                  }}
                >
                  <h3 className="text-lg font-bold text-white">Notifications</h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={() => markNotificationsAsRead()}
                      className="text-xs font-semibold px-3 py-1 rounded-lg transition-all duration-200 hover:scale-105"
                      style={{
                        backgroundColor: 'rgba(79, 70, 229, 0.2)',
                        border: '1px solid rgba(79, 70, 229, 0.4)',
                        color: '#A5B4FC'
                      }}
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                {/* Notifications List */}
                <div className="overflow-y-auto flex-1">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center">
                      <div 
                        className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3"
                        style={{
                          background: 'rgba(79, 70, 229, 0.2)',
                          border: '2px solid rgba(79, 70, 229, 0.3)'
                        }}
                      >
                        <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                      </div>
                      <p className="text-gray-400">No notifications yet</p>
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <div
                        key={notification._id}
                        onClick={() => {
                          if (!notification.read) {
                            markNotificationsAsRead([notification._id]);
                          }
                        }}
                        className="p-4 border-b transition-all duration-200 hover:bg-opacity-50 cursor-pointer"
                        style={{
                          backgroundColor: notification.read ? 'transparent' : 'rgba(79, 70, 229, 0.1)',
                          borderColor: 'rgba(79, 70, 229, 0.2)'
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <div 
                            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{
                              background: notification.type === 'quiz_assigned' || notification.type === 'new_quiz'
                                ? 'linear-gradient(135deg, #4F46E5 0%, #8B5CF6 100%)'
                                : notification.type === 'quiz_submitted' || notification.type === 'grade_posted'
                                  ? 'linear-gradient(135deg, #34D399 0%, #10B981 100%)'
                                  : 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)'
                            }}
                          >
                            {notification.type === 'quiz_assigned' || notification.type === 'new_quiz' ? (
                              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            ) : notification.type === 'quiz_submitted' || notification.type === 'grade_posted' ? (
                              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                              </svg>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <h4 className="text-sm font-bold text-white">{notification.title}</h4>
                              {!notification.read && (
                                <span 
                                  className="w-2 h-2 rounded-full flex-shrink-0 mt-1"
                                  style={{
                                    background: 'linear-gradient(135deg, #4F46E5 0%, #8B5CF6 100%)'
                                  }}
                                />
                              )}
                            </div>
                            <p className="text-xs text-gray-400 mb-1">{notification.message}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(notification.createdAt).toLocaleDateString()} at {new Date(notification.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions (Instructor only) */}
          {user?.role === 'instructor' && (
            <button 
              onClick={() => setShowAICreateModal(true)}
              className="hidden lg:flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-white transition-all duration-200 hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, #34D399 0%, #10B981 100%)',
                boxShadow: '0 4px 12px rgba(52, 211, 153, 0.3)'
              }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-sm">New Quiz</span>
            </button>
          )}

          {/* User Profile Dropdown */}
          <div className="relative group">
            <button 
              className="flex items-center gap-3 p-2 pr-3 rounded-xl transition-all duration-200 hover:scale-105"
              style={{
                background: 'rgba(79, 70, 229, 0.1)',
                border: '2px solid rgba(79, 70, 229, 0.2)'
              }}
            >
              <div 
                className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                style={{
                  background: 'linear-gradient(135deg, #4F46E5 0%, #8B5CF6 100%)',
                  boxShadow: '0 4px 12px rgba(79, 70, 229, 0.4)'
                }}
              >
                {user?.username?.charAt(0).toUpperCase()}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-white font-semibold text-sm leading-tight">{user?.username}</p>
                <p className="text-xs capitalize" style={{ color: '#A5B4FC' }}>{user?.role}</p>
              </div>
              <svg className="w-4 h-4 text-indigo-400 hidden md:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Dropdown Menu */}
            <div 
              className="absolute right-0 mt-2 w-56 rounded-2xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 overflow-hidden"
              style={{
                background: 'rgba(15, 23, 42, 0.98)',
                border: '2px solid rgba(79, 70, 229, 0.3)',
                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)'
              }}
            >
              <div className="p-4 border-b" style={{ borderColor: 'rgba(79, 70, 229, 0.2)' }}>
                <p className="text-white font-semibold text-sm">{user?.username}</p>
                <p className="text-gray-400 text-xs">{user?.email}</p>
              </div>
              
              <div className="p-2">
                <button
                  onClick={() => setActiveView('settings')}
                  className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-gray-300 hover:text-white transition-all duration-200"
                  style={{
                    backgroundColor: 'transparent'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(79, 70, 229, 0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-sm font-medium">Settings</span>
                </button>
                
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200"
                  style={{
                    backgroundColor: 'transparent',
                    color: '#F87171'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span className="text-sm font-medium">Logout</span>
                </button>
              </div>
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
      
      <main className="pt-24 md:pt-28 pb-8 px-4 sm:px-6 md:px-8 transition-all duration-300 md:ml-0" 
        style={{ marginLeft: window.innerWidth >= 768 ? (sidebarCollapsed ? '5rem' : '18rem') : '0' }}>
        {activeView === 'home' && (
          <div className="space-y-8">
            {/* Welcome Banner */}
            <div 
              className="relative overflow-hidden rounded-3xl p-8 md:p-10 border-2"
              style={{
                background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)',
                borderColor: 'rgba(79, 70, 229, 0.3)',
                boxShadow: '0 20px 50px rgba(79, 70, 229, 0.2)'
              }}
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-indigo-500/20 to-violet-500/20 rounded-full blur-3xl" />
              <div className="relative">
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
                  Welcome, {user?.username}! 👋
                </h2>
                <p className="text-lg text-gray-300">
                  {user?.role === 'instructor' ? 'Ready to create amazing quizzes today?' : 'Ready to take some quizzes today?'}
                </p>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Total Quizzes */}
              <div 
                className="group relative overflow-hidden rounded-2xl border-2 backdrop-blur-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl"
                style={{
                  background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
                  borderColor: 'rgba(79, 70, 229, 0.3)',
                  boxShadow: '0 8px 32px rgba(79, 70, 229, 0.15)'
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-violet-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform duration-300">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold bg-emerald-500/20 text-emerald-400">
                      <span>↑</span>
                      <span>12%</span>
                    </div>
                  </div>
                  <p className="text-gray-400 text-sm font-medium mb-1">Total Quizzes</p>
                  <p className="text-white text-3xl font-bold">{stats.totalQuizzes}</p>
                </div>
              </div>

              {/* Total Plays */}
              <div 
                className="group relative overflow-hidden rounded-2xl border-2 backdrop-blur-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl"
                style={{
                  background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(167, 139, 250, 0.1) 100%)',
                  borderColor: 'rgba(139, 92, 246, 0.3)',
                  boxShadow: '0 8px 32px rgba(139, 92, 246, 0.15)'
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-violet-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-violet-500/20 flex items-center justify-center text-violet-400 group-hover:scale-110 transition-transform duration-300">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold bg-emerald-500/20 text-emerald-400">
                      <span>↑</span>
                      <span>8%</span>
                    </div>
                  </div>
                  <p className="text-gray-400 text-sm font-medium mb-1">Total Plays</p>
                  <p className="text-white text-3xl font-bold">{stats.totalPlays}</p>
                </div>
              </div>

              {/* Average Score */}
              <div 
                className="group relative overflow-hidden rounded-2xl border-2 backdrop-blur-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl"
                style={{
                  background: 'linear-gradient(135deg, rgba(52, 211, 153, 0.1) 0%, rgba(16, 185, 129, 0.1) 100%)',
                  borderColor: 'rgba(52, 211, 153, 0.3)',
                  boxShadow: '0 8px 32px rgba(52, 211, 153, 0.15)'
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-green-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform duration-300">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <div className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold bg-emerald-500/20 text-emerald-400">
                      <span>↑</span>
                      <span>5%</span>
                    </div>
                  </div>
                  <p className="text-gray-400 text-sm font-medium mb-1">Average Score</p>
                  <p className="text-white text-3xl font-bold">{stats.averageScore}%</p>
                </div>
              </div>

              {/* Engagement */}
              <div 
                className="group relative overflow-hidden rounded-2xl border-2 backdrop-blur-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl"
                style={{
                  background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.1) 0%, rgba(99, 102, 241, 0.1) 100%)',
                  borderColor: 'rgba(79, 70, 229, 0.3)',
                  boxShadow: '0 8px 32px rgba(79, 70, 229, 0.15)'
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform duration-300">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                    <div className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold bg-emerald-500/20 text-emerald-400">
                      <span>↑</span>
                      <span>15%</span>
                    </div>
                  </div>
                  <p className="text-gray-400 text-sm font-medium mb-1">Engagement</p>
                  <p className="text-white text-3xl font-bold">{stats.engagement}%</p>
                </div>
              </div>
            </div>
            {/* Recent Quizzes */}
            <div 
              className="rounded-3xl p-8 border-2"
              style={{
                background: 'rgba(15, 23, 42, 0.6)',
                borderColor: 'rgba(79, 70, 229, 0.2)',
                backdropFilter: 'blur(20px)'
              }}
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-bold text-white">Recent Quizzes</h3>
                <button 
                  onClick={() => setActiveView('quizzes')} 
                  className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition-all duration-200 hover:scale-105"
                  style={{
                    color: '#A5B4FC',
                    backgroundColor: 'rgba(79, 70, 229, 0.2)',
                    border: '2px solid rgba(79, 70, 229, 0.3)'
                  }}
                >
                  View All
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {quizzes.slice(0, 6).map((quiz) => {
                  const isExpired = quiz.deadline && new Date(quiz.deadline) < new Date();
                  const canTakeQuiz = user?.role === 'instructor' || !isExpired;
                  
                  return (
                  <div 
                    key={quiz._id}
                    className={`group relative overflow-hidden rounded-2xl border-2 backdrop-blur-xl transition-all duration-300 flex flex-col ${
                      canTakeQuiz ? 'hover:scale-[1.02] hover:shadow-2xl cursor-pointer' : 'opacity-60 cursor-not-allowed'
                    }`}
                    style={{
                      background: 'rgba(15, 23, 42, 0.6)',
                      borderColor: isExpired && user?.role === 'learner' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(79, 70, 229, 0.2)',
                      boxShadow: '0 4px 24px rgba(0, 0, 0, 0.2)',
                      minHeight: '320px'
                    }}
                    onClick={() => {
                      if (canTakeQuiz) {
                        setSelectedQuiz(quiz);
                      } else {
                        showModal('Quiz Unavailable', 'The deadline for this quiz has passed. You can no longer take this quiz.', 'warning');
                      }
                    }}
                  >
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      style={{
                        background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)'
                      }}
                    />
                    
                    <div className="relative p-6 flex flex-col flex-1">
                      <div className="flex items-start justify-between mb-4">
                        <div 
                          className="w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300"
                          style={{
                            background: 'linear-gradient(135deg, #4F46E5 0%, #8B5CF6 100%)'
                          }}
                        >
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <span className="text-xs text-gray-500 font-medium">
                          {new Date(quiz.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      
                      <h4 className="text-white font-bold text-lg mb-2 group-hover:text-indigo-300 transition-colors line-clamp-1">
                        {quiz.title}
                      </h4>
                      
                      {/* Status badges for learners */}
                      {user?.role === 'learner' && (
                        <div className="mb-3 min-h-[28px] flex flex-wrap gap-2">
                          {isExpired && (
                            <span 
                              className="text-xs font-semibold px-2 py-1 rounded-lg inline-flex items-center gap-1"
                              style={{
                                background: 'rgba(239, 68, 68, 0.2)',
                                border: '1px solid rgba(239, 68, 68, 0.4)',
                                color: '#F87171'
                              }}
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Unavailable
                            </span>
                          )}
                          {learnerSubmissions[quiz._id] && (
                            <span 
                              className="text-xs font-semibold px-2 py-1 rounded-lg inline-flex items-center gap-1"
                              style={{
                                background: 'rgba(34, 211, 238, 0.2)',
                                border: '1px solid rgba(34, 211, 238, 0.4)',
                                color: '#67E8F9'
                              }}
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Submitted ({learnerSubmissions[quiz._id].score}%)
                            </span>
                          )}
                        </div>
                      )}
                      
                      <p className="text-gray-400 text-sm line-clamp-2 mb-3">
                        {quiz.description || 'No description provided'}
                      </p>
                      
                      {/* Deadline and Time Limit Info */}
                      <div className="flex flex-wrap gap-2 mb-3">
                        {quiz.deadline && (
                          <div className="flex items-center gap-1 text-xs text-gray-400">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>Due: {new Date(quiz.deadline).toLocaleDateString()}</span>
                          </div>
                        )}
                        {quiz.timeLimit && (
                          <div className="flex items-center gap-1 text-xs text-gray-400">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>{quiz.timeLimit} min</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1"></div>
                      
                      <div className="flex gap-2 mt-auto">
                        <button 
                          disabled={!canTakeQuiz}
                          className={`flex-1 px-4 py-2.5 rounded-xl font-semibold text-white transition-all duration-200 ${
                            canTakeQuiz ? 'transform hover:scale-105' : 'opacity-50 cursor-not-allowed'
                          }`}
                          style={{
                            background: canTakeQuiz ? 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)' : 'rgba(79, 70, 229, 0.5)',
                            boxShadow: canTakeQuiz ? '0 4px 12px rgba(79, 70, 229, 0.3)' : 'none'
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (canTakeQuiz) {
                              setSelectedQuiz(quiz);
                            } else {
                              showModal('Quiz Unavailable', 'The deadline for this quiz has passed. You can no longer take this quiz.', 'warning');
                            }
                          }}
                        >
                          {user?.role === 'instructor' 
                            ? 'Manage' 
                            : learnerSubmissions[quiz._id] 
                              ? 'View Results' 
                              : 'Take Quiz'}
                        </button>
                        {user?.role === 'instructor' && (
                          <button 
                            className="px-4 py-2.5 rounded-xl font-semibold transition-all duration-200 hover:scale-105"
                            style={{
                              backgroundColor: 'rgba(139, 92, 246, 0.2)',
                              border: '2px solid rgba(139, 92, 246, 0.3)',
                              color: '#A78BFA'
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setViewingSubmissions(quiz);
                            }}
                            title="View Submissions"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
              
              {quizzes.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16">
                  <div 
                    className="w-24 h-24 rounded-full flex items-center justify-center mb-6"
                    style={{
                      background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)',
                      border: '2px solid rgba(79, 70, 229, 0.3)'
                    }}
                  >
                    <svg className="w-12 h-12 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">
                    {user?.role === 'instructor' ? 'No Quizzes Created Yet' : 'No Quizzes Available'}
                  </h3>
                  <p className="text-gray-400 text-center max-w-md mb-6">
                    {user?.role === 'instructor' 
                      ? 'Create your first quiz to get started with QuizMate'
                      : 'Join a class to access quizzes from your instructors'}
                  </p>
                  {user?.role === 'instructor' && (
                    <button
                      onClick={() => setShowAICreateModal(true)}
                      className="px-6 py-3 rounded-xl font-semibold text-white transition-all duration-200 transform hover:scale-105"
                      style={{
                        background: 'linear-gradient(135deg, #4F46E5 0%, #8B5CF6 100%)',
                        boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)'
                      }}
                    >
                      Create Your First Quiz
                    </button>
                  )}
                </div>
              )}
            </div>
            {/* Quick Actions for Instructors */}
            {user?.role === 'instructor' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <button 
                  onClick={() => setShowAICreateModal(true)} 
                  className="group relative overflow-hidden rounded-2xl p-8 text-white transition-all duration-300 hover:scale-105 hover:shadow-2xl"
                  style={{
                    background: 'linear-gradient(135deg, #34D399 0%, #10B981 100%)',
                    boxShadow: '0 10px 30px rgba(52, 211, 153, 0.3)'
                  }}
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                  <div className="relative">
                    <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                    <h4 className="text-xl font-bold mb-2">AI Quiz Generator</h4>
                    <p className="text-emerald-100 text-sm">Create quizzes from documents instantly</p>
                  </div>
                </button>

                <button 
                  onClick={() => setActiveView('analytics')} 
                  className="group relative overflow-hidden rounded-2xl p-8 text-white transition-all duration-300 hover:scale-105 hover:shadow-2xl"
                  style={{
                    background: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)',
                    boxShadow: '0 10px 30px rgba(139, 92, 246, 0.3)'
                  }}
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                  <div className="relative">
                    <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <h4 className="text-xl font-bold mb-2">View Analytics</h4>
                    <p className="text-violet-100 text-sm">Track quiz performance and insights</p>
                  </div>
                </button>

                <button 
                  onClick={() => setActiveView('settings')} 
                  className="group relative overflow-hidden rounded-2xl p-8 text-white transition-all duration-300 hover:scale-105 hover:shadow-2xl"
                  style={{
                    background: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)',
                    boxShadow: '0 10px 30px rgba(79, 70, 229, 0.3)'
                  }}
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                  <div className="relative">
                    <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <h4 className="text-xl font-bold mb-2">Settings</h4>
                    <p className="text-indigo-100 text-sm">Customize your experience</p>
                  </div>
                </button>
              </div>
            )}
          </div>
        )}

        {activeView === 'quizzes' && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-3xl font-bold text-white mb-2">
                  {user?.role === 'instructor' ? 'My Quizzes' : 'Available Quizzes'}
                </h2>
                <p className="text-gray-400">
                  {user?.role === 'instructor' ? 'Manage and organize your quizzes' : 'Browse quizzes from your classes'}
                </p>
              </div>
              {user?.role === 'instructor' && (
                <button 
                  onClick={() => setShowAICreateModal(true)} 
                  className="px-6 py-3 rounded-xl font-semibold text-white transition-all duration-200 transform hover:scale-105 flex items-center gap-2"
                  style={{
                    background: 'linear-gradient(135deg, #34D399 0%, #10B981 100%)',
                    boxShadow: '0 10px 30px rgba(52, 211, 153, 0.3)'
                  }}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create New Quiz
                </button>
              )}
            </div>

            {/* Class Filter Tabs for Both Instructors and Learners */}
            {classes.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                <button
                  onClick={() => setSelectedClassFilter('all')}
                  className="px-4 py-2 rounded-xl font-semibold text-sm whitespace-nowrap transition-all duration-200 hover:scale-105"
                  style={{
                    background: selectedClassFilter === 'all'
                      ? 'linear-gradient(135deg, #4F46E5 0%, #8B5CF6 100%)'
                      : 'rgba(79, 70, 229, 0.1)',
                    border: selectedClassFilter === 'all'
                      ? '2px solid rgba(79, 70, 229, 0.6)'
                      : '2px solid rgba(79, 70, 229, 0.3)',
                    color: selectedClassFilter === 'all' ? '#FFFFFF' : '#A5B4FC',
                    boxShadow: selectedClassFilter === 'all' ? '0 4px 12px rgba(79, 70, 229, 0.3)' : 'none'
                  }}
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                    All Classes
                  </span>
                </button>
                {classes.map((classItem) => (
                  <button
                    key={classItem._id}
                    onClick={() => setSelectedClassFilter(classItem._id)}
                    className="px-4 py-2 rounded-xl font-semibold text-sm whitespace-nowrap transition-all duration-200 hover:scale-105"
                    style={{
                      background: selectedClassFilter === classItem._id
                        ? 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)'
                        : 'rgba(139, 92, 246, 0.1)',
                      border: selectedClassFilter === classItem._id
                        ? '2px solid rgba(139, 92, 246, 0.6)'
                        : '2px solid rgba(139, 92, 246, 0.3)',
                      color: selectedClassFilter === classItem._id ? '#FFFFFF' : '#C4B5FD',
                      boxShadow: selectedClassFilter === classItem._id ? '0 4px 12px rgba(139, 92, 246, 0.3)' : 'none'
                    }}
                  >
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      {classItem.name}
                    </span>
                  </button>
                ))}
              </div>
            )}
            
            {(() => {
              const filteredQuizzes = quizzes.filter((quiz) => {
                // Filter by selected class for both instructors and learners
                if (selectedClassFilter === 'all') return true;
                
                // Check if quiz belongs to selected class
                const selectedClass = classes.find(c => c._id === selectedClassFilter);
                return selectedClass?.quizzes?.includes(quiz._id);
              });

              return (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredQuizzes.map((quiz) => {
                      const isExpired = quiz.deadline && new Date(quiz.deadline) < new Date();
                      const canTakeQuiz = user?.role === 'instructor' || !isExpired;
                      
                      return (
                <div 
                  key={quiz._id}
                  className={`group relative overflow-hidden rounded-2xl border-2 backdrop-blur-xl transition-all duration-300 flex flex-col ${
                    canTakeQuiz ? 'hover:scale-[1.02] hover:shadow-2xl cursor-pointer' : 'opacity-60 cursor-not-allowed'
                  }`}
                  style={{
                    background: 'rgba(15, 23, 42, 0.6)',
                    borderColor: isExpired && user?.role === 'learner' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(79, 70, 229, 0.2)',
                    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.2)',
                    minHeight: '340px'
                  }}
                  onClick={() => {
                    if (canTakeQuiz) {
                      setSelectedQuiz(quiz);
                    } else {
                      showModal('Quiz Expired', 'The deadline for this quiz has passed. You can no longer take this quiz.', 'warning');
                    }
                  }}
                >
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{
                      background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)'
                    }}
                  />
                  
                  <div className="relative p-6 flex flex-col flex-1">
                    <div className="flex items-start justify-between mb-4">
                      <div 
                        className="w-14 h-14 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300"
                        style={{
                          background: 'linear-gradient(135deg, #4F46E5 0%, #8B5CF6 100%)'
                        }}
                      >
                        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <span className="text-xs text-gray-500 font-medium px-3 py-1 rounded-lg" style={{ backgroundColor: 'rgba(79, 70, 229, 0.1)' }}>
                        {new Date(quiz.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <h3 className="text-xl font-bold text-white mb-2 group-hover:text-indigo-300 transition-colors line-clamp-1">
                      {quiz.title}
                    </h3>
                    
                    {/* Class badge and submission status for learners */}
                    {user?.role === 'learner' && (
                      <div className="flex flex-wrap gap-1 mb-3 min-h-[32px]">
                        {classes
                          .filter(c => c.quizzes?.includes(quiz._id))
                          .map(classItem => (
                            <span 
                              key={classItem._id}
                              className="text-xs font-semibold px-2 py-1 rounded-lg h-fit"
                              style={{
                                background: 'rgba(139, 92, 246, 0.2)',
                                border: '1px solid rgba(139, 92, 246, 0.4)',
                                color: '#C4B5FD'
                              }}
                            >
                              📚 {classItem.name}
                            </span>
                          ))}
                        {isExpired && (
                          <span 
                            className="text-xs font-semibold px-2 py-1 rounded-lg flex items-center gap-1 h-fit"
                            style={{
                              background: 'rgba(239, 68, 68, 0.2)',
                              border: '1px solid rgba(239, 68, 68, 0.4)',
                              color: '#F87171'
                            }}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Unavailable
                          </span>
                        )}
                        {learnerSubmissions[quiz._id] && (
                          <span 
                            className="text-xs font-semibold px-2 py-1 rounded-lg flex items-center gap-1 h-fit"
                            style={{
                              background: 'rgba(34, 211, 238, 0.2)',
                              border: '1px solid rgba(34, 211, 238, 0.4)',
                              color: '#67E8F9'
                            }}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Submitted ({learnerSubmissions[quiz._id].score}%)
                          </span>
                        )}
                      </div>
                    )}
                    
                    {/* Submission count for instructors */}
                    {user?.role === 'instructor' && (
                      <div className="flex items-center gap-2 mb-3 min-h-[32px]">
                        <span 
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5"
                          style={{
                            background: 'rgba(34, 211, 238, 0.2)',
                            border: '1px solid rgba(34, 211, 238, 0.4)',
                            color: '#67E8F9'
                          }}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          {quizSubmissionCounts[quiz._id] || 0} {(quizSubmissionCounts[quiz._id] || 0) === 1 ? 'Submission' : 'Submissions'}
                        </span>
                      </div>
                    )}
                    
                    <p className="text-gray-400 text-sm line-clamp-2 mb-3">
                      {quiz.description || 'No description available'}
                    </p>
                    
                    {/* Deadline and Time Limit Info */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {quiz.deadline && (
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span>Due: {new Date(quiz.deadline).toLocaleDateString()}</span>
                        </div>
                      )}
                      {quiz.timeLimit && (
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>{quiz.timeLimit} min</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1"></div>
                    
                    <div className="flex gap-2 mt-auto">
                      <button 
                        disabled={!canTakeQuiz}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (canTakeQuiz) {
                            setSelectedQuiz(quiz);
                          } else {
                            showModal('Quiz Unavailable', 'The deadline for this quiz has passed. You can no longer take this quiz.', 'warning');
                          }
                        }}
                        className={`flex-1 px-4 py-2.5 rounded-xl font-semibold text-white transition-all duration-200 ${
                          canTakeQuiz ? 'transform hover:scale-105' : 'opacity-50 cursor-not-allowed'
                        }`}
                        style={{
                          background: canTakeQuiz ? 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)' : 'rgba(79, 70, 229, 0.5)',
                          boxShadow: canTakeQuiz ? '0 4px 12px rgba(79, 70, 229, 0.3)' : 'none'
                        }}
                      >
                        {user?.role === 'instructor' 
                          ? 'Manage' 
                          : learnerSubmissions[quiz._id] 
                            ? 'View Results' 
                            : 'Take Quiz'}
                      </button>
                      {user?.role === 'instructor' && (
                        <>
                          <button 
                            onClick={() => setViewingSubmissions(quiz)}
                            className="px-4 py-2.5 rounded-xl font-semibold transition-all duration-200 hover:scale-105"
                            style={{
                              backgroundColor: 'rgba(139, 92, 246, 0.2)',
                              border: '2px solid rgba(139, 92, 246, 0.3)',
                              color: '#A78BFA'
                            }}
                            title="View Submissions"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                          </button>
                          <button 
                            onClick={() => deleteQuiz(quiz._id)}
                            className="px-4 py-2.5 rounded-xl font-semibold transition-all duration-200 hover:scale-105"
                            style={{
                              backgroundColor: 'rgba(239, 68, 68, 0.2)',
                              border: '2px solid rgba(239, 68, 68, 0.3)',
                              color: '#F87171'
                            }}
                            title="Delete Quiz"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                      );
                    })}
                  </div>
                  
                  {filteredQuizzes.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20">
                <div 
                  className="w-24 h-24 rounded-full flex items-center justify-center mb-6"
                  style={{
                    background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)',
                    border: '2px solid rgba(79, 70, 229, 0.3)'
                  }}
                >
                  <svg className="w-12 h-12 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">
                  {selectedClassFilter !== 'all' 
                    ? 'No Quizzes in This Class' 
                    : user?.role === 'instructor'
                      ? 'No Quizzes Created Yet'
                      : 'No Quizzes Available'}
                </h3>
                <p className="text-gray-400 text-center max-w-md mb-6">
                  {selectedClassFilter !== 'all'
                    ? 'This class doesn\'t have any quizzes yet. Check back later or try another class.'
                    : user?.role === 'instructor' 
                      ? 'Create your first quiz to get started with QuizMate'
                      : 'Join a class to access quizzes from your instructors'}
                </p>
                {user?.role === 'instructor' && (
                  <button
                    onClick={() => setShowAICreateModal(true)}
                    className="px-6 py-3 rounded-xl font-semibold text-white transition-all duration-200 transform hover:scale-105"
                    style={{
                      background: 'linear-gradient(135deg, #4F46E5 0%, #8B5CF6 100%)',
                      boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)'
                    }}
                  >
                    Create Your First Quiz
                  </button>
                )}
                  </div>
                  )}
                </>
              );
            })()}
          </div>
        )}

        {activeView === 'classes' && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-3xl font-bold text-white mb-2">
                  {user?.role === 'instructor' ? 'My Classes' : 'Joined Classes'}
                </h2>
                <p className="text-gray-400">
                  {user?.role === 'instructor' 
                    ? 'Manage your classes and share codes with students' 
                    : 'View classes you have joined'}
                </p>
              </div>
              {user?.role === 'instructor' ? (
                <button 
                  onClick={() => setShowCreateClassModal(true)} 
                  className="px-6 py-3 rounded-xl font-semibold text-white transition-all duration-200 transform hover:scale-105 flex items-center gap-2"
                  style={{
                    background: 'linear-gradient(135deg, #34D399 0%, #10B981 100%)',
                    boxShadow: '0 10px 30px rgba(52, 211, 153, 0.3)'
                  }}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create Class
                </button>
              ) : (
                <button 
                  onClick={() => setShowJoinClassModal(true)} 
                  className="px-6 py-3 rounded-xl font-semibold text-white transition-all duration-200 transform hover:scale-105 flex items-center gap-2"
                  style={{
                    background: 'linear-gradient(135deg, #4F46E5 0%, #8B5CF6 100%)',
                    boxShadow: '0 10px 30px rgba(79, 70, 229, 0.3)'
                  }}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Join Class
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {classes.map((classItem) => (
                <div 
                  key={classItem._id}
                  className="group relative overflow-hidden rounded-2xl border-2 backdrop-blur-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl"
                  style={{
                    background: 'rgba(15, 23, 42, 0.6)',
                    borderColor: 'rgba(139, 92, 246, 0.2)',
                    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.2)'
                  }}
                >
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{
                      background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(79, 70, 229, 0.1) 100%)'
                    }}
                  />
                  
                  <div className="relative p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div 
                        className="w-14 h-14 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300"
                        style={{
                          background: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)'
                        }}
                      >
                        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                      {user?.role === 'instructor' && (
                        <div className="flex flex-col items-end gap-2">
                          <span className="text-xs text-gray-400 font-medium">Class Code</span>
                          <div 
                            className="px-3 py-1.5 rounded-lg font-bold text-lg tracking-wider cursor-pointer hover:scale-105 transition-transform"
                            style={{ 
                              backgroundColor: 'rgba(52, 211, 153, 0.2)',
                              border: '2px solid rgba(52, 211, 153, 0.4)',
                              color: '#34D399'
                            }}
                            onClick={() => {
                              navigator.clipboard.writeText(classItem.classCode);
                              showModal('Success', 'Class code copied to clipboard!', 'success');
                            }}
                            title="Click to copy"
                          >
                            {classItem.classCode}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <h3 className="text-xl font-bold text-white mb-2 group-hover:text-violet-300 transition-colors">
                      {classItem.name}
                    </h3>
                    <p className="text-gray-400 text-sm line-clamp-2 mb-4">
                      {classItem.description || 'No description available'}
                    </p>
                    
                    <div className="flex items-center gap-4 mb-4 text-sm">
                      <div className="flex items-center gap-2 text-gray-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        <span>{classItem.learners?.length || 0} students</span>
                      </div>
                      {user?.role === 'learner' && classItem.instructorId && (
                        <div className="flex items-center gap-2 text-gray-400">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <span>{classItem.instructorId.username}</span>
                        </div>
                      )}
                    </div>
                    
                    <button 
                      onClick={() => setSelectedClass(classItem)}
                      className="w-full px-4 py-2.5 rounded-xl font-semibold text-white transition-all duration-200 transform hover:scale-105"
                      style={{
                        background: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)',
                        boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)'
                      }}
                    >
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            {classes.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20">
                <div 
                  className="w-24 h-24 rounded-full flex items-center justify-center mb-6"
                  style={{
                    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(79, 70, 229, 0.2) 100%)',
                    border: '2px solid rgba(139, 92, 246, 0.3)'
                  }}
                >
                  <svg className="w-12 h-12 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">
                  {user?.role === 'instructor' ? 'No Classes Created Yet' : 'No Classes Joined Yet'}
                </h3>
                <p className="text-gray-400 text-center max-w-md mb-6">
                  {user?.role === 'instructor' 
                    ? 'Create your first class to organize students and quizzes'
                    : 'Join a class using a class code from your instructor'}
                </p>
                {user?.role === 'instructor' ? (
                  <button
                    onClick={() => setShowCreateClassModal(true)}
                    className="px-6 py-3 rounded-xl font-semibold text-white transition-all duration-200 transform hover:scale-105"
                    style={{
                      background: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)',
                      boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)'
                    }}
                  >
                    Create Your First Class
                  </button>
                ) : (
                  <button
                    onClick={() => setShowJoinClassModal(true)}
                    className="px-6 py-3 rounded-xl font-semibold text-white transition-all duration-200 transform hover:scale-105"
                    style={{
                      background: 'linear-gradient(135deg, #4F46E5 0%, #8B5CF6 100%)',
                      boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)'
                    }}
                  >
                    Join Your First Class
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {activeView === 'analytics' && (
          <div className="space-y-8">
            {/* Page Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold text-white mb-2">Analytics Dashboard</h2>
                <p className="text-gray-400">Track your quiz performance and engagement metrics</p>
              </div>
              <button 
                onClick={exportAnalyticsReport}
                className="px-6 py-3 rounded-xl font-semibold text-white transition-all duration-200 hover:scale-105 flex items-center gap-2"
                style={{
                  background: 'linear-gradient(135deg, #4F46E5 0%, #8B5CF6 100%)',
                  boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)'
                }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export Report
              </button>
            </div>

            {/* Performance Chart */}
            <div 
              className="rounded-3xl p-8 border-2"
              style={{
                background: 'rgba(15, 23, 42, 0.6)',
                borderColor: 'rgba(79, 70, 229, 0.2)',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
              }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, #4F46E5 0%, #8B5CF6 100%)',
                    boxShadow: '0 4px 12px rgba(79, 70, 229, 0.4)'
                  }}
                >
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Weekly Performance</h3>
                  <p className="text-sm text-gray-400">Average quiz scores over the last 7 days</p>
                </div>
              </div>
              
              <div className="h-72 flex items-end justify-around gap-3">
                {weeklyPerformance.map((value, index) => (
                  <div key={index} className="flex-1 flex flex-col items-center gap-3 group">
                    <div 
                      className="relative w-full rounded-t-2xl overflow-hidden transition-all duration-300 group-hover:scale-105"
                      style={{ height: '240px' }}
                    >
                      <div 
                        className="absolute bottom-0 w-full rounded-t-2xl transition-all duration-500"
                        style={{ 
                          height: `${Math.max(value, 5)}%`, // Minimum 5% for visibility
                          background: `linear-gradient(to top, ${
                            value >= 85 ? '#34D399' : value >= 70 ? '#8B5CF6' : '#4F46E5'
                          }, ${
                            value >= 85 ? '#10B981' : value >= 70 ? '#A78BFA' : '#6366F1'
                          })`,
                          boxShadow: `0 -4px 20px ${
                            value >= 85 ? 'rgba(52, 211, 153, 0.4)' : value >= 70 ? 'rgba(139, 92, 246, 0.4)' : 'rgba(79, 70, 229, 0.4)'
                          }`
                        }}
                      >
                        <div className="absolute top-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="text-white font-bold text-sm bg-black/50 px-2 py-1 rounded-lg backdrop-blur-sm">
                            {value}%
                          </span>
                        </div>
                      </div>
                    </div>
                    <span className="text-xs text-gray-400 font-medium">
                      {new Date(Date.now() - (6 - index) * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { weekday: 'short' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Two Column Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Performing Quizzes */}
              <div 
                className="rounded-3xl p-8 border-2"
                style={{
                  background: 'rgba(15, 23, 42, 0.6)',
                  borderColor: 'rgba(139, 92, 246, 0.2)',
                  backdropFilter: 'blur(20px)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
                }}
              >
                <div className="flex items-center gap-3 mb-6">
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)',
                      boxShadow: '0 4px 12px rgba(139, 92, 246, 0.4)'
                    }}
                  >
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Top Performers</h3>
                    <p className="text-sm text-gray-400">Best scoring quizzes</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  {quizPerformance.length > 0 ? (
                    quizPerformance.map((perf, index) => (
                      <div 
                        key={perf.quizId} 
                        className="flex items-center justify-between p-4 rounded-xl transition-all duration-200 hover:scale-[1.02]"
                        style={{
                          background: 'rgba(79, 70, 229, 0.1)',
                          border: '2px solid rgba(79, 70, 229, 0.2)'
                        }}
                      >
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div 
                            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 text-xl"
                            style={{
                              background: index === 0 ? 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)' :
                                         index === 1 ? 'linear-gradient(135deg, #C0C0C0 0%, #A8A8A8 100%)' :
                                         index === 2 ? 'linear-gradient(135deg, #CD7F32 0%, #B8860B 100%)' :
                                         'rgba(79, 70, 229, 0.3)'
                            }}
                          >
                            {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '📝'}
                          </div>
                          <span className="text-white font-medium truncate">{perf.title}</span>
                        </div>
                        <span 
                          className="px-4 py-2 rounded-lg font-bold text-sm flex-shrink-0"
                          style={{
                            backgroundColor: perf.avgScore >= 85 ? 'rgba(52, 211, 153, 0.2)' : 'rgba(139, 92, 246, 0.2)',
                            color: perf.avgScore >= 85 ? '#34D399' : '#A78BFA'
                          }}
                        >
                          {perf.avgScore}%
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      <p>No quiz submissions yet</p>
                      <p className="text-sm mt-2">Performance data will appear here once students start taking quizzes</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Participation Trends */}
              <div 
                className="rounded-3xl p-8 border-2"
                style={{
                  background: 'rgba(15, 23, 42, 0.6)',
                  borderColor: 'rgba(52, 211, 153, 0.2)',
                  backdropFilter: 'blur(20px)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
                }}
              >
                <div className="flex items-center gap-3 mb-6">
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(135deg, #34D399 0%, #10B981 100%)',
                      boxShadow: '0 4px 12px rgba(52, 211, 153, 0.4)'
                    }}
                  >
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Engagement Trends</h3>
                    <p className="text-sm text-gray-400">Participation over time</p>
                  </div>
                </div>
                
                <div className="space-y-6">
                  {[
                    { label: 'This Week', value: 87, color: '#34D399' },
                    { label: 'Last Week', value: 72, color: '#8B5CF6' },
                    { label: 'Last Month', value: 65, color: '#4F46E5' }
                  ].map((item, index) => (
                    <div key={index}>
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-gray-300 font-medium">{item.label}</span>
                        <span className="text-white font-bold text-lg">{item.value}%</span>
                      </div>
                      <div 
                        className="h-3 rounded-full overflow-hidden"
                        style={{ backgroundColor: 'rgba(30, 41, 59, 0.5)' }}
                      >
                        <div 
                          className="h-full rounded-full transition-all duration-1000 ease-out"
                          style={{ 
                            width: `${item.value}%`,
                            background: `linear-gradient(90deg, ${item.color} 0%, ${item.color}CC 100%)`,
                            boxShadow: `0 0 10px ${item.color}80`
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeView === 'settings' && (
          <div className="space-y-8">
            {/* Page Header */}
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">Settings</h2>
              <p className="text-gray-400">Manage your account preferences and profile information</p>
            </div>

            {/* Profile Card */}
            <div 
              className="rounded-3xl p-8 border-2"
              style={{
                background: 'rgba(15, 23, 42, 0.6)',
                borderColor: 'rgba(79, 70, 229, 0.2)',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
              }}
            >
              <div className="flex items-center gap-6 mb-8">
                <div 
                  className="w-24 h-24 rounded-2xl flex items-center justify-center text-white font-bold text-4xl"
                  style={{
                    background: 'linear-gradient(135deg, #4F46E5 0%, #8B5CF6 100%)',
                    boxShadow: '0 8px 24px rgba(79, 70, 229, 0.4)'
                  }}
                >
                  {user?.username?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-white mb-1">{user?.username}</h3>
                  <p className="text-gray-400 mb-3">{user?.email}</p>
                  <span 
                    className="inline-block px-4 py-2 rounded-xl font-semibold text-sm capitalize"
                    style={{
                      background: user?.role === 'instructor' 
                        ? 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)'
                        : 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)',
                      color: 'white',
                      boxShadow: user?.role === 'instructor'
                        ? '0 4px 12px rgba(139, 92, 246, 0.3)'
                        : '0 4px 12px rgba(79, 70, 229, 0.3)'
                    }}
                  >
                    {user?.role}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Username
                  </label>
                  {editingUsername ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        className="flex-1 px-4 py-3 rounded-xl text-white focus:outline-none transition-all duration-200"
                        style={{
                          backgroundColor: 'rgba(79, 70, 229, 0.2)',
                          border: '2px solid rgba(79, 70, 229, 0.4)'
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = '#4F46E5';
                          e.target.style.boxShadow = '0 0 0 4px rgba(79, 70, 229, 0.2)';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = 'rgba(79, 70, 229, 0.4)';
                          e.target.style.boxShadow = 'none';
                        }}
                        placeholder="Enter new username"
                      />
                      <button
                        onClick={async () => {
                          if (!newUsername.trim()) return;
                          setSavingUsername(true);
                          
                          try {
                            const token = localStorage.getItem('token');
                            const response = await fetch('/api/user/profile', {
                              method: 'PUT',
                              headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`,
                              },
                              body: JSON.stringify({ username: newUsername.trim() }),
                            });

                            if (response.ok) {
                              const data = await response.json();
                              // Update the user in AuthContext directly without reloading
                              updateUser({ username: newUsername.trim() });
                              
                              showModal('Success', 'Username updated successfully!', 'success');
                              setEditingUsername(false);
                              setNewUsername('');
                            } else {
                              const errorData = await response.json();
                              showModal('Error', errorData.error || 'Failed to update username', 'error');
                            }
                          } catch (error) {
                            console.error('Error updating username:', error);
                            showModal('Error', 'An error occurred while updating username', 'error');
                          } finally {
                            setSavingUsername(false);
                          }
                        }}
                        disabled={savingUsername || !newUsername.trim()}
                        className="px-4 py-3 rounded-xl font-semibold text-white transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{
                          background: 'linear-gradient(135deg, #34D399 0%, #10B981 100%)',
                          boxShadow: '0 4px 12px rgba(52, 211, 153, 0.3)'
                        }}
                      >
                        {savingUsername ? (
                          <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setEditingUsername(false);
                          setNewUsername('');
                        }}
                        className="px-4 py-3 rounded-xl font-semibold transition-all duration-200 hover:scale-105"
                        style={{
                          backgroundColor: 'rgba(239, 68, 68, 0.2)',
                          border: '2px solid rgba(239, 68, 68, 0.3)',
                          color: '#F87171'
                        }}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <div 
                        className="flex-1 px-4 py-3 rounded-xl"
                        style={{
                          backgroundColor: 'rgba(79, 70, 229, 0.1)',
                          border: '2px solid rgba(79, 70, 229, 0.3)'
                        }}
                      >
                        <p className="text-white font-medium">{user?.username}</p>
                      </div>
                      <button
                        onClick={() => {
                          setEditingUsername(true);
                          setNewUsername(user?.username || '');
                        }}
                        className="px-4 py-3 rounded-xl font-semibold transition-all duration-200 hover:scale-105"
                        style={{
                          backgroundColor: 'rgba(79, 70, 229, 0.2)',
                          border: '2px solid rgba(79, 70, 229, 0.3)',
                          color: '#A5B4FC'
                        }}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Email Address
                  </label>
                  <div 
                    className="px-4 py-3 rounded-xl"
                    style={{
                      backgroundColor: 'rgba(79, 70, 229, 0.1)',
                      border: '2px solid rgba(79, 70, 229, 0.3)'
                    }}
                  >
                    <p className="text-white font-medium">{user?.email}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Account Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div 
                className="rounded-2xl p-6 border-2 transition-all duration-200 hover:scale-[1.02]"
                style={{
                  background: 'rgba(15, 23, 42, 0.6)',
                  borderColor: 'rgba(79, 70, 229, 0.3)',
                  backdropFilter: 'blur(20px)',
                  boxShadow: '0 4px 16px rgba(79, 70, 229, 0.2)'
                }}
              >
                <div className="flex items-center gap-4">
                  <div 
                    className="w-14 h-14 rounded-xl flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)'
                    }}
                  >
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-white">{stats.totalQuizzes}</p>
                    <p className="text-sm text-gray-400 font-medium">Total Quizzes</p>
                  </div>
                </div>
              </div>

              <div 
                className="rounded-2xl p-6 border-2 transition-all duration-200 hover:scale-[1.02]"
                style={{
                  background: 'rgba(15, 23, 42, 0.6)',
                  borderColor: 'rgba(139, 92, 246, 0.3)',
                  backdropFilter: 'blur(20px)',
                  boxShadow: '0 4px 16px rgba(139, 92, 246, 0.2)'
                }}
              >
                <div className="flex items-center gap-4">
                  <div 
                    className="w-14 h-14 rounded-xl flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)'
                    }}
                  >
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-white">{stats.totalPlays}</p>
                    <p className="text-sm text-gray-400 font-medium">Total Plays</p>
                  </div>
                </div>
              </div>

              <div 
                className="rounded-2xl p-6 border-2 transition-all duration-200 hover:scale-[1.02]"
                style={{
                  background: 'rgba(15, 23, 42, 0.6)',
                  borderColor: 'rgba(52, 211, 153, 0.3)',
                  backdropFilter: 'blur(20px)',
                  boxShadow: '0 4px 16px rgba(52, 211, 153, 0.2)'
                }}
              >
                <div className="flex items-center gap-4">
                  <div 
                    className="w-14 h-14 rounded-xl flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(135deg, #34D399 0%, #10B981 100%)'
                    }}
                  >
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-white">{stats.averageScore}%</p>
                    <p className="text-sm text-gray-400 font-medium">Avg Score</p>
                  </div>
                </div>
              </div>
            </div>


          </div>
        )}

      </main>

      {/* AI Quiz Creation Modal */}
      {showAICreateModal && <AIQuizCreationModal />}

      {/* AI Quiz Preview */}
      {showAIPreview && aiQuizData && <AIQuizPreview />}

      {/* Class Modals */}
      {showCreateClassModal && <CreateClassModal />}
      {showJoinClassModal && <JoinClassModal />}
      {selectedClass && <ClassDetailsModal />}

      {/* Global Modal */}
      <Modal
        isOpen={modalConfig.isOpen}
        onClose={closeModal}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        onConfirm={modalConfig.onConfirm}
      />

      {/* Real-time Toast Notification */}
      {toast && (
        <div 
          className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300"
          style={{ maxWidth: '400px' }}
        >
          <div 
            className="px-6 py-4 rounded-2xl shadow-2xl border-2 backdrop-blur-xl flex items-center gap-3"
            style={{
              background: toast.type === 'success' 
                ? 'rgba(52, 211, 153, 0.95)' 
                : 'rgba(79, 70, 229, 0.95)',
              borderColor: toast.type === 'success' 
                ? 'rgba(52, 211, 153, 0.3)' 
                : 'rgba(79, 70, 229, 0.3)',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)'
            }}
          >
            <div className="flex-shrink-0">
              {toast.type === 'success' ? (
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
            <p className="text-white font-semibold flex-1">{toast.message}</p>
            <button
              onClick={() => setToast(null)}
              className="flex-shrink-0 text-white hover:text-gray-200 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;