/// <reference types="jest" />

// Mock worklets functionality for Reanimated
export const runOnUI = jest.fn((fn) => fn)
export const runOnJS = jest.fn((fn) => fn)
export const createWorklet = jest.fn((fn) => fn)
export const useWorkletCallback = jest.fn((fn) => fn)
export const useWorkletValue = jest.fn(() => ({ value: 0 }))
export const useWorkletDerivedValue = jest.fn(() => ({ value: 0 }))
export const useWorkletSharedValue = jest.fn(() => ({ value: 0 }))
export const useWorkletAnimatedStyle = jest.fn(() => ({}))
export const withWorkletTiming = jest.fn()
export const withWorkletSpring = jest.fn()
export const withWorkletDecay = jest.fn()
export const withWorkletRepeat = jest.fn()
export const withWorkletSequence = jest.fn()
export const withWorkletDelay = jest.fn()
export const withWorkletClamp = jest.fn()
export const workletInterpolate = jest.fn()
export const WorkletExtrapolate = {
  CLAMP: 'clamp',
  EXTEND: 'extend',
  IDENTITY: 'identity',
}

// Mock the version check that Reanimated does
export const version = '0.4.0'
