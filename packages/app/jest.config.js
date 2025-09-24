module.exports = {
  preset: null,
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.ts'],
  cache: true,
  cacheDirectory: '<rootDir>/node_modules/.cache/jest',
  // 🚀 PERFORMANCE OPTIMIZATIONS
  maxWorkers: '50%', // Use 50% of available cores for parallel execution
  bail: 1, // Stop on first failure for faster feedback
  globals: {
    __DEV__: true,
  },
  testMatch: ['**/__tests__/**/*.(test|spec).(ts|tsx|js)', '**/*.(test|spec).(ts|tsx|js)'],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { configFile: require.resolve('./babel.config.js') }],
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    'features/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/__tests__/**',
    '!**/node_modules/**',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  moduleNameMapper: {
    '^@ui/(.*)$': '<rootDir>/../ui/src/$1',
    '^@app/(.*)$': '<rootDir>/$1',
    '^@api/(.*)$': '<rootDir>/../api/src/$1',
    '^@config/(.*)$': '<rootDir>/../config/src/$1',
    '^@my/ui/(.*)$': '<rootDir>/../ui/src/$1',
    '^@my/app/(.*)$': '<rootDir>/$1',
    '^@my/api/(.*)$': '<rootDir>/../api/src/$1',
    '^@my/config/(.*)$': '<rootDir>/../config/src/$1',
    'react-native-compressor': '<rootDir>/__mocks__/react-native-compressor.ts',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?react-native|@react-native|@expo|expo|@unimodules|unimodules|sentry-expo|native-base|react-native-svg|@react-navigation|@shopify/react-native-skia|react-native-reanimated)',
  ],
  testEnvironment: 'jsdom',
}
