// API Configuration
export const apiConfig = {
  baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
  pollingInterval: Number(import.meta.env.VITE_POLLING_INTERVAL) || 2000,
  timeout: 30000,
};

export const endpoints = {
  // Feature endpoints
  feature: {
    parse: '/api/feature/parse',
    validateSyntax: '/api/feature/validate-syntax',
  },
  // Execution endpoints
  execution: {
    run: '/api/execution/run',
    status: (id: string) => `/api/execution/${id}/status`,
    details: (id: string) => `/api/execution/${id}`,
    list: '/api/execution/list',
    artifacts: (id: string) => `/api/execution/${id}/artifacts`,
    cancel: (id: string) => `/api/execution/${id}/cancel`,
    delete: (id: string) => `/api/execution/${id}`,
  },
  // Mapping endpoints
  mapping: {
    checkStep: '/api/mapping/check-step',
  },
  // LLM endpoints
  llm: {
    generateSpec: '/api/llm/generate-spec',
    suggestLocator: '/api/llm/suggest-locator',
  },
};
