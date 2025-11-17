import React from 'react';

interface PasswordStrengthIndicatorProps {
  password: string;
}

const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({ password }) => {
  const checks = {
    length: password.length >= 6,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };

  const passedChecks = Object.values(checks).filter(Boolean).length;
  const strength = passedChecks <= 1 ? 'weak' : passedChecks <= 3 ? 'medium' : 'strong';

  const getStrengthColor = () => {
    if (strength === 'weak') return '#EF4444';
    if (strength === 'medium') return '#F59E0B';
    return '#10B981';
  };

  const getStrengthText = () => {
    if (strength === 'weak') return 'Weak';
    if (strength === 'medium') return 'Medium';
    return 'Strong';
  };

  if (!password) return null;

  return (
    <div className="mt-2 space-y-2">
      {/* Strength Bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full transition-all duration-300"
            style={{
              width: `${(passedChecks / 5) * 100}%`,
              backgroundColor: getStrengthColor(),
            }}
          />
        </div>
        <span
          className="text-xs font-medium"
          style={{ color: getStrengthColor() }}
        >
          {getStrengthText()}
        </span>
      </div>

      {/* Requirements */}
      <div className="space-y-1">
        <CheckItem checked={checks.length} text="At least 6 characters" />
        <CheckItem checked={checks.uppercase} text="One uppercase letter" />
        <CheckItem checked={checks.lowercase} text="One lowercase letter" />
        <CheckItem checked={checks.number} text="One number" />
        <CheckItem checked={checks.special} text="One special character" />
      </div>
    </div>
  );
};

interface CheckItemProps {
  checked: boolean;
  text: string;
}

const CheckItem: React.FC<CheckItemProps> = ({ checked, text }) => {
  return (
    <div className="flex items-center gap-1.5">
      {checked ? (
        <svg className="w-3.5 h-3.5 text-green-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      ) : (
        <svg className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
      )}
      <span className={`text-xs ${checked ? 'text-gray-300' : 'text-gray-500'}`}>
        {text}
      </span>
    </div>
  );
};

export default PasswordStrengthIndicator;
