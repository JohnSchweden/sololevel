module.exports = {
  preset: 'jest-expo',
  setupFiles: ['<rootDir>/jest.polyfills.js'],
  setupFilesAfterEnv: ['<rootDir>/src/test-utils/setup.ts'],
  cache: true,
  cacheDirectory: '<rootDir>/node_modules/.cache/jest',
  testMatch: ['**/__tests__/**/*.(test|spec).(ts|tsx|js)', '**/*.(test|spec).(ts|tsx|js)'],

  // 🚀 PARALLEL EXECUTION CONFIGURATION (High Impact)
  maxWorkers: 1, // Run sequentially to avoid OOM from large UI suites
  // Alternative options:
  // maxWorkers: 4, // Fixed number of workers
  // maxWorkers: '25%', // Percentage of available cores
  // maxWorkers: 1, // Disable parallel execution
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/__tests__/**',
    '!**/node_modules/**',
    '!**/*.stories.*',
    '!**/types.ts',
  ],
  coveragePathIgnorePatterns: [
    '/__tests__/',
    '\\.stories\\.(ts|tsx)$',
    'types\\.ts$',
    '/node_modules/',
    '/dist/',
  ],
  coverageReporters: ['text', 'html', 'lcov'],
  moduleNameMapper: {
    '^@tamagui/linear-gradient$': '<rootDir>/src/__mocks__/@tamagui/linear-gradient.tsx',
    '^@my/logging$': '<rootDir>/../logging/src/index.ts',
    '^@my/logging/(.*)$': '<rootDir>/../logging/src/$1',
    '^@my/app$': '<rootDir>/../app/index.ts',
    '^@my/app/(.*)$': '<rootDir>/../app/src/$1',
    '^@my/api$': '<rootDir>/../api/src/index.ts',
    '^@my/api/(.*)$': '<rootDir>/../api/src/$1',
    '^@my/config$': '<rootDir>/../config/src/index.ts',
    '^@my/config/(.*)$': '<rootDir>/../config/src/$1',
    '^@my/ui$': '<rootDir>/src/index.ts',
    '^@my/ui/(.*)$': '<rootDir>/src/$1',
    '^@ui/(.*)$': '<rootDir>/src/$1',
    '^@app/provider/(.*)$': '<rootDir>/../app/provider/$1',
    '^@app/features/(.*)$': '<rootDir>/../app/features/$1',
    '^@app/(.*)$': '<rootDir>/../app/src/$1',
    '^@api/(.*)$': '<rootDir>/../api/src/$1',
    '^@config/(.*)$': '<rootDir>/../config/src/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|native-base|react-native-svg)',
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
