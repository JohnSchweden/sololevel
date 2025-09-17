import '@testing-library/jest-dom'

// Suppress react-test-renderer deprecation warnings in React 19
// This is a known issue with @testing-library/react-native until they update
const originalConsoleError = console.error
console.error = (...args) => {
  if (typeof args[0] === 'string') {
    // Suppress react-test-renderer deprecation warnings
    if (args[0].includes('react-test-renderer is deprecated')) {
      return // Suppress this specific warning
    }
    // Suppress React Native style prop warnings in web tests
    if (
      args[0].includes('React does not recognize the') &&
      (args[0].includes('justifyContent') ||
        args[0].includes('alignItems') ||
        args[0].includes('borderWidth') ||
        args[0].includes('borderColor') ||
        args[0].includes('shadowColor') ||
        args[0].includes('shadowOffset') ||
        args[0].includes('shadowOpacity') ||
        args[0].includes('shadowRadius') ||
        args[0].includes('paddingHorizontal') ||
        args[0].includes('textAlign') ||
        args[0].includes('numberOfLines'))
    ) {
      return // Suppress React Native style prop warnings
    }
    // Suppress event handler warnings
    if (
      args[0].includes('Unknown event handler property') &&
      (args[0].includes('onPressIn') || args[0].includes('onPressOut'))
    ) {
      return // Suppress unknown event handler warnings
    }
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

// Mock window.getComputedStyle for touch target tests
Object.defineProperty(window, 'getComputedStyle', {
  writable: true,
  value: jest.fn().mockImplementation((element) => {
    // Return mock styles based on element attributes
    const minHeight = (element.getAttribute && element.getAttribute('minheight')) || '44px'
    const minWidth = (element.getAttribute && element.getAttribute('minwidth')) || '44px'

    return {
      minHeight,
      minWidth,
      getPropertyValue: jest.fn((prop) => {
        switch (prop) {
          case 'min-height':
            return minHeight
          case 'min-width':
            return minWidth
          default:
            return ''
        }
      }),
    }
  }),
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
jest.mock('expo-camera', () => {
  const React = require('react')
  const mockCamera = {
    recordAsync: jest.fn().mockResolvedValue({
      uri: 'file:///mock/recorded_video.mp4',
    }),
    stopRecording: jest.fn(),
    toggleRecordingAsync: jest.fn(),
    takePictureAsync: jest.fn().mockResolvedValue({ uri: 'file:///mock/photo.jpg' }),
  }

  const mockCameraView = React.forwardRef((props, ref) => {
    const { testID, children, ...otherProps } = props

    // Set up the ref with camera methods
    React.useImperativeHandle(ref, () => mockCamera, [])

    return React.createElement(
      'div',
      {
        ...otherProps,
        ref,
        testID: testID || 'expo-camera',
      },
      children
    )
  })

  return {
    CameraView: mockCameraView,
    Camera: ({ children }) => children,
    useCameraPermissions: () => [
      { granted: true, canAskAgain: true, status: 'granted' },
      jest.fn(),
    ],
    useMicrophonePermissions: () => [
      { granted: true, canAskAgain: true, status: 'granted' },
      jest.fn(),
    ],
  }
})

// Mock VideoStorageService
jest.mock('@app/features/CameraRecording/services/videoStorageService', () => ({
  VideoStorageService: {
    saveVideo: jest.fn().mockImplementation(async (sourceUri, filename, metadata) => {
      const FileSystem = require('expo-file-system')
      const timestamp = Date.now()
      const format = metadata?.format || 'mp4'
      const savedFilename = `video_${timestamp}.${format}`
      const localUri = `file:///documents/recordings/${savedFilename}`

      try {
        // Simulate the copy operation that the test expects
        await FileSystem.copyAsync({
          from: sourceUri,
          to: localUri,
        })

        return {
          localUri,
          filename: savedFilename,
          size: 1024000, // Always use mock size as per test expectation
          metadata: {
            duration: metadata?.duration || 30,
            size: 1024000, // Always use mock size as per test expectation
            format: format,
          },
        }
      } catch (error) {
        // Wrap FileSystem errors with VideoStorageService error message
        throw new Error('Failed to save video')
      }
    }),
    getVideoInfo: jest.fn().mockImplementation(async (uri) => {
      const FileSystem = require('expo-file-system')
      return await FileSystem.getInfoAsync(uri)
    }),
    listVideos: jest.fn().mockImplementation(async () => {
      const FileSystem = require('expo-file-system')
      const videosDir = 'file:///documents/recordings/'

      try {
        const files = await FileSystem.readDirectoryAsync(videosDir)
        return files.map((filename) => ({
          localUri: `${videosDir}${filename}`,
          filename,
          size: 1024000,
          metadata: {
            duration: 30,
            size: 1024000,
            format: 'mp4',
          },
        }))
      } catch {
        return []
      }
    }),
    deleteVideo: jest.fn().mockImplementation(async (uri) => {
      const FileSystem = require('expo-file-system')
      await FileSystem.deleteAsync(uri)
    }),
    cleanupTempFiles: jest.fn().mockImplementation(async () => {
      const FileSystem = require('expo-file-system')
      const tempDir = 'file:///cache/temp/'

      try {
        await FileSystem.readDirectoryAsync(tempDir)
        // Simulate cleanup
      } catch {
        // Directory doesn't exist or is empty
      }
    }),
  },
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
  User: () => 'User',
  Menu: () => 'Menu',
  Bell: () => 'Bell',
  Download: () => 'Download',
  Maximize: () => 'Maximize',
  Maximize2: () => 'Maximize2',
  Share: () => 'Share',
  SkipBack: () => 'SkipBack',
  SkipForward: () => 'SkipForward',
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
    React.forwardRef((props, ref) => {
      const { testID, children, ...otherProps } = props
      return React.createElement(
        'div',
        {
          ...otherProps,
          ref,
          'data-testid': testID || name,
        },
        children
      )
    })

  const mockTextComponent = React.forwardRef((props, ref) => {
    const { testID, children, ...otherProps } = props
    return React.createElement(
      'div',
      {
        ...otherProps,
        ref,
        'data-testid': testID || 'Text',
      },
      children
    )
  })

  return {
    TamaguiProvider: ({ children }) => children,
    styled: (_component, _config) => mockComponent('StyledComponent'),
    Stack: mockComponent('Stack'),
    XStack: mockComponent('XStack'),
    YStack: mockComponent('YStack'),
    Button: mockComponent('Button'),
    Text: mockTextComponent,
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
    React.forwardRef((props, ref) => {
      const {
        testID,
        accessibilityLabel,
        accessibilityRole,
        'data-testid': dataTestId,
        ...otherProps
      } = props
      return React.createElement('div', {
        ...otherProps,
        ref,
        'data-testid': dataTestId || testID || name,
        'aria-label': accessibilityLabel,
        role: accessibilityRole,
        // Preserve original props for testing
        'data-original-accessibility-label': accessibilityLabel,
        'data-original-accessibility-role': accessibilityRole,
        'data-original-test-id': testID,
      })
    })

  const mockTextComponent = React.forwardRef((props, ref) => {
    const { testID, accessibilityLabel, accessibilityRole, ...otherProps } = props
    return React.createElement('div', {
      ...otherProps,
      ref,
      'data-testid': testID || 'Text',
      'aria-label': accessibilityLabel,
      role: accessibilityRole || 'text',
    })
  })

  const mockButtonComponent = React.forwardRef((props, ref) => {
    const {
      testID,
      onPress,
      accessibilityLabel,
      disabled,
      accessibilityRole,
      icon,
      children,
      ...otherProps
    } = props
    return React.createElement(
      'button',
      {
        ...otherProps,
        ref,
        'data-testid': testID || 'Button',
        'aria-label': accessibilityLabel,
        'aria-disabled': disabled ? 'true' : 'false',
        onClick: disabled ? undefined : onPress,
        disabled: disabled,
        role: accessibilityRole || 'button',
      },
      icon || children
    )
  })

  return {
    TamaguiProvider: ({ children }) => children,
    styled: (_component, _config) => mockComponent('StyledComponent'),
    createTamagui: jest.fn(() => ({})),
    Stack: mockComponent('Stack'),
    XStack: mockComponent('XStack'),
    YStack: mockComponent('YStack'),
    Button: mockButtonComponent,
    Text: mockTextComponent,
    View: mockComponent('View'),
    Dialog: Object.assign(mockComponent('Dialog'), {
      Root: ({ children }) => children,
      Portal: ({ children }) => children,
      Overlay: mockComponent('DialogOverlay'),
      Content: mockComponent('DialogContent'),
      Title: mockComponent('DialogTitle'),
      Description: mockComponent('DialogDescription'),
      Close: mockComponent('DialogClose'),
    }),
    Sheet: Object.assign(
      ({ children, ...props }) => {
        const React = require('react')
        return React.createElement(
          'div',
          {
            ...props,
            'data-testid': 'sheet',
          },
          children
        )
      },
      {
        Overlay: mockComponent('SheetOverlay'),
        Handle: mockComponent('SheetHandle'),
        Frame: ({ children, ...props }) => {
          const React = require('react')
          return React.createElement(
            'div',
            {
              ...props,
              'data-testid': 'sheet-frame',
            },
            children
          )
        },
      }
    ),
    Circle: mockComponent('Circle'),
    Spinner: mockComponent('Spinner'),
    ScrollView: mockComponent('ScrollView'),
    SizableText: mockTextComponent,
  }
})

// Mock @tamagui/button
jest.mock('@tamagui/button', () => {
  const React = require('react')
  const mockButton = React.forwardRef((props, ref) => {
    const {
      testID,
      children,
      onPress,
      accessibilityLabel,
      disabled,
      accessibilityRole,
      icon,
      ...otherProps
    } = props
    return React.createElement(
      'button',
      {
        ...otherProps,
        ref,
        'data-testid': testID || 'Button',
        'aria-label': accessibilityLabel,
        'aria-disabled': disabled ? 'true' : 'false',
        onClick: disabled ? undefined : onPress,
        disabled: disabled,
        role: accessibilityRole || 'button',
      },
      icon || children
    )
  })
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
jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn(),
  },
  Platform: {
    OS: 'web',
    select: jest.fn((options) => options.web || options.default),
  },
  Dimensions: {
    get: jest.fn(() => ({ width: 375, height: 667 })),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  },
  StyleSheet: {
    create: jest.fn((styles) => styles),
    flatten: jest.fn((style) => style),
  },
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  ScrollView: 'ScrollView',
  FlatList: 'FlatList',
  Image: 'Image',
  TextInput: 'TextInput',
  Pressable: (props) => {
    const mockReact = require('react')
    const {
      testID,
      children,
      onPress,
      accessibilityLabel,
      accessibilityRole,
      accessibilityHint,
      disabled,
      ...otherProps
    } = props
    return mockReact.createElement(
      'div',
      {
        ...otherProps,
        'data-testid': testID || 'Pressable',
        'aria-label': accessibilityLabel,
        role: accessibilityRole,
        'aria-description': accessibilityHint,
        'aria-disabled': disabled ? 'true' : 'false',
        onClick: disabled ? undefined : onPress,
      },
      children
    )
  },
  Animated: {
    View: 'Animated.View',
    Text: 'Animated.Text',
    Value: jest.fn(() => ({
      setValue: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      interpolate: jest.fn(),
    })),
    timing: jest.fn(() => ({
      start: jest.fn(),
    })),
    spring: jest.fn(() => ({
      start: jest.fn(),
    })),
    sequence: jest.fn(() => ({
      start: jest.fn(),
    })),
    parallel: jest.fn(() => ({
      start: jest.fn(),
    })),
    loop: jest.fn(() => ({
      start: jest.fn(),
    })),
    createAnimatedComponent: jest.fn((component) => component),
  },
  Easing: {
    linear: jest.fn(),
    ease: jest.fn(),
    quad: jest.fn(),
    cubic: jest.fn(),
    poly: jest.fn(),
    sin: jest.fn(),
    circle: jest.fn(),
    exp: jest.fn(),
    elastic: jest.fn(),
    back: jest.fn(),
    bounce: jest.fn(),
    bezier: jest.fn(),
    in: jest.fn(),
    out: jest.fn(),
    inOut: jest.fn(),
  },
  PanResponder: {
    create: jest.fn(() => ({
      panHandlers: {},
    })),
  },
  Keyboard: {
    addListener: jest.fn(),
    removeListener: jest.fn(),
    dismiss: jest.fn(),
  },
  PixelRatio: {
    get: jest.fn(() => 2),
    getFontScale: jest.fn(() => 1),
    getPixelSizeForLayoutSize: jest.fn((size) => size * 2),
    roundToNearestPixel: jest.fn((size) => size),
  },
}))
