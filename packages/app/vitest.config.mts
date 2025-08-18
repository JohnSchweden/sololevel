import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
  server: {
    deps: {
      inline: ['expo-router', 'expo-constants', 'expo-linking', 'react-native-svg', 'react-native-svg/*']
    },
  },
  resolve: {
    alias: [
      { find: 'react-native', replacement: 'react-native-web' },
      { find: 'react-native-svg', replacement: resolve(__dirname, './__mocks__/react-native-svg.ts') },
      { find: '@my/ui', replacement: resolve(__dirname, '../ui/src') },
      { find: '@my/config', replacement: resolve(__dirname, '../config/src') },
      { find: 'app', replacement: resolve(__dirname, '.') },
    ],
  },
  define: {
    global: 'globalThis',
  },
})
// TEMPORARY FIX: Exclude react-native-svg from test processing due to React 19 compatibility issues
// Issue: react-native-svg@15.12.1 has TypeScript syntax errors with React 19
// Solution: Add to inline deps to prevent processing until react-native-svg supports React 19
// TODO: Remove this exclusion when react-native-svg releases React 19 compatible version
