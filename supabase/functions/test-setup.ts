/**
 * Global test setup for Supabase Edge Functions
 * Mocks Deno environment for Node.js testing
 */

import { vi } from 'vitest'

// Mock Deno global
Object.defineProperty(globalThis, 'Deno', {
  value: {
    env: {
      get: (key: string): string | undefined => {
        // Return test environment variables
        const testEnv: Record<string, string> = {
          GEMINI_API_KEY: 'test-gemini-api-key',
          SUPABASE_ENV_GEMINI_API_KEY: 'test-supabase-gemini-api-key',
          GEMINI_MODEL: 'gemini-1.5-pro',
          GEMINI_FILES_MAX_MB: '20',
          AI_ANALYSIS_MODE: 'mock',
          SUPABASE_URL: 'https://test.supabase.co',
          SUPABASE_ANON_KEY: 'test-anon-key',
          SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
        }
        return testEnv[key]
      },
    },
  },
  configurable: true,
  writable: true,
})

// Mock fetch for tests
globalThis.fetch = vi.fn() as any
