module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.ts'],
  moduleNameMapper: {
    '^@my/ui(.*)$': '<rootDir>/../../packages/ui/src$1',
    '^@my/config(.*)$': '<rootDir>/../../packages/config/src$1',
    '^app(.*)$': '<rootDir>/../../packages/app$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|react-native-web|@react-native-community|expo|@expo|@tamagui|expo-router|expo-modules-core)/)',
  ],
  testMatch: ['<rootDir>/__tests__/**/*.{test,spec}.{js,jsx,ts,tsx}'],
}
