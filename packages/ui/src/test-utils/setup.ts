// Mock react-native-gesture-handler for cross-platform testing
jest.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: ({ children }: { children: React.ReactNode }) => children,
  PanGestureHandler: ({ children }: { children: React.ReactNode }) => children,
  TapGestureHandler: ({ children }: { children: React.ReactNode }) => children,
  NativeViewGestureHandler: ({ children }: { children: React.ReactNode }) => children,
  GestureDetector: ({ children }: { children: React.ReactNode }) => children,
  Gesture: {
    Pan: () => {
      const gesture = {
        withRef: () => gesture,
        minDistance: () => gesture,
        maxPointers: () => gesture,
        activeOffsetY: () => gesture,
        activeOffsetX: () => gesture,
        activateAfterLongPress: () => gesture,
        onBegin: () => gesture,
        onStart: () => gesture,
        onUpdate: () => gesture,
        onEnd: () => gesture,
        onFinalize: () => gesture,
        shouldCancelWhenOutside: () => gesture,
        simultaneousWithExternalGesture: () => gesture,
      }
      return gesture
    },
    Tap: () => {
      const gesture = {
        withRef: () => gesture,
        minDistance: () => gesture,
        onEnd: () => gesture,
        simultaneousWithExternalGesture: () => gesture,
      }
      return gesture
    },
    Native: () => ({
      simultaneousWithExternalGesture: () => ({}),
    }),
  },
  State: {},
  Directions: {},
}))
import { jest } from '@jest/globals'
import React from 'react'

// Setup jest-dom for additional matchers
import '@testing-library/jest-dom'

// Note: Do not enable fake timers globally; enable per-suite when needed.
afterEach(() => {
  if (jest.isMockFunction(setTimeout)) {
    if (jest.getTimerCount() > 0) {
      jest.runOnlyPendingTimers()
    }
    jest.clearAllTimers()
  }
})

// Create Pressable mock outside jest.mock
interface MockPressableProps {
  onPress?: () => void
  onPressIn?: () => void
  onPressOut?: () => void
  children?: React.ReactNode
  [key: string]: any
}

const MockPressable = React.forwardRef<any, MockPressableProps>((props, ref) => {
  const {
    onPress,
    onPressIn,
    onPressOut,
    onLongPress,
    onStartShouldSetPanResponder,
    onMoveShouldSetPanResponder,
    onPanResponderGrant,
    onPanResponderMove,
    onPanResponderRelease,
    onPanResponderTerminate,
    children,
    testID,
    accessibilityRole,
    accessibilityLabel,
    accessibilityHint,
    accessibilityState,
    ...otherProps
  } = props

  const cleanedProps = { ...otherProps }
  delete (cleanedProps as Record<string, unknown>).testID
  delete (cleanedProps as Record<string, unknown>).accessibilityRole
  delete (cleanedProps as Record<string, unknown>).accessibilityLabel
  delete (cleanedProps as Record<string, unknown>).accessibilityHint
  delete (cleanedProps as Record<string, unknown>).accessibilityState
  delete (cleanedProps as Record<string, unknown>).onLongPress
  delete (cleanedProps as Record<string, unknown>).onStartShouldSetPanResponder
  delete (cleanedProps as Record<string, unknown>).onMoveShouldSetPanResponder
  delete (cleanedProps as Record<string, unknown>).onPanResponderGrant
  delete (cleanedProps as Record<string, unknown>).onPanResponderMove
  delete (cleanedProps as Record<string, unknown>).onPanResponderRelease
  delete (cleanedProps as Record<string, unknown>).onPanResponderTerminate

  // Handle render prop pattern - children can be a function
  const renderedChildren = typeof children === 'function' ? children({ pressed: false }) : children

  return React.createElement(
    'div',
    {
      ...cleanedProps,
      ref,
      onClick: props.disabled ? undefined : onPress,
      onMouseDown: props.disabled ? undefined : onPressIn,
      onMouseUp: props.disabled ? undefined : onPressOut,
      onMouseLeave: onLongPress,
      style: { cursor: props.disabled ? 'not-allowed' : 'pointer', ...props.style },
      'data-testid': testID || 'Pressable',
      role: accessibilityRole || 'button',
      'aria-label': accessibilityLabel,
      'aria-describedby': accessibilityHint,
      'aria-disabled': accessibilityState?.disabled || props.disabled,
      'aria-pressed': accessibilityState?.pressed,
      tabIndex: props.disabled ? -1 : 0,
    },
    renderedChildren
  )
})

// Mock @tamagui/sheet for Select native adapter
jest.mock('@tamagui/sheet', () => {
  const React = require('react')
  return {
    Sheet: Object.assign(
      React.forwardRef((props: any) =>
        React.createElement('div', { ...props, 'data-testid': 'sheet' }, props.children)
      ),
      {
        Frame: (props: any) =>
          React.createElement('div', { ...props, 'data-testid': 'sheet-frame' }, props.children),
        ScrollView: (props: any) =>
          React.createElement(
            'div',
            { ...props, 'data-testid': 'sheet-scrollview' },
            props.children
          ),
        Overlay: (props: any) =>
          React.createElement('div', { ...props, 'data-testid': 'sheet-overlay' }),
      }
    ),
  }
})

// Mock Tamagui components globally
jest.mock('tamagui', () => {
  require('react')
  const { createTamaguiMock } = require('./mocks')

  return createTamaguiMock()
})

// Mock @tamagui/core to provide styled function
jest.mock('@tamagui/core', () => {
  require('react')
  const { createTamaguiMock, createMockStyled } = require('./mocks')
  const tamaguiMock = createTamaguiMock()

  return {
    ...tamaguiMock,
    styled: createMockStyled(),
  }
})

// Mock Lucide icons globally - using manual mock at packages/ui/__mocks__/@tamagui/lucide-icons.tsx
// Jest automatically uses manual mocks in __mocks__ directory

// Mock React Native components that might be used in tests
jest.mock('react-native', () => {
  const React = require('react')

  const MockView = (props: any) => React.createElement('div', props, props.children)
  const MockText = (props: any) => React.createElement('span', props, props.children)
  const MockScrollView = (props: any) => React.createElement('div', props, props.children)
  const MockSafeAreaView = (props: any) => React.createElement('div', props, props.children)
  const MockImageBackground = (props: any) =>
    React.createElement(
      'div',
      { ...props, style: { ...props.style, backgroundImage: `url(${props.source})` } },
      props.children
    )

  return {
    Alert: {
      alert: jest.fn(),
    },
    Platform: {
      OS: 'web',
      Version: 'jest',
      select: jest.fn((obj: any) => obj.web || obj.default),
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
    Easing: {
      bezier: jest.fn(() => jest.fn()),
      linear: jest.fn(() => jest.fn()),
      ease: jest.fn(() => jest.fn()),
    },
    View: MockView,
    Text: MockText,
    TouchableOpacity: 'button',
    Pressable: MockPressable,
    ScrollView: MockScrollView,
    FlatList: 'div',
    Image: 'img',
    ImageBackground: MockImageBackground,
    TextInput: 'input',
    SafeAreaView: MockSafeAreaView,
    StatusBar: {
      setBarStyle: jest.fn(),
      setBackgroundColor: jest.fn(),
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

// Mock Expo Camera
jest.mock('expo-camera', () => {
  const React = require('react')
  const { View } = require('react-native')
  return {
    CameraType: {
      front: 'front',
      back: 'back',
    },
    CameraMode: {
      video: 'video',
      picture: 'picture',
    },
    CameraRatio: {
      '16:9': '16:9',
      '4:3': '4:3',
    },
    CameraView: React.forwardRef((props: any, ref: any) => {
      // Create a mock camera ref that the component can use
      React.useRef({
        recordAsync: jest.fn(() => {
          return new Promise((resolve, reject) => {
            if (!props.permissionGranted) {
              reject(new Error('Camera permission not granted'))
              return
            }
            // Use fake timers - resolve immediately and advance time
            resolve({
              uri: 'file:///mock/recorded_video.mp4',
              duration: 5000, // 5 seconds in milliseconds
            })
            jest.advanceTimersByTime(100)
          })
        }),
        startRecording: jest.fn((options: any) => {
          return new Promise((resolve, reject) => {
            if (!props.permissionGranted) {
              reject(new Error('Camera permission not granted'))
              return
            }
            // Use fake timers - call callback immediately and advance time
            if (options?.onRecordingFinished) {
              options.onRecordingFinished({
                path: 'file:///mock/recorded_video.mp4',
                duration: 5000, // 5 seconds
              })
            }
            resolve({
              path: 'file:///mock/recorded_video.mp4',
              duration: 5000,
            })
            jest.advanceTimersByTime(100)
          })
        }),
        stopRecording: jest.fn(() => Promise.resolve()),
        pauseRecording: jest.fn(() => Promise.resolve()),
        resumeRecording: jest.fn(() => Promise.resolve()),
        takePicture: jest.fn(() => Promise.resolve()),
        getCamera: jest.fn(() => ({ zoom: props.zoom || 1 })),
        toggleFacing: jest.fn(() => Promise.resolve()),
      })

      // Simulate CameraView component that exposes methods via ref
      React.useImperativeHandle(ref, () => ({
        startRecording: jest.fn(async (): Promise<void> => {
          if (!props.permissionGranted) {
            throw new Error('Camera permission not granted')
          }
          // Using fake timers - recording completion is handled elsewhere
          // This would normally be called by the actual camera implementation
          // For testing, we simulate the onRecordingFinished callback via fake timers
        }),
        stopRecording: jest.fn(() => Promise.resolve()),
        recordAsync: jest.fn((options: any) => {
          return new Promise((resolve, reject) => {
            if (!props.permissionGranted) {
              reject(new Error('Camera permission not granted'))
              return
            }
            // Use fake timers - call callback immediately and advance time
            if (options?.onRecordingFinished) {
              options.onRecordingFinished({
                uri: 'file:///mock/recorded_video.mp4',
                duration: 5000, // 5 seconds
              })
            }
            resolve({
              uri: 'file:///mock/recorded_video.mp4',
              duration: 5000,
            })
            jest.advanceTimersByTime(100)
          })
        }),
        pauseRecording: jest.fn(() => Promise.resolve()),
        resumeRecording: jest.fn(() => Promise.resolve()),
        takePicture: jest.fn(() => Promise.resolve()),
        getCamera: jest.fn(() => ({ zoom: props.zoom || 1 })),
        toggleFacing: jest.fn(() => Promise.resolve()),
        setZoom: jest.fn(),
        getZoom: jest.fn(() => props.zoom || 1),
      }))

      return React.createElement(View, { testID: 'expo-camera', ...props }, props.children)
    }),
    requestCameraPermissionsAsync: jest.fn(() =>
      Promise.resolve({ granted: true, status: 'granted' })
    ),
    getCameraPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true, status: 'granted' })),
  }
})

// Mock react-native-vision-camera
jest.mock('react-native-vision-camera', () => {
  const React = require('react')
  const { View } = require('react-native')
  return {
    useCameraDevice: jest.fn(),
    useCameraFormat: jest.fn(() => ({ videoStabilizationModes: ['standard'] })),
    useResizePlugin: jest.fn(),
    useFrameProcessor: jest.fn(),
    Camera: React.forwardRef((props: any, ref: any) => {
      // Expose mock methods via ref
      React.useImperativeHandle(ref, () => ({
        startRecording: jest.fn((options: any) => {
          // Simulate recording and calling the callback
          if (props.isActive) {
            // Use fake timers - call callback immediately and advance time
            options.onRecordingFinished({
              path: 'file:///mock/recorded_video.mp4',
              duration: 5000,
            })
            jest.advanceTimersByTime(100)
          }
        }),
        stopRecording: jest.fn(),
        pauseRecording: jest.fn(),
        resumeRecording: jest.fn(),
      }))

      // Render a placeholder
      return React.createElement(View, { testID: 'vision-camera', ...props })
    }),
    runAsync: jest.fn((f: any) => f()),
    FrameProcessor: {
      Worklets: { createRunInJsFn: jest.fn(), createSharedValue: jest.fn() },
    },
  }
})

// Mock Expo Router
jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
  })),
  Link: jest.fn(),
}))

// Mock additional modules that might be used
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}))

// Mock react-native-worklets-core BEFORE reanimated
jest.mock('react-native-worklets-core', () => ({
  Worklets: {
    createRunInJsFn: jest.fn(),
    createSharedValue: jest.fn(),
    runOnUI: jest.fn(),
  },
  useSharedValue: jest.fn(),
}))

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const React = require('react')
  const Animated = {
    View: ({ children, style, testID, ...props }: any) =>
      React.createElement('div', { style, 'data-testid': testID, ...props }, children),
    Text: ({ children, style, testID, ...props }: any) =>
      React.createElement('span', { style, 'data-testid': testID, ...props }, children),
    ScrollView: ({ children, style, testID, ...props }: any) =>
      React.createElement(
        'div',
        { style: { ...style, overflow: 'auto' }, 'data-testid': testID, ...props },
        children
      ),
    createAnimatedComponent: (component: React.ComponentType<any>) => component,
  }
  return {
    __esModule: true,
    default: Animated,
    useAnimatedStyle: () => ({}),
    useAnimatedReaction: () => {},
    useSharedValue: (initialValue: any) => ({
      value: initialValue,
    }),
    useAnimatedRef: () => React.useRef(null),
    useAnimatedGestureHandler: (handler: any) => handler,
    useAnimatedScrollHandler: (handler: any) => handler,
    withSpring: (targetValue: any) => targetValue,
    withTiming: (targetValue: any) => targetValue,
    interpolate: (value: any, inputRange: any, outputRange: any) => {
      if (inputRange.length !== 2 || outputRange.length !== 2) return outputRange[0]
      const [inMin, inMax] = inputRange
      const [outMin, outMax] = outputRange
      const ratio = (value - inMin) / (inMax - inMin)
      return outMin + ratio * (outMax - outMin)
    },
    Extrapolation: {
      CLAMP: 'clamp',
      EXTEND: 'extend',
    },
    runOnJS: (fn: any) => fn,
    runOnUI: (fn: any) => fn,
    createAnimatedStyle: () => ({}),
    Easing: {
      linear: (t: number) => t,
      easeIn: (t: number) => t * t,
      easeOut: (t: number) => (1 - Math.cos(t * Math.PI)) / 2,
      bezier: (_x1: number, _y1: number, _x2: number, _y2: number) => (t: number) => t,
    },
    Worklets: {
      createRunInJsFn: jest.fn(),
      createSharedValue: jest.fn(),
      runOnUI: jest.fn(),
    },
  }
})

// Mock react-native-video
jest.mock('react-native-video', () => 'Video')

// Mock expo-image-picker
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  MediaTypeOptions: {
    All: 'All',
    Images: 'Images',
    Videos: 'Videos',
  },
}))

// Mock expo-document-picker
jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(),
}))

// Mock expo-blur (manual mock in __mocks__/expo-blur.tsx)
jest.mock('expo-blur')

// Mock @react-native-masked-view/masked-view
jest.mock('@react-native-masked-view/masked-view', () => {
  const React = require('react')
  return React.forwardRef((props: any, ref: any) =>
    React.createElement('div', { ...props, ref, 'data-testid': 'masked-view' }, props.children)
  )
})

// Mock @tamagui/linear-gradient
jest.mock('@tamagui/linear-gradient', () => {
  const React = require('react')
  return {
    LinearGradient: React.forwardRef((props: any, ref: any) =>
      React.createElement(
        'div',
        { ...props, ref, 'data-testid': 'linear-gradient' },
        props.children
      )
    ),
  }
})

// Mock expo-modules-core
jest.mock('expo-modules-core', () => ({
  createPermissionHook: jest.fn(() => jest.fn(() => ({ granted: true }))),
  EventEmitter: jest.fn(),
  NativeModulesProxy: {},
  Platform: {
    OS: 'web',
    select: jest.fn((obj: any) => obj.web || obj.default),
  },
  mockPlaySound: jest.fn(),
}))

// Mock @expo/react-native-action-sheet
jest.mock('@expo/react-native-action-sheet', () => ({
  useActionSheet: () => ({
    showActionSheetWithOptions: jest.fn(),
  }),
}))

// Mock UI utilities
jest.mock('@my/logging', () => ({
  log: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}))

jest.mock('@ui/utils/videoValidation', () => ({
  validateVideoFile: jest.fn(),
}))

// Mock @my/logging
jest.mock('@my/logging', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  log: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  getConsoleLogs: jest.fn(() => []),
  getConsoleErrors: jest.fn(() => []),
  getNetworkLogs: jest.fn(() => []),
  getNetworkErrors: jest.fn(() => []),
}))

// Mock @my/config package
jest.mock('@my/config', () => ({
  shadows: {
    small: {
      shadowColor: 'rgba(0, 0, 0, 0.1)',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 1,
    },
    medium: {
      shadowColor: 'rgba(0, 0, 0, 0.15)',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 2,
    },
    large: {
      shadowColor: 'rgba(0, 0, 0, 0.2)',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 4,
    },
    xlarge: {
      shadowColor: 'rgba(0, 0, 0, 0.25)',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.25,
      shadowRadius: 12,
      elevation: 6,
    },
  },
  config: {},
}))

// Global test configuration
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks()
})

afterEach(() => {
  // Clean up after each test
  if (jest.isMockFunction(setTimeout)) {
    if (jest.getTimerCount() > 0) {
      jest.runOnlyPendingTimers()
    }
    jest.clearAllTimers()
  }
})
