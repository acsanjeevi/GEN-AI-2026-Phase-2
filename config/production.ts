/**
 * Production environment configuration
 * Extends default config with production-specific settings
 */

import { defaultConfig } from './default';

export const productionConfig = {
  ...defaultConfig,
  server: {
    ...defaultConfig.server,
    port: 8080,
  },
  logging: {
    ...defaultConfig.logging,
    level: 'info',
    format: 'json',
  },
  mcp: {
    ...defaultConfig.mcp,
    playwright: {
      ...defaultConfig.mcp.playwright,
      timeout: 30000,
    },
  },
};

export type ProductionConfig = typeof productionConfig;
