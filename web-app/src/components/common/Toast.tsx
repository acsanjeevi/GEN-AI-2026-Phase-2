/**
 * Toast Component
 * Toast notification display with auto-dismiss
 */

import { useState } from 'react';
import { cn } from '@/utils';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  X,
} from 'lucide-react';
import { useNotificationStore } from '@/stores/notification.store';
import type { Notification } from '@/types';

const variantConfig: Record<
  Notification['type'],
  {
    icon: React.ComponentType<{ className?: string }>;
    classes: string;
    iconClasses: string;
  }
> = {
  success: {
    icon: CheckCircle,
    classes:
      'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20',
    iconClasses: 'text-green-600 dark:text-green-400',
  },
  error: {
    icon: XCircle,
    classes: 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20',
    iconClasses: 'text-red-600 dark:text-red-400',
  },
  warning: {
    icon: AlertTriangle,
    classes:
      'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20',
    iconClasses: 'text-yellow-600 dark:text-yellow-400',
  },
  info: {
    icon: Info,
    classes:
      'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20',
    iconClasses: 'text-blue-600 dark:text-blue-400',
  },
};

interface ToastItemProps {
  notification: Notification;
  onDismiss: (id: string) => void;
}

function ToastItem({ notification, onDismiss }: ToastItemProps) {
  const [isExiting, setIsExiting] = useState(false);
  const config = variantConfig[notification.type];
  const Icon = config.icon;

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => {
      onDismiss(notification.id);
    }, 200);
  };

  return (
    <div
      className={cn(
        'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border p-4 shadow-lg transition-all duration-200',
        config.classes,
        isExiting ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'
      )}
      role="alert"
    >
      <Icon className={cn('h-5 w-5 flex-shrink-0', config.iconClasses)} />
      <div className="flex-1 min-w-0">
        {notification.title && (
          <p className="text-sm font-medium text-foreground">
            {notification.title}
          </p>
        )}
        <p
          className={cn(
            'text-sm text-muted-foreground',
            notification.title && 'mt-1'
          )}
        >
          {notification.message}
        </p>
      </div>
      <button
        onClick={handleDismiss}
        className="flex-shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label="Dismiss notification"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export interface ToastContainerProps {
  /** Position on screen */
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
  /** Maximum number of toasts to show */
  maxVisible?: number;
  /** Additional CSS classes */
  className?: string;
}

const positionClasses = {
  'top-right': 'top-4 right-4',
  'top-left': 'top-4 left-4',
  'bottom-right': 'bottom-4 right-4',
  'bottom-left': 'bottom-4 left-4',
  'top-center': 'top-4 left-1/2 -translate-x-1/2',
  'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
};

export function ToastContainer({
  position = 'top-right',
  maxVisible = 5,
  className,
}: ToastContainerProps) {
  const notifications = useNotificationStore((state) => state.notifications);
  const removeNotification = useNotificationStore((state) => state.removeNotification);

  const visibleNotifications = notifications.slice(0, maxVisible);

  if (visibleNotifications.length === 0) return null;

  return (
    <div
      className={cn(
        'pointer-events-none fixed z-50 flex flex-col gap-2',
        positionClasses[position],
        className
      )}
      aria-live="polite"
      aria-label="Notifications"
    >
      {visibleNotifications.map((notification) => (
        <ToastItem
          key={notification.id}
          notification={notification}
          onDismiss={removeNotification}
        />
      ))}
    </div>
  );
}

/**
 * Hook to show toast notifications
 */
export function useToast() {
  const store = useNotificationStore();

  return {
    success: (title: string, message?: string) => store.success(title, message),
    error: (title: string, message?: string) => store.error(title, message),
    warning: (title: string, message?: string) => store.warning(title, message),
    info: (title: string, message?: string) => store.info(title, message),
  };
}

export default ToastContainer;
