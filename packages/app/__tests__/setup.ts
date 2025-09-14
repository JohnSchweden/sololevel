// Jest setup for app package
import 'react-native-gesture-handler/jestSetup'

// Mock Expo modules
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  useLocalSearchParams: () => ({}),
  Link: 'Link',
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  },
}))

jest.mock('expo-constants', () => ({
  expoConfig: { extra: {} },
}))

jest.mock('expo-file-system', () => ({
  documentDirectory: 'file:///documents/',
  cacheDirectory: 'file:///cache/',
  getInfoAsync: jest.fn(),
  makeDirectoryAsync: jest.fn(),
  copyAsync: jest.fn(),
  readDirectoryAsync: jest.fn(),
  deleteAsync: jest.fn(),
}))

// Mock React Native modules
// Note: NativeAnimatedHelper is not available in test environment

// Mock window.matchMedia for Tamagui
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock expo-file-system for all tests
jest.mock('expo-file-system', () => ({
  documentDirectory: 'file:///documents/',
  cacheDirectory: 'file:///cache/',
  getInfoAsync: jest.fn(),
  makeDirectoryAsync: jest.fn(),
  copyAsync: jest.fn(),
  readDirectoryAsync: jest.fn(),
  deleteAsync: jest.fn(),
  writeAsStringAsync: jest.fn(),
  readAsStringAsync: jest.fn(),
}))

// Mock Tamagui components for app package tests
jest.mock('tamagui', () => {
  const React = require('react')
  const mockComponent = (name: string) =>
    React.forwardRef((props: any, ref: any) =>
      React.createElement('div', { ...props, ref, 'data-testid': name })
    )

  return {
    TamaguiProvider: ({ children }: { children: any }) => children,
    styled: (_component: any, _config: any) => mockComponent,
    Stack: mockComponent('Stack'),
    XStack: mockComponent('XStack'),
    YStack: mockComponent('YStack'),
    Button: mockComponent('Button'),
    Text: mockComponent('Text'),
    View: mockComponent('View'),
    createTamagui: jest.fn(() => ({})),
  }
})

// Mock @tamagui/lucide-icons
jest.mock('@tamagui/lucide-icons', () => ({
  ChevronLeft: () => 'ChevronLeft',
  MoreVertical: () => 'MoreVertical',
  Edit3: () => 'Edit3',
  Check: () => 'Check',
  X: () => 'X',
}))

// Mock @my/ui components
jest.mock('@my/ui', () => {
  const React = require('react')
  return {
    ProcessingOverlay: ({ children }: { children?: any }) =>
      React.createElement('div', { 'data-testid': 'ProcessingOverlay' }, children),
    VideoPlayer: ({ children }: { children?: any }) =>
      React.createElement('div', { 'data-testid': 'VideoPlayer' }, children),
    MotionCaptureOverlay: ({ children }: { children?: any }) =>
      React.createElement('div', { 'data-testid': 'MotionCaptureOverlay' }, children),
    FeedbackBubbles: ({ children }: { children?: any }) =>
      React.createElement('div', { 'data-testid': 'FeedbackBubbles' }, children),
    AudioFeedbackOverlay: ({ children }: { children?: any }) =>
      React.createElement('div', { 'data-testid': 'AudioFeedbackOverlay' }, children),
    VideoControlsOverlay: ({ children }: { children?: any }) =>
      React.createElement('div', { 'data-testid': 'VideoControlsOverlay' }, children),
    BottomSheet: ({ children }: { children?: any }) =>
      React.createElement('div', { 'data-testid': 'BottomSheet' }, children),
    SocialIcons: ({ children }: { children?: any }) =>
      React.createElement('div', { 'data-testid': 'SocialIcons' }, children),
    VideoTitle: ({ children }: { children?: any }) =>
      React.createElement('div', { 'data-testid': 'VideoTitle' }, children),
    log: {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    },
  }
})

// Mock @my/config
jest.mock('@my/config', () => ({
  PoseData: [],
  FeedbackMessage: {},
  SocialStats: {},
  FeedbackItem: {},
}))

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}
