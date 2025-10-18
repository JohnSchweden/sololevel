import { afterEach, beforeEach, vi } from 'vitest'
import '@testing-library/jest-dom'

// Global test environment setup
beforeEach(() => {
  // Reset all mocks before each test for isolation
  vi.clearAllMocks()
  vi.resetAllMocks()

  // Reset any global state
  if (typeof window !== 'undefined') {
    // Clear any DOM state
    document.body.innerHTML = ''
  }
})

afterEach(() => {
  // Cleanup after each test
  vi.restoreAllMocks()
})

// Environment variables for consistent testing
if (!process.env.NODE_ENV) {
  Object.defineProperty(process.env, 'NODE_ENV', {
    value: 'test',
    writable: true,
  })
}
if (!process.env.TEST_AUTH_ENABLED) {
  process.env.TEST_AUTH_ENABLED = 'false'
}

// Mock @my/app/hooks/useAuth with factory function for better isolation
vi.mock('@my/app/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    isAuthenticated: false,
    loading: false,
    initialized: false,
    user: null,
    session: null,
    userId: null,
    signIn: vi.fn(),
    signOut: vi.fn(),
  })),
}))

// Mock @my/logging
vi.mock('@my/logging', () => ({
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock @my/ui components with React-compatible mocks
vi.mock('@my/ui', () => {
  const React = require('react')
  return {
    YStack: React.forwardRef((props: any, ref: any) =>
      React.createElement('div', { ...props, ref, 'data-testid': 'YStack' })
    ),
    Spinner: React.forwardRef((props: any, ref: any) =>
      React.createElement('div', { ...props, ref, 'data-testid': 'Spinner' }, 'Loading...')
    ),
    H3: React.forwardRef((props: any, ref: any) => React.createElement('h3', { ...props, ref })),
  }
})

// Mock expo-router
vi.mock('expo-router', () => ({
  useRouter: vi.fn(() => ({
    replace: vi.fn(),
    push: vi.fn(),
    back: vi.fn(),
    getPathname: vi.fn(() => '/'),
  })),
  usePathname: vi.fn(() => '/'),
}))

// Mock browser APIs for jsdom compatibility
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Suppress console warnings in tests
const originalConsoleWarn = console.warn
console.warn = (...args) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('useLayoutEffect') ||
      args[0].includes('Warning: ReactDOM.render') ||
      args[0].includes('act()'))
  ) {
    return
  }
  originalConsoleWarn(...args)
}
