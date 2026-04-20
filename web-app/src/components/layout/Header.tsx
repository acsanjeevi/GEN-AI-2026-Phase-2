/**
 * Header Component
 * App header with logo, theme toggle, and mobile menu trigger
 */

import { Menu, Moon, Sun, Monitor } from 'lucide-react';
import { cn } from '@/utils';
import { useSettingsStore, selectResolvedTheme } from '@/stores';
import { Logo } from '@/components/common/Logo';
import type { Theme } from '@/types';

export interface HeaderProps {
  /** Toggle sidebar on mobile */
  onMenuClick?: () => void;
  /** Show menu button (for mobile) */
  showMenuButton?: boolean;
  /** Additional CSS classes */
  className?: string;
}

const themeIcons: Record<Theme, React.ComponentType<{ className?: string }>> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

const themeLabels: Record<Theme, string> = {
  light: 'Light',
  dark: 'Dark',
  system: 'System',
};

export function Header({ onMenuClick, showMenuButton = false, className }: HeaderProps) {
  const theme = useSettingsStore((state) => state.ui.theme);
  const resolvedTheme = useSettingsStore(selectResolvedTheme);
  const setTheme = useSettingsStore((state) => state.setTheme);

  // Cycle through themes: light -> dark -> system
  const cycleTheme = () => {
    const themes: Theme[] = ['light', 'dark', 'system'];
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  const ThemeIcon = themeIcons[theme];

  return (
    <header
      className={cn(
        'sticky top-0 z-40 flex h-14 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60',
        className
      )}
    >
      {/* Mobile Menu Button */}
      {showMenuButton && (
        <button
          onClick={onMenuClick}
          className="inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 lg:hidden"
          aria-label="Toggle menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      )}

      {/* Logo - visible on mobile when sidebar is hidden */}
      <div className="lg:hidden">
        <Logo size="sm" />
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Theme Toggle */}
      <button
        onClick={cycleTheme}
        className="inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        aria-label={`Current theme: ${themeLabels[theme]}. Click to change.`}
        title={`Theme: ${themeLabels[theme]}`}
      >
        <ThemeIcon className="h-4 w-4" />
        <span className="hidden sm:inline">{themeLabels[theme]}</span>
      </button>

      {/* Current Theme Indicator (visual feedback) */}
      <div
        className={cn(
          'h-2 w-2 rounded-full',
          resolvedTheme === 'dark' ? 'bg-blue-400' : 'bg-yellow-400'
        )}
        title={`Active: ${resolvedTheme}`}
      />
    </header>
  );
}

export default Header;
