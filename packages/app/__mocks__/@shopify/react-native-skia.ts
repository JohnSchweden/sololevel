/// <reference types="jest" />

// Mock all Skia components as simple View components
export const Blur = 'Blur'
export const Canvas = 'Canvas'
export const Circle = 'Circle'
export const Group = 'Group'
export const Image = 'Image'
export const LinearGradient = 'LinearGradient'
export const Path = 'Path'
export const Rect = 'Rect'
export const RoundedRect = 'RoundedRect'
export const Text = 'Text'
export const useValue = jest.fn(() => ({ value: 0 }))
export const useComputedValue = jest.fn(() => ({ value: 0 }))
export const useSharedValueEffect = jest.fn()
export const runOnJS = jest.fn((fn) => fn)
export const useDerivedValue = jest.fn(() => ({ value: 0 }))
export const useAnimatedStyle = jest.fn(() => ({}))
export const withTiming = jest.fn()
export const withSpring = jest.fn()
export const withDecay = jest.fn()
export const withRepeat = jest.fn()
export const withSequence = jest.fn()
export const withDelay = jest.fn()
export const withClamp = jest.fn()
export const interpolate = jest.fn()
export const Extrapolate = {
  CLAMP: 'clamp',
  EXTEND: 'extend',
  IDENTITY: 'identity',
}
