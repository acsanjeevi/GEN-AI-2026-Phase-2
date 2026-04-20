/**
 * PageContainer Component
 * Content wrapper with consistent padding and max-width
 */

import { cn } from '@/utils';

export interface PageContainerProps {
  /** Page content */
  children: React.ReactNode;
  /** Page title (for accessibility) */
  title?: string;
  /** Page description */
  description?: string;
  /** Maximum width variant */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  /** Remove default padding */
  noPadding?: boolean;
  /** Additional CSS classes */
  className?: string;
}

const maxWidthClasses = {
  sm: 'max-w-screen-sm',
  md: 'max-w-screen-md',
  lg: 'max-w-screen-lg',
  xl: 'max-w-screen-xl',
  '2xl': 'max-w-screen-2xl',
  full: 'max-w-full',
};

export function PageContainer({
  children,
  title,
  description,
  maxWidth = '2xl',
  noPadding = false,
  className,
}: PageContainerProps) {
  return (
    <div
      className={cn(
        'flex-1',
        !noPadding && 'p-4 sm:p-6 lg:p-8',
        className
      )}
    >
      <div className={cn('mx-auto', maxWidthClasses[maxWidth])}>
        {/* Page Header */}
        {(title || description) && (
          <header className="mb-6">
            {title && (
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {title}
              </h1>
            )}
            {description && (
              <p className="mt-2 text-muted-foreground">
                {description}
              </p>
            )}
          </header>
        )}

        {/* Page Content */}
        {children}
      </div>
    </div>
  );
}

export default PageContainer;
