import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles =
    'font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-offset-2 focus:ring-offset-dark-base focus:ring-accent-primary flex items-center justify-center gap-2';

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2.5 text-base',
    lg: 'px-6 py-3 text-base',
  };

  const variantStyles = {
    primary:
      'bg-accent-primary text-dark-base hover:bg-accent-hover active:bg-accent-active disabled:opacity-60 disabled:cursor-not-allowed',
    secondary:
      'bg-dark-elevated border border-border-normal text-text-primary hover:bg-dark-hover active:bg-dark-elevated disabled:opacity-60 disabled:cursor-not-allowed',
    ghost:
      'text-accent-primary hover:text-accent-hover active:text-accent-active disabled:opacity-60 disabled:cursor-not-allowed',
  };

  return (
    <button
      {...props}
      disabled={isLoading || disabled}
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]}`}
    >
      {isLoading ? (
        <>
          <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
          <span>Loading...</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
