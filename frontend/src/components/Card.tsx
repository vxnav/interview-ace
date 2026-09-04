import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`bg-dark-surface border border-border-subtle rounded-md p-6 transition-colors duration-200 ${className}`}>
      {children}
    </div>
  );
}

