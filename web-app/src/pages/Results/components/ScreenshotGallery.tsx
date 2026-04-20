/**
 * ScreenshotGallery Component
 * Display screenshots with lightbox modal viewing
 */

import { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Download, ZoomIn, Maximize2, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/utils';

export interface Screenshot {
  /** Screenshot URL */
  url: string;
  /** Screenshot name */
  name: string;
  /** Optional timestamp */
  timestamp?: string;
  /** Attempt number (for retry grouping) */
  attempt?: number;
}

export interface AttemptGroup {
  /** Attempt number */
  attemptNumber: number;
  /** Total attempts */
  totalAttempts: number;
  /** Whether this attempt passed (only true for last successful attempt) */
  passed: boolean;
  /** Screenshots in this attempt */
  screenshots: Screenshot[];
}

export interface ScreenshotGalleryProps {
  /** Array of screenshots */
  screenshots: Screenshot[];
  /** Optional attempt groups for retry-aware display */
  attemptGroups?: AttemptGroup[];
  /** Grid columns */
  columns?: 2 | 3 | 4;
  /** On download click handler */
  onDownload?: (screenshot: Screenshot) => void;
  /** Additional CSS classes */
  className?: string;
}

export function ScreenshotGallery({
  screenshots,
  attemptGroups,
  columns = 3,
  onDownload,
  className,
}: ScreenshotGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());

  // Flatten attempt groups to screenshots if provided, otherwise use screenshots directly
  const allScreenshots = attemptGroups
    ? attemptGroups.flatMap(g => g.screenshots)
    : screenshots;

  const openLightbox = (index: number) => setSelectedIndex(index);
  const closeLightbox = () => setSelectedIndex(null);

  const goToPrevious = () => {
    if (selectedIndex !== null && selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
    }
  };

  const goToNext = () => {
    if (selectedIndex !== null && selectedIndex < allScreenshots.length - 1) {
      setSelectedIndex(selectedIndex + 1);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (selectedIndex === null) return;
    if (e.key === 'ArrowLeft') goToPrevious();
    if (e.key === 'ArrowRight') goToNext();
    if (e.key === 'Escape') closeLightbox();
  };

  const handleImageError = (index: number) => {
    setImageErrors(prev => new Set(prev).add(index));
  };

  const gridCols = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 md:grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
  };

  if (allScreenshots.length === 0) {
    return (
      <div className={cn('flex flex-col items-center justify-center rounded-lg border bg-muted/50 p-8', className)}>
        <p className="text-muted-foreground">No screenshots available</p>
      </div>
    );
  }

  // Get attempt label
  const getAttemptLabel = (attemptNum: number, total: number, passed: boolean) => {
    if (total === 1) return passed ? '✓ Passed' : '✗ Failed';
    const status = passed ? '✓ Success' : '✗ Failed';
    return `Attempt ${attemptNum} of ${total} (${status})`;
  };

  // Render a grid of screenshots
  const renderScreenshotGrid = (screenshotsToRender: Screenshot[], indexOffset: number = 0) => (
    <div className={cn('grid gap-4', gridCols[columns])}>
      {screenshotsToRender.map((screenshot, index) => {
        const globalIndex = indexOffset + index;
        return (
          <div
            key={globalIndex}
            className="group relative aspect-video cursor-pointer overflow-hidden rounded-lg border bg-muted transition-all hover:border-primary hover:shadow-md"
            onClick={() => openLightbox(globalIndex)}
          >
            {imageErrors.has(globalIndex) ? (
              <div className="flex h-full items-center justify-center bg-muted">
                <p className="text-xs text-muted-foreground">Failed to load</p>
              </div>
            ) : (
              <img
                src={screenshot.url}
                alt={screenshot.name}
                className="h-full w-full object-cover transition-transform group-hover:scale-105"
                onError={() => handleImageError(globalIndex)}
                loading="lazy"
              />
            )}
            
            {/* Overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/30">
              <ZoomIn className="h-8 w-8 text-white opacity-0 transition-opacity group-hover:opacity-100" />
            </div>

            {/* Name Badge */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
              <p className="truncate text-xs text-white">{screenshot.name}</p>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className={className} onKeyDown={handleKeyDown} tabIndex={0}>
      {/* Render with attempt groups if provided */}
      {attemptGroups ? (
        <div className="space-y-6">
          {attemptGroups.map((group, groupIndex) => {
            // Calculate index offset for lightbox
            const indexOffset = attemptGroups
              .slice(0, groupIndex)
              .reduce((sum, g) => sum + g.screenshots.length, 0);

            return (
              <div key={group.attemptNumber} className="space-y-4">
                {/* Attempt Header */}
                <div className={`flex items-center gap-2 rounded-lg border p-3 ${
                  group.passed
                    ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30'
                    : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30'
                }`}>
                  {group.passed ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                  <span className={`font-medium ${
                    group.passed ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'
                  }`}>
                    {getAttemptLabel(group.attemptNumber, group.totalAttempts, group.passed)}
                  </span>
                  <span className="ml-auto text-sm text-muted-foreground">
                    {group.screenshots.length} screenshot{group.screenshots.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Screenshots Grid */}
                {renderScreenshotGrid(group.screenshots, indexOffset)}
              </div>
            );
          })}
        </div>
      ) : (
        /* Simple grid without attempt grouping */
        renderScreenshotGrid(allScreenshots)
      )}

      {/* Lightbox Modal */}
      {selectedIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={closeLightbox}
          role="dialog"
          aria-modal="true"
          aria-label="Screenshot viewer"
        >
          {/* Close Button */}
          <button
            onClick={closeLightbox}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
            aria-label="Close"
          >
            <X className="h-6 w-6" />
          </button>

          {/* Navigation - Previous */}
          {selectedIndex > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); goToPrevious(); }}
              className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
              aria-label="Previous screenshot"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}

          {/* Navigation - Next */}
          {selectedIndex < allScreenshots.length - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); goToNext(); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
              aria-label="Next screenshot"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          )}

          {/* Main Image */}
          <div
            className="relative max-h-[85vh] max-w-[90vw]"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={allScreenshots[selectedIndex].url}
              alt={allScreenshots[selectedIndex].name}
              className="max-h-[85vh] max-w-[90vw] object-contain"
            />

            {/* Image Info Bar */}
            <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between bg-gradient-to-t from-black/80 to-transparent p-4">
              <div>
                <p className="text-sm font-medium text-white">
                  {allScreenshots[selectedIndex].name}
                </p>
                <p className="text-xs text-white/70">
                  {selectedIndex + 1} of {allScreenshots.length}
                </p>
              </div>
              <div className="flex gap-2">
                {onDownload && (
                  <button
                    onClick={() => onDownload(allScreenshots[selectedIndex])}
                    className="rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
                    aria-label="Download screenshot"
                  >
                    <Download className="h-5 w-5" />
                  </button>
                )}
                <a
                  href={allScreenshots[selectedIndex].url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
                  aria-label="Open in new tab"
                >
                  <Maximize2 className="h-5 w-5" />
                </a>
              </div>
            </div>
          </div>

          {/* Thumbnail Strip */}
          {allScreenshots.length > 1 && (
            <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2 overflow-x-auto rounded-lg bg-black/50 p-2">
              {allScreenshots.slice(
                Math.max(0, selectedIndex - 3),
                Math.min(allScreenshots.length, selectedIndex + 4)
              ).map((screenshot, i) => {
                const actualIndex = Math.max(0, selectedIndex - 3) + i;
                return (
                  <button
                    key={actualIndex}
                    onClick={(e) => { e.stopPropagation(); setSelectedIndex(actualIndex); }}
                    className={cn(
                      'h-12 w-16 overflow-hidden rounded border-2 transition-all',
                      actualIndex === selectedIndex
                        ? 'border-white'
                        : 'border-transparent opacity-60 hover:opacity-100'
                    )}
                  >
                    <img
                      src={screenshot.url}
                      alt={screenshot.name}
                      className="h-full w-full object-cover"
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ScreenshotGallery;
