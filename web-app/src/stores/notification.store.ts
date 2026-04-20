/**
 * Notification Store
 * Manages toast notifications
 */

import { create } from 'zustand';
import type { Notification, NotificationType } from '@/types';

// ============================================================================
// Types
// ============================================================================

interface NotificationState {
  /** Active notifications */
  notifications: Notification[];
  /** Maximum notifications to show at once */
  maxNotifications: number;
}

interface NotificationActions {
  /** Add a notification */
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => string;
  /** Remove a notification by ID */
  removeNotification: (id: string) => void;
  /** Clear all notifications */
  clearAll: () => void;
  /** Show success notification */
  success: (title: string, message?: string) => string;
  /** Show error notification */
  error: (title: string, message?: string) => string;
  /** Show warning notification */
  warning: (title: string, message?: string) => string;
  /** Show info notification */
  info: (title: string, message?: string) => string;
}

type NotificationStore = NotificationState & NotificationActions;

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_DURATION = 5000; // 5 seconds
const ERROR_DURATION = 8000; // 8 seconds for errors
const MAX_NOTIFICATIONS = 5;

// ============================================================================
// Initial State
// ============================================================================

const initialState: NotificationState = {
  notifications: [],
  maxNotifications: MAX_NOTIFICATIONS,
};

// ============================================================================
// Store
// ============================================================================

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  ...initialState,

  addNotification: (notification) => {
    const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = Date.now();
    
    const newNotification: Notification = {
      ...notification,
      id,
      timestamp,
      duration: notification.duration ?? DEFAULT_DURATION,
    };

    set((state) => {
      // Remove oldest if at max
      const notifications =
        state.notifications.length >= state.maxNotifications
          ? state.notifications.slice(1)
          : state.notifications;

      return {
        notifications: [...notifications, newNotification],
      };
    });

    // Auto-remove after duration (if duration > 0)
    if (newNotification.duration > 0) {
      setTimeout(() => {
        get().removeNotification(id);
      }, newNotification.duration);
    }

    return id;
  },

  removeNotification: (id) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    }));
  },

  clearAll: () => {
    set({ notifications: [] });
  },

  success: (title, message) => {
    return get().addNotification({
      type: 'success',
      title,
      message,
      duration: DEFAULT_DURATION,
    });
  },

  error: (title, message) => {
    return get().addNotification({
      type: 'error',
      title,
      message,
      duration: ERROR_DURATION,
    });
  },

  warning: (title, message) => {
    return get().addNotification({
      type: 'warning',
      title,
      message,
      duration: DEFAULT_DURATION,
    });
  },

  info: (title, message) => {
    return get().addNotification({
      type: 'info',
      title,
      message,
      duration: DEFAULT_DURATION,
    });
  },
}));

// ============================================================================
// Selectors
// ============================================================================

/**
 * Get notifications by type
 */
export const selectNotificationsByType = (
  state: NotificationStore,
  type: NotificationType
): Notification[] => {
  return state.notifications.filter((n) => n.type === type);
};

/**
 * Get notification count
 */
export const selectNotificationCount = (state: NotificationStore): number => {
  return state.notifications.length;
};

/**
 * Check if there are any error notifications
 */
export const selectHasErrors = (state: NotificationStore): boolean => {
  return state.notifications.some((n) => n.type === 'error');
};

export default useNotificationStore;
