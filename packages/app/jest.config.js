module.exports = {
  preset: null,
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.ts'],
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
  },
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?react-native|@react-native|@expo|expo|@unimodules|unimodules|sentry-expo|native-base|react-native-svg|@react-navigation|@shopify/react-native-skia|react-native-reanimated)',
  ],
  testEnvironment: 'jsdom',
}
