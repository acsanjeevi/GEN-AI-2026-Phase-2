/**
 * Editor Page
 * Gherkin feature editor with syntax validation
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Download,
  Upload,
  Save,
  Trash2,
  RefreshCw,
  PanelRightClose,
  PanelRight,
} from 'lucide-react';
import type { editor } from 'monaco-editor';
import { PageContainer } from '@/components/layout';
import { useToast } from '@/components/common';
import { useEditorStore, useExecutionStore, useSettingsStore } from '@/stores';
import { featureService, executionService } from '@/services';
import type { Scenario, ParseError } from '@/types';
import {
  GherkinEditor,
  ValidationPanel,
  StepPreview,
  RunButton,
  type RunConfig,
  type StepMapping,
} from './components';

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_GHERKIN = `Feature: SauceDemo Shopping Cart and Logout
  As a standard user of Swag Labs
  I want to login, manage my shopping cart, and logout
  So that I can verify the end-to-end shopping and session flow

  Background:
    Given I navigate to "https://www.saucedemo.com"

  @smoke @login @saucedemo
  Scenario: Login with valid credentials
    When I enter "standard_user" in the "Username" field
    And I enter "secret_sauce" in the "Password" field
    And I click on the "Login" button
    Then the url should be "https://www.saucedemo.com/inventory.html"

  @smoke @cart @saucedemo
  Scenario: Add top 4 products to cart
    Given I am logged in as "standard_user" with password "secret_sauce"
    And I am on the "https://www.saucedemo.com/inventory.html" page
    When I click "Add to cart" for "Sauce Labs Backpack"
    And I click "Add to cart" for "Sauce Labs Bike Light"
    And I click "Add to cart" for "Sauce Labs Bolt T-Shirt"
    And I click "Add to cart" for "Sauce Labs Fleece Jacket"
    Then the cart badge should display "4"
    And the "Add to cart" button for "Sauce Labs Backpack" should change to "Remove"
    And the "Add to cart" button for "Sauce Labs Bike Light" should change to "Remove"
    And the "Add to cart" button for "Sauce Labs Bolt T-Shirt" should change to "Remove"
    And the "Add to cart" button for "Sauce Labs Fleece Jacket" should change to "Remove"

  @smoke @cart @saucedemo
  Scenario: Navigate to cart and clear all items
    Given I am logged in as "standard_user" with password "secret_sauce"
    And I have added the following items to the cart:
      | Item Name                  |
      | Sauce Labs Backpack        |
      | Sauce Labs Bike Light      |
      | Sauce Labs Bolt T-Shirt    |
      | Sauce Labs Fleece Jacket   |
    When I navigate to "https://www.saucedemo.com/cart.html"
    Then the url should be "https://www.saucedemo.com/cart.html"
    And the cart should contain "4" items
    When I click the "Remove" button
    And I click the "Remove" button
    And I click the "Remove" button
    And I click the "Remove" button

  @smoke @logout @saucedemo
  Scenario: Clear cart and logout via hamburger menu
    Given I am logged in as "standard_user" with password "secret_sauce"
    And I am on the "https://www.saucedemo.com/inventory.html" page
    When I click "Add to cart" for "Sauce Labs Backpack"
    And I click "Add to cart" for "Sauce Labs Bike Light"
    And I click "Add to cart" for "Sauce Labs Bolt T-Shirt"
    And I click "Add to cart" for "Sauce Labs Fleece Jacket"
    Then the cart badge should display "4"
    When I navigate to "https://www.saucedemo.com/cart.html"
    Then the url should be "https://www.saucedemo.com/cart.html"
    When I click the "Remove" button
    And I click the "Remove" button
    And I click the "Remove" button
    And I click the "Remove" button
    And I click "Go back Continue Shopping"
    Then the url should be "https://www.saucedemo.com/inventory.html"
    When I click the "Open Menu" hamburger button
    And I click on the "Logout" link
`;

const DEBOUNCE_DELAY = 500;

// ============================================================================
// Component
// ============================================================================

export function Editor() {
  const navigate = useNavigate();
  const toast = useToast();
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Store state
  const content = useEditorStore((state) => state.content);
  const setContent = useEditorStore((state) => state.setContent);
  const validationResult = useEditorStore((state) => state.validationResult);
  const setValidation = useEditorStore((state) => state.setValidation);
  const isDirty = useEditorStore((state) => state.isDirty);
  const markSaved = useEditorStore((state) => state.markSaved);

  const setExecution = useExecutionStore((state) => state.setExecution);
  
  const defaultBaseUrl = useSettingsStore((state) => state.execution.defaultBaseUrl);

  // Local state
  const [isValidating, setIsValidating] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [stepMappings] = useState<Map<string, StepMapping>>(new Map());
  const [showSidebar, setShowSidebar] = useState(true);

  // Validate content with debounce
  useEffect(() => {
    if (!content.trim()) {
      setValidation({
        valid: true,
        errors: [],
        warnings: [],
        scenarioNames: [],
      });
      setScenarios([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsValidating(true);
      try {
        const result = await featureService.validateSyntax(content);
        setValidation(result);

        // If valid, parse to get scenarios
        if (result.valid) {
          setIsParsing(true);
          try {
            const parseResult = await featureService.parse(content);
            if (parseResult.success && parseResult.data) {
              setScenarios(parseResult.data.feature.scenarios);
            }
          } catch (err) {
            console.error('Parse error:', err);
          } finally {
            setIsParsing(false);
          }
        } else {
          setScenarios([]);
        }
      } catch (err) {
        console.error('Validation error:', err);
        setValidation({
          valid: false,
          errors: [{ message: 'Failed to validate syntax' }],
          warnings: [],
        });
      } finally {
        setIsValidating(false);
      }
    }, DEBOUNCE_DELAY);

    return () => clearTimeout(timer);
  }, [content, setValidation]);

  // Handle content change
  const handleContentChange = useCallback(
    (newContent: string) => {
      setContent(newContent);
    },
    [setContent]
  );

  // Handle error click to jump to line
  const handleErrorClick = useCallback((error: ParseError) => {
    if (editorRef.current && error.line) {
      editorRef.current.revealLineInCenter(error.line);
      editorRef.current.setPosition({ lineNumber: error.line, column: error.column || 1 });
      editorRef.current.focus();
    }
  }, []);

  // Handle run
  const handleRun = useCallback(
    async (config: RunConfig) => {
      if (!content.trim()) {
        toast.error('Please write some Gherkin content first');
        return;
      }

      if (!validationResult?.valid) {
        toast.error('Please fix validation errors before running');
        return;
      }

      // Use the config baseUrl, or fall back to settings default
      const effectiveBaseUrl = config.baseUrl || defaultBaseUrl || '';
      
      if (!effectiveBaseUrl) {
        toast.error('Please set a base URL in settings or the run configuration');
        return;
      }

      setIsRunning(true);
      try {
        const execution = await executionService.create({
          featureContent: content,
          baseUrl: effectiveBaseUrl,
          browser: config.browser,
          options: config.options,
        });

        setExecution(execution);
        toast.success('Execution started');
        navigate(`/execution/${execution.id}`);
      } catch (err) {
        console.error('Run error:', err);
        toast.error('Failed to start execution');
      } finally {
        setIsRunning(false);
      }
    },
    [content, validationResult, defaultBaseUrl, setExecution, navigate, toast]
  );

  // Handle clear
  const handleClear = useCallback(() => {
    setContent('');
    setScenarios([]);
    toast.info('Editor cleared');
  }, [setContent, toast]);

  // Handle save to localStorage
  const handleSave = useCallback(() => {
    try {
      localStorage.setItem('gherkin-feature', content);
      markSaved();
      toast.success('Feature saved to browser storage');
    } catch (err) {
      toast.error('Failed to save feature');
    }
  }, [content, markSaved, toast]);

  // Handle load from localStorage
  const handleLoad = useCallback(() => {
    try {
      const saved = localStorage.getItem('gherkin-feature');
      if (saved) {
        setContent(saved);
        toast.success('Feature loaded from browser storage');
      } else {
        toast.info('No saved feature found');
      }
    } catch (err) {
      toast.error('Failed to load feature');
    }
  }, [setContent, toast]);

  // Handle file import
  const handleImport = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result;
        if (typeof text === 'string') {
          setContent(text);
          toast.success(`Imported: ${file.name}`);
        }
      };
      reader.onerror = () => {
        toast.error('Failed to read file');
      };
      reader.readAsText(file);

      // Reset input
      e.target.value = '';
    },
    [setContent, toast]
  );

  // Handle file export
  const handleExport = useCallback(() => {
    if (!content.trim()) {
      toast.error('Nothing to export');
      return;
    }

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'feature.feature';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Feature exported');
  }, [content, toast]);

  // Handle editor mount
  const handleEditorMount = useCallback((editor: editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;
  }, []);

  // Load default content if empty
  useEffect(() => {
    if (!content) {
      const saved = localStorage.getItem('gherkin-feature');
      if (saved) {
        setContent(saved);
      } else {
        setContent(DEFAULT_GHERKIN);
      }
    }
  }, [content, setContent]);

  const isValid = validationResult?.valid ?? false;
  const canRun = isValid && content.trim().length > 0 && !isValidating;

  return (
    <PageContainer
      title="Feature Editor"
      description="Write and validate your Gherkin feature files"
      maxWidth="full"
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".feature,.txt"
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="flex h-[calc(100vh-12rem)] flex-col">
        {/* Toolbar */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {/* File actions */}
            <div className="flex items-center rounded-md border bg-card">
              <button
                onClick={handleImport}
                className="flex items-center gap-1 border-r px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                title="Import file"
              >
                <Upload className="h-4 w-4" />
                <span className="hidden sm:inline">Import</span>
              </button>
              <button
                onClick={handleExport}
                className="flex items-center gap-1 border-r px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                title="Export file"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Export</span>
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-1 border-r px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                title="Save to browser"
              >
                <Save className="h-4 w-4" />
                <span className="hidden sm:inline">Save</span>
              </button>
              <button
                onClick={handleLoad}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                title="Load from browser"
              >
                <RefreshCw className="h-4 w-4" />
                <span className="hidden sm:inline">Load</span>
              </button>
            </div>

            {/* Status indicator */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {isDirty && (
                <>
                  <span className="inline-block h-2 w-2 rounded-full bg-yellow-500" />
                  <span>Unsaved</span>
                </>
              )}
              {isValidating && (
                <>
                  <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-blue-500" />
                  <span>Validating...</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Clear button */}
            <button
              onClick={handleClear}
              className="flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              title="Clear editor"
            >
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">Clear</span>
            </button>

            {/* Toggle sidebar */}
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="rounded-md border p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              title={showSidebar ? 'Hide sidebar' : 'Show sidebar'}
            >
              {showSidebar ? (
                <PanelRightClose className="h-4 w-4" />
              ) : (
                <PanelRight className="h-4 w-4" />
              )}
            </button>

            {/* Run button */}
            <RunButton
              disabled={!canRun}
              isRunning={isRunning}
              onRun={handleRun}
            />
          </div>
        </div>

        {/* Main content */}
        <div className="flex flex-1 gap-4 overflow-hidden">
          {/* Editor Panel */}
          <div className={`flex flex-1 flex-col overflow-hidden ${showSidebar ? 'lg:w-2/3' : ''}`}>
            {/* Editor */}
            <div className="flex-1 overflow-hidden rounded-lg border bg-card">
              <GherkinEditor
                value={content}
                onChange={handleContentChange}
                errors={validationResult?.errors}
                onMount={handleEditorMount}
              />
            </div>
          </div>

          {/* Sidebar */}
          {showSidebar && (
            <div className="hidden w-full flex-col gap-4 overflow-hidden lg:flex lg:w-1/3">
              {/* Validation Panel */}
              <ValidationPanel
                validationResult={validationResult}
                isValidating={isValidating}
                onErrorClick={handleErrorClick}
              />

              {/* Step Preview */}
              <div className="flex-1 overflow-auto rounded-lg border bg-card p-4">
                <StepPreview
                  scenarios={scenarios}
                  stepMappings={stepMappings}
                  isLoading={isParsing}
                />
              </div>
            </div>
          )}
        </div>

        {/* Mobile validation (shown when sidebar is hidden or on small screens) */}
        {!showSidebar && (
          <div className="mt-4 lg:hidden">
            <ValidationPanel
              validationResult={validationResult}
              isValidating={isValidating}
              onErrorClick={handleErrorClick}
            />
          </div>
        )}
      </div>
    </PageContainer>
  );
}

export default Editor;
