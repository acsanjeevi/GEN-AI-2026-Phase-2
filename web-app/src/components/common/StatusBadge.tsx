/**
 * StatusBadge Component
 * Status indicator with color-coded badges
 */

import { cn } from '@/utils';
import {
  Clock,
  Loader2,
  CheckCircle,
  XCircle,
  SkipForward,
  Ban,
  AlertCircle,
} from 'lucide-react';

export type Status =
  | 'pending'
  | 'running'
  | 'passed'
  | 'failed'
  | 'skipped'
  | 'cancelled'
  | 'error';

export interface StatusBadgeProps {
  /** Status to display */
  status: Status;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Show icon alongside text */
  showIcon?: boolean;
  /** Show only icon (no text) */
  iconOnly?: boolean;
  /** Additional CSS classes */
  className?: string;
}

const statusConfig: Record<
  Status,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    classes: string;
    iconClasses?: string;
  }
> = {
  pending: {
    label: 'Pending',
    icon: Clock,
    classes: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  },
  running: {
    label: 'Running',
    icon: Loader2,
    classes: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    iconClasses: 'animate-spin',
  },
  passed: {
    label: 'Passed',
    icon: CheckCircle,
    classes: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  },
  failed: {
    label: 'Failed',
    icon: XCircle,
    classes: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  },
  skipped: {
    label: 'Skipped',
    icon: SkipForward,
    classes: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  },
  cancelled: {
    label: 'Cancelled',
    icon: Ban,
    classes: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  },
  error: {
    label: 'Error',
    icon: AlertCircle,
    classes: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  },
};

const sizeConfig = {
  sm: {
    badge: 'px-2 py-0.5 text-xs',
    icon: 'h-3 w-3',
    gap: 'gap-1',
  },
  md: {
    badge: 'px-2.5 py-1 text-sm',
    icon: 'h-4 w-4',
    gap: 'gap-1.5',
  },
  lg: {
    badge: 'px-3 py-1.5 text-base',
    icon: 'h-5 w-5',
    gap: 'gap-2',
  },
};

export function StatusBadge({
  status,
  size = 'md',
  showIcon = true,
  iconOnly = false,
  className,
}: StatusBadgeProps) {
  const config = statusConfig[status];
  const sizes = sizeConfig[size];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        sizes.badge,
        sizes.gap,
        config.classes,
        className
      )}
      title={iconOnly ? config.label : undefined}
    >
      {showIcon && (
        <Icon className={cn(sizes.icon, config.iconClasses)} />
      )}
      {!iconOnly && <span>{config.label}</span>}
    </span>
  );
}

export default StatusBadge;
