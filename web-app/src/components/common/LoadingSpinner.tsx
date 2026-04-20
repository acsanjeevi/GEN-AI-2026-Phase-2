/**
 * LoadingSpinner Component
 * Animated loading indicator with size variants
 */

import { cn } from '@/utils';
import { Loader2 } from 'lucide-react';

export interface LoadingSpinnerProps {
  /** Size variant */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Optional label text */
  label?: string;
  /** Center in parent container */
  center?: boolean;
  /** Full page overlay */
  fullPage?: boolean;
  /** Additional CSS classes */
  className?: string;
}

const sizeConfig = {
  sm: {
    spinner: 'h-4 w-4',
    text: 'text-xs',
    gap: 'gap-1.5',
  },
  md: {
    spinner: 'h-6 w-6',
    text: 'text-sm',
    gap: 'gap-2',
  },
  lg: {
    spinner: 'h-8 w-8',
    text: 'text-base',
    gap: 'gap-2.5',
  },
  xl: {
    spinner: 'h-12 w-12',
    text: 'text-lg',
    gap: 'gap-3',
  },
};

export function LoadingSpinner({
  size = 'md',
  label,
  center = false,
  fullPage = false,
  className,
}: LoadingSpinnerProps) {
  const config = sizeConfig[size];

  const spinner = (
    <div
      className={cn(
        'flex flex-col items-center justify-center',
        config.gap,
        center && 'flex-1',
        className
      )}
      role="status"
      aria-label={label || 'Loading'}
    >
      <Loader2
        className={cn(config.spinner, 'animate-spin text-primary')}
        aria-hidden="true"
      />
      {label && (
        <span className={cn(config.text, 'text-muted-foreground')}>
          {label}
        </span>
      )}
      <span className="sr-only">{label || 'Loading...'}</span>
    </div>
  );

  if (fullPage) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
        {spinner}
      </div>
    );
  }

  return spinner;
}

export default LoadingSpinner;
