/**
 * Jest setup file for React Native tests
 * Configures React Native Testing Library and mocks
 */

import { jest } from '@jest/globals'

// Note: Using regular React Testing Library for native tests (following monorepo pattern)

// Mock React Native specific modules
jest.mock('react-native/Libraries/Utilities/Platform', () => ({
  OS: 'ios',
  select: jest.fn((obj) => obj.ios || obj.default),
}))

jest.mock('react-native/Libraries/Utilities/Dimensions', () => ({
  get: jest.fn(() => ({ width: 375, height: 812 })),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
}))

jest.mock('react-native/Libraries/Interaction/PanResponder', () => ({
  create: jest.fn(() => ({
    panHandlers: {
      onStartShouldSetPanResponder: jest.fn(),
      onMoveShouldSetPanResponder: jest.fn(),
      onPanResponderGrant: jest.fn(),
      onPanResponderMove: jest.fn(),
      onPanResponderRelease: jest.fn(),
      onPanResponderTerminate: jest.fn(),
    },
  })),
}))

// Mock expo modules that might not be available
jest.mock('expo-constants', () => ({
  default: {
    appOwnership: 'expo',
    expoVersion: '49.0.0',
  },
}))

jest.mock('expo-linking', () => ({
  createURL: jest.fn(() => 'exp://localhost:19000'),
}))

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useLocalSearchParams: () => ({}),
  usePathname: () => '/',
}))

// Global test utilities for native tests
global.__DEV__ = true
global.__reanimatedWorkletInit = jest.fn()

// Console error override will be handled in individual test files if needed
