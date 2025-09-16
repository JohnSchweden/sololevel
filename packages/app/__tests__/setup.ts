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

// Mock @my/ui components (consolidated)
jest.mock('@my/ui', () => {
  const React = require('react')
  return {
    ProcessingOverlay: ({ children, testID, ...props }: { children?: any; testID?: string }) =>
      React.createElement(
        'div',
        { 'data-testid': testID || 'ProcessingOverlay', ...props },
        children
      ),
    VideoPlayer: ({ children, testID, ...props }: { children?: any; testID?: string }) =>
      React.createElement('div', { 'data-testid': testID || 'VideoPlayer', ...props }, children),
    MotionCaptureOverlay: ({ children, testID, ...props }: { children?: any; testID?: string }) =>
      React.createElement(
        'div',
        { 'data-testid': testID || 'MotionCaptureOverlay', ...props },
        children
      ),
    FeedbackBubbles: ({ children, testID, ...props }: { children?: any; testID?: string }) =>
      React.createElement(
        'div',
        { 'data-testid': testID || 'FeedbackBubbles', ...props },
        children
      ),
    AudioFeedbackOverlay: ({ children, testID, ...props }: { children?: any; testID?: string }) =>
      React.createElement(
        'div',
        { 'data-testid': testID || 'AudioFeedbackOverlay', ...props },
        children
      ),
    VideoControlsOverlay: ({ children, testID, ...props }: { children?: any; testID?: string }) =>
      React.createElement(
        'div',
        { 'data-testid': testID || 'VideoControlsOverlay', ...props },
        children
      ),
    BottomSheet: ({ children, testID, ...props }: { children?: any; testID?: string }) =>
      React.createElement('div', { 'data-testid': testID || 'BottomSheet', ...props }, children),
    SocialIcons: ({ children, testID, ...props }: { children?: any; testID?: string }) =>
      React.createElement('div', { 'data-testid': testID || 'SocialIcons', ...props }, children),
    VideoTitle: ({ children, testID, ...props }: { children?: any; testID?: string }) =>
      React.createElement('div', { 'data-testid': testID || 'VideoTitle', ...props }, children),
    VideoAnalysisPlayer: ({ testID, ...props }: any) =>
      React.createElement(
        'View',
        { testID: testID || 'video-player-container', ...props },
        'Video Player'
      ),
    log: {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    },
  }
})

// Mock @ui/components/VideoAnalysis (the actual import path)
jest.mock('@ui/components/VideoAnalysis', () => {
  const React = require('react')
  return {
    ProcessingOverlay: ({ children, testID, ...props }: { children?: any; testID?: string }) =>
      React.createElement(
        'div',
        { 'data-testid': testID || 'ProcessingOverlay', ...props },
        children
      ),
    VideoPlayer: ({ children, testID, ...props }: { children?: any; testID?: string }) =>
      React.createElement('div', { 'data-testid': testID || 'VideoPlayer', ...props }, children),
    MotionCaptureOverlay: ({ children, testID, ...props }: { children?: any; testID?: string }) =>
      React.createElement(
        'div',
        { 'data-testid': testID || 'MotionCaptureOverlay', ...props },
        children
      ),
    FeedbackBubbles: ({ children, testID, ...props }: { children?: any; testID?: string }) =>
      React.createElement(
        'div',
        { 'data-testid': testID || 'FeedbackBubbles', ...props },
        children
      ),
    AudioFeedbackOverlay: ({ children, testID, ...props }: { children?: any; testID?: string }) =>
      React.createElement(
        'div',
        { 'data-testid': testID || 'AudioFeedbackOverlay', ...props },
        children
      ),
    VideoControlsOverlay: ({ children, testID, ...props }: { children?: any; testID?: string }) =>
      React.createElement(
        'div',
        { 'data-testid': testID || 'VideoControlsOverlay', ...props },
        children
      ),
    BottomSheet: ({ children, testID, ...props }: { children?: any; testID?: string }) =>
      React.createElement('div', { 'data-testid': testID || 'BottomSheet', ...props }, children),
    SocialIcons: ({ children, testID, ...props }: { children?: any; testID?: string }) =>
      React.createElement('div', { 'data-testid': testID || 'SocialIcons', ...props }, children),
    VideoTitle: ({ children, testID, ...props }: { children?: any; testID?: string }) =>
      React.createElement('div', { 'data-testid': testID || 'VideoTitle', ...props }, children),
  }
})

// Mock @my/config
jest.mock('@my/config', () => ({
  PoseData: [],
  FeedbackMessage: {},
  SocialStats: {},
  FeedbackItem: {},
}))

// Mock @api/src/supabase
jest.mock('@api/src/supabase', () => ({
  supabase: {
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
    })),
    realtime: {
      onConnStateChange: jest.fn(),
    },
  },
}))

// Mock TanStack Query
jest.mock('@tanstack/react-query', () => ({
  QueryClient: jest.fn().mockImplementation(() => ({
    getQueryData: jest.fn(),
    setQueryData: jest.fn(),
    invalidateQueries: jest.fn(),
    refetchQueries: jest.fn(),
    cancelQueries: jest.fn(),
    removeQueries: jest.fn(),
    clear: jest.fn(),
    mount: jest.fn(),
    unmount: jest.fn(),
    getDefaultOptions: jest.fn(),
    setDefaultOptions: jest.fn(),
    getQueryCache: jest.fn(),
    getMutationCache: jest.fn(),
    getLogger: jest.fn(),
    setLogger: jest.fn(),
    isFetching: jest.fn(),
    isMutating: jest.fn(),
    getQueryState: jest.fn(),
    getMutationState: jest.fn(),
    ensureQueryData: jest.fn(),
    prefetchQuery: jest.fn(),
    fetchQuery: jest.fn(),
    executeMutation: jest.fn(),
    resumePausedMutations: jest.fn(),
    getQueryDefaults: jest.fn(),
    setQueryDefaults: jest.fn(),
    getMutationDefaults: jest.fn(),
    setMutationDefaults: jest.fn(),
    getQueryClient: jest.fn(),
    setQueryClient: jest.fn(),
  })),
  QueryClientProvider: ({ children }: { children: any }) => children,
  useQuery: jest.fn(() => ({
    data: null,
    error: null,
    isLoading: false,
    isError: false,
    isSuccess: false,
    refetch: jest.fn(),
  })),
  useMutation: jest.fn(() => ({
    mutate: jest.fn(),
    mutateAsync: jest.fn(),
    isLoading: false,
    isError: false,
    isSuccess: false,
    error: null,
    data: null,
    reset: jest.fn(),
  })),
  useQueryClient: jest.fn(() => ({
    getQueryData: jest.fn(),
    setQueryData: jest.fn(),
    invalidateQueries: jest.fn(),
    refetchQueries: jest.fn(),
  })),
}))

// Mock Zustand stores
jest.mock('../stores/MVPposeStore', () => ({
  usePoseStore: jest.fn(() => ({
    currentPose: null,
    poseHistory: [],
    processingQuality: 'medium',
    errors: [],
    processPose: jest.fn(),
    addError: jest.fn(),
    clearErrors: jest.fn(),
    clearHistory: jest.fn(),
  })),
}))

jest.mock('../stores/analysisStatus', () => ({
  useAnalysisStatusStore: jest.fn(() => ({
    updateJob: jest.fn(),
    subscribeToJob: jest.fn(),
    unsubscribeFromJob: jest.fn(),
  })),
  useAnalysisJobStatus: jest.fn(() => ({
    job: null,
    exists: false,
    isQueued: false,
    isProcessing: false,
    isCompleted: false,
    isFailed: false,
    progress: 0,
    error: null,
    results: null,
    poseData: null,
    isSubscribed: false,
    lastUpdated: Date.now(),
  })),
}))

// Mock Tamagui components
jest.mock('tamagui', () => {
  const React = require('react')
  return {
    Button: ({ children, onPress, testID, ...props }: any) =>
      React.createElement('TouchableOpacity', { onPress, testID, ...props }, children),
    XStack: ({ children, testID, ...props }: any) =>
      React.createElement('View', { testID, style: { flexDirection: 'row' }, ...props }, children),
    YStack: ({ children, testID, ...props }: any) =>
      React.createElement(
        'View',
        { testID, style: { flexDirection: 'column' }, ...props },
        children
      ),
  }
})

// Mock Tamagui icons
jest.mock('@tamagui/lucide-icons', () => ({
  ChevronLeft: ({ testID, ...props }: any) => {
    const React = require('react')
    return React.createElement('View', { testID: testID || 'chevron-left', ...props }, '←')
  },
  MoreVertical: ({ testID, ...props }: any) => {
    const React = require('react')
    return React.createElement('View', { testID: testID || 'more-vertical', ...props }, '⋮')
  },
}))

// Mock ConnectionErrorBanner component
jest.mock('../components/ConnectionErrorBanner', () => ({
  ConnectionErrorBanner: ({ isVisible, error, reconnectAttempts, onRetry, onDismiss }: any) => {
    const React = require('react')

    if (!isVisible) {
      return null
    }

    return React.createElement('View', { testID: 'connection-error-banner' }, [
      React.createElement('Text', { key: 'title' }, 'Connection Lost'),
      React.createElement('Text', { key: 'error' }, error || 'Real-time updates unavailable'),
      reconnectAttempts > 0 &&
        React.createElement(
          'Text',
          { key: 'attempts' },
          `Reconnection attempt ${reconnectAttempts}`
        ),
      React.createElement(
        'TouchableOpacity',
        { key: 'retry', testID: 'retry-connection-button', onPress: onRetry },
        'Retry'
      ),
      React.createElement(
        'TouchableOpacity',
        { key: 'dismiss', testID: 'dismiss-error-button', onPress: onDismiss },
        'Dismiss'
      ),
    ])
  },
}))

// Second @my/ui mock removed - consolidated into single mock above

// Mock useAnalysisRealtime hooks
jest.mock('../hooks/useAnalysisRealtime', () => ({
  useAnalysisRealtime: jest.fn(() => ({
    isSubscribed: true,
    analysisId: 123,
  })),
  usePoseDataStream: jest.fn(() => ({
    isStreaming: false,
    currentPose: null,
    poseHistory: [],
    processingQuality: 'medium',
  })),
  useVideoAnalysisRealtime: jest.fn(() => ({
    analysisJob: null,
    isAnalysisSubscribed: false,
    currentPose: null,
    poseHistory: [],
    isPoseStreaming: false,
    processingQuality: 'medium',
    isConnected: true,
    reconnectAttempts: 0,
    connectionError: null,
    isFullyConnected: false,
  })),
}))

// Mock React Native StyleSheet
jest.mock('react-native/Libraries/StyleSheet/StyleSheet', () => ({
  flatten: jest.fn((style) => style),
  create: jest.fn((styles) => styles),
  absoluteFill: {},
  absoluteFillObject: {},
  hairlineWidth: 1,
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
