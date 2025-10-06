import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    server: {
      deps: {
        inline: ['react-native-svg'],
      },
    },
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html', 'lcov'],
            include: ['src/**/*.{ts,tsx}'],
            exclude: [
                'node_modules/',
                'dist/',
                '**/*.d.ts',
                '**/*.test.{ts,tsx}',
                '**/*.spec.{ts,tsx}',
                '**/__tests__/**',
                '**/__mocks__/**',
                '**/*.stories.*',
                '**/types.ts',
                'vitest.config.mts',
                'vitest.setup.ts',
            ],
        },
  },
  optimizeDeps: {
    exclude: ['react-native-svg', '@testing-library/react-native'],
    include: ['@my/ui'],
  },
  ssr: {
    noExternal: ['react-native-svg'],
  },
  resolve: {
    alias: [
      { find: 'react-native', replacement: 'react-native-web' },
      { find: '@my/ui', replacement: resolve(__dirname, '../ui/src') },
    ],
  },
  define: {
    global: 'globalThis',
  },
})
