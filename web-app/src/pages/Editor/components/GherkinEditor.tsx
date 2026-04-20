/**
 * GherkinEditor Component
 * Monaco editor wrapper with Gherkin syntax highlighting and error markers
 */

import { useRef, useEffect, useCallback } from 'react';
import Editor, { type OnMount, type Monaco } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { useSettingsStore, selectResolvedTheme } from '@/stores';
import {
  GHERKIN_LANGUAGE_ID,
  gherkinLanguageDefinition,
  gherkinLanguageConfig,
  gherkinLightTheme,
  gherkinDarkTheme,
  gherkinCompletions,
  getEditorOptions,
} from '@/config/editor.config';
import type { ParseError } from '@/types';
import { LoadingSpinner } from '@/components/common';

// ============================================================================
// Types
// ============================================================================

export interface GherkinEditorProps {
  /** Editor content value */
  value: string;
  /** Callback when content changes */
  onChange: (value: string) => void;
  /** Validation errors to display as markers */
  errors?: ParseError[];
  /** Whether the editor is read-only */
  readOnly?: boolean;
  /** Editor height (default: 100%) */
  height?: string;
  /** Additional CSS class */
  className?: string;
  /** Callback when editor is mounted */
  onMount?: (editor: editor.IStandaloneCodeEditor) => void;
}

// ============================================================================
// Component
// ============================================================================

export function GherkinEditor({
  value,
  onChange,
  errors = [],
  readOnly = false,
  height = '100%',
  className = '',
  onMount: onMountProp,
}: GherkinEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);

  const resolvedTheme = useSettingsStore((state) => selectResolvedTheme(state));

  // Register Gherkin language and themes
  const handleEditorWillMount = useCallback((monaco: Monaco) => {
    // Check if language is already registered
    const languages = monaco.languages.getLanguages();
    const isRegistered = languages.some(
      (lang: { id: string }) => lang.id === GHERKIN_LANGUAGE_ID
    );

    if (!isRegistered) {
      // Register language
      monaco.languages.register({ id: GHERKIN_LANGUAGE_ID });

      // Set language tokenizer
      monaco.languages.setMonarchTokensProvider(
        GHERKIN_LANGUAGE_ID,
        gherkinLanguageDefinition as Parameters<typeof monaco.languages.setMonarchTokensProvider>[1]
      );

      // Set language configuration
      monaco.languages.setLanguageConfiguration(
        GHERKIN_LANGUAGE_ID,
        gherkinLanguageConfig as Parameters<typeof monaco.languages.setLanguageConfiguration>[1]
      );

      // Register completion provider
      monaco.languages.registerCompletionItemProvider(GHERKIN_LANGUAGE_ID, {
        provideCompletionItems: (
          model: Parameters<Parameters<typeof monaco.languages.registerCompletionItemProvider>[1]['provideCompletionItems']>[0],
          position: Parameters<Parameters<typeof monaco.languages.registerCompletionItemProvider>[1]['provideCompletionItems']>[1]
        ) => {
          const word = model.getWordUntilPosition(position);
          const range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn,
          };

          const lineContent = model.getLineContent(position.lineNumber);
          const trimmedLine = lineContent.trim();

          // Provide keyword completions at start of line
          const suggestions: ReturnType<typeof monaco.languages.registerCompletionItemProvider> extends { provideCompletionItems: infer F }
            ? F extends (...args: unknown[]) => infer R
              ? R extends { suggestions: infer S }
                ? S
                : never
              : never
            : never = [];

          // Keywords
          if (trimmedLine.length === 0 || trimmedLine === word.word) {
            gherkinCompletions.keywords.forEach((item) => {
              suggestions.push({
                label: item.label,
                kind: monaco.languages.CompletionItemKind.Keyword,
                insertText: item.insertText,
                insertTextRules:
                  monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation: item.documentation,
                range,
              });
            });
          }

          // Step keywords
          gherkinCompletions.steps.forEach((item) => {
            suggestions.push({
              label: item.label,
              kind: monaco.languages.CompletionItemKind.Keyword,
              insertText: item.insertText,
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: item.documentation,
              range,
            });
          });

          // Action completions (after step keywords)
          const stepKeywords = ['Given', 'When', 'Then', 'And', 'But'];
          const hasStepKeyword = stepKeywords.some((kw) =>
            trimmedLine.startsWith(kw)
          );

          if (hasStepKeyword) {
            gherkinCompletions.actions.forEach((item) => {
              suggestions.push({
                label: item.label,
                kind: monaco.languages.CompletionItemKind.Function,
                insertText: item.insertText,
                insertTextRules:
                  monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation: item.documentation,
                range,
              });
            });
          }

          return { suggestions };
        },
      });
    }

    // Define themes
    monaco.editor.defineTheme('gherkin-light', gherkinLightTheme);
    monaco.editor.defineTheme('gherkin-dark', gherkinDarkTheme);
  }, []);

  // Handle editor mount
  const handleEditorMount: OnMount = useCallback(
    (editor, monaco) => {
      editorRef.current = editor;
      monacoRef.current = monaco;

      // Set initial theme
      monaco.editor.setTheme(resolvedTheme === 'dark' ? 'gherkin-dark' : 'gherkin-light');

      // Focus editor
      editor.focus();

      // Call external onMount if provided
      onMountProp?.(editor);
    },
    [resolvedTheme, onMountProp]
  );

  // Update theme when it changes
  useEffect(() => {
    if (monacoRef.current) {
      monacoRef.current.editor.setTheme(
        resolvedTheme === 'dark' ? 'gherkin-dark' : 'gherkin-light'
      );
    }
  }, [resolvedTheme]);

  // Update error markers when errors change
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current) return;

    const model = editorRef.current.getModel();
    if (!model) return;

    const markers: editor.IMarkerData[] = errors
      .filter((error) => error.line !== undefined)
      .map((error) => ({
        severity: monacoRef.current!.MarkerSeverity.Error,
        message: error.message,
        startLineNumber: error.line!,
        startColumn: error.column || 1,
        endLineNumber: error.line!,
        endColumn: error.column ? error.column + 10 : model.getLineMaxColumn(error.line!),
      }));

    monacoRef.current.editor.setModelMarkers(model, 'gherkin-validator', markers);
  }, [errors]);

  // Handle content change
  const handleChange = useCallback(
    (newValue: string | undefined) => {
      onChange(newValue || '');
    },
    [onChange]
  );

  // Get editor options - use default settings structure
  const editorOptions = getEditorOptions({
    fontSize: 14,
    tabSize: 2,
    minimap: false,
    wordWrap: 'on' as const,
    lineNumbers: 'on' as const,
    autoClosingBrackets: 'always' as const,
    theme: resolvedTheme === 'dark' ? 'vs-dark' as const : 'vs' as const,
  });

  return (
    <div className={`relative h-full w-full ${className}`}>
      <Editor
        height={height}
        defaultLanguage={GHERKIN_LANGUAGE_ID}
        value={value}
        onChange={handleChange}
        beforeMount={handleEditorWillMount}
        onMount={handleEditorMount}
        options={{
          ...editorOptions,
          readOnly,
        }}
        loading={
          <div className="flex h-full items-center justify-center">
            <LoadingSpinner size="lg" />
          </div>
        }
      />
    </div>
  );
}

export default GherkinEditor;
