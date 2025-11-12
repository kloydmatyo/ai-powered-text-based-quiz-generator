'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import LandingPage from '@/components/LandingPage';
import LoginForm from '@/components/LoginForm';
import RegisterForm from '@/components/RegisterForm';
import Dashboard from '@/components/Dashboard';

export default function Home() {
  const { user, loading } = useAuth();
  const [view, setView] = useState<'landing' | 'login' | 'register'>('landing');

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (user) {
    return <Dashboard />;
  }

  // Show different views based on state
  if (view === 'login') {
    return <LoginForm onSwitchToRegister={() => setView('register')} />;
  }

  if (view === 'register') {
    return <RegisterForm onSwitchToLogin={() => setView('login')} />;
  }

  return <LandingPage onGetStarted={() => setView('register')} />;
}