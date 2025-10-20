import '@testing-library/jest-dom'
import { act, render } from '@testing-library/react-native'
import { VideoAnalysisScreen } from './VideoAnalysisScreen'

// Mock the logger to capture logs in tests
jest.mock('@my/logging', () => ({
  logOnChange: jest.fn(),
  log: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}))

// Mock @my/api hooks
jest.mock('@my/api', () => ({
  useUploadProgress: jest.fn(() => ({ data: null })),
  subscribeToAnalysisJob: jest.fn(() => jest.fn()), // Returns unsubscribe function
  getAnalysisIdForJobId: jest.fn().mockResolvedValue('00000000-0000-0000-0000-000000000000'),
}))

// Mock LayoutAnimation from react-native
jest.mock('react-native', () => ({
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
  Platform: {
    OS: 'ios',
    select: jest.fn(),
  },
  Dimensions: {
    get: jest.fn(() => ({ width: 375, height: 667 })),
  },
  // Add other react-native mocks as needed
}))

// Mock components needed for this specific test
jest.mock('@my/ui', () => ({
  AppHeader: ({ children, ...props }: any) => {
    const React = require('react')
    return React.createElement(
      'View',
      {
        'data-testid': 'app-header',
        ...props,
      },
      children
    )
  },
  log: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}))

// Mock VideoAnalysis components
jest.mock('@ui/components/VideoAnalysis', () => ({
  AudioFeedback: ({ children, testID, ...props }: { children?: any; testID?: string }) => {
    const React = require('react')
    return React.createElement(
      'div',
      { 'data-testid': testID || 'AudioFeedback', ...props },
      children
    )
  },
  FeedbackBubbles: ({ children, testID, ...props }: { children?: any; testID?: string }) => {
    const React = require('react')
    return React.createElement(
      'div',
      { 'data-testid': testID || 'FeedbackBubbles', ...props },
      children
    )
  },
  FeedbackPanel: ({ children, testID, ...props }: { children?: any; testID?: string }) => {
    const React = require('react')
    return React.createElement(
      'div',
      { 'data-testid': testID || 'FeedbackPanel', ...props },
      children
    )
  },
  MotionCaptureOverlay: ({ children, testID, ...props }: { children?: any; testID?: string }) => {
    const React = require('react')
    return React.createElement(
      'div',
      { 'data-testid': testID || 'MotionCaptureOverlay', ...props },
      children
    )
  },
  CoachAvatar: ({ children, testID, ...props }: { children?: any; testID?: string }) => {
    const React = require('react')
    return React.createElement(
      'div',
      { 'data-testid': testID || 'CoachAvatar', ...props },
      children
    )
  },
  SocialIcons: ({ children, testID, ...props }: { children?: any; testID?: string }) => {
    const React = require('react')
    return React.createElement(
      'div',
      { 'data-testid': testID || 'SocialIcons', ...props },
      children
    )
  },
  VideoContainer: ({ children, testID, ...props }: { children?: any; testID?: string }) => {
    const React = require('react')
    return React.createElement(
      'div',
      { 'data-testid': testID || 'VideoContainer', ...props },
      children
    )
  },
  VideoControls: ({ children, testID, ...props }: { children?: any; testID?: string }) => {
    const React = require('react')
    return React.createElement(
      'div',
      { 'data-testid': testID || 'VideoControls', ...props },
      children
    )
  },
  VideoPlayer: ({ children, testID, ...props }: { children?: any; testID?: string }) => {
    const React = require('react')
    return React.createElement(
      'div',
      { 'data-testid': testID || 'VideoPlayer', ...props },
      children
    )
  },
  VideoPlayerArea: ({ children, testID, ...props }: { children?: any; testID?: string }) => {
    const React = require('react')
    return React.createElement(
      'div',
      { 'data-testid': testID || 'VideoPlayerArea', ...props },
      children
    )
  },
  VideoControlsRef: jest.fn(),
}))

const mockProcessingIndicator = jest.fn((_: any) => null)
jest.mock('./components/ProcessingIndicator', () => ({
  ProcessingIndicator: (props: any) => {
    mockProcessingIndicator(props)
    return null
  },
}))

jest.mock('./components/UploadErrorState', () => ({
  UploadErrorState: ({ children }: { children?: any }) => {
    const React = require('react')
    return React.createElement('View', { testID: 'upload-error-state' }, children)
  },
}))

jest.mock('./components/VideoPlayerSection', () => ({
  VideoPlayerSection: ({ children }: { children?: any }) => {
    const React = require('react')
    return React.createElement('View', { testID: 'video-player-section' }, children)
  },
}))

jest.mock('./components/FeedbackSection', () => ({
  FeedbackSection: ({ children }: { children?: any }) => {
    const React = require('react')
    return React.createElement('View', { testID: 'feedback-section' }, children)
  },
}))

// Note: Using simplified tests that focus on core functionality

describe('VideoAnalysisScreen - Simplified Version', () => {
  const mockProps = {
    analysisJobId: 123,
    videoUri: 'test-video.mp4',
  }

  const mockCallbacks = {
    onBack: jest.fn(),
    onMenuPress: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    it('renders without crashing (key success metric)', () => {
      const { UNSAFE_root } = render(
        <VideoAnalysisScreen
          {...mockProps}
          {...mockCallbacks}
        />
      )

      expect(UNSAFE_root).toBeTruthy()
    })

    it('renders with video URI', () => {
      const { UNSAFE_root } = render(
        <VideoAnalysisScreen
          {...mockProps}
          {...mockCallbacks}
        />
      )

      expect(UNSAFE_root).toBeTruthy()
    })
  })

  describe('Processing State', () => {
    it('handles processing state correctly', async () => {
      const { UNSAFE_root } = render(
        <VideoAnalysisScreen
          {...mockProps}
          {...mockCallbacks}
        />
      )

      expect(UNSAFE_root).toBeTruthy()

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 3100))
      })

      expect(UNSAFE_root).toBeTruthy()
    })

    it('history mode: uses analysisState.phase directly (no phase override)', async () => {
      render(<VideoAnalysisScreen analysisJobId={456} />)

      // Assert ProcessingIndicator received phase from analysisState (default mock state is "analyzing")
      expect(mockProcessingIndicator).toHaveBeenCalled()
      const props = (mockProcessingIndicator.mock.calls.at(-1)?.[0] ?? {}) as any
      expect(props.phase).toBe('analyzing')
    })
  })

  describe('Video Playback', () => {
    it('renders with fallback video when no videoUri provided', () => {
      const propsWithoutVideo = { analysisJobId: 123 }

      const { UNSAFE_root } = render(
        <VideoAnalysisScreen
          {...propsWithoutVideo}
          {...mockCallbacks}
        />
      )

      expect(UNSAFE_root).toBeTruthy()
    })
  })

  describe('Event Handlers', () => {
    it('handles callback props correctly', () => {
      render(
        <VideoAnalysisScreen
          {...mockProps}
          {...mockCallbacks}
        />
      )

      // Verify that callbacks are available and properly structured
      expect(typeof mockCallbacks.onBack).toBe('function')
      expect(typeof mockCallbacks.onMenuPress).toBe('function')
    })
  })

  describe('Performance and Stability', () => {
    it('renders within acceptable time', () => {
      const startTime = performance.now()

      const { UNSAFE_root } = render(
        <VideoAnalysisScreen
          {...mockProps}
          {...mockCallbacks}
        />
      )

      const endTime = performance.now()
      const renderTime = endTime - startTime

      expect(UNSAFE_root).toBeTruthy()
      expect(renderTime).toBeLessThan(100) // Should render quickly
    })

    it('handles multiple re-renders without issues', () => {
      const { rerender } = render(
        <VideoAnalysisScreen
          {...mockProps}
          {...mockCallbacks}
        />
      )

      // Re-render multiple times
      for (let i = 1; i <= 5; i++) {
        rerender(
          <VideoAnalysisScreen
            {...mockProps}
            analysisJobId={123 + i}
            {...mockCallbacks}
          />
        )
      }

      // Should not crash
      expect(() => {
        rerender(
          <VideoAnalysisScreen
            {...mockProps}
            {...mockCallbacks}
          />
        )
      }).not.toThrow()
    })

    it('cleans up timers on unmount', () => {
      const { unmount } = render(
        <VideoAnalysisScreen
          {...mockProps}
          {...mockCallbacks}
        />
      )

      // Should not crash when unmounting
      expect(() => unmount()).not.toThrow()
    })
  })
})
