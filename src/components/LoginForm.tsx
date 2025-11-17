'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { signIn } from 'next-auth/react';

interface LoginFormProps {
  onSwitchToRegister: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onSwitchToRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const { login } = useAuth();

  // Check for OAuth errors in URL
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const errorParam = urlParams.get('error');
    if (errorParam) {
      setError(decodeURIComponent(errorParam));
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden py-4" style={{ backgroundColor: '#0F172A' }}>
      {/* Simplified Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div 
          className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-20 blur-3xl animate-pulse"
          style={{ 
            background: 'radial-gradient(circle, #4F46E5 0%, #8B5CF6 50%, transparent 70%)',
            animationDuration: '4s'
          }}
        />
        <div 
          className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full opacity-15 blur-3xl animate-pulse"
          style={{ 
            background: 'radial-gradient(circle, #8B5CF6 0%, #4F46E5 50%, transparent 70%)',
            animationDuration: '5s'
          }}
        />
      </div>

      {/* Compact Login Card */}
      <div className="relative z-10 w-full max-w-sm px-4">
        <div 
          className="backdrop-blur-xl rounded-2xl shadow-2xl p-5 border max-h-[95vh] overflow-y-auto"
          style={{ 
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            borderColor: 'rgba(79, 70, 229, 0.3)',
            boxShadow: '0 20px 40px -12px rgba(79, 70, 229, 0.3)'
          }}
        >
          {/* Compact Header */}
          <div className="text-center mb-4">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg mb-2" style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #8B5CF6 100%)' }}>
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-white mb-1">QuizMate</h1>
            <p className="text-gray-400 text-xs">Sign in to continue</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-3 p-3 rounded-lg border-2" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
              <p className="text-red-300 text-xs font-medium">{error}</p>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Email Input */}
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-gray-300 mb-1">Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  style={{ 
                    backgroundColor: 'rgba(30, 41, 59, 0.6)',
                    border: '1px solid rgba(79, 70, 229, 0.3)'
                  }}
                  placeholder="Enter your email"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="password" className="block text-xs font-medium text-gray-300 mb-1">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  style={{ 
                    backgroundColor: 'rgba(30, 41, 59, 0.6)',
                    border: '1px solid rgba(79, 70, 229, 0.3)'
                  }}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-300"
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Forgot Password */}
            <div className="text-right">
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Forgot password?
              </button>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-lg font-semibold text-sm text-white transition-all duration-200 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: loading ? 'rgba(79, 70, 229, 0.5)' : 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)',
                boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)'
              }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Google Sign In */}
          <div className="mt-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-600" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-2 text-gray-400 bg-slate-900">Or continue with</span>
              </div>
            </div>
            
            <button
              type="button"
              onClick={async () => {
                const result = await signIn('google', { 
                  callbackUrl: '/',
                  redirect: false 
                });
                
                if (result?.error) {
                  setError(result.error);
                }
              }}
              className="w-full mt-3 py-2.5 px-4 rounded-lg font-medium text-sm text-white border border-gray-600 hover:border-gray-500 transition-all duration-200 flex items-center justify-center gap-2"
              style={{ backgroundColor: 'rgba(30, 41, 59, 0.6)' }}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>
            
            {/* Info Note */}
            <div className="mt-2 p-2 rounded-lg border border-indigo-800 bg-indigo-900/20">
              <p className="text-xs text-gray-400 text-center">
                Google Sign-In only works with registered email addresses.
              </p>
            </div>
          </div>

          {/* Sign Up Link */}
          <div className="mt-4 text-center">
            <span className="text-xs text-gray-400">New to QuizMate? </span>
            <button
              type="button"
              onClick={onSwitchToRegister}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
            >
              Create an account
            </button>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl p-6 max-w-sm w-full border border-gray-600">
            <h3 className="text-lg font-bold text-white mb-4">Reset Password</h3>
            <p className="text-sm text-gray-300 mb-4">
              Enter your email address and we'll send you a link to reset your password.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowForgotPassword(false)}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-gray-300 border border-gray-600 hover:border-gray-500 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!email) {
                    setError('Please enter your email address first');
                    return;
                  }

                  try {
                    const response = await fetch('/api/auth/forgot-password', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({ email }),
                    });

                    if (response.ok) {
                      setShowForgotPassword(false);
                      setError('');
                      alert('Password reset link sent to your email!');
                    } else {
                      const data = await response.json();
                      setError(data.error || 'Failed to send reset email');
                    }
                  } catch (error) {
                    setError('Network error. Please try again.');
                  }
                }}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
              >
                Send Link
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginForm;