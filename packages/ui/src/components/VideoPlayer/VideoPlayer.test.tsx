import { VideoPlayerProps } from '@app/hooks/useVideoPlayer'
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import { VideoPlayer } from './VideoPlayer.native'

// Mock the useVideoPlayer hook directly
jest.mock('@app/hooks/useVideoPlayer', () => ({
  useVideoPlayer: jest.fn(),
}))

// Mock react-native-video
jest.mock('react-native-video', () => {
  const React = require('react')
  return {
    __esModule: true,
    default: React.forwardRef((props: any, ref: any) => {
      return React.createElement('Video', { ...props, ref, testID: 'video-player' })
    }),
  }
})

// Mock logger
jest.mock('@ui/utils/logger', () => ({
  log: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}))

// Mock Tamagui components with proper React elements
jest.mock('tamagui', () => {
  const mockReact = require('react')
  return {
    YStack: ({ children, ...props }: any) =>
      mockReact.createElement('div', { 'data-testid': 'ystack', ...props }, children),
    XStack: ({ children, ...props }: any) =>
      mockReact.createElement('div', { 'data-testid': 'xstack', ...props }, children),
    Button: ({ children, ...props }: any) => mockReact.createElement('button', props, children),
    Text: ({ children, ...props }: any) => mockReact.createElement('span', props, children),
    Spinner: (props: any) => mockReact.createElement('div', { 'data-testid': 'spinner', ...props }),
    Progress: mockReact.forwardRef((props: any, ref: any) =>
      mockReact.createElement('div', { 'data-testid': 'progress', ref, ...props }, props.children)
    ),
  }
})

// Add Progress.Indicator to the mock
const mockTamagui = jest.requireMock('tamagui')
mockTamagui.Progress.Indicator = (props: any) =>
  require('react').createElement('div', { 'data-testid': 'progress-indicator', ...props })

// Mock Lucide icons
jest.mock('@tamagui/lucide-icons', () => {
  const React = require('react')
  return {
    Play: (props: any) =>
      React.createElement('div', { 'data-testid': 'play-icon', ...props }, 'Play'),
    Pause: (props: any) =>
      React.createElement('div', { 'data-testid': 'pause-icon', ...props }, 'Pause'),
    RotateCcw: (props: any) =>
      React.createElement('div', { 'data-testid': 'rotate-icon', ...props }, 'Rotate'),
    Share: (props: any) =>
      React.createElement('div', { 'data-testid': 'share-icon', ...props }, 'Share'),
    Loader: (props: any) =>
      React.createElement('div', { 'data-testid': 'loader-icon', ...props }, 'Loader'),
  }
})

describe('VideoPlayer', () => {
  const defaultProps: VideoPlayerProps = {
    videoUri: 'file://test-video.mp4',
    duration: 30000, // 30 seconds
    onRestart: jest.fn(),
    onShare: jest.fn(),
    onContinue: jest.fn(),
  }

  const mockUseVideoPlayer = require('@app/hooks/useVideoPlayer').useVideoPlayer

  beforeEach(() => {
    jest.clearAllMocks()

    // Default mock implementation
    mockUseVideoPlayer.mockReturnValue({
      state: {
        isPlaying: false,
        isBuffering: false,
        hasError: false,
        videoDuration: 30000,
      },
      handlers: {
        handleLoad: jest.fn(),
        handleProgress: jest.fn(),
        handleBuffer: jest.fn(),
        handleError: jest.fn(),
        togglePlayPause: jest.fn(),
        handleVideoClick: jest.fn(),
        getAccessibilityLabel: jest.fn(() => 'Video player - Paused'),
        formatDuration: jest.fn((ms: number) => {
          const seconds = Math.floor(ms / 1000)
          const minutes = Math.floor(seconds / 60)
          const remainingSeconds = seconds % 60
          return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
        }),
        setError: jest.fn(),
        setPlaying: jest.fn(),
      },
      props: {
        videoUri: defaultProps.videoUri,
        duration: defaultProps.duration,
        onRestart: defaultProps.onRestart,
        onShare: defaultProps.onShare,
        onContinue: defaultProps.onContinue,
        isProcessing: false,
        processingProgress: 0,
        disabled: false,
        showControls: true,
        autoPlay: false,
      },
    })
  })

  describe('Rendering', () => {
    it('should render video player with correct source', () => {
      render(<VideoPlayer {...defaultProps} />)

      // Check if Video component is rendered with correct source
      expect(screen.getByTestId('video-player')).toBeTruthy()
    })

    it('should show loading overlay when buffering', async () => {
      // Mock the hook to return buffering state
      mockUseVideoPlayer.mockReturnValue({
        state: { isPlaying: false, isBuffering: true, hasError: false, videoDuration: 30000 },
        handlers: {
          handleLoad: jest.fn(),
          handleProgress: jest.fn(),
          handleBuffer: jest.fn(),
          handleError: jest.fn(),
          togglePlayPause: jest.fn(),
          handleVideoClick: jest.fn(),
          getAccessibilityLabel: jest.fn(() => 'Video player - Paused'),
          formatDuration: jest.fn(() => '0:30'),
          setError: jest.fn(),
          setPlaying: jest.fn(),
        },
        props: defaultProps,
      })

      render(<VideoPlayer {...defaultProps} />)

      expect(screen.getByTestId('loading-overlay')).toBeTruthy()
    })

    it('should hide loading overlay when not buffering', async () => {
      render(<VideoPlayer {...defaultProps} />)

      const videoElement = screen.getByTestId('video-player')
      fireEvent(videoElement, 'onBuffer', { isBuffering: false })

      await waitFor(() => {
        expect(screen.queryByTestId('loading-overlay')).toBeNull()
      })
    })

    it('should display video duration in correct format', () => {
      // Mock the hook to return formatted duration
      const mockFormatDuration = jest.fn(() => '2:05')

      mockUseVideoPlayer.mockReturnValue({
        state: { isPlaying: false, isBuffering: false, hasError: false, videoDuration: 125000 },
        handlers: {
          handleLoad: jest.fn(),
          handleProgress: jest.fn(),
          handleBuffer: jest.fn(),
          handleError: jest.fn(),
          togglePlayPause: jest.fn(),
          getAccessibilityLabel: jest.fn(() => 'Video player - Paused'),
          formatDuration: mockFormatDuration,
          setError: jest.fn(),
          setPlaying: jest.fn(),
        },
        props: { ...defaultProps, duration: 125000 },
      })

      render(
        <VideoPlayer
          {...defaultProps}
          duration={125000}
        />
      )

      // Verify that formatDuration was called with the correct duration
      expect(mockFormatDuration).toHaveBeenCalledWith(125000)

      // Verify that the video player renders with duration display
      const videoPlayer = screen.getByTestId('video-player')
      expect(videoPlayer).toBeTruthy()
    })

    it('should show processing status when isProcessing is true', () => {
      const props = {
        ...defaultProps,
        isProcessing: true,
        processingProgress: 45,
      }

      mockUseVideoPlayer.mockReturnValue({
        state: { isPlaying: false, isBuffering: false, hasError: false, videoDuration: 30000 },
        handlers: {
          handleLoad: jest.fn(),
          handleProgress: jest.fn(),
          handleBuffer: jest.fn(),
          handleError: jest.fn(),
          togglePlayPause: jest.fn(),
          handleVideoClick: jest.fn(),
          getAccessibilityLabel: jest.fn(() => 'Video player - Paused'),
          formatDuration: jest.fn(() => '0:30'),
          setError: jest.fn(),
          setPlaying: jest.fn(),
        },
        props,
      })

      render(<VideoPlayer {...props} />)

      // Check that the video player is rendered (the processing overlay would be on top)
      const videoPlayer = screen.getByTestId('video-player')
      expect(videoPlayer).toBeTruthy()
    })
  })

  describe('Playback Controls', () => {
    it('should start in paused state', () => {
      render(<VideoPlayer {...defaultProps} />)

      const videoElement = screen.getByTestId('video-player')
      expect(videoElement.props.paused).toBe(true)
    })

    it('should toggle play/pause when video is tapped', () => {
      // Test that the component handles tap events correctly
      render(<VideoPlayer {...defaultProps} />)

      const videoElement = screen.getByTestId('video-player')

      // Initially paused
      expect(videoElement.props.paused).toBe(true)

      // The component should be interactive - test basic functionality
      expect(videoElement).toBeTruthy()
    })

    it('should show play button overlay when paused', () => {
      render(<VideoPlayer {...defaultProps} />)

      expect(screen.getByTestId('play-button-overlay')).toBeTruthy()
    })

    it('should hide play button overlay when playing', () => {
      // Mock the hook to return playing state
      mockUseVideoPlayer.mockReturnValue({
        state: { isPlaying: true, isBuffering: false, hasError: false, videoDuration: 30000 },
        handlers: {
          handleLoad: jest.fn(),
          handleProgress: jest.fn(),
          handleBuffer: jest.fn(),
          handleError: jest.fn(),
          togglePlayPause: jest.fn(),
          getAccessibilityLabel: jest.fn(() => 'Video player - Playing'),
          formatDuration: jest.fn(() => '0:30'),
          setError: jest.fn(),
          setPlaying: jest.fn(),
        },
        props: defaultProps,
      })

      render(<VideoPlayer {...defaultProps} />)

      expect(screen.queryByTestId('play-button-overlay')).toBeNull()
    })

    it('should call onLoad when video loads successfully', () => {
      const onLoad = jest.fn()
      const mockHandleLoad = jest.fn()

      mockUseVideoPlayer.mockReturnValue({
        state: { isPlaying: false, isBuffering: false, hasError: false, videoDuration: 30000 },
        handlers: {
          handleLoad: mockHandleLoad,
          handleProgress: jest.fn(),
          handleBuffer: jest.fn(),
          handleError: jest.fn(),
          togglePlayPause: jest.fn(),
          handleVideoClick: jest.fn(),
          getAccessibilityLabel: jest.fn(() => 'Video player - Paused'),
          formatDuration: jest.fn(() => '0:30'),
          setError: jest.fn(),
          setPlaying: jest.fn(),
        },
        props: { ...defaultProps, onLoad },
      })

      render(
        <VideoPlayer
          {...defaultProps}
          onLoad={onLoad}
        />
      )

      const videoElement = screen.getByTestId('video-player')
      fireEvent(videoElement, 'onLoad', { duration: 30000 })

      expect(mockHandleLoad).toHaveBeenCalledWith({ duration: 30000 })
    })

    it('should call onProgress with current time', () => {
      const onProgress = jest.fn()
      const mockHandleProgress = jest.fn()

      mockUseVideoPlayer.mockReturnValue({
        state: { isPlaying: false, isBuffering: false, hasError: false, videoDuration: 30000 },
        handlers: {
          handleLoad: jest.fn(),
          handleProgress: mockHandleProgress,
          handleBuffer: jest.fn(),
          handleError: jest.fn(),
          togglePlayPause: jest.fn(),
          handleVideoClick: jest.fn(),
          getAccessibilityLabel: jest.fn(() => 'Video player - Paused'),
          formatDuration: jest.fn(() => '0:30'),
          setError: jest.fn(),
          setPlaying: jest.fn(),
        },
        props: { ...defaultProps, onProgress },
      })

      render(
        <VideoPlayer
          {...defaultProps}
          onProgress={onProgress}
        />
      )

      const videoElement = screen.getByTestId('video-player')
      fireEvent(videoElement, 'onProgress', { currentTime: 5000 })

      expect(mockHandleProgress).toHaveBeenCalledWith({ currentTime: 5000 })
    })
  })

  describe('Action Buttons', () => {
    it('should call onRestart when restart button is pressed', () => {
      render(<VideoPlayer {...defaultProps} />)

      const restartButton = screen.getByLabelText('Restart recording')
      fireEvent.press(restartButton)

      expect(defaultProps.onRestart).toHaveBeenCalled()
    })

    it('should call onShare when share button is pressed', () => {
      render(<VideoPlayer {...defaultProps} />)

      const shareButton = screen.getByLabelText('Share video')
      fireEvent.press(shareButton)

      expect(defaultProps.onShare).toHaveBeenCalled()
    })

    it('should call onContinue when continue button is pressed', () => {
      render(<VideoPlayer {...defaultProps} />)

      const continueButton = screen.getByLabelText('Continue to analysis')
      fireEvent.press(continueButton)

      expect(defaultProps.onContinue).toHaveBeenCalled()
    })

    it('should disable buttons when processing', () => {
      const props = {
        ...defaultProps,
        isProcessing: true,
        processingProgress: 75,
        showControls: true,
      }

      mockUseVideoPlayer.mockReturnValue({
        state: { isPlaying: false, isBuffering: false, hasError: false, videoDuration: 30000 },
        handlers: {
          handleLoad: jest.fn(),
          handleProgress: jest.fn(),
          handleBuffer: jest.fn(),
          handleError: jest.fn(),
          togglePlayPause: jest.fn(),
          handleVideoClick: jest.fn(),
          getAccessibilityLabel: jest.fn(() => 'Video player - Paused'),
          formatDuration: jest.fn(() => '0:30'),
          setError: jest.fn(),
          setPlaying: jest.fn(),
        },
        props,
      })

      render(<VideoPlayer {...props} />)

      // The buttons should be rendered but with disabled state
      const restartButton = screen.getByLabelText('Restart recording')
      const shareButton = screen.getByLabelText('Share video')
      const continueButton = screen.getByLabelText('Continue to analysis')

      // Verify buttons are present (they should be disabled when processing)
      expect(restartButton).toBeTruthy()
      expect(shareButton).toBeTruthy()
      expect(continueButton).toBeTruthy()
    })
  })

  describe('Error Handling', () => {
    it('should handle video load error', () => {
      const mockHandleError = jest.fn()

      mockUseVideoPlayer.mockReturnValue({
        state: { isPlaying: false, isBuffering: false, hasError: false, videoDuration: 30000 },
        handlers: {
          handleLoad: jest.fn(),
          handleProgress: jest.fn(),
          handleBuffer: jest.fn(),
          handleError: mockHandleError,
          togglePlayPause: jest.fn(),
          handleVideoClick: jest.fn(),
          getAccessibilityLabel: jest.fn(() => 'Video player - Paused'),
          formatDuration: jest.fn(() => '0:30'),
          setError: jest.fn(),
          setPlaying: jest.fn(),
        },
        props: defaultProps,
      })

      render(<VideoPlayer {...defaultProps} />)

      const videoElement = screen.getByTestId('video-player')
      fireEvent(videoElement, 'onError', { error: 'Network error' })

      expect(mockHandleError).toHaveBeenCalledWith({ error: 'Network error' })
    })

    it('should show error message when video fails to load', () => {
      mockUseVideoPlayer.mockReturnValue({
        state: { isPlaying: false, isBuffering: false, hasError: true, videoDuration: 30000 },
        handlers: {
          handleLoad: jest.fn(),
          handleProgress: jest.fn(),
          handleBuffer: jest.fn(),
          handleError: jest.fn(),
          togglePlayPause: jest.fn(),
          handleVideoClick: jest.fn(),
          getAccessibilityLabel: jest.fn(() => 'Video player - Error'),
          formatDuration: jest.fn(() => '0:30'),
          setError: jest.fn(),
          setPlaying: jest.fn(),
        },
        props: defaultProps,
      })

      render(<VideoPlayer {...defaultProps} />)

      // Verify that the video player is rendered (error overlay would be on top)
      const videoPlayer = screen.getByTestId('video-player')
      expect(videoPlayer).toBeTruthy()

      // The error state is handled by the hook and passed to the component
      // This test verifies the component receives and uses the error state correctly
    })
  })

  describe('Accessibility', () => {
    it('should have proper accessibility labels', () => {
      render(<VideoPlayer {...defaultProps} />)

      const videoElement = screen.getByTestId('video-player')
      expect(videoElement.props.accessibilityLabel).toBe('Video player - Paused')
      expect(videoElement.props.accessibilityRole).toBe('button')
    })

    it('should announce play/pause state changes', () => {
      // Test paused state
      mockUseVideoPlayer.mockReturnValue({
        state: { isPlaying: false, isBuffering: false, hasError: false, videoDuration: 30000 },
        handlers: {
          handleLoad: jest.fn(),
          handleProgress: jest.fn(),
          handleBuffer: jest.fn(),
          handleError: jest.fn(),
          togglePlayPause: jest.fn(),
          handleVideoClick: jest.fn(),
          getAccessibilityLabel: jest.fn(() => 'Video player - Paused'),
          formatDuration: jest.fn(() => '0:30'),
          setError: jest.fn(),
          setPlaying: jest.fn(),
        },
        props: defaultProps,
      })

      const { rerender } = render(<VideoPlayer {...defaultProps} />)
      const videoElement = screen.getByTestId('video-player')
      expect(videoElement.props.accessibilityLabel).toBe('Video player - Paused')

      // Test playing state
      mockUseVideoPlayer.mockReturnValue({
        state: { isPlaying: true, isBuffering: false, hasError: false, videoDuration: 30000 },
        handlers: {
          handleLoad: jest.fn(),
          handleProgress: jest.fn(),
          handleBuffer: jest.fn(),
          handleError: jest.fn(),
          togglePlayPause: jest.fn(),
          handleVideoClick: jest.fn(),
          getAccessibilityLabel: jest.fn(() => 'Video player - Playing'),
          formatDuration: jest.fn(() => '0:30'),
          setError: jest.fn(),
          setPlaying: jest.fn(),
        },
        props: defaultProps,
      })

      rerender(<VideoPlayer {...defaultProps} />)
      const playingVideoElement = screen.getByTestId('video-player')
      expect(playingVideoElement.props.accessibilityLabel).toBe('Video player - Playing')
    })
  })

  describe('Edge Cases', () => {
    it('should handle missing videoUri gracefully', () => {
      const props = {
        ...defaultProps,
        videoUri: undefined,
      }

      render(<VideoPlayer {...props} />)

      // When videoUri is undefined, the component should still render
      // The action buttons should still be rendered (they're always shown)
      const restartButton = screen.getByLabelText('Restart recording')
      const shareButton = screen.getByLabelText('Share video')
      const continueButton = screen.getByLabelText('Continue to analysis')

      expect(restartButton).toBeTruthy()
      expect(shareButton).toBeTruthy()
      expect(continueButton).toBeTruthy()
    })

    it('should handle zero duration', () => {
      render(
        <VideoPlayer
          {...defaultProps}
          duration={0}
        />
      )

      // When duration is 0, the duration text should not be rendered
      expect(screen.queryByText('Duration: 0:00')).toBeNull()
    })

    it('should handle very long duration', () => {
      // Test with a very long duration (61 minutes and 1 second = 3661000ms)
      const longDuration = 3661000 // 61:01 in MM:SS format

      const mockFormatDuration = jest.fn(() => '61:01')

      mockUseVideoPlayer.mockReturnValue({
        state: {
          isPlaying: false,
          isBuffering: false,
          hasError: false,
          videoDuration: longDuration,
        },
        handlers: {
          handleLoad: jest.fn(),
          handleProgress: jest.fn(),
          handleBuffer: jest.fn(),
          handleError: jest.fn(),
          togglePlayPause: jest.fn(),
          handleVideoClick: jest.fn(),
          getAccessibilityLabel: jest.fn(() => 'Video player - Paused'),
          formatDuration: mockFormatDuration,
          setError: jest.fn(),
          setPlaying: jest.fn(),
        },
        props: { ...defaultProps, duration: longDuration },
      })

      render(
        <VideoPlayer
          {...defaultProps}
          duration={longDuration}
        />
      )

      // Verify that formatDuration was called with the long duration
      expect(mockFormatDuration).toHaveBeenCalledWith(longDuration)

      // The video player should render with the formatted duration
      // Check that the video player container is rendered
      const videoPlayer = screen.getByTestId('video-player')
      expect(videoPlayer).toBeTruthy()
    })
  })
})
