'use client';

import React from 'react';

interface LandingPageProps {
  onGetStarted: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
  return (
    <div className="min-h-screen relative overflow-hidden" style={{ backgroundColor: '#0F172A' }}>
      {/* Animated Background Gradients */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute top-0 right-1/4 w-96 h-96 rounded-full opacity-20 blur-3xl animate-pulse"
          style={{ 
            background: 'radial-gradient(circle, #4F46E5 0%, #8B5CF6 50%, transparent 70%)',
            animationDuration: '4s'
          }}
        />
        <div 
          className="absolute bottom-0 left-1/4 w-80 h-80 rounded-full opacity-15 blur-3xl animate-pulse"
          style={{ 
            background: 'radial-gradient(circle, #8B5CF6 0%, #4F46E5 50%, transparent 70%)',
            animationDuration: '5s',
            animationDelay: '1s'
          }}
        />
        <div 
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full opacity-10 blur-3xl animate-pulse"
          style={{ 
            background: 'radial-gradient(circle, #34D399 0%, transparent 70%)',
            animationDuration: '6s',
            animationDelay: '2s'
          }}
        />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b" style={{ borderColor: 'rgba(79, 70, 229, 0.2)' }}>
        <nav className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #8B5CF6 100%)' }}>
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <span className="text-2xl font-bold text-white">QuizMate</span>
            </div>

            {/* Navigation */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#home" className="text-gray-300 hover:text-white transition-colors duration-200">Home</a>
              <a href="#features" className="text-gray-300 hover:text-white transition-colors duration-200">Features</a>
              <a href="#how-it-works" className="text-gray-300 hover:text-white transition-colors duration-200">How It Works</a>
              <a href="#about" className="text-gray-300 hover:text-white transition-colors duration-200">About</a>
            </div>

            {/* CTA Button */}
            <button
              onClick={onGetStarted}
              className="px-6 py-2.5 rounded-xl font-semibold text-white transition-all duration-200 transform hover:scale-105"
              style={{ backgroundColor: '#34D399' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#10B981'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#34D399'}
            >
              Get Started
            </button>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section id="home" className="relative z-10 max-w-7xl mx-auto px-6 py-20 md:py-32">
        <div className="text-center">
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            Build and Share Quizzes
            <br />
            <span 
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: 'linear-gradient(135deg, #4F46E5 0%, #8B5CF6 50%, #34D399 100%)' }}
            >
              in Seconds
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-400 mb-12 max-w-3xl mx-auto">
            Create engaging quizzes with AI-powered question generation. Perfect for educators, trainers, and learners.
          </p>
          
          {/* Hero CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={onGetStarted}
              className="px-8 py-4 rounded-xl font-bold text-lg text-white transition-all duration-200 transform hover:scale-105 shadow-lg w-full sm:w-auto"
              style={{ 
                background: 'linear-gradient(135deg, #34D399 0%, #10B981 100%)',
                boxShadow: '0 10px 30px rgba(52, 211, 153, 0.3)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 15px 40px rgba(52, 211, 153, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 10px 30px rgba(52, 211, 153, 0.3)';
              }}
            >
              Create Your First Quiz
            </button>
            <button
              className="px-8 py-4 rounded-xl font-bold text-lg transition-all duration-200 transform hover:scale-105 border-2 w-full sm:w-auto"
              style={{ 
                color: '#A5B4FC',
                borderColor: '#4F46E5',
                backgroundColor: 'rgba(79, 70, 229, 0.1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(79, 70, 229, 0.2)';
                e.currentTarget.style.borderColor = '#8B5CF6';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(79, 70, 229, 0.1)';
                e.currentTarget.style.borderColor = '#4F46E5';
              }}
            >
              Watch Demo
            </button>
          </div>

          {/* Stats */}
          <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-4xl font-bold mb-2" style={{ color: '#34D399' }}>10K+</div>
              <div className="text-gray-400">Quizzes Created</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold mb-2" style={{ color: '#8B5CF6' }}>50K+</div>
              <div className="text-gray-400">Active Users</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold mb-2" style={{ color: '#4F46E5' }}>1M+</div>
              <div className="text-gray-400">Questions Answered</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative z-10 max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Why Choose QuizMate?
          </h2>
          <p className="text-xl text-gray-400">
            Everything you need to create, share, and track engaging quizzes
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div 
            className="p-8 rounded-2xl border-2 transition-all duration-300 hover:scale-105"
            style={{ 
              backgroundColor: 'rgba(15, 23, 42, 0.5)',
              borderColor: 'rgba(79, 70, 229, 0.3)',
              backdropFilter: 'blur(10px)'
            }}
          >
            <div className="w-16 h-16 rounded-xl flex items-center justify-center mb-6" style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #8B5CF6 100%)' }}>
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">Lightning Fast</h3>
            <p className="text-gray-400">
              Create quizzes in minutes with our intuitive interface and AI-powered question generation.
            </p>
          </div>

          {/* Feature 2 */}
          <div 
            className="p-8 rounded-2xl border-2 transition-all duration-300 hover:scale-105"
            style={{ 
              backgroundColor: 'rgba(15, 23, 42, 0.5)',
              borderColor: 'rgba(139, 92, 246, 0.3)',
              backdropFilter: 'blur(10px)'
            }}
          >
            <div className="w-16 h-16 rounded-xl flex items-center justify-center mb-6" style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)' }}>
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">Fully Customizable</h3>
            <p className="text-gray-400">
              Multiple question types, custom themes, and flexible settings to match your needs.
            </p>
          </div>

          {/* Feature 3 */}
          <div 
            className="p-8 rounded-2xl border-2 transition-all duration-300 hover:scale-105"
            style={{ 
              backgroundColor: 'rgba(15, 23, 42, 0.5)',
              borderColor: 'rgba(52, 211, 153, 0.3)',
              backdropFilter: 'blur(10px)'
            }}
          >
            <div className="w-16 h-16 rounded-xl flex items-center justify-center mb-6" style={{ background: 'linear-gradient(135deg, #34D399 0%, #10B981 100%)' }}>
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">Share Instantly</h3>
            <p className="text-gray-400">
              Share quizzes with a link, track results, and analyze performance in real-time.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="relative z-10 max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            How It Works
          </h2>
          <p className="text-xl text-gray-400">
            Get started in three simple steps
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* Step 1 */}
          <div className="text-center">
            <div className="relative inline-block mb-6">
              <div className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold text-white" style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #8B5CF6 100%)' }}>
                1
              </div>
              <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full" style={{ backgroundColor: '#34D399' }} />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">Create Account</h3>
            <p className="text-gray-400">
              Sign up for free as a learner or instructor in seconds
            </p>
          </div>

          {/* Step 2 */}
          <div className="text-center">
            <div className="relative inline-block mb-6">
              <div className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold text-white" style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)' }}>
                2
              </div>
              <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full" style={{ backgroundColor: '#34D399' }} />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">Build Quiz</h3>
            <p className="text-gray-400">
              Use AI to generate questions or create your own custom quiz
            </p>
          </div>

          {/* Step 3 */}
          <div className="text-center">
            <div className="relative inline-block mb-6">
              <div className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold text-white" style={{ background: 'linear-gradient(135deg, #34D399 0%, #10B981 100%)' }}>
                3
              </div>
              <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full" style={{ backgroundColor: '#8B5CF6' }} />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">Share & Track</h3>
            <p className="text-gray-400">
              Share with students and monitor their progress in real-time
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 py-20">
        <div 
          className="rounded-3xl p-12 md:p-16 text-center border-2"
          style={{ 
            background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)',
            borderColor: 'rgba(79, 70, 229, 0.3)',
            backdropFilter: 'blur(10px)'
          }}
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Join thousands of educators and learners using QuizMate to create engaging, interactive quizzes.
          </p>
          <button
            onClick={onGetStarted}
            className="px-10 py-4 rounded-xl font-bold text-lg text-white transition-all duration-200 transform hover:scale-105 shadow-lg"
            style={{ 
              background: 'linear-gradient(135deg, #34D399 0%, #10B981 100%)',
              boxShadow: '0 10px 30px rgba(52, 211, 153, 0.3)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 15px 40px rgba(52, 211, 153, 0.4)';
              e.currentTarget.style.transform = 'scale(1.05) translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 10px 30px rgba(52, 211, 153, 0.3)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            Start Creating Quizzes Now
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t mt-20" style={{ borderColor: 'rgba(79, 70, 229, 0.2)' }}>
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            {/* Brand */}
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #8B5CF6 100%)' }}>
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <span className="text-2xl font-bold text-white">QuizMate</span>
              </div>
              <p className="text-gray-400 mb-4">
                Create, share, and track engaging quizzes with AI-powered tools.
              </p>
              {/* Social Icons */}
              <div className="flex gap-4">
                <a href="#" className="w-10 h-10 rounded-lg flex items-center justify-center transition-colors duration-200" style={{ backgroundColor: 'rgba(79, 70, 229, 0.2)' }}>
                  <svg className="w-5 h-5 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </a>
                <a href="#" className="w-10 h-10 rounded-lg flex items-center justify-center transition-colors duration-200" style={{ backgroundColor: 'rgba(79, 70, 229, 0.2)' }}>
                  <svg className="w-5 h-5 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                  </svg>
                </a>
                <a href="#" className="w-10 h-10 rounded-lg flex items-center justify-center transition-colors duration-200" style={{ backgroundColor: 'rgba(79, 70, 229, 0.2)' }}>
                  <svg className="w-5 h-5 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </a>
              </div>
            </div>

            {/* Links Column 1 */}
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors duration-200">Features</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors duration-200">Pricing</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors duration-200">FAQ</a></li>
              </ul>
            </div>

            {/* Links Column 2 */}
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors duration-200">About</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors duration-200">Blog</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors duration-200">Contact</a></li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 border-t flex flex-col md:flex-row justify-between items-center gap-4" style={{ borderColor: 'rgba(79, 70, 229, 0.2)' }}>
            <p className="text-gray-400 text-sm">
              © 2024 QuizMate. All rights reserved.
            </p>
            <div className="flex gap-6 text-sm">
              <a href="#" className="text-gray-400 hover:text-white transition-colors duration-200">Privacy Policy</a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors duration-200">Terms of Service</a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors duration-200">Cookie Policy</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
