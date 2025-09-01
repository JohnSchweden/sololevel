/**
 * Global Test Setup for UI Package Tests
 * This file should be imported at the top of every test file
 */

// Mock Tamagui components globally
jest.mock('tamagui', () => {
  const _React = require('react')
  const { createTamaguiMock } = require('./mocks')

  return createTamaguiMock()
})

// Mock Lucide icons globally
jest.mock('@tamagui/lucide-icons', () => {
  const _React = require('react')
  const { createIconMocks } = require('./mocks')

  return createIconMocks()
})

// Mock React Native components that might be used in tests
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Alert: {
    alert: jest.fn(),
  },
  Platform: {
    OS: 'web',
    select: jest.fn((obj) => obj.web || obj.default),
  },
}))

// Mock Expo modules
jest.mock('expo-modules-core', () => ({
  requireNativeModule: jest.fn(),
  NativeModulesProxy: {},
}))

jest.mock('expo-camera', () => ({
  Camera: jest.fn(),
  CameraType: {
    back: 'back',
    front: 'front',
  },
}))

jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
  })),
  Link: jest.fn(),
}))

// Global test configuration
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks()
})

afterEach(() => {
  // Clean up after each test
  jest.clearAllTimers()
})
