/**
 * Logo Component
 * App logo with optional text display
 */

import { Play } from 'lucide-react';
import { cn } from '@/utils';

export interface LogoProps {
  /** Show text next to logo */
  showText?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Additional CSS classes */
  className?: string;
}

const sizeConfig = {
  sm: {
    icon: 'h-5 w-5',
    container: 'h-7 w-7',
    title: 'text-sm',
    subtitle: 'text-[10px]',
  },
  md: {
    icon: 'h-6 w-6',
    container: 'h-9 w-9',
    title: 'text-base',
    subtitle: 'text-xs',
  },
  lg: {
    icon: 'h-8 w-8',
    container: 'h-12 w-12',
    title: 'text-xl',
    subtitle: 'text-sm',
  },
};

export function Logo({ showText = true, size = 'md', className }: LogoProps) {
  const config = sizeConfig[size];

  return (
    <div className={cn('flex items-center gap-3', className)}>
      {/* Logo Icon */}
      <div
        className={cn(
          'flex items-center justify-center rounded-lg bg-primary text-primary-foreground',
          config.container
        )}
      >
        <Play className={cn(config.icon, 'ml-0.5')} fill="currentColor" />
      </div>

      {/* Logo Text */}
      {showText && (
        <div className="flex flex-col">
          <span className={cn('font-bold leading-tight text-foreground', config.title)}>
            No-Code UI
          </span>
          <span className={cn('text-muted-foreground leading-tight', config.subtitle)}>
            Automation Platform
          </span>
        </div>
      )}
    </div>
  );
}

export default Logo;
