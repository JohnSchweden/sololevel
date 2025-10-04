module.exports = {
  preset: 'jest-expo',
  setupFiles: ['<rootDir>/jest.polyfills.js'],
  setupFilesAfterEnv: ['<rootDir>/src/test-utils/setup.ts'],
  cache: true,
  cacheDirectory: '<rootDir>/node_modules/.cache/jest',
  testMatch: ['**/__tests__/**/*.(test|spec).(ts|tsx|js)', '**/*.(test|spec).(ts|tsx|js)'],

  // 🚀 PARALLEL EXECUTION CONFIGURATION (High Impact)
  maxWorkers: '50%', // Use 50% of available cores for parallel execution
  // Alternative options:
  // maxWorkers: 4, // Fixed number of workers
  // maxWorkers: '25%', // Percentage of available cores
  // maxWorkers: 1, // Disable parallel execution
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
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
    '^@my/(.*)$': '<rootDir>/../$1/src',
    '^@ui/(.*)$': '<rootDir>/src/$1',
    '^@app/(.*)$': '<rootDir>/../app/$1',
    '^@api/(.*)$': '<rootDir>/../api/src/$1',
    '^@config/(.*)$': '<rootDir>/../config/src/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)',
  ],
  testEnvironment: 'jsdom',
  testPathIgnorePatterns: [
    '/node_modules/',
    '/test-templates/',
    '\\.native\\..*\\.test\\.(ts|tsx|js)$',
  ],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': [
      'babel-jest',
      {
        presets: [['babel-preset-expo', { jsxRuntime: 'automatic', reanimated: false }]],
        plugins: ['@babel/plugin-proposal-optional-chaining'],
      },
    ],
  },
}
