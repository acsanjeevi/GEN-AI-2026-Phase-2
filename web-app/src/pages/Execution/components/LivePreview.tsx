/**
 * LivePreview Component
 * Shows latest screenshot during execution
 */

import { useState } from 'react';
import { cn } from '@/utils';
import { Image, Maximize2, X, RefreshCw } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export interface LivePreviewProps {
  /** Screenshot URL or base64 */
  screenshotUrl?: string | null;
  /** Alt text for screenshot */
  alt?: string;
  /** Whether execution is running */
  isRunning?: boolean;
  /** Callback to refresh screenshot */
  onRefresh?: () => void;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function LivePreview({
  screenshotUrl,
  alt = 'Live preview',
  isRunning = false,
  onRefresh,
  className,
}: LivePreviewProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasError, setHasError] = useState(false);

  const handleImageError = () => {
    setHasError(true);
  };

  const handleImageLoad = () => {
    setHasError(false);
  };

  return (
    <>
      {/* Preview Card */}
      <div className={cn('rounded-lg border bg-card', className)}>
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-2">
          <div className="flex items-center gap-2">
            <Image className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Live Preview</span>
            {isRunning && (
              <span className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                <span className="h-2 w-2 animate-pulse rounded-full bg-current" />
                Live
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={!isRunning}
                className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
                title="Refresh preview"
              >
                <RefreshCw className={cn('h-4 w-4', isRunning && 'animate-spin')} />
              </button>
            )}
            {screenshotUrl && !hasError && (
              <button
                onClick={() => setIsFullscreen(true)}
                className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                title="View fullscreen"
              >
                <Maximize2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Preview Content */}
        <div className="relative aspect-video bg-muted/50">
          {screenshotUrl && !hasError ? (
            <img
              src={screenshotUrl}
              alt={alt}
              className="h-full w-full object-contain"
              onError={handleImageError}
              onLoad={handleImageLoad}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
              <Image className="mb-2 h-12 w-12 opacity-50" />
              <p className="text-sm">
                {hasError
                  ? 'Failed to load preview'
                  : isRunning
                    ? 'Waiting for screenshot...'
                    : 'No preview available'}
              </p>
              {!isRunning && (
                <p className="mt-1 text-xs">
                  Screenshots appear during test execution
                </p>
              )}
            </div>
          )}

          {/* Loading overlay */}
          {isRunning && screenshotUrl && (
            <div className="absolute bottom-2 right-2">
              <span className="flex items-center gap-1 rounded bg-black/70 px-2 py-1 text-xs text-white">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-400" />
                Updating...
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen Modal */}
      {isFullscreen && screenshotUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={() => setIsFullscreen(false)}
        >
          <button
            onClick={() => setIsFullscreen(false)}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={screenshotUrl}
            alt={alt}
            className="max-h-[90vh] max-w-[90vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}

export default LivePreview;
