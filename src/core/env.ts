/**
 * Environment variable loader and validator
 * Loads environment variables from .env files based on NODE_ENV
 */

import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

/**
 * Environment variable schema for validation
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().transform(Number).default('3000'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  MCP_PLAYWRIGHT_ENABLED: z.string().transform((val) => val === 'true').default('true'),
  // Locator resolution mode: 'pattern' for pattern-matching, 'llm' for LLM-based resolution
  LOCATOR_RESOLUTION_MODE: z.enum(['pattern', 'llm']).default('pattern'),
  LLM_PROVIDER: z.string().default('openai'),
  LLM_API_KEY: z.string().optional(),
  LLM_MODEL: z.string().optional(),
  LLM_BASE_URL: z.string().optional(),
  LLM_API_VERSION: z.string().optional(),
  LLM_DEPLOYMENT_NAME: z.string().optional(),
  LLM_MAX_TOKENS: z.string().transform(Number).optional(),
  LLM_TEMPERATURE: z.string().transform(Number).optional(),
  MONGO_URI: z.string().default('mongodb://localhost:27017/no-code-automation'),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Loads environment variables from the appropriate .env file
 * @returns Validated environment variables
 */
export function loadEnv(): Env {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const rootDir = path.resolve(__dirname, '../../');

  // Load base .env file first
  dotenv.config({ path: path.join(rootDir, '.env') });

  // Load environment-specific .env file (overrides base)
  const envFile = `.env.${nodeEnv}`;
  dotenv.config({ path: path.join(rootDir, envFile) });

  // Validate and parse environment variables
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
    throw new Error('Invalid environment variables');
  }

  return parsed.data;
}

/**
 * Singleton instance of validated environment variables
 */
let envInstance: Env | null = null;

/**
 * Gets the singleton environment instance
 * @returns Validated environment variables
 */
export function getEnv(): Env {
  if (!envInstance) {
    envInstance = loadEnv();
  }
  return envInstance;
}
