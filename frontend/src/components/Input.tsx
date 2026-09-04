import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export function Input({
  label,
  error,
  helperText,
  id,
  ...props
}: InputProps) {
  const inputId = id || `input-${Math.random()}`;

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-text-primary mb-2">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`w-full px-4 py-2.5 rounded-lg text-text-primary placeholder-text-tertiary bg-dark-surface border transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-accent-primary ${
          error ? 'border-status-error' : 'border-border-subtle hover:border-border-normal'
        }`}
        {...props}
      />
      {error && (
        <p className="mt-2 text-sm text-status-error">{error}</p>
      )}
      {helperText && !error && (
        <p className="mt-2 text-sm text-text-tertiary">{helperText}</p>
      )}
    </div>
  );
}

