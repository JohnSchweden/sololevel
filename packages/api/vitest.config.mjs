import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';
export default defineConfig({
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: ['./vitest.setup.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: [
                'node_modules/',
                'dist/',
                '**/*.d.ts',
                '**/*.test.{ts,tsx}',
                '**/*.spec.{ts,tsx}',
                '**/__tests__/**',
                '**/__mocks__/**',
                'vitest.config.mts',
                'vitest.setup.ts',
            ],
            thresholds: {
                global: {
                    branches: 80,
                    functions: 80,
                    lines: 80,
                    statements: 80,
                },
            },
        },
    },
    optimizeDeps: {
        exclude: ['react-native-svg', '@testing-library/react-native'],
        include: ['@my/ui'],
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
});
