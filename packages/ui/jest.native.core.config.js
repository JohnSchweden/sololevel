module.exports = {
  preset: 'jest-expo',
  displayName: 'ui:native-core',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/test-utils/setup.native.core.ts'],
  testMatch: ['**/*.native.core.test.(ts|tsx)'],
  moduleNameMapper: {
    '^@my/(.*)$': '<rootDir>/../$1/src',
    '^@ui/(.*)$': '<rootDir>/src/$1',
    '^@app/(.*)$': '<rootDir>/../app/src/$1',
    '^@api/(.*)$': '<rootDir>/../api/src/$1',
    '^@config/(.*)$': '<rootDir>/../config/src/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|react-native-reanimated)',
  ],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': [
      'babel-jest',
      {
        presets: [['babel-preset-expo', { jsxRuntime: 'automatic', reanimated: true }]],
      },
    ],
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/__tests__/**',
    '!**/node_modules/**',
  ],
}
