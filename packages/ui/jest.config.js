module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@ui/(.*)$': '<rootDir>/src/$1',
    '^@app/(.*)$': '<rootDir>/../app/$1',
    '^@config/(.*)$': '<rootDir>/../config/src/$1',
    '^react-native$': 'react-native-web',
    '^react-native/(.*)$': 'react-native-web/$1',
    '^expo-camera$': '<rootDir>/jest.setup.js',
    '^expo-modules-core$': '<rootDir>/jest.setup.js',
    '^expo-router$': '<rootDir>/jest.setup.js',
    '^@tamagui/config/v4$': '<rootDir>/jest.setup.js',
    '^@tamagui/core$': '<rootDir>/__mocks__/@tamagui/core.js',
    '^tamagui$': '<rootDir>/__mocks__/tamagui.js',
    '^@tamagui/button$': '<rootDir>/jest.setup.js',
    '^@tamagui/font-inter$': '<rootDir>/jest.setup.js',
    '^@my/config$': '<rootDir>/jest.setup.js',
  },
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': [
      'babel-jest',
      {
        presets: [
          ['@babel/preset-env', { targets: { node: 'current' } }],
          '@babel/preset-react',
          '@babel/preset-typescript',
        ],
      },
    ],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|react-native-web|@tamagui|tamagui)/)',
  ],
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{test,spec}.{js,jsx,ts,tsx}',
    '<rootDir>/src/**/*.{test,spec}.{js,jsx,ts,tsx}',
  ],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.{js,jsx,ts,tsx}',
    '!src/**/__tests__/**',
    '!src/**/*.test.{js,jsx,ts,tsx}',
    '!src/**/*.spec.{js,jsx,ts,tsx}',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  globals: {
    __DEV__: true,
  },
}
