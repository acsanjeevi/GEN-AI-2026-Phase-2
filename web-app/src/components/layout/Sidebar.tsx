/**
 * Sidebar Component
 * Navigation sidebar with collapsible support
 */

import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FileCode,
  Play,
  History,
  Settings,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { cn } from '@/utils';
import { Logo } from '@/components/common/Logo';
import { useSettingsStore } from '@/stores';

export interface SidebarProps {
  /** Whether sidebar is open on mobile */
  isOpen?: boolean;
  /** Close sidebar callback (for mobile) */
  onClose?: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Navigation items configuration
 */
const navItems = [
  {
    path: '/',
    label: 'Dashboard',
    icon: LayoutDashboard,
    description: 'Overview and quick actions',
  },
  {
    path: '/editor',
    label: 'Editor',
    icon: FileCode,
    description: 'Write Gherkin features',
  },
  {
    path: '/execution',
    label: 'Execution',
    icon: Play,
    description: 'Monitor running tests',
  },
  {
    path: '/history',
    label: 'History',
    icon: History,
    description: 'Browse past executions',
  },
  {
    path: '/settings',
    label: 'Settings',
    icon: Settings,
    description: 'Configure preferences',
  },
] as const;

export function Sidebar({ isOpen = false, onClose, className }: SidebarProps) {
  const location = useLocation();
  const isCollapsed = useSettingsStore((state) => state.ui.sidebarCollapsed);
  const toggleSidebar = useSettingsStore((state) => state.toggleSidebar);

  /**
   * Check if a route is currently active
   */
  const isActiveRoute = (path: string): boolean => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          // Base styles
          'fixed inset-y-0 left-0 z-50 flex flex-col border-r bg-card transition-all duration-300',
          // Desktop styles
          'lg:sticky lg:top-0 lg:z-30 lg:h-screen',
          // Width based on collapsed state
          isCollapsed ? 'lg:w-16' : 'lg:w-64',
          // Mobile styles - slide in/out
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          // Mobile width
          'w-64',
          className
        )}
      >
        {/* Header */}
        <div
          className={cn(
            'flex h-14 items-center border-b px-4',
            isCollapsed ? 'lg:justify-center lg:px-2' : 'justify-between'
          )}
        >
          <Logo showText={!isCollapsed} size={isCollapsed ? 'sm' : 'md'} />

          {/* Mobile Close Button */}
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-2">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = isActiveRoute(item.path);

              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    onClick={onClose}
                    className={cn(
                      'group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                      isCollapsed && 'lg:justify-center lg:px-2'
                    )}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <Icon
                      className={cn(
                        'h-5 w-5 flex-shrink-0',
                        isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-foreground'
                      )}
                    />
                    {!isCollapsed && (
                      <span className="truncate lg:inline">{item.label}</span>
                    )}
                    {isCollapsed && (
                      <span className="lg:hidden">{item.label}</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer - Collapse Toggle (Desktop Only) */}
        <div className="hidden border-t p-2 lg:block">
          <button
            onClick={toggleSidebar}
            className={cn(
              'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
              isCollapsed && 'justify-center px-2'
            )}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <>
                <ChevronLeft className="h-5 w-5" />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
