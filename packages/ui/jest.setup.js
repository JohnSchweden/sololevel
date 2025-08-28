import '@testing-library/jest-native/extend-expect'
import '@testing-library/jest-dom'

// Mock window.matchMedia for Tamagui
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: jest.fn().mockReturnValue({
    top: 44,
    right: 0,
    bottom: 34,
    left: 0,
  }),
  SafeAreaProvider: ({ children }) => children,
  SafeAreaView: ({ children }) => children,
}))

// Mock react-native-svg
jest.mock('react-native-svg', () => {
  const React = require('react')
  const mockComponent = (name) =>
    React.forwardRef((props, ref) =>
      React.createElement('div', { ...props, ref, 'data-testid': name })
    )

  return {
    Svg: mockComponent('svg'),
    Circle: mockComponent('circle'),
    Ellipse: mockComponent('ellipse'),
    G: mockComponent('g'),
    Text: mockComponent('text'),
    TSpan: mockComponent('tspan'),
    TextPath: mockComponent('textPath'),
    Path: mockComponent('path'),
    Polygon: mockComponent('polygon'),
    Polyline: mockComponent('polyline'),
    Line: mockComponent('line'),
    Rect: mockComponent('rect'),
    Use: mockComponent('use'),
    Image: mockComponent('image'),
    Symbol: mockComponent('symbol'),
    Defs: mockComponent('defs'),
    LinearGradient: mockComponent('linearGradient'),
    RadialGradient: mockComponent('radialGradient'),
    Stop: mockComponent('stop'),
    ClipPath: mockComponent('clipPath'),
    Pattern: mockComponent('pattern'),
    Mask: mockComponent('mask'),
  }
})

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const View = require('react-native-web').View
  return {
    default: {
      View: View,
      Text: require('react-native-web').Text,
      Image: require('react-native-web').Image,
      ScrollView: require('react-native-web').ScrollView,
      createAnimatedComponent: (component) => component,
    },
    Easing: {
      linear: jest.fn(),
      ease: jest.fn(),
      quad: jest.fn(),
      cubic: jest.fn(),
    },
    runOnJS: (fn) => fn,
    runOnUI: (fn) => fn,
    useSharedValue: (val) => ({ value: val }),
    useAnimatedStyle: (fn) => fn(),
    useAnimatedGestureHandler: jest.fn(),
    useAnimatedRef: jest.fn(),
    useDerivedValue: (fn) => ({ value: fn() }),
    interpolate: jest.fn(),
    withTiming: (val) => val,
    withSpring: (val) => val,
    withDecay: (val) => val,
    withRepeat: (val) => val,
    cancelAnimation: jest.fn(),
    measure: jest.fn(),
    Extrapolate: {
      EXTEND: 'extend',
      CLAMP: 'clamp',
      IDENTITY: 'identity',
    },
  }
})
