import '@testing-library/jest-dom'
import { jest } from '@jest/globals'
import type { ReactNode } from 'react'

jest.mock('react-native/Libraries/TurboModule/TurboModuleRegistry', () => ({
  get: () => null,
  getEnforcing: () => ({
    installTurboModule: () => false,
  }),
}))

// Focused Reanimated mock supplying primitives used by VideoControls
jest.mock('react-native-reanimated', () => {
  const React = require('react') as typeof import('react')

  const AnimatedComponents = {
    View: ({ children, style, testID, ...props }: any) =>
      React.createElement('div', { style, 'data-testid': testID, ...props }, children),
    Text: ({ children, style, testID, ...props }: any) =>
      React.createElement('span', { style, 'data-testid': testID, ...props }, children),
    ScrollView: ({ children, style, testID, ...props }: any) =>
      React.createElement(
        'div',
        { style: { overflow: 'auto', ...(style ?? {}) }, 'data-testid': testID, ...props },
        children
      ),
  }

  return {
    __esModule: true,
    default: {
      ...AnimatedComponents,
      createAnimatedComponent: (component: React.ComponentType<any>) => component,
    },
    ...AnimatedComponents,
    createAnimatedComponent: (component: React.ComponentType<any>) => component,
    useAnimatedStyle: () => ({}),
    useAnimatedReaction: () => {
      // No-op in tests to prevent infinite re-renders from side effects
    },
    useSharedValue: (initial: unknown) => ({ value: initial }),
    makeMutable: (initial: unknown) => ({ value: initial }),
    useDerivedValue: (callback: () => unknown) => {
      const result = callback?.()
      return { value: result }
    },
    useAnimatedRef: () => React.createRef(),
    useAnimatedGestureHandler: (handler: any) => handler,
    useAnimatedScrollHandler: (handler: any) => handler,
    runOnJS: (fn: any) => fn,
    runOnUI: (fn: any) => fn,
    withSpring: (value: unknown) => value,
    withTiming: (value: unknown) => value,
    withDelay: (_: number, value: unknown) => value,
    cancelAnimation: jest.fn(),
    interpolate: () => 0,
    Extrapolation: {
      CLAMP: 'clamp',
      EXTEND: 'extend',
    },
    Easing: {
      linear: (t: number) => t,
      ease: (t: number) => t,
      inOut: () => (t: number) => t,
      out: () => (t: number) => t,
    },
    FadeIn: {
      duration: () => ({}) as any,
    },
    FadeOut: {
      duration: () => ({}) as any,
    },
  }
})

// Minimal React Native primitives required by VideoControls
jest.mock('react-native', () => {
  const React = require('react') as typeof import('react')

  const MockPressable = React.forwardRef<HTMLButtonElement, any>(
    ({ onPress, disabled, ...rest }, ref) =>
      React.createElement('button', {
        ref,
        disabled,
        ...rest,
        onClick: disabled ? undefined : onPress,
      })
  )
  MockPressable.displayName = 'MockPressable'

  const MockView = (props: any) => React.createElement('div', props, props.children)
  const MockText = (props: any) => React.createElement('span', props, props.children)
  const MockScrollView = ({ style, children, ...rest }: any) => {
    const scrollStyle: any = {
      overflow: 'auto',
      ...(style ?? {}),
    }
    return React.createElement('div', { ...rest, style: scrollStyle }, children)
  }
  const MockSafeAreaView = (props: any) => React.createElement('div', props, props.children)
  const MockImageBackground = ({ source, style, children, ...rest }: any) => {
    const backgroundStyle: any = {
      ...(style ?? {}),
      ...(source ? { backgroundImage: `url(${source})` } : {}),
    }

    return React.createElement('div', { ...rest, style: backgroundStyle }, children)
  }

  return {
    __esModule: true,
    Platform: {
      OS: 'ios',
      select: (values: Record<string, unknown>) => values.ios ?? values.default,
    },
    View: MockView,
    Pressable: MockPressable,
    Text: MockText,
    TouchableOpacity: 'button',
    ScrollView: MockScrollView,
    Image: 'img',
    ImageBackground: MockImageBackground,
    TextInput: 'input',
    SafeAreaView: MockSafeAreaView,
    StatusBar: {
      setBarStyle: jest.fn(),
      setBackgroundColor: jest.fn(),
    },
    Dimensions: {
      get: jest.fn(() => ({ width: 375, height: 812 })),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    },
    StyleSheet: {
      create: jest.fn((styles) => styles),
      flatten: jest.fn((style) => style),
    },
    TurboModuleRegistry: {
      get: () => null,
      getEnforcing: () => ({ installTurboModule: () => false }),
    },
    PanResponder: {
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
    },
  }
})

// Gesture handler mocks for native tests
jest.mock('react-native-gesture-handler', () => {
  const createChainable = () => {
    const chainable = {
      withRef: () => chainable,
      minDistance: () => chainable,
      maxPointers: () => chainable,
      activeOffsetY: () => chainable,
      activeOffsetX: () => chainable,
      activateAfterLongPress: () => chainable,
      onBegin: () => chainable,
      onStart: () => chainable,
      onUpdate: () => chainable,
      onEnd: () => chainable,
      onFinalize: () => chainable,
      shouldCancelWhenOutside: () => chainable,
      simultaneousWithExternalGesture: () => chainable,
    }
    return chainable
  }

  return {
    GestureHandlerRootView: ({ children }: { children: ReactNode }) => children,
    GestureDetector: ({ children }: { children: ReactNode }) => children,
    Gesture: {
      Pan: createChainable,
      Tap: createChainable,
      Native: () => ({ simultaneousWithExternalGesture: () => ({}) }),
    },
    State: {},
    Directions: {},
  }
})

// BlurView mock
jest.mock('expo-blur', () => {
  const React = require('react') as typeof import('react')
  return {
    BlurView: React.forwardRef((props: any, ref: any) =>
      React.createElement('div', { ...props, ref, 'data-testid': 'blur-view' }, props.children)
    ),
  }
})

// Expo modules core mock
jest.mock('expo-modules-core', () => ({
  NativeModulesProxy: {
    NativeUnimoduleProxy: {},
  },
  Platform: {
    OS: 'ios',
  },
}))

// Expo Image mock
jest.mock('expo-image', () => {
  const React = require('react') as typeof import('react')
  return {
    Image: React.forwardRef((props: any, ref: any) =>
      React.createElement('img', { ...props, ref, src: props.source?.uri || props.source })
    ),
  }
})

// Targeted logging mock (avoid global pollution)
jest.mock('@my/logging', () => ({
  log: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}))

const clearTimers = () => {
  if (jest.isMockFunction(setTimeout)) {
    jest.runOnlyPendingTimers()
    jest.clearAllTimers()
  }
}

afterEach(() => {
  jest.clearAllMocks()
  clearTimers()
})

type TestGlobal = typeof globalThis & {
  __DEV__: boolean
  __reanimatedWorkletInit: jest.Mock
}

const testGlobal = globalThis as TestGlobal

testGlobal.__DEV__ = true
testGlobal.__reanimatedWorkletInit = jest.fn()

// Expo environment setup
if (typeof process !== 'undefined' && process.env) {
  process.env.EXPO_OS = 'ios'
}
