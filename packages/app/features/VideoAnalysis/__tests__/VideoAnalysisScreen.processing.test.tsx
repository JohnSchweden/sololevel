import { act, render, screen } from '@testing-library/react'
import { VideoAnalysisScreen } from '../VideoAnalysisScreen'

// Mock @my/api hooks
jest.mock('@my/api', () => ({
  useUploadProgress: jest.fn(),
  subscribeToAnalysisJob: jest.fn(),
}))

// Mock @ui/components/VideoAnalysis components as React components
jest.mock('@ui/components/VideoAnalysis', () => ({
  VideoControls: ({ isProcessing }: any) => (
    <div
      data-testid="video-controls"
      data-processing={String(!!isProcessing)}
    />
  ),
  VideoPlayer: ({ isPlaying }: any) => (
    <div
      data-testid="video-player"
      data-playing={String(!!isPlaying)}
    />
  ),
  VideoContainer: ({ children }: any) => <div>{children}</div>,
  VideoPlayerArea: ({ children }: any) => <div>{children}</div>,
  AppHeader: () => <div />,
  MotionCaptureOverlay: () => <div />,
  FeedbackBubbles: () => <div />,
  AudioFeedback: () => <div />,
  CoachAvatar: () => <div />,
  FeedbackPanel: () => <div />,
  SocialIcons: () => <div />,
}))

describe('VideoAnalysisScreen - Processing State', () => {
  const mockUseUploadProgress = require('@my/api').useUploadProgress
  const mockSubscribeToAnalysisJob = require('@my/api').subscribeToAnalysisJob

  const defaultProps = {
    analysisJobId: 123,
    videoRecordingId: 456,
    videoUri: 'test-video.mp4',
    initialStatus: 'processing' as const,
    onBack: jest.fn(),
    onMenuPress: jest.fn(),
  }

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks()

    // Default mock implementations
    mockUseUploadProgress.mockReturnValue({ data: null })
    mockSubscribeToAnalysisJob.mockReturnValue(jest.fn())
  })

  it('shows processing when initialStatus is "processing"', () => {
    render(
      <VideoAnalysisScreen
        {...defaultProps}
        initialStatus="processing"
      />
    )

    const videoControls = screen.getByTestId('video-controls')
    expect(videoControls.getAttribute('data-processing')).toBe('true')
  })

  it('hides processing when initialStatus is "ready"', () => {
    render(
      <VideoAnalysisScreen
        {...defaultProps}
        initialStatus="ready"
      />
    )

    const videoControls = screen.getByTestId('video-controls')
    expect(videoControls.getAttribute('data-processing')).toBe('false')
  })

  it('shows processing when upload is in progress', () => {
    mockUseUploadProgress.mockReturnValue({ data: { status: 'uploading', percentage: 50 } })

    render(
      <VideoAnalysisScreen
        {...defaultProps}
        initialStatus="ready"
      />
    )

    const videoControls = screen.getByTestId('video-controls')
    expect(videoControls.getAttribute('data-processing')).toBe('true')
  })

  it('shows processing during analysis and hides when completed', () => {
    let jobCallback: (job: any) => void

    mockSubscribeToAnalysisJob.mockImplementation((_id: number, callback: (job: any) => void) => {
      jobCallback = callback
      return jest.fn() // unsubscribe function
    })

    render(
      <VideoAnalysisScreen
        {...defaultProps}
        initialStatus="ready"
      />
    )

    // Initially should be false (initialStatus="ready")
    let videoControls = screen.getByTestId('video-controls')
    expect(videoControls.getAttribute('data-processing')).toBe('false')

    // Simulate analysis starting
    act(() => {
      jobCallback({ id: 123, status: 'queued' })
    })
    videoControls = screen.getByTestId('video-controls')
    expect(videoControls.getAttribute('data-processing')).toBe('true')

    // Simulate analysis processing
    act(() => {
      jobCallback({ id: 123, status: 'processing' })
    })
    videoControls = screen.getByTestId('video-controls')
    expect(videoControls.getAttribute('data-processing')).toBe('true')

    // Simulate analysis completed
    act(() => {
      jobCallback({ id: 123, status: 'completed' })
    })
    videoControls = screen.getByTestId('video-controls')
    expect(videoControls.getAttribute('data-processing')).toBe('false')
  })

  it('auto-starts video playback when processing completes', () => {
    // Start with no upload (processing = false based on initialStatus)
    mockUseUploadProgress.mockReturnValue({ data: null })

    const { rerender } = render(
      <VideoAnalysisScreen
        {...defaultProps}
        initialStatus="processing"
      />
    )

    // Initially processing due to initialStatus
    let videoControls = screen.getByTestId('video-controls')
    expect(videoControls.getAttribute('data-processing')).toBe('true')

    let videoPlayer = screen.getByTestId('video-player')
    expect(videoPlayer.getAttribute('data-playing')).toBe('false')

    // Simulate processing completion by changing initialStatus
    rerender(
      <VideoAnalysisScreen
        {...defaultProps}
        initialStatus="ready"
      />
    )

    // Now processing should be false
    videoControls = screen.getByTestId('video-controls')
    expect(videoControls.getAttribute('data-processing')).toBe('false')

    // And video should auto-start playing
    videoPlayer = screen.getByTestId('video-player')
    expect(videoPlayer.getAttribute('data-playing')).toBe('true')
  })
})
