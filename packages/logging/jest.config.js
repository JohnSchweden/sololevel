module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  cache: true,
  cacheDirectory: '<rootDir>/node_modules/.cache/jest',
  // 🚀 PERFORMANCE OPTIMIZATIONS
  maxWorkers: '50%', // Use 50% of available cores for parallel execution
  bail: 1, // Stop on first failure for faster feedback
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts'],
  setupFilesAfterEnv: [],
  moduleFileExtensions: ['ts', 'js'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json',
    },
  },
}
