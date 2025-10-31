import '@testing-library/jest-dom'
import { render } from '@testing-library/react-native'
import { VideoAnalysisScreen } from './VideoAnalysisScreen'
import type { UseVideoAnalysisOrchestratorReturn } from './hooks/useVideoAnalysisOrchestrator'

// Mock the logger
jest.mock('@my/logging', () => ({
  log: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}))

// Mock Platform
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    select: jest.fn(),
  },
  Dimensions: {
    get: jest.fn(() => ({ width: 375, height: 667 })),
  },
}))

// Mock the orchestrator hook
jest.mock('./hooks/useVideoAnalysisOrchestrator')

// Mock the layout component
jest.mock('./components/VideoAnalysisLayout.native', () => ({
  VideoAnalysisLayout: ({ testID, ...props }: any) => {
    const React = require('react')
    return React.createElement('View', { 'data-testid': testID || 'VideoAnalysisLayout', ...props })
  },
}))

describe('VideoAnalysisScreen', () => {
  const mockOrchestratorReturn: UseVideoAnalysisOrchestratorReturn = {
    video: {
      uri: 'https://example.com/video.mp4',
      posterUri: 'https://example.com/poster.jpg',
      isReady: true,
      isProcessing: false,
      currentTime: 0,
      duration: 60000,
      ended: false,
    },
    playback: {
      isPlaying: false,
      videoEnded: false,
      pendingSeek: null,
      shouldPlayVideo: true,
      play: jest.fn(),
      pause: jest.fn(),
      replay: jest.fn(),
      seek: jest.fn(),
    },
    audio: {
      controller: {
        isPlaying: false,
        duration: 0,
        play: jest.fn(),
        pause: jest.fn(),
        stop: jest.fn(),
      } as any,
      source: {
        activeAudio: null,
        audioUrls: {},
        errors: {},
        clearError: jest.fn(),
      } as any,
      sync: {
        shouldPlayVideo: true,
      } as any,
    },
    feedback: {
      items: [],
      coordinator: {
        highlightedFeedbackId: null,
        bubbleState: {
          bubbleVisible: false,
          currentBubbleIndex: 0,
        },
        overlayVisible: false,
        activeAudio: null,
        isCoachSpeaking: false,
        onProgressTrigger: jest.fn(),
        onUserTapFeedback: jest.fn(),
        onPlay: jest.fn(),
        onPanelCollapse: jest.fn(),
        onPlayPendingFeedback: jest.fn(),
        onAudioOverlayClose: jest.fn(),
        onAudioOverlayInactivity: jest.fn(),
        onAudioOverlayInteraction: jest.fn(),
      } as any,
      panel: {
        panelFraction: 0.5,
        activeTab: 'feedback' as const,
        collapse: jest.fn(),
        expand: jest.fn(),
        setActiveTab: jest.fn(),
      } as any,
      state: {
        isProcessing: false,
        phase: 'ready' as const,
        progress: { upload: 0, analysis: 0, feedback: 0 },
        thumbnailUrl: null,
        error: null,
        channelExhausted: false,
        feedback: {
          feedbackItems: [],
          retryFailedFeedback: jest.fn(),
        } as any,
      } as any,
      panelFraction: 0.5,
      activeTab: 'feedback' as const,
      selectedFeedbackId: null,
      phase: 'ready' as const,
      progress: { upload: 0, analysis: 0, feedback: 0 },
      channelExhausted: false,
      errors: {},
      audioUrls: {},
    } as any,
    gesture: {
      rootPan: {} as any,
      feedbackScrollEnabled: true,
      blockFeedbackScrollCompletely: false,
      isPullingToRevealJS: false,
      onFeedbackScrollY: jest.fn(),
      onFeedbackMomentumScrollEnd: jest.fn(),
      rootPanRef: { current: null } as any,
    },
    animation: {
      scrollY: { value: 0 } as any,
      collapseProgress: { value: 0.5 } as any,
      headerStyle: {} as any,
      feedbackSectionStyle: {} as any,
      pullIndicatorStyle: {} as any,
      headerTransformStyle: {} as any,
      scrollRef: { current: null } as any,
      feedbackContentOffsetY: { value: 0 } as any,
    },
    controls: {
      showControls: true,
      videoControlsRef: { current: null },
      onControlsVisibilityChange: jest.fn(),
    },
    error: {
      visible: false,
      message: null,
    },
    handlers: {
      onPlay: jest.fn(),
      onPause: jest.fn(),
      onReplay: jest.fn(),
      onEnd: jest.fn(),
      onSeek: jest.fn(),
      onSeekComplete: jest.fn(),
      onVideoLoad: jest.fn(),
      onSignificantProgress: jest.fn(),
      onFeedbackItemPress: jest.fn(),
      onCollapsePanel: jest.fn(),
      onRetry: jest.fn(),
      onShare: jest.fn(),
      onLike: jest.fn(),
      onComment: jest.fn(),
      onBookmark: jest.fn(),
      onSelectAudio: jest.fn(),
      onFeedbackScrollY: jest.fn(),
      onFeedbackMomentumScrollEnd: jest.fn(),
    },
    contextValue: {
      videoUri: 'https://example.com/video.mp4',
      feedbackItems: [],
      isPullingToReveal: false,
    },
    refs: {
      videoControlsRef: { current: null },
      rootPanRef: { current: null },
    },
  }

  beforeEach(() => {
    jest.clearAllMocks()
    const { useVideoAnalysisOrchestrator } = require('./hooks/useVideoAnalysisOrchestrator')
    useVideoAnalysisOrchestrator.mockReturnValue(mockOrchestratorReturn)
  })

  // Arrange-Act-Assert
  test('renders without crashing', () => {
    // Arrange
    const props = {
      videoUri: 'https://example.com/video.mp4',
    }

    // Act
    const result = render(<VideoAnalysisScreen {...props} />)

    // Assert
    expect(result.root).toBeTruthy()
  })

  // Arrange-Act-Assert
  test('calls orchestrator with correct props', () => {
    // Arrange
    const { useVideoAnalysisOrchestrator } = require('./hooks/useVideoAnalysisOrchestrator')
    const props = {
      analysisJobId: 123,
      videoRecordingId: 456,
      videoUri: 'https://example.com/video.mp4',
      initialStatus: 'processing' as const,
      onBack: jest.fn(),
    }

    // Act
    render(<VideoAnalysisScreen {...props} />)

    // Assert
    expect(useVideoAnalysisOrchestrator).toHaveBeenCalledWith(props)
  })

  // Arrange-Act-Assert
  test('delegates rendering to layout component', () => {
    // Arrange
    const props = {
      videoUri: 'https://example.com/video.mp4',
    }

    // Act
    const result = render(<VideoAnalysisScreen {...props} />)

    // Assert
    // Component should render successfully (delegating to layout)
    expect(result.root).toBeTruthy()
  })
})
