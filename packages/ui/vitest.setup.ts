import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock browser APIs
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

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Suppress console warnings for tests
const originalWarn = console.warn
console.warn = (...args) => {
  // Suppress specific warnings that are expected in test environment
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('useLayoutEffect') || args[0].includes('Warning: ReactDOM.render'))
  ) {
    return
  }
  originalWarn(...args)
}
