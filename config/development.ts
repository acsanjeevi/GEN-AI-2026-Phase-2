/**
 * Development environment configuration
 * Extends default config with development-specific settings
 */

import { defaultConfig } from './default';

export const developmentConfig = {
  ...defaultConfig,
  server: {
    ...defaultConfig.server,
    port: 3000,
  },
  logging: {
    ...defaultConfig.logging,
    level: 'debug',
    format: 'pretty',
  },
  mcp: {
    ...defaultConfig.mcp,
    playwright: {
      ...defaultConfig.mcp.playwright,
      timeout: 60000, // Longer timeout for development
    },
  },
};

export type DevelopmentConfig = typeof developmentConfig;
