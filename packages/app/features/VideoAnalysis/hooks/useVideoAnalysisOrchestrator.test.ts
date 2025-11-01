import { renderHook } from '@testing-library/react-native'
import { Platform } from 'react-native'
import type { VideoAnalysisScreenProps } from '../VideoAnalysisScreen'
import { useVideoAnalysisOrchestrator } from './useVideoAnalysisOrchestrator'

// Mock all dependencies
jest.mock('@my/logging', () => ({
  log: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}))

jest.mock('./useHistoricalAnalysis')
jest.mock('./useAnalysisState')
jest.mock('./useVideoPlayback')
jest.mock('./useVideoControls')
jest.mock('./useFeedbackAudioSource')
jest.mock('./useAudioController')
jest.mock('./useFeedbackCoordinator')
jest.mock('./useFeedbackPanel')
jest.mock('./useVideoAudioSync')
jest.mock('./useAutoPlayOnReady')
jest.mock('./useGestureController')
jest.mock('./useAnimationController')
jest.mock('@app/hooks/useStatusBar')

describe('useVideoAnalysisOrchestrator', () => {
  const mockProps: VideoAnalysisScreenProps = {
    analysisJobId: 123,
    videoRecordingId: 456,
    videoUri: 'https://example.com/video.mp4',
    initialStatus: 'processing',
  }

  beforeEach(() => {
    jest.clearAllMocks()

    // Setup default mock implementations
    const { useHistoricalAnalysis } = require('./useHistoricalAnalysis')
    const { useAnalysisState } = require('./useAnalysisState')
    const { useVideoPlayback } = require('./useVideoPlayback')
    const { useVideoControls } = require('./useVideoControls')
    const { useFeedbackAudioSource } = require('./useFeedbackAudioSource')
    const { useAudioController } = require('./useAudioController')
    const { useFeedbackCoordinator } = require('./useFeedbackCoordinator')
    const { useFeedbackPanel } = require('./useFeedbackPanel')
    const { useVideoAudioSync } = require('./useVideoAudioSync')
    const { useAutoPlayOnReady } = require('./useAutoPlayOnReady')
    const { useGestureController } = require('./useGestureController')
    const { useAnimationController } = require('./useAnimationController')
    const { useStatusBar } = require('@app/hooks/useStatusBar')

    useHistoricalAnalysis.mockReturnValue({
      isLoading: false,
      data: null,
    })

    useAnalysisState.mockReturnValue({
      isProcessing: false,
      phase: 'idle',
      progress: 0,
      thumbnailUrl: null,
      error: null,
      channelExhausted: false,
      feedback: { feedbackItems: [] },
    })

    useVideoPlayback.mockReturnValue({
      isPlaying: false,
      pendingSeek: null,
      videoEnded: false,
      play: jest.fn(),
      pause: jest.fn(),
      seek: jest.fn(),
      replay: jest.fn(),
      handleLoad: jest.fn(),
      handleSeekComplete: jest.fn(),
    })

    useVideoControls.mockReturnValue({
      showControls: true,
      setControlsVisible: jest.fn(),
    })

    useFeedbackAudioSource.mockReturnValue({
      activeAudio: null,
      audioUrls: {},
      errors: {},
    })

    useAudioController.mockReturnValue({
      isPlaying: false,
      play: jest.fn(),
      pause: jest.fn(),
      stop: jest.fn(),
    })

    useFeedbackCoordinator.mockReturnValue({
      highlightedFeedbackId: null,
      isCoachSpeaking: false,
      bubbleState: {
        currentBubbleIndex: 0,
        bubbleVisible: false,
        items: [],
      },
      overlayVisible: false,
      activeAudio: null,
      onProgressTrigger: jest.fn(),
      onUserTapFeedback: jest.fn(),
      onPlay: jest.fn(),
      onPanelCollapse: jest.fn(),
      onPlayPendingFeedback: jest.fn(),
      onAudioOverlayClose: jest.fn(),
      onAudioOverlayInactivity: jest.fn(),
      onAudioOverlayInteraction: jest.fn(),
    })

    useFeedbackPanel.mockReturnValue({
      panelFraction: 0.5,
      activeTab: 'feedback',
      collapse: jest.fn(),
    })

    useVideoAudioSync.mockReturnValue({
      shouldPlayVideo: true,
    })

    useAutoPlayOnReady.mockReturnValue(undefined)

    useGestureController.mockReturnValue({
      rootPan: {},
      feedbackScrollEnabled: true,
      blockFeedbackScrollCompletely: false,
      isPullingToRevealJS: false,
      onFeedbackScrollY: jest.fn(),
      onFeedbackMomentumScrollEnd: jest.fn(),
      rootPanRef: { current: null },
    })

    useAnimationController.mockReturnValue({
      scrollY: { value: 0 },
      collapseProgress: { value: 0.5 },
      headerStyle: {},
      feedbackSectionStyle: {},
      pullIndicatorStyle: {},
      scrollRef: { current: null },
      feedbackContentOffsetY: { value: 0 },
    })

    useStatusBar.mockReturnValue(undefined)
  })

  // Arrange-Act-Assert
  test('calls all required hooks with correct dependencies', () => {
    // Arrange
    const { useHistoricalAnalysis } = require('./useHistoricalAnalysis')
    const { useAnalysisState } = require('./useAnalysisState')
    const { useVideoPlayback } = require('./useVideoPlayback')

    // Act
    renderHook(() => useVideoAnalysisOrchestrator(mockProps))

    // Assert
    expect(useHistoricalAnalysis).toHaveBeenCalledWith(123)
    expect(useAnalysisState).toHaveBeenCalledWith(123, 456, 'ready', true)
    expect(useVideoPlayback).toHaveBeenCalledWith('processing')
  })

  // Arrange-Act-Assert
  test('returns organized interface with all required groups', () => {
    // Arrange
    // (mocks already set up in beforeEach)

    // Act
    const { result } = renderHook(() => useVideoAnalysisOrchestrator(mockProps))

    // Assert
    expect(result.current).toHaveProperty('video')
    expect(result.current).toHaveProperty('playback')
    expect(result.current).toHaveProperty('audio')
    expect(result.current).toHaveProperty('feedback')
    expect(result.current).toHaveProperty('gesture')
    expect(result.current).toHaveProperty('animation')
    expect(result.current).toHaveProperty('controls')
    expect(result.current).toHaveProperty('error')
    expect(result.current).toHaveProperty('handlers')
    expect(result.current).toHaveProperty('contextValue')
    expect(result.current).toHaveProperty('refs')
  })

  // Arrange-Act-Assert
  test('aggregates handlers into single object', () => {
    // Arrange
    // (mocks already set up in beforeEach)

    // Act
    const { result } = renderHook(() => useVideoAnalysisOrchestrator(mockProps))

    // Assert
    expect(result.current.handlers).toHaveProperty('onPlay')
    expect(result.current.handlers).toHaveProperty('onPause')
    expect(result.current.handlers).toHaveProperty('onSeek')
    expect(result.current.handlers).toHaveProperty('onSeekComplete')
    expect(result.current.handlers).toHaveProperty('onVideoLoad')
    expect(result.current.handlers).toHaveProperty('onSignificantProgress')
    expect(result.current.handlers).toHaveProperty('onFeedbackItemPress')
    expect(result.current.handlers).toHaveProperty('onCollapsePanel')
    expect(result.current.handlers).toHaveProperty('onShare')
    expect(result.current.handlers).toHaveProperty('onLike')
    expect(result.current.handlers).toHaveProperty('onComment')
    expect(result.current.handlers).toHaveProperty('onBookmark')
    expect(result.current.handlers).toHaveProperty('onSelectAudio')
    expect(result.current.handlers).toHaveProperty('onFeedbackScrollY')
    expect(result.current.handlers).toHaveProperty('onFeedbackMomentumScrollEnd')
  })

  // Arrange-Act-Assert
  test('only includes gesture and animation on native platform', () => {
    // Arrange
    Platform.OS = 'ios'

    // Act
    const { result } = renderHook(() => useVideoAnalysisOrchestrator(mockProps))

    // Assert
    expect(result.current.gesture).toBeDefined()
    expect(result.current.animation).toBeDefined()
  })

  // Arrange-Act-Assert
  test('wires cross-hook dependencies correctly', () => {
    // Arrange
    const { useFeedbackCoordinator } = require('./useFeedbackCoordinator')
    const { useFeedbackPanel } = require('./useFeedbackPanel')

    // Act
    renderHook(() => useVideoAnalysisOrchestrator(mockProps))

    // Assert
    // Verify coordinator receives feedback items, audio, and playback
    expect(useFeedbackCoordinator).toHaveBeenCalledWith(
      expect.objectContaining({
        feedbackItems: expect.any(Array),
        feedbackAudio: expect.any(Object),
        audioController: expect.any(Object),
        videoPlayback: expect.any(Object),
      })
    )

    // Verify panel receives highlighted feedback from coordinator
    expect(useFeedbackPanel).toHaveBeenCalledWith(
      expect.objectContaining({
        highlightedFeedbackId: null,
      })
    )
  })

  // Arrange-Act-Assert
  test('handles history mode correctly', () => {
    // Arrange
    const { useHistoricalAnalysis } = require('./useHistoricalAnalysis')
    const propsWithHistory: VideoAnalysisScreenProps = {
      analysisJobId: 789,
    }

    // Act
    renderHook(() => useVideoAnalysisOrchestrator(propsWithHistory))

    // Assert
    expect(useHistoricalAnalysis).toHaveBeenCalledWith(789)
  })

  // Arrange-Act-Assert
  test('handles non-history mode correctly', () => {
    // Arrange
    const { useHistoricalAnalysis } = require('./useHistoricalAnalysis')
    const propsWithoutHistory: VideoAnalysisScreenProps = {
      videoUri: 'file://video.mp4',
    }

    // Act
    renderHook(() => useVideoAnalysisOrchestrator(propsWithoutHistory))

    // Assert
    expect(useHistoricalAnalysis).toHaveBeenCalledWith(null)
  })
})
