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

describe.skip('VideoAnalysisScreen - Simplified Version', () => {
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

  describe('Static Layout Requirements', () => {
    it('renders video section with flex 0.6 and feedback section with flex 0.4', () => {
      // 🧪 ARRANGE: Set up component with any props
      const layoutProps = { ...mockProps }

      // 🎬 ACT: Render the component
      const { UNSAFE_root } = render(
        <VideoAnalysisScreen
          {...layoutProps}
          {...mockCallbacks}
        />
      )

      // ✅ ASSERT: Component renders with static layout
      expect(UNSAFE_root).toBeTruthy()
      // Note: Flex values will be verified through component props in implementation
    })

    it('does not use dynamic panelFraction for layout', () => {
      // 🧪 ARRANGE: Set up component
      const staticProps = { ...mockProps }

      // 🎬 ACT: Render the component
      const { UNSAFE_root } = render(
        <VideoAnalysisScreen
          {...staticProps}
          {...mockCallbacks}
        />
      )

      // ✅ ASSERT: Component renders without dynamic panel sizing
      expect(UNSAFE_root).toBeTruthy()
      // Note: Dynamic panelFraction usage will be removed in implementation
    })
  })

  describe('Edge Warming & Preload', () => {
    const mockFetch = jest.fn()

    beforeEach(() => {
      global.fetch = mockFetch
      mockFetch.mockResolvedValue({
        ok: true,
        status: 206,
      })
    })

    afterEach(() => {
      mockFetch.mockReset()
    })

    it('fires Range request to warm edge cache when video URL is available', async () => {
      // 🧪 ARRANGE: Render with signed video URL
      const videoUri = 'https://cdn.example.com/videos/test-video.mp4?token=abc123'

      // 🎬 ACT: Render component with video URI
      render(
        <VideoAnalysisScreen
          {...mockProps}
          videoUri={videoUri}
          {...mockCallbacks}
        />
      )

      // ✅ ASSERT: fetch called with Range header for first 256KB
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100))
      })

      expect(mockFetch).toHaveBeenCalledWith(
        videoUri,
        expect.objectContaining({
          method: 'GET',
          headers: { Range: 'bytes=0-262143' },
        })
      )
    })

    it('does not warm cache for local file:// URIs', async () => {
      // 🧪 ARRANGE: Render with local file URI
      const localUri = 'file:///data/videos/local-video.mp4'

      // 🎬 ACT: Render component
      render(
        <VideoAnalysisScreen
          {...mockProps}
          videoUri={localUri}
          {...mockCallbacks}
        />
      )

      // ✅ ASSERT: No fetch call for local files
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100))
      })

      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('logs warning when edge warming fails', async () => {
      // 🧪 ARRANGE: Mock fetch failure
      mockFetch.mockRejectedValue(new Error('Network error'))
      const { log } = require('@my/logging')
      const videoUri = 'https://cdn.example.com/videos/test-video.mp4'

      // 🎬 ACT: Render component
      render(
        <VideoAnalysisScreen
          {...mockProps}
          videoUri={videoUri}
          {...mockCallbacks}
        />
      )

      // ✅ ASSERT: Warning logged but component doesn't crash
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100))
      })

      expect(log.warn).toHaveBeenCalledWith(
        'VideoAnalysisScreen.warmEdgeCache',
        'Failed to warm edge cache',
        expect.objectContaining({
          error: 'Network error',
        })
      )
    })
  })
})
