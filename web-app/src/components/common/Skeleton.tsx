/**
 * Skeleton Component
 * Loading placeholder for content
 */

import { cn } from '@/utils';

export interface SkeletonProps {
  /** Width (CSS value or Tailwind class) */
  width?: string;
  /** Height (CSS value or Tailwind class) */
  height?: string;
  /** Shape variant */
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  /** Animation variant */
  animation?: 'pulse' | 'shimmer' | 'none';
  /** Additional CSS classes */
  className?: string;
}

export function Skeleton({
  width,
  height,
  variant = 'text',
  animation = 'pulse',
  className,
}: SkeletonProps) {
  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-none',
    rounded: 'rounded-lg',
  };

  const animationClasses = {
    pulse: 'animate-pulse',
    shimmer:
      'relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent',
    none: '',
  };

  // Handle width/height - could be Tailwind class or CSS value
  const style: React.CSSProperties = {};
  let widthClass = '';
  let heightClass = '';

  if (width) {
    if (width.startsWith('w-') || width === 'full') {
      widthClass = width.startsWith('w-') ? width : 'w-full';
    } else {
      style.width = width;
    }
  }

  if (height) {
    if (height.startsWith('h-')) {
      heightClass = height;
    } else {
      style.height = height;
    }
  }

  return (
    <div
      className={cn(
        'bg-muted',
        variantClasses[variant],
        animationClasses[animation],
        widthClass || 'w-full',
        heightClass || (variant === 'text' ? 'h-4' : 'h-full'),
        className
      )}
      style={Object.keys(style).length > 0 ? style : undefined}
      aria-hidden="true"
    />
  );
}

/**
 * SkeletonText - Multiple lines of skeleton text
 */
export interface SkeletonTextProps {
  /** Number of lines */
  lines?: number;
  /** Vary line widths */
  varyWidths?: boolean;
  /** Gap between lines */
  gap?: 'sm' | 'md' | 'lg';
  /** Additional CSS classes */
  className?: string;
}

export function SkeletonText({
  lines = 3,
  varyWidths = true,
  gap = 'md',
  className,
}: SkeletonTextProps) {
  const gapClasses = {
    sm: 'space-y-1',
    md: 'space-y-2',
    lg: 'space-y-3',
  };

  const widths = varyWidths
    ? ['w-full', 'w-11/12', 'w-4/5', 'w-3/4', 'w-2/3']
    : ['w-full'];

  return (
    <div className={cn(gapClasses[gap], className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          variant="text"
          className={widths[index % widths.length]}
        />
      ))}
    </div>
  );
}

/**
 * SkeletonCard - Card placeholder
 */
export interface SkeletonCardProps {
  /** Show header skeleton */
  showHeader?: boolean;
  /** Number of body lines */
  bodyLines?: number;
  /** Show footer skeleton */
  showFooter?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export function SkeletonCard({
  showHeader = true,
  bodyLines = 3,
  showFooter = false,
  className,
}: SkeletonCardProps) {
  return (
    <div className={cn('rounded-lg border bg-card p-4', className)}>
      {showHeader && (
        <div className="mb-4 flex items-center gap-3">
          <Skeleton variant="circular" className="h-10 w-10" />
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" className="h-4 w-1/3" />
            <Skeleton variant="text" className="h-3 w-1/4" />
          </div>
        </div>
      )}
      <SkeletonText lines={bodyLines} />
      {showFooter && (
        <div className="mt-4 flex justify-end gap-2">
          <Skeleton variant="rounded" className="h-8 w-20" />
          <Skeleton variant="rounded" className="h-8 w-20" />
        </div>
      )}
    </div>
  );
}

export default Skeleton;
