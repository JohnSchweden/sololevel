module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  cache: true,
  cacheDirectory: '<rootDir>/node_modules/.cache/jest',
  testMatch: ['**/__tests__/**/*.(test|spec).(ts|tsx|js)', '**/*.(test|spec).(ts|tsx|js)'],
  moduleNameMapper: {
    '^@my/config/(.*)$': '<rootDir>/src/$1',
    '^react-native-mmkv$': '<rootDir>/src/__tests__/__mocks__/react-native-mmkv.ts',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/__tests__/**',
    '!**/node_modules/**',
  ],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.json',
      },
    ],
  },
}
