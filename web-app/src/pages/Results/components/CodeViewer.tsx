/**
 * CodeViewer Component
 * Display generated Playwright code with Monaco Editor syntax highlighting
 */

import { useState, useCallback } from 'react';
import { Copy, Check, Download, Maximize2, Minimize2 } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { cn } from '@/utils';

export interface CodeViewerProps {
  /** Code content to display */
  code: string;
  /** Language for syntax highlighting */
  language?: 'typescript' | 'javascript';
  /** File name to display */
  fileName?: string;
  /** On download click handler */
  onDownload?: () => void;
  /** Maximum height before scrolling */
  maxHeight?: string;
  /** Additional CSS classes */
  className?: string;
}

export function CodeViewer({
  code,
  language = 'typescript',
  fileName,
  onDownload,
  maxHeight = '500px',
  className,
}: CodeViewerProps) {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  }, [code]);

  const toggleExpand = () => setIsExpanded(!isExpanded);

  const lines = code.split('\n');
  
  // Calculate height based on content
  const lineHeight = 19; // Monaco default line height
  const contentHeight = lines.length * lineHeight + 20; // Add padding
  const displayHeight = isExpanded 
    ? Math.max(contentHeight, 300) 
    : Math.min(contentHeight, parseInt(maxHeight) || 500);

  if (!code) {
    return (
      <div className={cn('flex flex-col items-center justify-center rounded-lg border bg-muted/50 p-8', className)}>
        <p className="text-muted-foreground">No generated code available</p>
      </div>
    );
  }

  return (
    <div className={cn('overflow-hidden rounded-lg border bg-card', className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-muted/50 px-4 py-2">
        <div className="flex items-center gap-2">
          {/* File type indicator */}
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-blue-500" />
            <span className="text-sm font-medium text-foreground">
              {fileName || `spec.${language === 'typescript' ? 'ts' : 'js'}`}
            </span>
          </div>
          <span className="text-xs text-muted-foreground">
            {lines.length} lines
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label={copied ? 'Copied!' : 'Copy code'}
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-green-500" />
                <span className="text-green-500">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>

          <button
            onClick={toggleExpand}
            className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? (
              <Minimize2 className="h-3.5 w-3.5" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" />
            )}
          </button>

          {onDownload && (
            <button
              onClick={onDownload}
              className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Download code"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download</span>
            </button>
          )}
        </div>
      </div>

      {/* Monaco Editor */}
      <div style={{ height: displayHeight }}>
        <Editor
          height="100%"
          language={language}
          value={code}
          theme="vs-dark"
          options={{
            readOnly: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontSize: 13,
            lineNumbers: 'on',
            folding: true,
            wordWrap: 'on',
            automaticLayout: true,
            scrollbar: {
              vertical: 'auto',
              horizontal: 'auto',
              verticalScrollbarSize: 10,
              horizontalScrollbarSize: 10,
            },
            padding: { top: 10, bottom: 10 },
            renderLineHighlight: 'none',
            selectionHighlight: false,
            occurrencesHighlight: 'off',
            cursorStyle: 'line',
            cursorBlinking: 'solid',
          }}
        />
      </div>

      {/* Footer - Show when collapsed and there's more content */}
      {!isExpanded && lines.length > 25 && (
        <div className="border-t bg-muted/30 px-4 py-2 text-center">
          <button
            onClick={toggleExpand}
            className="text-xs text-primary hover:underline"
          >
            Show all {lines.length} lines
          </button>
        </div>
      )}
    </div>
  );
}

export default CodeViewer;
