# No-Code UI Automation - Web Application

## Project Overview

Building an enterprise-grade React web application for the No-Code UI Automation Platform.
This frontend consumes the existing Node.js/Express backend API to provide:

- Gherkin feature editor with syntax validation
- Test execution with real-time progress monitoring
- Results dashboard with artifact viewing (videos, screenshots, traces)
- Configuration management for browser and LLM settings

**Tech Stack:**
- React 18 + TypeScript
- Vite (build tool)
- Tailwind CSS + shadcn/ui (styling)
- Zustand (state management)
- React Query (server state & caching)
- Monaco Editor (Gherkin editor)
- React Router v6 (routing)

## Development Philosophy

Follow the same enterprise conventions as the backend:

- **Component-based architecture** - Small, reusable, single-responsibility components
- **Separation of concerns** - UI components don't contain business logic
- **Type safety** - Full TypeScript coverage with interfaces matching backend DTOs
- **API abstraction** - All backend calls go through service layer
- **State management** - Global state in stores, server state via React Query
- **Error boundaries** - Graceful error handling at page level
- **Accessibility** - WCAG 2.1 AA compliance
- **Responsive design** - Mobile-first approach

## Folder Structure

```
no-code/
└── web-app/
    ├── index.html
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── .env
    ├── .env.development
    ├── .env.production
    │
    ├── public/
    │   ├── favicon.ico
    │   └── assets/
    │
    └── src/
        ├── main.tsx                    # App entry point
        ├── App.tsx                     # Root component with routing
        ├── vite-env.d.ts
        │
        ├── types/                      # TypeScript interfaces
        │   ├── index.ts
        │   ├── api.types.ts            # API request/response types
        │   ├── execution.types.ts      # Execution domain types
        │   ├── feature.types.ts        # Feature/scenario types
        │   └── config.types.ts         # Configuration types
        │
        ├── config/                     # App configuration
        │   ├── index.ts
        │   ├── api.config.ts           # API base URL, timeouts
        │   ├── editor.config.ts        # Monaco editor settings
        │   └── defaults.config.ts      # Default form values
        │
        ├── services/                   # API service layer
        │   ├── index.ts
        │   ├── api.client.ts           # Axios instance with interceptors
        │   ├── execution.service.ts    # /api/execution/* endpoints
        │   ├── feature.service.ts      # /api/feature/* endpoints
        │   ├── mapping.service.ts      # /api/mapping/* endpoints
        │   ├── mcp.service.ts          # /api/mcp/* endpoints
        │   └── llm.service.ts          # /api/llm/* endpoints
        │
        ├── hooks/                      # Custom React hooks
        │   ├── index.ts
        │   ├── useExecutionPolling.ts  # Poll execution status
        │   ├── useFeatureValidation.ts # Validate Gherkin syntax
        │   ├── useLocalStorage.ts      # Persist to localStorage
        │   ├── useDebounce.ts          # Debounce input changes
        │   └── useMediaQuery.ts        # Responsive breakpoints
        │
        ├── stores/                     # Zustand state stores
        │   ├── index.ts
        │   ├── execution.store.ts      # Current execution state
        │   ├── editor.store.ts         # Editor content & settings
        │   ├── settings.store.ts       # User preferences
        │   └── notification.store.ts   # Toast notifications
        │
        ├── pages/                      # Page components (routes)
        │   ├── index.ts
        │   ├── Dashboard/
        │   │   ├── Dashboard.tsx
        │   │   ├── Dashboard.styles.ts
        │   │   └── components/
        │   │       ├── ExecutionCard.tsx
        │   │       ├── QuickRunForm.tsx
        │   │       └── StatsOverview.tsx
        │   │
        │   ├── Editor/
        │   │   ├── Editor.tsx
        │   │   ├── Editor.styles.ts
        │   │   └── components/
        │   │       ├── GherkinEditor.tsx
        │   │       ├── ValidationPanel.tsx
        │   │       ├── StepPreview.tsx
        │   │       └── RunButton.tsx
        │   │
        │   ├── Execution/
        │   │   ├── Execution.tsx
        │   │   ├── Execution.styles.ts
        │   │   └── components/
        │   │       ├── ProgressTracker.tsx
        │   │       ├── StepList.tsx
        │   │       ├── LivePreview.tsx
        │   │       └── ActionLog.tsx
        │   │
        │   ├── Results/
        │   │   ├── Results.tsx
        │   │   ├── Results.styles.ts
        │   │   └── components/
        │   │       ├── ResultsSummary.tsx
        │   │       ├── ScenarioResult.tsx
        │   │       ├── StepResult.tsx
        │   │       ├── ArtifactViewer.tsx
        │   │       ├── VideoPlayer.tsx
        │   │       ├── ScreenshotGallery.tsx
        │   │       └── GeneratedCode.tsx
        │   │
        │   ├── History/
        │   │   ├── History.tsx
        │   │   └── components/
        │   │       ├── ExecutionTable.tsx
        │   │       ├── FilterBar.tsx
        │   │       └── Pagination.tsx
        │   │
        │   └── Settings/
        │       ├── Settings.tsx
        │       └── components/
        │           ├── BrowserSettings.tsx
        │           ├── LLMSettings.tsx
        │           ├── DefaultsSettings.tsx
        │           └── APISettings.tsx
        │
        ├── components/                 # Shared UI components
        │   ├── ui/                     # shadcn/ui components
        │   │   ├── button.tsx
        │   │   ├── input.tsx
        │   │   ├── select.tsx
        │   │   ├── card.tsx
        │   │   ├── dialog.tsx
        │   │   ├── tabs.tsx
        │   │   ├── toast.tsx
        │   │   ├── badge.tsx
        │   │   ├── progress.tsx
        │   │   └── skeleton.tsx
        │   │
        │   ├── layout/                 # Layout components
        │   │   ├── Header.tsx
        │   │   ├── Sidebar.tsx
        │   │   ├── Footer.tsx
        │   │   ├── PageContainer.tsx
        │   │   └── MainLayout.tsx
        │   │
        │   ├── common/                 # Common reusable components
        │   │   ├── Logo.tsx
        │   │   ├── StatusBadge.tsx
        │   │   ├── LoadingSpinner.tsx
        │   │   ├── ErrorMessage.tsx
        │   │   ├── EmptyState.tsx
        │   │   ├── ConfirmDialog.tsx
        │   │   └── Breadcrumb.tsx
        │   │
        │   └── feature/                # Feature-specific shared components
        │       ├── BrowserConfigForm.tsx
        │       ├── ExecutionOptions.tsx
        │       └── FeaturePreview.tsx
        │
        ├── utils/                      # Utility functions
        │   ├── index.ts
        │   ├── formatters.ts           # Date, duration, size formatting
        │   ├── validators.ts           # Client-side validation
        │   ├── gherkin.utils.ts        # Gherkin syntax helpers
        │   └── storage.utils.ts        # localStorage helpers
        │
        └── styles/                     # Global styles
            ├── globals.css             # Tailwind imports + custom CSS
            └── themes/
                ├── light.css
                └── dark.css
```

## What the Web App Must Do

### Core Features

1. **Feature Editor Page**
   - Monaco editor with Gherkin syntax highlighting
   - Real-time syntax validation (debounced)
   - Step preview showing mapped actions
   - Save/load feature files from localStorage
   - Import from file upload

2. **Execution Page**
   - Configure browser settings (type, headless, viewport)
   - Configure options (retries, timeout, video, screenshots)
   - Set base URL and script ID
   - Start execution with progress tracking
   - Real-time step-by-step updates (polling)
   - Cancel running execution

3. **Results Page**
   - Summary statistics (pass/fail/skip counts)
   - Scenario-level results with expandable steps
   - Video player for recorded executions
   - Screenshot gallery with lightbox
   - Trace viewer link (opens Playwright trace viewer)
   - Generated spec file viewer with syntax highlighting
   - Download artifacts

4. **History Page**
   - List all past executions
   - Filter by status, date range
   - Sort by date, name, duration
   - Pagination
   - Quick actions (view, re-run, delete)

5. **Settings Page**
   - Browser defaults (type, viewport, headless)
   - Execution defaults (timeout, retries)
   - API configuration (base URL)
   - Theme selection (light/dark)

### API Integration

| Feature | Endpoint | Method |
|---------|----------|--------|
| Validate syntax | `/api/feature/validate-syntax` | POST |
| Parse feature | `/api/feature/parse` | POST |
| Check step | `/api/mapping/check-step` | POST |
| Start execution | `/api/execution/run` | POST |
| Get status | `/api/execution/:id/status` | GET |
| Get full details | `/api/execution/:id` | GET |
| List executions | `/api/execution/list` | GET |
| Get artifacts | `/api/execution/:id/artifacts` | GET |
| Download artifact | `/api/execution/:id/artifacts/:artifactId` | GET |
| Cancel execution | `/api/execution/:id/cancel` | POST |
| Delete execution | `/api/execution/:id` | DELETE |

---

## Incremental Development Plan

### Phase 1 — Project Setup ✅

**Objective:** Initialize React + TypeScript project with all tooling configured.

**Tasks:**
1. Initialize Vite + React + TypeScript project
2. Install and configure Tailwind CSS
3. Install and configure shadcn/ui
4. Set up folder structure
5. Configure path aliases in tsconfig
6. Create environment files (.env, .env.development)
7. Set up ESLint + Prettier
8. Create basic App.tsx with routing skeleton

**Deliverables:**
- `package.json` with all dependencies
- `vite.config.ts` with path aliases
- `tailwind.config.js` with custom theme
- `tsconfig.json` with strict mode
- Basic folder structure created
- App runs with "Hello World"

---

### Phase 2 — Types & Configuration

**Objective:** Define all TypeScript interfaces matching backend DTOs.

**Tasks:**
1. Create `types/api.types.ts` - API request/response interfaces
2. Create `types/execution.types.ts` - Execution domain types
3. Create `types/feature.types.ts` - Feature/Scenario/Step types
4. Create `types/config.types.ts` - Configuration types
5. Create `config/api.config.ts` - API configuration
6. Create `config/defaults.config.ts` - Default values

**Deliverables:**
- All TypeScript interfaces defined
- Type exports from `types/index.ts`
- Configuration files with sensible defaults
- Zero TypeScript errors

**Key Interfaces:**
```typescript
// Execution types
interface CreateExecutionRequest { ... }
interface ExecutionResponse { ... }
interface ExecutionStatus { ... }
interface ExecutionItemSummary { ... }

// Feature types
interface Feature { ... }
interface Scenario { ... }
interface Step { ... }
interface ValidationResult { ... }

// Config types
interface BrowserConfig { ... }
interface ExecutionOptions { ... }
interface AppSettings { ... }
```

---

### Phase 3 — API Service Layer

**Objective:** Create typed API client with all service methods.

**Tasks:**
1. Create `services/api.client.ts` - Axios instance with interceptors
2. Create `services/execution.service.ts` - Execution API methods
3. Create `services/feature.service.ts` - Feature parsing/validation
4. Create `services/mapping.service.ts` - Step mapping
5. Add request/response logging in development
6. Add error transformation

**Deliverables:**
- Typed API client with error handling
- All service methods implemented
- Request/response interceptors
- Exports from `services/index.ts`

**Service Methods:**
```typescript
// execution.service.ts
executionService.create(request: CreateExecutionRequest): Promise<ExecutionResponse>
executionService.getStatus(id: string): Promise<ExecutionStatus>
executionService.getDetails(id: string): Promise<ExecutionResponse>
executionService.list(params: ListParams): Promise<PaginatedResponse>
executionService.cancel(id: string): Promise<void>
executionService.delete(id: string): Promise<void>
executionService.getArtifacts(id: string): Promise<ArtifactsResponse>

// feature.service.ts
featureService.parse(content: string): Promise<ParseResponse>
featureService.validateSyntax(content: string): Promise<ValidationResult>

// mapping.service.ts
mappingService.checkStep(stepText: string): Promise<CheckStepResponse>
```

---

### Phase 4 — State Management

**Objective:** Set up Zustand stores for global state.

**Tasks:**
1. Create `stores/execution.store.ts` - Current execution state
2. Create `stores/editor.store.ts` - Editor content & settings
3. Create `stores/settings.store.ts` - User preferences with persistence
4. Create `stores/notification.store.ts` - Toast notifications
5. Add localStorage persistence for settings

**Deliverables:**
- All stores created and typed
- Settings persisted to localStorage
- Store exports from `stores/index.ts`

**Store Structure:**
```typescript
// execution.store.ts
interface ExecutionStore {
  currentExecution: ExecutionResponse | null;
  isRunning: boolean;
  progress: number;
  setExecution: (execution: ExecutionResponse) => void;
  updateStatus: (status: ExecutionStatus) => void;
  reset: () => void;
}

// editor.store.ts
interface EditorStore {
  content: string;
  validationResult: ValidationResult | null;
  isDirty: boolean;
  setContent: (content: string) => void;
  setValidation: (result: ValidationResult) => void;
}

// settings.store.ts
interface SettingsStore {
  browserConfig: BrowserConfig;
  executionOptions: ExecutionOptions;
  apiBaseUrl: string;
  theme: 'light' | 'dark';
  updateBrowserConfig: (config: Partial<BrowserConfig>) => void;
  updateExecutionOptions: (options: Partial<ExecutionOptions>) => void;
}
```

---

### Phase 5 — Layout & Navigation

**Objective:** Create app shell with header, sidebar, and routing.

**Tasks:**
1. Create `components/layout/Header.tsx` - App header with logo
2. Create `components/layout/Sidebar.tsx` - Navigation sidebar
3. Create `components/layout/MainLayout.tsx` - Page wrapper
4. Create `components/layout/PageContainer.tsx` - Content wrapper
5. Set up React Router with all routes
6. Add route guards for active execution

**Deliverables:**
- Fully functional navigation
- Responsive sidebar (collapsible on mobile)
- Active route highlighting
- Page transitions

**Routes:**
```typescript
/                    → Dashboard
/editor              → Feature Editor
/execution/:id       → Execution Monitor
/results/:id         → Results Viewer
/history             → Execution History
/settings            → Settings
```

---

### Phase 6 — Common Components

**Objective:** Build reusable UI components.

**Tasks:**
1. Install shadcn/ui components (button, input, select, card, etc.)
2. Create `components/common/StatusBadge.tsx` - Status indicator
3. Create `components/common/LoadingSpinner.tsx` - Loading states
4. Create `components/common/ErrorMessage.tsx` - Error display
5. Create `components/common/EmptyState.tsx` - Empty list states
6. Create `components/common/ConfirmDialog.tsx` - Confirmation modal
7. Create `components/common/Breadcrumb.tsx` - Page breadcrumbs

**Deliverables:**
- All common components created
- Storybook stories (optional)
- Consistent styling with Tailwind

---

### Phase 7 — Dashboard Page

**Objective:** Build the main dashboard with quick-run capability.

**Tasks:**
1. Create `pages/Dashboard/Dashboard.tsx` - Main dashboard page
2. Create `StatsOverview.tsx` - Summary statistics cards
3. Create `ExecutionCard.tsx` - Recent execution cards
4. Create `QuickRunForm.tsx` - Quick execution form
5. Integrate with execution service
6. Add loading and error states

**Deliverables:**
- Dashboard showing recent executions
- Quick-run form with validation
- Statistics overview
- Navigation to results

**Features:**
- Show last 5 executions
- Pass/fail statistics
- Quick-run with minimal config
- Link to full editor

---

### Phase 8 — Feature Editor Page

**Objective:** Build Gherkin editor with validation.

**Tasks:**
1. Install Monaco Editor (`@monaco-editor/react`)
2. Create Gherkin language definition for Monaco
3. Create `pages/Editor/Editor.tsx` - Editor page layout
4. Create `GherkinEditor.tsx` - Monaco editor wrapper
5. Create `ValidationPanel.tsx` - Syntax validation display
6. Create `StepPreview.tsx` - Mapped steps preview
7. Create `RunButton.tsx` - Execute button with config
8. Add debounced validation

**Deliverables:**
- Syntax-highlighted Gherkin editor
- Real-time validation feedback
- Step mapping preview
- Run with configuration modal

**Features:**
- Gherkin syntax highlighting
- Error markers in editor
- Line numbers
- Auto-complete for keywords
- Save to localStorage
- Import from file

---

### Phase 9 — Execution Monitor Page

**Objective:** Build real-time execution tracking.

**Tasks:**
1. Create `hooks/useExecutionPolling.ts` - Status polling hook
2. Create `pages/Execution/Execution.tsx` - Execution page
3. Create `ProgressTracker.tsx` - Overall progress bar
4. Create `StepList.tsx` - Step-by-step status list
5. Create `ActionLog.tsx` - Live action log
6. Create `LivePreview.tsx` - Screenshot preview (optional)
7. Add cancel execution functionality

**Deliverables:**
- Real-time progress updates
- Step-by-step status display
- Cancel capability
- Auto-redirect on completion

**Polling Strategy:**
```typescript
// Poll every 2 seconds while running
// Stop polling when status is completed/failed/cancelled
// Show live step updates
```

---

### Phase 10 — Results Page

**Objective:** Build comprehensive results viewer.

**Tasks:**
1. Create `pages/Results/Results.tsx` - Results page layout
2. Create `ResultsSummary.tsx` - Pass/fail summary
3. Create `ScenarioResult.tsx` - Scenario accordion
4. Create `StepResult.tsx` - Individual step result
5. Create `VideoPlayer.tsx` - Video playback component
6. Create `ScreenshotGallery.tsx` - Screenshot viewer
7. Create `GeneratedCode.tsx` - Spec file viewer
8. Create `ArtifactViewer.tsx` - Artifact tabs

**Deliverables:**
- Complete results visualization
- Video playback
- Screenshot gallery with zoom
- Downloadable artifacts
- Syntax-highlighted generated code

**Features:**
- Expandable scenario results
- Step duration display
- Error messages with stack traces
- Video player with controls
- Screenshot lightbox
- Copy generated code
- Download spec file

---

### Phase 11 — History Page

**Objective:** Build execution history with filtering.

**Tasks:**
1. Create `pages/History/History.tsx` - History page
2. Create `ExecutionTable.tsx` - Sortable table
3. Create `FilterBar.tsx` - Filter controls
4. Create `Pagination.tsx` - Page navigation
5. Add sorting functionality
6. Add bulk actions (delete multiple)

**Deliverables:**
- Paginated execution list
- Filter by status, date
- Sort by columns
- Quick actions per row

**Features:**
- Status filter (all, passed, failed)
- Date range filter
- Search by name
- Sort by date/name/duration
- View/re-run/delete actions

---

### Phase 12 — Settings Page

**Objective:** Build configuration management.

**Tasks:**
1. Create `pages/Settings/Settings.tsx` - Settings page
2. Create `BrowserSettings.tsx` - Browser configuration
3. Create `LLMSettings.tsx` - LLM configuration (display only)
4. Create `DefaultsSettings.tsx` - Default values
5. Create `APISettings.tsx` - API endpoint config
6. Add theme toggle (light/dark)
7. Persist settings to localStorage

**Deliverables:**
- All settings configurable
- Settings persisted
- Theme switching
- Reset to defaults

**Settings:**
```typescript
{
  browser: {
    type: 'chromium' | 'firefox' | 'webkit',
    headless: boolean,
    viewportWidth: number,
    viewportHeight: number
  },
  execution: {
    timeout: number,
    maxRetries: number,
    screenshotOnFailure: boolean,
    recordVideo: boolean,
    traceEnabled: boolean
  },
  api: {
    baseUrl: string
  },
  ui: {
    theme: 'light' | 'dark',
    sidebarCollapsed: boolean
  }
}
```

---

### Phase 13 — Polish & Hardening

**Objective:** Final polish and error handling.

**Tasks:**
1. Add error boundaries to all pages
2. Add loading skeletons
3. Add toast notifications
4. Add keyboard shortcuts
5. Add responsive design fixes
6. Add accessibility improvements
7. Performance optimization (memo, lazy loading)
8. Add PWA support (optional)

**Deliverables:**
- Production-ready application
- Graceful error handling
- Responsive on all devices
- Accessible (WCAG 2.1 AA)

---

### Phase 14 — Testing & Documentation

**Objective:** Add tests and documentation.

**Tasks:**
1. Set up Vitest for unit tests
2. Add tests for services
3. Add tests for stores
4. Add tests for utility functions
5. Set up Playwright for E2E tests
6. Add E2E tests for critical flows
7. Create README with setup instructions
8. Add inline code documentation

**Deliverables:**
- Unit test coverage > 70%
- E2E tests for happy paths
- README documentation
- JSDoc comments

---

## Component Specifications

### StatusBadge Component
```typescript
interface StatusBadgeProps {
  status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped' | 'cancelled';
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

// Colors:
// pending: gray
// running: blue (animated pulse)
// passed: green
// failed: red
// skipped: yellow
// cancelled: orange
```

### ExecutionCard Component
```typescript
interface ExecutionCardProps {
  execution: ExecutionResponse;
  onView: (id: string) => void;
  onRerun: (id: string) => void;
  onDelete: (id: string) => void;
}

// Shows: name, status, duration, pass rate, timestamp
// Actions: View Results, Re-run, Delete
```

### GherkinEditor Component
```typescript
interface GherkinEditorProps {
  value: string;
  onChange: (value: string) => void;
  errors?: ValidationError[];
  readOnly?: boolean;
  height?: string;
}

// Features:
// - Gherkin syntax highlighting
// - Error markers on lines
// - Line numbers
// - Auto-indent
```

### VideoPlayer Component
```typescript
interface VideoPlayerProps {
  src: string;
  poster?: string;
  onError?: () => void;
}

// Features:
// - Play/pause
// - Seek bar
// - Fullscreen
// - Download button
```

---

## API Response Handling

### Standard Response Format
```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}
```

### Error Handling
```typescript
// In api.client.ts interceptor
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized
    }
    if (error.response?.status === 404) {
      // Handle not found
    }
    if (error.response?.status >= 500) {
      // Handle server error
    }
    return Promise.reject(transformError(error));
  }
);
```

---

## Polling Strategy

### Execution Status Polling
```typescript
// hooks/useExecutionPolling.ts
const useExecutionPolling = (executionId: string, enabled: boolean) => {
  const [status, setStatus] = useState<ExecutionStatus | null>(null);
  
  useEffect(() => {
    if (!enabled || !executionId) return;
    
    const poll = async () => {
      const result = await executionService.getStatus(executionId);
      setStatus(result);
      
      // Stop polling if execution is complete
      if (['completed', 'failed', 'cancelled'].includes(result.status)) {
        return;
      }
    };
    
    // Initial fetch
    poll();
    
    // Poll every 2 seconds
    const interval = setInterval(poll, 2000);
    
    return () => clearInterval(interval);
  }, [executionId, enabled]);
  
  return status;
};
```

---

## Environment Variables

```env
# .env.development
VITE_API_BASE_URL=http://localhost:3000
VITE_POLLING_INTERVAL=2000
VITE_APP_NAME=No-Code UI Automation

# .env.production
VITE_API_BASE_URL=/api
VITE_POLLING_INTERVAL=3000
VITE_APP_NAME=No-Code UI Automation
```

---

## What Copilot Should Always Do

1. Follow folder structure exactly
2. Create small, focused components
3. Use TypeScript strictly (no `any`)
4. Match interfaces to backend DTOs
5. Handle loading and error states
6. Make components accessible
7. Use Tailwind for all styling
8. Keep business logic in hooks/services
9. Document complex logic
10. Export from index.ts files

## What Copilot Should Never Do

1. Never put API calls directly in components
2. Never use inline styles
3. Never skip error handling
4. Never create god components
5. Never mix concerns
6. Never skip TypeScript types
7. Never hardcode API URLs
8. Never ignore accessibility
9. Never skip loading states
10. Never commit console.logs

---

## Ready to Start

Confirm this plan, and I will begin with **Phase 1 — Project Setup**.

Each phase will be implemented incrementally with your review before proceeding to the next.
