import path from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      // Use absolute paths with proper index resolution
      '@my/app': path.resolve(__dirname, '../../packages/app'),
      '@my/api': path.resolve(__dirname, '../../packages/api/src'),
      '@my/ui': path.resolve(__dirname, '../../packages/ui/src'),
      '@my/logging': path.resolve(__dirname, '../../packages/logging/src'),
      '@my/config': path.resolve(__dirname, '../../packages/config/src'),
    },
  },
  test: {
    // Ensure proper jsdom environment for DOM-dependent tests
    environment: 'jsdom',
    setupFiles: ['./test-setup.ts'],
    // Isolate test environments to prevent conflicts
    isolate: true,
    poolOptions: {
      threads: {
        singleThread: true,
        isolate: true,
      },
    },
    // Reset modules and mocks between tests
    clearMocks: true,
    restoreMocks: true,
    mockReset: true,
    // Reasonable timeouts
    testTimeout: 30000,
    hookTimeout: 30000,
    // Globals for better test isolation
    globals: true,
    // Define globals for React
    define: {
      global: 'globalThis',
    },
  },
})

