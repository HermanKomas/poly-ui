/**
 * Loading spinner with whale animation
 */

import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  message?: string;
}

export function LoadingSpinner({ className, size = 'md', message }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'text-2xl',
    md: 'text-4xl',
    lg: 'text-6xl',
  };

  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 py-12', className)}>
      <div className={cn('animate-bounce', sizeClasses[size])}>
        🐋
      </div>
      {message && (
        <p className="text-sm text-muted-foreground animate-pulse">{message}</p>
      )}
    </div>
  );
}
