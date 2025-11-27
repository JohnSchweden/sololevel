module.exports = {
  preset: null,
  setupFilesAfterEnv: ['<rootDir>/test-utils/setup.ts'],
  cache: true,
  cacheDirectory: '<rootDir>/node_modules/.cache/jest',
  // 🚀 PERFORMANCE OPTIMIZATIONS
  maxWorkers: '50%', // Use 50% of available cores for parallel execution
  bail: 1, // Stop on first failure for faster feedback
  globals: {
    __DEV__: true,
  },
  testMatch: [
    '**/__tests__/**/*.(test|spec).(ts|tsx|js)',
    '**/*.(test|spec).(ts|tsx|js)',
    '**/integration/**/*.(test|spec).(ts|tsx|js)',
  ],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { configFile: require.resolve('./babel.config.js') }],
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    'features/**/*.{ts,tsx}',
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
    '^@ui/(.*)$': '<rootDir>/../ui/src/$1',
    '^@app/(.*)$': '<rootDir>/$1',
    '^@api/(.*)$': '<rootDir>/../api/src/$1',
    '^@config/(.*)$': '<rootDir>/../config/src/$1',
    '^@my/ui/src/(.*)$': '<rootDir>/../ui/src/$1', // Handle @my/ui/src/... imports
    '^@my/ui/(.*)$': '<rootDir>/../ui/src/$1',
    '^@my/app/(.*)$': '<rootDir>/$1',
    '^@my/api/(.*)$': '<rootDir>/../api/src/$1',
    '^@my/config/(.*)$': '<rootDir>/../config/src/$1',
    '^@my/logging$': '<rootDir>/../logging/src/index.ts',
    '^@my/logging/(.*)$': '<rootDir>/../logging/src/$1',
    'react-native-compressor': '<rootDir>/__mocks__/react-native-compressor.ts',
    'expo-video-thumbnails': '<rootDir>/__mocks__/expo-video-thumbnails.ts',
  },
  transformIgnorePatterns: [
    // POST-MVP: @shopify/react-native-skia removed (pose detection feature)
    'node_modules/(?!(jest-)?react-native|@react-native|@expo|expo|@unimodules|unimodules|native-base|react-native-svg|@react-navigation|react-native-reanimated)',
  ],
  testEnvironment: 'jsdom',
}
