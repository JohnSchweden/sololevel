import '@testing-library/jest-dom'

// Suppress react-test-renderer deprecation warnings in React 19
// This is a known issue with @testing-library/react-native until they update
const originalConsoleError = console.error
console.error = (...args) => {
  if (
    typeof args[0] === 'string' &&
    args[0].includes('react-test-renderer is deprecated')
  ) {
    return // Suppress this specific warning
  }
  originalConsoleError(...args)
}

// Use React Testing Library for web components instead of React Native Testing Library
// This avoids conflicts with jsdom environment

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

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

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

// Mock Expo modules core
jest.mock('expo-modules-core', () => ({
  NativeModule: jest.fn(),
  requireNativeModule: jest.fn(),
  requireOptionalNativeModule: jest.fn(),
}))

// Mock global expo object
Object.defineProperty(globalThis, 'expo', {
  value: {
    NativeModule: jest.fn(),
    modules: {},
  },
  writable: true,
})

// Mock Expo Camera
jest.mock('expo-camera', () => ({
  CameraView: ({ children }) => children,
  Camera: ({ children }) => children,
  useCameraPermissions: () => [{ granted: true, canAskAgain: true, status: 'granted' }, jest.fn()],
  useMicrophonePermissions: () => [
    { granted: true, canAskAgain: true, status: 'granted' },
    jest.fn(),
  ],
}))

// Mock Expo Document Picker
jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn().mockResolvedValue({
    canceled: false,
    assets: [
      {
        uri: 'file://mock-video.mp4',
        name: 'mock-video.mp4',
        size: 1024 * 1024,
        mimeType: 'video/mp4',
      },
    ],
  }),
}))

// Mock Expo Image Picker
jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn().mockResolvedValue({
    canceled: false,
    assets: [
      {
        uri: 'file://mock-video.mp4',
        fileName: 'mock-video.mp4',
        fileSize: 1024 * 1024,
        mimeType: 'video/mp4',
        duration: 30000,
        width: 1920,
        height: 1080,
      },
    ],
  }),
  launchCameraAsync: jest.fn().mockResolvedValue({
    canceled: false,
    assets: [
      {
        uri: 'file://mock-video.mp4',
        fileName: 'mock-video.mp4',
        fileSize: 1024 * 1024,
        mimeType: 'video/mp4',
        duration: 30000,
        width: 1920,
        height: 1080,
      },
    ],
  }),
  requestCameraPermissionsAsync: jest.fn().mockResolvedValue({
    granted: true,
    canAskAgain: true,
    status: 'granted',
  }),
  MediaTypeOptions: {
    Videos: 'Videos',
  },
}))

// Mock Expo React Native Action Sheet
jest.mock('@expo/react-native-action-sheet', () => ({
  useActionSheet: () => ({
    showActionSheetWithOptions: jest.fn((options, callback) => {
      // Simulate user selecting the first option (Photo Library)
      callback(0)
    }),
  }),
  ActionSheetProvider: ({ children }) => children,
}))

// Mock Tamagui Lucide Icons
jest.mock('@tamagui/lucide-icons', () => ({
  RefreshCw: () => 'RefreshCw',
  ChevronLeft: () => 'ChevronLeft',
  AlertCircle: () => 'AlertCircle',
  AlertTriangle: () => 'AlertTriangle',
  CheckCircle: () => 'CheckCircle',
  X: () => 'X',
  Play: () => 'Play',
  Pause: () => 'Pause',
  Square: () => 'Square',
  RotateCcw: () => 'RotateCcw',
  Upload: () => 'Upload',
  SwitchCamera: () => 'SwitchCamera',
  Settings: () => 'Settings',
  Camera: () => 'Camera',
  FileVideo: () => 'FileVideo',
  Folder: () => 'Folder',
  Image: () => 'Image',
  // Add other icons as needed
}))

// Mock Expo Router
jest.mock('expo-router', () => ({
  Link: ({ children }) => children,
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: () => false,
  }),
  useLocalSearchParams: () => ({ id: 'mock-id' }),
  Stack: {
    Screen: ({ children }) => children,
  },
}))

// Mock Tamagui config
jest.mock('@tamagui/config/v4', () => ({
  defaultConfig: {
    tokens: {},
    themes: {},
    fonts: {},
  },
}))

// Mock Tamagui core components to prevent styled() errors
jest.mock('@tamagui/core', () => {
  const React = require('react')
  const mockComponent = (name) =>
    React.forwardRef((props, ref) =>
      React.createElement('div', { ...props, ref, 'data-testid': name })
    )

  return {
    TamaguiProvider: ({ children }) => children,
    styled: (_component, _config) => mockComponent,
    Stack: mockComponent('Stack'),
    XStack: mockComponent('XStack'),
    YStack: mockComponent('YStack'),
    Button: mockComponent('Button'),
    Text: mockComponent('Text'),
    View: mockComponent('View'),
    createTamagui: jest.fn(() => ({})),
    createTokens: jest.fn(() => ({})),
    createTheme: jest.fn(() => ({})),
    getVariableValue: jest.fn(),
  }
})

// Mock Tamagui components
jest.mock('tamagui', () => {
  const React = require('react')
  const mockComponent = (name) =>
    React.forwardRef((props, ref) =>
      React.createElement('div', { ...props, ref, 'data-testid': name })
    )

  return {
    TamaguiProvider: ({ children }) => children,
    styled: (_component, _config) => mockComponent,
    createTamagui: jest.fn(() => ({})),
    Stack: mockComponent('Stack'),
    XStack: mockComponent('XStack'),
    YStack: mockComponent('YStack'),
    Button: mockComponent('Button'),
    Text: mockComponent('Text'),
    View: mockComponent('View'),
    Dialog: {
      Root: ({ children }) => children,
      Portal: ({ children }) => children,
      Overlay: mockComponent('DialogOverlay'),
      Content: mockComponent('DialogContent'),
      Title: mockComponent('DialogTitle'),
      Description: mockComponent('DialogDescription'),
      Close: mockComponent('DialogClose'),
    },
    Sheet: {
      Root: ({ children }) => children,
      Overlay: mockComponent('SheetOverlay'),
      Handle: mockComponent('SheetHandle'),
      Frame: mockComponent('SheetFrame'),
    },
    Circle: mockComponent('Circle'),
  }
})

// Mock @tamagui/button
jest.mock('@tamagui/button', () => {
  const React = require('react')
  const mockButton = React.forwardRef((props, ref) =>
    React.createElement('button', { ...props, ref, 'data-testid': 'Button' })
  )
  return {
    Button: mockButton,
  }
})

// Mock @tamagui/font-inter
jest.mock('@tamagui/font-inter', () => ({
  createInterFont: jest.fn(() => ({
    family: 'Inter',
    size: {},
    lineHeight: {},
    weight: {},
    letterSpacing: {},
  })),
}))

// Manual mock for @my/config is in __mocks__/@my/config.js

// Mock React Native Alert
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native')
  return {
    ...RN,
    Alert: {
      alert: jest.fn(),
    },
    Platform: {
      OS: 'web',
      select: jest.fn((options) => options.web || options.default),
    },
  }
})
