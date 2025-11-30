// Jest setup for app package
import '@testing-library/jest-dom'
import 'react-native-gesture-handler/jestSetup'
import { enableMapSet } from 'immer'

// Enable Immer MapSet plugin for Zustand stores
enableMapSet()

// Mock environment variables for consistent testing
process.env.TEST_AUTH_ENABLED = 'false'
process.env.TEST_AUTH_EMAIL = 'test@example.com'
process.env.TEST_AUTH_PASSWORD = 'test-password'
process.env.SUPABASE_URL = 'https://test.supabase.co'
process.env.SUPABASE_ANON_KEY = 'test-anon-key'
if (!process.env.NODE_ENV) {
  Object.defineProperty(process.env, 'NODE_ENV', {
    value: 'test',
    writable: true,
  })
}

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
  useNavigation: jest.fn(() => ({
    setOptions: jest.fn(),
  })),
}))

// Mock React Navigation elements
jest.mock('@react-navigation/elements', () => ({}))

// Mock useSafeArea hook
jest.mock('@app/provider/safe-area/use-safe-area', () => {
  const insets = {
    top: 44,
    bottom: 34,
    left: 0,
    right: 0,
  }

  return {
    __esModule: true,
    useSafeArea: () => insets,
    useStableTopInset: () => insets.top,
    useStableSafeArea: () => insets,
  }
})

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
  createDownloadResumable: jest.fn(),
}))

jest.mock('expo-image', () => {
  const React = require('react')
  const MockImage = ({ children, testID = 'expo-image', ...props }: any) =>
    React.createElement('img', { 'data-testid': testID, ...props }, children)

  return {
    __esModule: true,
    Image: MockImage,
    default: MockImage,
  }
})

// Mock expo-blur for GlassBackground/GlassButton
jest.mock('expo-blur', () => {
  const React = require('react')
  return {
    BlurView: ({ children, testID, ...props }: any) =>
      React.createElement('div', { 'data-testid': testID || 'blur-view', ...props }, children),
  }
})

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
  downloadAsync: jest.fn(),
  createDownloadResumable: jest.fn(),
}))

// Mock expo-media-library for all tests
jest.mock('expo-media-library', () => ({
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  getPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  createAssetAsync: jest.fn(),
  getAssetsAsync: jest.fn(() =>
    Promise.resolve({ assets: [], endCursor: '', hasNextPage: false, totalCount: 0 })
  ),
  getAssetInfoAsync: jest.fn(),
  deleteAssetsAsync: jest.fn(),
  MediaType: {
    audio: 'audio',
    photo: 'photo',
    video: 'video',
    unknown: 'unknown',
  },
  SortBy: {
    default: 'default',
    id: 'id',
    creationTime: 'creationTime',
    modificationTime: 'modificationTime',
    mediaType: 'mediaType',
    width: 'width',
    height: 'height',
    duration: 'duration',
  },
}))

// Mock expo-crypto for all tests
jest.mock('expo-crypto', () => ({
  digestStringAsync: jest.fn(() => Promise.resolve('test-hash')),
  getRandomBytesAsync: jest.fn(() => Promise.resolve(new Uint8Array([1, 2, 3, 4]))),
  CryptoDigestAlgorithm: {
    SHA256: 'SHA256',
  },
}))

// Mock expo-modules-core for all tests
jest.mock('expo-modules-core', () => ({
  requireNativeModule: jest.fn((moduleName: string) => {
    if (moduleName === 'ExpoCrypto') {
      return {
        digestStringAsync: jest.fn(() => Promise.resolve('test-hash')),
        getRandomBytesAsync: jest.fn(() => Promise.resolve(new Uint8Array([1, 2, 3, 4]))),
      }
    }
    return {}
  }),
  requireOptionalNativeModule: jest.fn((moduleName: string) => {
    if (moduleName === 'ExpoCrypto') {
      return {
        digestStringAsync: jest.fn(() => Promise.resolve('test-hash')),
        getRandomBytesAsync: jest.fn(() => Promise.resolve(new Uint8Array([1, 2, 3, 4]))),
      }
    }
    return null
  }),
  NativeModule: class NativeModule {},
  createPermissionHook: jest.fn(() => () => [true, jest.fn()]),
}))

// Tamagui mock defined later in this file to avoid duplication

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
    // Video Analysis components
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
    AudioFeedback: ({ children, testID, ...props }: { children?: any; testID?: string }) =>
      React.createElement('div', { 'data-testid': testID || 'AudioFeedback', ...props }, children),
    VideoControls: ({ children, testID, ...props }: { children?: any; testID?: string }) =>
      React.createElement('div', { 'data-testid': testID || 'VideoControls', ...props }, children),
    FeedbackPanel: ({ children, testID, ...props }: { children?: any; testID?: string }) =>
      React.createElement('div', { 'data-testid': testID || 'FeedbackPanel', ...props }, children),
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
    // Mock GlassBackground/GlassButton to avoid expo-blur and image import issues
    GlassBackground: ({ children, testID, ...props }: { children?: any; testID?: string }) =>
      React.createElement(
        'div',
        { 'data-testid': testID || 'GlassBackground', ...props },
        children
      ),
    GlassButton: ({
      children,
      testID,
      onPress,
      ...props
    }: { children?: any; testID?: string; onPress?: () => void }) =>
      React.createElement(
        'button',
        { 'data-testid': testID || 'GlassButton', onClick: onPress, ...props },
        children
      ),
    // Mock BlurView to avoid expo-blur issues in tests
    BlurView: ({ children, testID, ...props }: { children?: any; testID?: string }) =>
      React.createElement('div', { 'data-testid': testID || 'blur-view', ...props }, children),
    // Mock ConfirmDialog to avoid Dialog component issues in tests
    ConfirmDialog: ({
      visible,
      title,
      message,
      onConfirm,
      onCancel,
      testID = 'confirm-dialog',
    }: any) =>
      visible
        ? React.createElement(
            'div',
            { 'data-testid': testID },
            React.createElement('div', { 'data-testid': `${testID}-title` }, title),
            React.createElement('div', { 'data-testid': `${testID}-message` }, message),
            React.createElement(
              'button',
              { 'data-testid': `${testID}-cancel-button`, onClick: onCancel },
              'Cancel'
            ),
            React.createElement(
              'button',
              { 'data-testid': `${testID}-confirm-button`, onClick: onConfirm },
              'Confirm'
            )
          )
        : null,
    // Mock Settings components to avoid image import issues in SettingsScreen tests
    ProfileSection: ({ user, email, isLoading, testID = 'profile-section' }: any) => {
      if (isLoading) {
        return React.createElement(
          'div',
          { 'data-testid': 'profile-section-skeleton' },
          email
            ? [
                'Loading...',
                React.createElement('div', {
                  key: 'email-skeleton',
                  'data-testid': 'profile-section-skeleton-email',
                }),
              ]
            : 'Loading...'
        )
      }
      return React.createElement(
        'div',
        { 'data-testid': testID },
        user?.name || user?.user_metadata?.full_name || user?.email || 'No user',
        email &&
          React.createElement(
            'div',
            { 'data-testid': 'profile-section-email', key: 'email' },
            email
          )
      )
    },
    SettingsListItem: ({ label, onPress, testID = 'settings-list-item' }: any) =>
      React.createElement('button', { 'data-testid': testID, onClick: onPress }, label),
    SettingsSectionHeader: ({ title, testID = 'settings-section-header' }: any) =>
      React.createElement('div', { 'data-testid': testID }, title),
    SettingsNavigationList: ({ items, onNavigate, testID = 'settings-navigation-list' }: any) =>
      React.createElement(
        'div',
        { 'data-testid': testID },
        ...(items || []).map((item: any) =>
          React.createElement(
            'button',
            {
              key: item.id,
              'data-testid': `settings-nav-item-${item.id}`,
              onClick: () => onNavigate(item.route),
            },
            item.label
          )
        )
      ),
    LogOutButton: ({ onPress, isLoading, testID = 'log-out-button' }: any) =>
      React.createElement(
        'button',
        { 'data-testid': testID, onClick: onPress },
        isLoading ? 'Logging out...' : 'Log out'
      ),
    SettingsFooter: ({ onLinkPress, testID = 'settings-footer' }: any) =>
      React.createElement(
        'div',
        { 'data-testid': testID },
        React.createElement(
          'button',
          { 'data-testid': `${testID}-privacy`, onClick: () => onLinkPress('privacy') },
          'Privacy'
        ),
        React.createElement(
          'button',
          { 'data-testid': `${testID}-terms`, onClick: () => onLinkPress('terms') },
          'Terms of use'
        ),
        React.createElement(
          'button',
          { 'data-testid': `${testID}-faq`, onClick: () => onLinkPress('faq') },
          'FAQ'
        )
      ),
    SettingsNavigationItem: ({
      title,
      subtitle,
      onPress,
      testID = 'settings-navigation-item',
    }: any) =>
      React.createElement(
        'button',
        { 'data-testid': testID, onClick: onPress },
        React.createElement('div', {}, title),
        React.createElement('div', {}, subtitle)
      ),
    SettingsToggleItem: ({
      title,
      description,
      value,
      onValueChange,
      testID = 'settings-toggle-item',
    }: any) =>
      React.createElement(
        'div',
        { 'data-testid': testID },
        React.createElement('div', {}, title),
        React.createElement('div', {}, description),
        React.createElement('input', {
          type: 'checkbox',
          role: 'switch',
          checked: value,
          'aria-label': title,
          'aria-description': description,
          onChange: (e: any) => onValueChange(e.target.checked),
        })
      ),
    AuthenticationSection: (_props: any) =>
      React.createElement('div', { 'data-testid': 'authentication-section' }),
    SessionManagementSection: (_props: any) =>
      React.createElement('div', { 'data-testid': 'session-management-section' }),
    // Mock Feedback components
    FeedbackTypeButton: ({
      id,
      label,
      icon,
      selected,
      onPress,
      testID,
    }: {
      id: string
      label: string
      icon: string
      selected: boolean
      onPress: (id: string) => void
      testID?: string
    }) =>
      React.createElement(
        'button',
        {
          'data-testid': testID || `feedback-type-${id}`,
          'aria-label': `${label}, ${selected ? 'selected' : 'not selected'}`,
          onClick: () => onPress(id),
          'data-selected': selected,
        },
        React.createElement('span', {}, icon),
        React.createElement('span', {}, label)
      ),
    // Mock Form components
    TextArea: ({
      value,
      onChange,
      placeholder,
      testID,
      maxLength,
    }: {
      value?: string
      onChange?: (value: string) => void
      placeholder?: string
      testID?: string
      maxLength?: number
    }) =>
      React.createElement('textarea', {
        'data-testid': testID || 'textarea',
        value: value || '',
        onChange: (e: any) => onChange?.(e.target.value),
        placeholder,
        maxLength,
      }),
  }
})

// @ui/components/VideoAnalysis mocks are defined in individual test files
// to avoid conflicts and allow test-specific behavior

// Mock @ui/components/VideoAnalysis
jest.mock('@ui/components/VideoAnalysis', () => {
  const React = require('react')
  return {
    AudioFeedback: ({ children, testID, ...props }: { children?: any; testID?: string }) =>
      React.createElement('div', { 'data-testid': testID || 'AudioFeedback', ...props }, children),
    VideoPlayer: ({ children, testID, ...props }: { children?: any; testID?: string }) =>
      React.createElement('div', { 'data-testid': testID || 'VideoPlayer', ...props }, children),
    VideoControls: ({ children, testID, ...props }: { children?: any; testID?: string }) =>
      React.createElement('div', { 'data-testid': testID || 'VideoControls', ...props }, children),
    VideoPlayerArea: ({ children, testID, ...props }: { children?: any; testID?: string }) =>
      React.createElement(
        'div',
        { 'data-testid': testID || 'VideoPlayerArea', ...props },
        children
      ),
    VideoContainer: ({ children, testID, ...props }: { children?: any; testID?: string }) =>
      React.createElement('div', { 'data-testid': testID || 'VideoContainer', ...props }, children),
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
    CoachAvatar: ({ children, testID, ...props }: { children?: any; testID?: string }) =>
      React.createElement('div', { 'data-testid': testID || 'CoachAvatar', ...props }, children),
    SocialIcons: ({ children, testID, ...props }: { children?: any; testID?: string }) =>
      React.createElement('div', { 'data-testid': testID || 'SocialIcons', ...props }, children),
    AudioPlayer: ({ children, testID, ...props }: { children?: any; testID?: string }) =>
      React.createElement('div', { 'data-testid': testID || 'AudioPlayer', ...props }, children),
  }
})

// Mock @my/config
jest.mock('@my/config', () => ({
  PoseData: [],
  FeedbackMessage: {},
  SocialStats: {},
  FeedbackItem: {},
}))

// Mock @my/api
jest.mock('@my/api', () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(() =>
        Promise.resolve({ data: { user: { id: 'test-user-id' } }, error: null })
      ),
      getUser: jest.fn(() =>
        Promise.resolve({ data: { user: { id: 'test-user-id' } }, error: null })
      ),
      signOut: jest.fn(() => Promise.resolve({ error: null })),
    },
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
    })),
    realtime: {
      onConnStateChange: jest.fn(),
    },
    storage: {
      from: jest.fn(() => ({
        createSignedUploadUrl: jest.fn(() =>
          Promise.resolve({
            data: { signedUrl: 'http://test-signed-url', path: 'test-path' },
            error: null,
          })
        ),
        upload: jest.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    },
    from: jest.fn(() => ({
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() =>
            Promise.resolve({
              data: { id: 123, filename: 'test.mp4' },
              error: null,
            })
          ),
        })),
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() =>
              Promise.resolve({
                data: { id: 123, filename: 'test.mp4' },
                error: null,
              })
            ),
          })),
        })),
      })),
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() =>
            Promise.resolve({
              data: { id: 123, filename: 'test.mp4' },
              error: null,
            })
          ),
        })),
      })),
    })),
    rpc: jest.fn(() => Promise.resolve({ data: null, error: null })),
    functions: {
      invoke: jest.fn(() =>
        Promise.resolve({
          data: { analysisId: 123, status: 'queued' },
          error: null,
        })
      ),
    },
  },
  getAnalysisJobByVideoId: jest.fn(() =>
    Promise.resolve({
      id: 123,
      status: 'completed',
      results: { test: 'results' },
    })
  ),
  // Expose analysis history fetcher for tests that need to control it
  getUserAnalysisJobs: jest.fn(),
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

// useAnalysisStatusStore - REMOVED: Migrated to TanStack Query
// Use QueryClient mocks instead
jest.mock('../features/VideoAnalysis/stores/analysisStatus', () => ({
  // Store removed - use TanStack Query hooks instead
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

// Mock react-native first to ensure StyleSheet is available
jest.mock('react-native', () => {
  const React = require('react')
  return {
    Platform: {
      OS: 'web',
      select: jest.fn((obj: any) => obj.web || obj.default),
    },
    StyleSheet: {
      flatten: jest.fn((style: any) => style || {}),
      create: jest.fn((styles: any) => styles),
      absoluteFill: {},
      absoluteFillObject: {},
      hairlineWidth: 1,
    },
    View: ({ children, testID, ...props }: any) =>
      React.createElement('div', { testID, ...props }, children),
    Text: ({ children, testID, ...props }: any) =>
      React.createElement('span', { testID, ...props }, children),
    TouchableOpacity: ({ children, onPress, testID, ...props }: any) =>
      React.createElement('button', { onPress, testID, ...props }, children),
    Dimensions: {
      get: jest.fn(() => ({ width: 375, height: 812 })),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    },
    useWindowDimensions: jest.fn(() => ({ width: 375, height: 812 })),
    LayoutAnimation: {
      configureNext: jest.fn(),
      create: jest.fn(),
      Types: {
        easeInEaseOut: 'easeInEaseOut',
      },
      Properties: {
        opacity: 'opacity',
      },
    },
    InteractionManager: {
      runAfterInteractions: jest.fn((callback) => {
        // In tests, execute immediately
        if (typeof callback === 'function') {
          callback()
        }
        return { cancel: jest.fn() }
      }),
    },
  }
})

// Mock Tamagui components
jest.mock('tamagui', () => {
  const React = require('react')
  return {
    Button: ({ children, onPress, testID, ...props }: any) =>
      React.createElement('button', { onPress, testID, ...props }, children),
    XStack: ({ children, testID, ...props }: any) =>
      React.createElement(
        'div',
        { testID, style: { display: 'flex', flexDirection: 'row' }, ...props },
        children
      ),
    YStack: ({ children, testID, ...props }: any) =>
      React.createElement(
        'div',
        { testID, style: { display: 'flex', flexDirection: 'column' }, ...props },
        children
      ),
    ScrollView: ({ children, testID, ...props }: any) =>
      React.createElement('div', { testID, style: { overflow: 'auto' }, ...props }, children),
    Circle: ({ children, testID, ...props }: any) =>
      React.createElement('div', { testID, style: { borderRadius: '50%' }, ...props }, children),
    Text: ({ children, testID, ...props }: any) =>
      React.createElement('span', { testID, ...props }, children),
  }
})

// @my/ui/components/VideoAnalysis mocks moved to test files for specificity

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

// Note: useAnalysisRealtime hooks removed - they were dead code (only used in tests)

// Mock React Native StyleSheet (standalone path and global for @testing-library/react-native)
const mockStyleSheet = {
  flatten: jest.fn((style) => style || {}),
  create: jest.fn((styles) => styles),
  absoluteFill: {},
  absoluteFillObject: {},
  hairlineWidth: 1,
}

jest.mock('react-native/Libraries/StyleSheet/StyleSheet', () => mockStyleSheet)

// Expose StyleSheet globally for @testing-library/react-native
Object.defineProperty(global, 'StyleSheet', {
  value: mockStyleSheet,
  writable: true,
  configurable: true,
})

// Mock crypto for UUID generation
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: jest.fn(() => 'test-uuid-' + Math.random().toString(36).substr(2, 9)),
  },
})

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}

// Global logger mocking - silent by default, can be overridden in individual tests
jest.mock('@my/logging', () => ({
  log: {
    trace: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    fatal: jest.fn(),
  },
  logger: {
    trace: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    fatal: jest.fn(),
  },
  logOnChange: jest.fn(),
}))

// Mock react-native-reanimated for animation hooks
jest.mock('react-native-reanimated', () => {
  const React = require('react')
  return {
    useAnimatedStyle: () => ({}),
    useAnimatedReaction: () => {},
    useSharedValue: (initialValue: any) => ({
      value: initialValue,
    }),
    useDerivedValue: (callback: () => any) => ({
      value: callback(),
    }),
    useAnimatedGestureHandler: (handler: any) => handler,
    withSpring: (targetValue: any) => targetValue,
    withTiming: (targetValue: any) => targetValue,
    scrollTo: jest.fn(),
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
    cancelAnimation: jest.fn(),
    Animated: {
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
    },
    Easing: {
      linear: (t: number) => t,
      easeIn: (t: number) => t * t,
      easeOut: (t: number) => (1 - Math.cos(t * Math.PI)) / 2,
      easeInOut: (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2),
      quad: (t: number) => t * t,
      cubic: (t: number) => t * t * t,
      quart: (t: number) => t * t * t * t,
      quint: (t: number) => t * t * t * t * t,
      sine: (t: number) => 1 - Math.cos((t * Math.PI) / 2),
      expo: (t: number) => 2 ** (10 * (t - 1)),
      circ: (t: number) => 1 - Math.sqrt(1 - t * t),
      back: (t: number) => t * t * (2.70158 * t - 1.70158),
      bounce: (t: number) => {
        if (t < 1 / 2.75) {
          return 7.5625 * t * t
        }
        if (t < 2 / 2.75) {
          return 7.5625 * (t - 1.5 / 2.75) * t + 0.75
        }
        if (t < 2.5 / 2.75) {
          return 7.5625 * (t - 2.25 / 2.75) * t + 0.9375
        }
        return 7.5625 * (t - 2.625 / 2.75) * t + 0.984375
      },
      bezier: (_x1: number, _y1: number, _x2: number, _y2: number) => (t: number) => t,
    },
    useAnimatedRef: () => React.useRef(null),
  }
})

// Mock react-native-gesture-handler
jest.mock('react-native-gesture-handler', () => {
  const React = require('react')
  return {
    Gesture: {
      Pan: jest.fn(() => ({
        onUpdate: jest.fn(),
        onFinalize: jest.fn(),
      })),
      Tap: jest.fn(() => ({
        onEnd: jest.fn(),
      })),
      LongPress: jest.fn(() => ({
        onStart: jest.fn(),
      })),
      Pinch: jest.fn(() => ({
        onUpdate: jest.fn(),
      })),
      Rotation: jest.fn(() => ({
        onUpdate: jest.fn(),
      })),
      Fling: jest.fn(() => ({
        onEnd: jest.fn(),
      })),
      Race: jest.fn((...gestures: any) => gestures[0]),
      Simultaneous: jest.fn((...gestures: any) => gestures[0]),
      Exclusive: jest.fn((...gestures: any) => gestures[0]),
    },
    GestureDetector: ({ children }: { children: any; gesture?: any }) =>
      React.createElement(React.Fragment, null, children),
    GestureHandlerRootView: ({ children, ...props }: any) =>
      React.createElement('div', { ...props }, children),
    gestureHandlerRootHOC: (Component: any) => Component,
    createNativeWrapper: (Component: any) => Component,
  }
})
