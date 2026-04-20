/**
 * ErrorMessage Component
 * Error display with icon, message, and optional retry action
 */

import { cn } from '@/utils';
import { AlertCircle, RefreshCw, XCircle } from 'lucide-react';

export interface ErrorMessageProps {
  /** Error title */
  title?: string;
  /** Error message or description */
  message: string;
  /** Error variant */
  variant?: 'inline' | 'card' | 'banner';
  /** Retry callback */
  onRetry?: () => void;
  /** Dismiss callback */
  onDismiss?: () => void;
  /** Additional CSS classes */
  className?: string;
}

export function ErrorMessage({
  title,
  message,
  variant = 'card',
  onRetry,
  onDismiss,
  className,
}: ErrorMessageProps) {
  if (variant === 'inline') {
    return (
      <div
        className={cn(
          'flex items-center gap-2 text-sm text-red-600 dark:text-red-400',
          className
        )}
        role="alert"
      >
        <AlertCircle className="h-4 w-4 flex-shrink-0" />
        <span>{message}</span>
      </div>
    );
  }

  if (variant === 'banner') {
    return (
      <div
        className={cn(
          'flex items-center justify-between gap-4 rounded-lg bg-red-50 px-4 py-3 dark:bg-red-900/20',
          className
        )}
        role="alert"
      >
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400" />
          <div>
            {title && (
              <p className="font-medium text-red-800 dark:text-red-200">
                {title}
              </p>
            )}
            <p className="text-sm text-red-700 dark:text-red-300">{message}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onRetry && (
            <button
              onClick={onRetry}
              className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100 dark:text-red-300 dark:hover:bg-red-900/40"
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </button>
          )}
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="rounded-md p-1 text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/40"
              aria-label="Dismiss"
            >
              <XCircle className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // Card variant (default)
  return (
    <div
      className={cn(
        'rounded-lg border border-red-200 bg-red-50 p-6 text-center dark:border-red-800 dark:bg-red-900/20',
        className
      )}
      role="alert"
    >
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40">
        <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
      </div>
      {title && (
        <h3 className="mb-2 text-lg font-semibold text-red-800 dark:text-red-200">
          {title}
        </h3>
      )}
      <p className="mb-4 text-sm text-red-700 dark:text-red-300">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
        >
          <RefreshCw className="h-4 w-4" />
          Try Again
        </button>
      )}
    </div>
  );
}

export default ErrorMessage;
