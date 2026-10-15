import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-medium transition-colors select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap shrink-0';

  const sizeStyles = {
    sm: 'text-xs px-3 py-1.5 rounded-md min-h-[36px]',
    md: 'text-sm px-4 py-2 rounded-lg min-h-[42px]',
    lg: 'text-base px-5 py-2.5 rounded-lg min-h-[48px]',
  };

  const variantStyles = {
    primary:
      'bg-slate-900 text-white hover:bg-slate-800 focus-visible:ring-slate-900 active:scale-[0.99]',
    secondary:
      'bg-slate-100 text-slate-800 hover:bg-slate-200 focus-visible:ring-slate-400',
    outline:
      'border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 focus-visible:ring-slate-400',
    danger:
      'bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-600',
    ghost:
      'text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus-visible:ring-slate-400',
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center gap-2">
          <svg
            className="animate-spin h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>Guardando...</span>
        </span>
      ) : (
        children
      )}
    </button>
  );
};
