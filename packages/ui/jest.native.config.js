module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: [
    '<rootDir>/src/test-utils/setup.ts',
    '<rootDir>/jest.setup.js',
    '<rootDir>/jest.native.setup.js'
  ],
  testMatch: ['**/*.native.test.(ts|tsx|js)', '**/VideoControls.test.native.tsx'],
  testEnvironment: 'jsdom',

  // Module name mapping for native environment
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

  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': [
      'babel-jest',
      {
        presets: [['babel-preset-expo', { jsxRuntime: 'automatic', reanimated: false }]],
        plugins: ['@babel/plugin-proposal-optional-chaining'],
      },
    ],
  },

  // Native-specific test setup
  setupFiles: ['<rootDir>/jest.native.setup.js'],
}
