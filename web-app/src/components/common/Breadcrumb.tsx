/**
 * Breadcrumb Component
 * Navigation breadcrumbs for page context
 */

import { Link } from 'react-router-dom';
import { cn } from '@/utils';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  /** Display label */
  label: string;
  /** Navigation path (omit for current page) */
  href?: string;
  /** Icon to display before label */
  icon?: React.ComponentType<{ className?: string }>;
}

export interface BreadcrumbProps {
  /** Breadcrumb items */
  items: BreadcrumbItem[];
  /** Show home icon as first item */
  showHome?: boolean;
  /** Home path */
  homePath?: string;
  /** Separator variant */
  separator?: 'chevron' | 'slash';
  /** Additional CSS classes */
  className?: string;
}

export function Breadcrumb({
  items,
  showHome = true,
  homePath = '/',
  separator = 'chevron',
  className,
}: BreadcrumbProps) {
  const allItems: BreadcrumbItem[] = showHome
    ? [{ label: 'Home', href: homePath, icon: Home }, ...items]
    : items;

  return (
    <nav aria-label="Breadcrumb" className={cn('flex', className)}>
      <ol className="flex items-center space-x-1 text-sm">
        {allItems.map((item, index) => {
          const isLast = index === allItems.length - 1;
          const Icon = item.icon;

          return (
            <li key={index} className="flex items-center">
              {/* Separator */}
              {index > 0 && (
                <span className="mx-2 text-muted-foreground" aria-hidden="true">
                  {separator === 'chevron' ? (
                    <ChevronRight className="h-4 w-4" />
                  ) : (
                    '/'
                  )}
                </span>
              )}

              {/* Breadcrumb Item */}
              {isLast || !item.href ? (
                <span
                  className={cn(
                    'flex items-center gap-1.5',
                    isLast
                      ? 'font-medium text-foreground'
                      : 'text-muted-foreground'
                  )}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {Icon && <Icon className="h-4 w-4" />}
                  <span className={Icon && index === 0 ? 'sr-only sm:not-sr-only' : ''}>
                    {item.label}
                  </span>
                </span>
              ) : (
                <Link
                  to={item.href}
                  className="flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
                >
                  {Icon && <Icon className="h-4 w-4" />}
                  <span className={Icon && index === 0 ? 'sr-only sm:not-sr-only' : ''}>
                    {item.label}
                  </span>
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default Breadcrumb;
