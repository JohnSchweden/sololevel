// Vitest setup for Node.js environment
import { vi } from 'vitest'

// Mock environment variables for consistent testing
process.env.TEST_AUTH_ENABLED = 'false'
process.env.TEST_AUTH_EMAIL = 'test@example.com'
process.env.TEST_AUTH_PASSWORD = 'test-password'
process.env.SUPABASE_URL = 'https://test.supabase.co'
process.env.SUPABASE_ANON_KEY = 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'

if (!process.env.NODE_ENV) {
  Object.defineProperty(process.env, 'NODE_ENV', {
    value: 'test',
    writable: true,
  })
}

// Suppress console warnings for tests
const originalWarn = console.warn
console.warn = (...args) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('useLayoutEffect') || args[0].includes('Warning: ReactDOM.render'))
  ) {
    return
  }
  originalWarn(...args)
}

// Global logger mocking - silent by default, can be overridden in individual tests
vi.mock('@my/logging', () => ({
  log: {
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
  },
  logger: {
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
  },
}))
