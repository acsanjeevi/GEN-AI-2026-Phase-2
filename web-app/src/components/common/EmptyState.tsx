/**
 * EmptyState Component
 * Empty list/data state with icon and optional action
 */

import { cn } from '@/utils';
import {
  FileText,
  Inbox,
  Search,
  FolderOpen,
  Database,
  AlertCircle,
  Play,
  type LucideIcon,
} from 'lucide-react';

export interface EmptyStateAction {
  /** Button label */
  label: string;
  /** Click handler */
  onClick: () => void;
}

export interface EmptyStateProps {
  /** Icon to display */
  icon?: LucideIcon | 'file' | 'inbox' | 'search' | 'folder' | 'database' | 'error' | 'play';
  /** Main title */
  title: string;
  /** Description text */
  description?: string;
  /** Primary action button */
  action?: EmptyStateAction;
  /** Secondary action button */
  secondaryAction?: EmptyStateAction;
  /** @deprecated Use action prop instead */
  actionLabel?: string;
  /** @deprecated Use action.onClick instead */
  onAction?: () => void;
  /** @deprecated Use secondaryAction prop instead */
  secondaryActionLabel?: string;
  /** @deprecated Use secondaryAction.onClick instead */
  onSecondaryAction?: () => void;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Additional CSS classes */
  className?: string;
}

const presetIcons: Record<string, LucideIcon> = {
  file: FileText,
  inbox: Inbox,
  search: Search,
  folder: FolderOpen,
  database: Database,
  error: AlertCircle,
  play: Play,
};

const sizeConfig = {
  sm: {
    container: 'py-6',
    iconContainer: 'h-10 w-10',
    icon: 'h-5 w-5',
    title: 'text-sm font-medium',
    description: 'text-xs',
    button: 'px-3 py-1.5 text-sm',
  },
  md: {
    container: 'py-10',
    iconContainer: 'h-14 w-14',
    icon: 'h-7 w-7',
    title: 'text-base font-semibold',
    description: 'text-sm',
    button: 'px-4 py-2 text-sm',
  },
  lg: {
    container: 'py-16',
    iconContainer: 'h-20 w-20',
    icon: 'h-10 w-10',
    title: 'text-xl font-semibold',
    description: 'text-base',
    button: 'px-5 py-2.5 text-base',
  },
};

export function EmptyState({
  icon = 'inbox',
  title,
  description,
  action,
  secondaryAction,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  size = 'md',
  className,
}: EmptyStateProps) {
  const config = sizeConfig[size];

  // Resolve icon
  const Icon = typeof icon === 'string' ? presetIcons[icon] || Inbox : icon;

  // Support both old and new action props
  const primaryAction = action || (actionLabel && onAction ? { label: actionLabel, onClick: onAction } : undefined);
  const secondary = secondaryAction || (secondaryActionLabel && onSecondaryAction ? { label: secondaryActionLabel, onClick: onSecondaryAction } : undefined);

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        config.container,
        className
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          'mb-4 flex items-center justify-center rounded-full bg-muted',
          config.iconContainer
        )}
      >
        <Icon className={cn(config.icon, 'text-muted-foreground')} />
      </div>

      {/* Title */}
      <h3 className={cn(config.title, 'text-foreground')}>{title}</h3>

      {/* Description */}
      {description && (
        <p className={cn(config.description, 'mt-1 max-w-sm text-muted-foreground')}>
          {description}
        </p>
      )}

      {/* Actions */}
      {(primaryAction || secondary) && (
        <div className="mt-4 flex items-center gap-3">
          {primaryAction && (
            <button
              onClick={primaryAction.onClick}
              className={cn(
                config.button,
                'rounded-md bg-primary font-medium text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'
              )}
            >
              {primaryAction.label}
            </button>
          )}
          {secondary && (
            <button
              onClick={secondary.onClick}
              className={cn(
                config.button,
                'rounded-md border font-medium text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'
              )}
            >
              {secondary.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default EmptyState;
