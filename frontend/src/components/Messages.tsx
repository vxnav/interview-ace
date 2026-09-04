import React from 'react';
import { Button } from './Button';

interface ErrorMessageProps {
  message: string;
  onDismiss?: () => void;
  onRetry?: () => void;
}

export function ErrorMessage({ message, onDismiss, onRetry }: ErrorMessageProps) {
  return (
    <div className="bg-dark-elevated border border-status-error border-opacity-30 rounded-lg p-4 mb-4 animate-slide-up">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-status-error" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-text-primary text-sm">{message}</p>
          <div className="mt-3 flex gap-2">
            {onRetry && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRetry}
              >
                Try again
              </Button>
            )}
            {onDismiss && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDismiss}
              >
                Dismiss
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function LoadingSpinner() {
  return (
    <div className="flex flex-col justify-center items-center py-12 gap-3">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-border-normal border-t-accent-primary"></div>
      <p className="text-text-secondary text-sm">Loading...</p>
    </div>
  );
}

