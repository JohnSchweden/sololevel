module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.ts'],
  cache: true,
  cacheDirectory: '<rootDir>/node_modules/.cache/jest',
  // 🚀 PERFORMANCE OPTIMIZATIONS
  maxWorkers: '50%', // Use 50% of available cores for parallel execution
  bail: 1, // Stop on first failure for faster feedback
  moduleNameMapper: {
    '^@my/ui(.*)$': '<rootDir>/../../packages/ui/src$1',
    '^@my/config(.*)$': '<rootDir>/../../packages/config/src$1',
    '^@app$': '<rootDir>/../../packages/app/index.ts',
    '^@app/(.*)$': '<rootDir>/../../packages/app/$1',
    '^app(.*)$': '<rootDir>/../../packages/app$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|react-native-web|@react-native-community|expo|@expo|@tamagui|expo-router|expo-modules-core)/)',
  ],
  testEnvironment: 'jsdom',
  testMatch: [
    '<rootDir>/__tests__/**/*.{test,spec}.{js,jsx,ts,tsx}', // Keep setup files
    '<rootDir>/**/*.{test,spec}.{js,jsx,ts,tsx}', // Add co-located tests
    '!<rootDir>/node_modules/**', // Exclude node_modules
  ],
}
