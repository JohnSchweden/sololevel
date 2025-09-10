// Mock react-native-gesture-handler for cross-platform testing
jest.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: ({ children }: { children: React.ReactNode }) => children,
  PanGestureHandler: ({ children }: { children: React.ReactNode }) => children,
  TapGestureHandler: ({ children }: { children: React.ReactNode }) => children,
  State: {},
  Directions: {},
}))
import { jest } from '@jest/globals'
import React from 'react'

// Setup jest-dom for additional matchers
import '@testing-library/jest-dom'

// Create Pressable mock outside jest.mock
interface MockPressableProps {
  onPress?: () => void
  onPressIn?: () => void
  onPressOut?: () => void
  children?: React.ReactNode
  [key: string]: any
}

const MockPressable = React.forwardRef<any, MockPressableProps>((props, ref) => {
  const { onPress, onPressIn, onPressOut, children, ...otherProps } = props
  return React.createElement(
    'div',
    {
      ...otherProps,
      ref,
      onClick: onPress,
      onMouseDown: onPressIn,
      onMouseUp: onPressOut,
      style: { cursor: 'pointer', ...props.style },
      'data-testid': props.testID || 'Pressable',
      role: props.accessibilityRole || 'button',
      'aria-label': props.accessibilityLabel,
      'aria-disabled': props.accessibilityState?.disabled || props.disabled,
      'aria-pressed': props.accessibilityState?.pressed,
      tabIndex: props.disabled ? -1 : 0,
    },
    children
  )
})

// Mock Tamagui components globally
jest.mock('tamagui', () => {
  require('react')
  const { createTamaguiMock } = require('./mocks')

  return createTamaguiMock()
})

// Mock Lucide icons globally
jest.mock('@tamagui/lucide-icons', () => {
  require('react')
  const { createIconMocks } = require('./mocks')

  return createIconMocks()
})

// Mock React Native components that might be used in tests
jest.mock('react-native', () => ({
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
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  Pressable: MockPressable,
  ScrollView: 'ScrollView',
  FlatList: 'FlatList',
  Image: 'Image',
  TextInput: 'TextInput',
  SafeAreaView: 'SafeAreaView',
  StatusBar: {
    setBarStyle: jest.fn(),
    setBackgroundColor: jest.fn(),
  },
}))

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
            setTimeout(() => {
              resolve({
                uri: 'file:///mock/recorded_video.mp4',
                duration: 5000, // 5 seconds in milliseconds
              })
            }, 100)
          })
        }),
        startRecording: jest.fn((options: any) => {
          return new Promise((resolve, reject) => {
            if (!props.permissionGranted) {
              reject(new Error('Camera permission not granted'))
              return
            }
            setTimeout(() => {
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
            }, 100)
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
          // Simulate recording completion after a short delay
          setTimeout(() => {
            // This would normally be called by the actual camera implementation
            // For testing, we simulate the onRecordingFinished callback
          }, 100)
        }),
        stopRecording: jest.fn(() => Promise.resolve()),
        recordAsync: jest.fn((options: any) => {
          return new Promise((resolve, reject) => {
            if (!props.permissionGranted) {
              reject(new Error('Camera permission not granted'))
              return
            }
            setTimeout(() => {
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
            }, 100)
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
            setTimeout(() => {
              options.onRecordingFinished({
                path: 'file:///mock/recorded_video.mp4',
                duration: 5000,
              })
            }, 100)
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

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'))

// Mock react-native-worklets-core
jest.mock('react-native-worklets-core', () => ({
  Worklets: {
    createRunInJsFn: jest.fn(),
    createSharedValue: jest.fn(),
    runOnUI: jest.fn(),
  },
  useSharedValue: jest.fn(),
}))

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
jest.mock('@ui/utils/logger', () => ({
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
  jest.clearAllTimers()
})
