/// <reference types="jest" />

// Manual mock for react-native-reanimated - handles complex dependencies per @testing-unified.mdc
export const Easing = {
  linear: jest.fn(),
  ease: jest.fn(),
  quad: jest.fn(),
  cubic: jest.fn(),
  sin: jest.fn(),
  circle: jest.fn(),
  exp: jest.fn(),
  bounce: jest.fn(),
  back: jest.fn(),
  elastic: jest.fn(),
}

export const useDerivedValue = jest.fn(() => ({ value: 0 }))
export const useSharedValue = jest.fn(() => ({ value: 0 }))
export const withTiming = jest.fn((value) => value)
export const withSpring = jest.fn((value) => value)
export const withDecay = jest.fn((value) => value)
export const withRepeat = jest.fn((value) => value)
export const withSequence = jest.fn((value) => value)
export const withDelay = jest.fn((value) => value)
export const withClamp = jest.fn((value) => value)
export const interpolate = jest.fn((value) => value)
export const Extrapolate = {
  CLAMP: 'clamp',
  EXTEND: 'extend',
  IDENTITY: 'identity',
}

// Mock the entire reanimated module to prevent worklets dependency
const mockReanimated = {
  Easing,
  useDerivedValue,
  useSharedValue,
  withTiming,
  withSpring,
  withDecay,
  withRepeat,
  withSequence,
  withDelay,
  withClamp,
  interpolate,
  Extrapolate,
}

module.exports = mockReanimated
