/**
 * Monaco Editor Configuration
 * Settings for the Gherkin editor
 */

import type { EditorSettings } from '@/types';
import { defaultEditorSettings } from './defaults.config';

// ============================================================================
// Gherkin Language Definition
// ============================================================================

/**
 * Gherkin language ID for Monaco
 */
export const GHERKIN_LANGUAGE_ID = 'gherkin';

/**
 * Gherkin keywords for syntax highlighting
 */
export const gherkinKeywords = {
  primary: ['Feature', 'Scenario', 'Scenario Outline', 'Background', 'Examples'],
  steps: ['Given', 'When', 'Then', 'And', 'But', '*'],
  tags: ['@'],
} as const;

/**
 * Gherkin language monarch tokenizer definition
 */
export const gherkinLanguageDefinition = {
  defaultToken: '',
  tokenPostfix: '.gherkin',

  keywords: [
    'Feature',
    'Scenario',
    'Scenario Outline',
    'Background',
    'Examples',
    'Given',
    'When',
    'Then',
    'And',
    'But',
  ],

  tokenizer: {
    root: [
      // Tags
      [/@[\w-]+/, 'tag'],

      // Keywords
      [
        /\b(Feature|Scenario|Scenario Outline|Background|Examples)\b:?/,
        'keyword',
      ],

      // Step keywords
      [/\b(Given|When|Then|And|But|\*)\b/, 'keyword.step'],

      // Strings
      [/"([^"\\]|\\.)*"/, 'string'],
      [/'([^'\\]|\\.)*'/, 'string'],

      // Comments
      [/#.*$/, 'comment'],

      // Data table pipes
      [/\|/, 'delimiter'],

      // Doc strings
      [/"""/, { token: 'string.docstring', next: '@docstring' }],

      // Placeholders in scenario outlines
      [/<[\w]+>/, 'variable'],

      // Numbers
      [/\d+/, 'number'],
    ],

    docstring: [
      [/"""/, { token: 'string.docstring', next: '@pop' }],
      [/./, 'string.docstring'],
    ],
  },
};

/**
 * Gherkin language configuration
 */
export const gherkinLanguageConfig = {
  comments: {
    lineComment: '#',
  },
  brackets: [
    ['|', '|'],
    ['<', '>'],
    ['"', '"'],
  ],
  autoClosingPairs: [
    { open: '"', close: '"' },
    { open: "'", close: "'" },
    { open: '<', close: '>' },
  ],
  surroundingPairs: [
    { open: '"', close: '"' },
    { open: "'", close: "'" },
    { open: '<', close: '>' },
  ],
  folding: {
    markers: {
      start: /^\s*(Feature|Scenario|Scenario Outline|Background|Examples):/,
      end: /^\s*$/,
    },
  },
};

// ============================================================================
// Editor Themes
// ============================================================================

/**
 * Custom Gherkin theme for light mode
 */
export const gherkinLightTheme = {
  base: 'vs' as const,
  inherit: true,
  rules: [
    { token: 'keyword', foreground: '0000FF', fontStyle: 'bold' },
    { token: 'keyword.step', foreground: '795E26', fontStyle: 'bold' },
    { token: 'tag', foreground: '008080' },
    { token: 'string', foreground: 'A31515' },
    { token: 'string.docstring', foreground: 'A31515' },
    { token: 'comment', foreground: '008000', fontStyle: 'italic' },
    { token: 'variable', foreground: '001080' },
    { token: 'number', foreground: '098658' },
    { token: 'delimiter', foreground: '000000' },
  ],
  colors: {
    'editor.background': '#FFFFFF',
    'editor.foreground': '#000000',
  },
};

/**
 * Custom Gherkin theme for dark mode
 */
export const gherkinDarkTheme = {
  base: 'vs-dark' as const,
  inherit: true,
  rules: [
    { token: 'keyword', foreground: '569CD6', fontStyle: 'bold' },
    { token: 'keyword.step', foreground: 'DCDCAA', fontStyle: 'bold' },
    { token: 'tag', foreground: '4EC9B0' },
    { token: 'string', foreground: 'CE9178' },
    { token: 'string.docstring', foreground: 'CE9178' },
    { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
    { token: 'variable', foreground: '9CDCFE' },
    { token: 'number', foreground: 'B5CEA8' },
    { token: 'delimiter', foreground: 'D4D4D4' },
  ],
  colors: {
    'editor.background': '#1E1E1E',
    'editor.foreground': '#D4D4D4',
  },
};

// ============================================================================
// Editor Options
// ============================================================================

/**
 * Get Monaco editor options based on settings
 */
export function getEditorOptions(settings: EditorSettings = defaultEditorSettings) {
  return {
    fontSize: settings.fontSize,
    tabSize: settings.tabSize,
    minimap: { enabled: settings.minimap },
    wordWrap: settings.wordWrap,
    lineNumbers: settings.lineNumbers,
    automaticLayout: true,
    scrollBeyondLastLine: false,
    renderLineHighlight: 'line' as const,
    selectOnLineNumbers: true,
    roundedSelection: false,
    cursorStyle: 'line' as const,
    autoClosingBrackets: settings.autoClosingBrackets,
    formatOnPaste: true,
    formatOnType: true,
    suggestOnTriggerCharacters: true,
    acceptSuggestionOnEnter: 'on' as const,
    folding: true,
    foldingStrategy: 'auto' as const,
    showFoldingControls: 'mouseover' as const,
    matchBrackets: 'always' as const,
    renderWhitespace: 'selection' as const,
    quickSuggestions: {
      other: true,
      comments: false,
      strings: true,
    },
  };
}

// ============================================================================
// Gherkin Completions
// ============================================================================

/**
 * Gherkin auto-completion suggestions
 */
export const gherkinCompletions = {
  keywords: [
    { label: 'Feature:', insertText: 'Feature: ${1:Feature Name}\n  ${0}', documentation: 'Defines a feature' },
    { label: 'Scenario:', insertText: 'Scenario: ${1:Scenario Name}\n    ${0}', documentation: 'Defines a scenario' },
    { label: 'Scenario Outline:', insertText: 'Scenario Outline: ${1:Scenario Name}\n    ${0}\n\n  Examples:\n    | ${2:header} |\n    | ${3:value} |', documentation: 'Defines a scenario outline with examples' },
    { label: 'Background:', insertText: 'Background:\n    ${0}', documentation: 'Defines background steps' },
    { label: 'Examples:', insertText: 'Examples:\n    | ${1:header} |\n    | ${2:value} |', documentation: 'Defines examples for scenario outline' },
  ],
  steps: [
    { label: 'Given', insertText: 'Given ${0}', documentation: 'Describes an initial context' },
    { label: 'When', insertText: 'When ${0}', documentation: 'Describes an action' },
    { label: 'Then', insertText: 'Then ${0}', documentation: 'Describes an expected outcome' },
    { label: 'And', insertText: 'And ${0}', documentation: 'Additional step' },
    { label: 'But', insertText: 'But ${0}', documentation: 'Negative additional step' },
  ],
  actions: [
    { label: 'I navigate to', insertText: 'I navigate to "${1:url}"', documentation: 'Navigate to a URL' },
    { label: 'I click on', insertText: 'I click on the ${1:element}', documentation: 'Click on an element' },
    { label: 'I enter', insertText: 'I enter "${1:value}" in the ${2:field}', documentation: 'Enter text in a field' },
    { label: 'I should see', insertText: 'I should see "${1:text}"', documentation: 'Assert text is visible' },
    { label: 'I should see the', insertText: 'I should see the ${1:element}', documentation: 'Assert element is visible' },
    { label: 'I wait for', insertText: 'I wait for ${1:seconds} seconds', documentation: 'Wait for a duration' },
    { label: 'I select', insertText: 'I select "${1:option}" from the ${2:dropdown}', documentation: 'Select from dropdown' },
    { label: 'I check', insertText: 'I check the ${1:checkbox}', documentation: 'Check a checkbox' },
    { label: 'I uncheck', insertText: 'I uncheck the ${1:checkbox}', documentation: 'Uncheck a checkbox' },
  ],
};
