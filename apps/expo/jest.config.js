module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.ts'],
  moduleNameMapper: {
    '^@my/ui(.*)$': '<rootDir>/../../packages/ui/src$1',
    '^@my/config(.*)$': '<rootDir>/../../packages/config/src$1',
    '^app(.*)$': '<rootDir>/../../packages/app$1',
    '^react-native$': 'react-native-web',
  },
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        types: ['jest', 'node']
      }
    }],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|react-native-web|@react-native-community|expo|@expo|@tamagui)/)'
  ],
  testMatch: [
    '<rootDir>/__tests__/**/*.{test,spec}.{js,jsx,ts,tsx}'
  ]
}
