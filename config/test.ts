/**
 * Test environment configuration
 * Extends default config with test-specific settings
 */

import { defaultConfig } from './default';

export const testConfig = {
  ...defaultConfig,
  server: {
    ...defaultConfig.server,
    port: 3001,
  },
  logging: {
    ...defaultConfig.logging,
    level: 'error',
    format: 'json',
  },
  database: {
    ...defaultConfig.database,
    uri: 'mongodb://localhost:27017/no-code-automation-test',
  },
  mcp: {
    ...defaultConfig.mcp,
    playwright: {
      ...defaultConfig.mcp.playwright,
      timeout: 10000, // Shorter timeout for tests
    },
  },
};

export type TestConfig = typeof testConfig;
