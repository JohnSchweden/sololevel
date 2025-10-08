import { act, renderHook, waitFor } from '@testing-library/react'

import type { FeedbackPanelItem } from '../types'
import type { AudioControllerState } from './useAudioController'
import type { FeedbackAudioSourceState } from './useFeedbackAudioSource'
import { useFeedbackCoordinator } from './useFeedbackCoordinator'
import type { VideoPlaybackState } from './useVideoPlayback'

jest.mock('./useFeedbackSelection', () => ({
  useFeedbackSelection: jest.fn(),
}))

jest.mock('./useBubbleController', () => ({
  useBubbleController: jest.fn(),
}))

const { useFeedbackSelection } = jest.requireMock('./useFeedbackSelection') as {
  useFeedbackSelection: jest.Mock
}

const { useBubbleController } = jest.requireMock('./useBubbleController') as {
  useBubbleController: jest.Mock
}

describe('useFeedbackCoordinator', () => {
  const mockUseFeedbackSelection = useFeedbackSelection as jest.Mock
  const mockUseBubbleController = useBubbleController as jest.Mock

  const createFeedbackItem = (overrides: Partial<FeedbackPanelItem> = {}): FeedbackPanelItem => ({
    id: 'feedback-1',
    timestamp: 2_000,
    text: 'Feedback sample',
    type: 'suggestion',
    category: 'voice',
    ssmlStatus: 'completed',
    audioStatus: 'completed',
    confidence: 1,
    ...overrides,
  })

  const createDependencies = (overrides?: {
    feedbackItems?: FeedbackPanelItem[]
    feedbackAudio?: Partial<FeedbackAudioSourceState>
    audioController?: Partial<AudioControllerState>
    videoPlayback?: Partial<VideoPlaybackState & { isPlaying?: boolean; videoEnded?: boolean }>
  }) => {
    const feedbackItems = overrides?.feedbackItems ?? [
      createFeedbackItem({ id: 'feedback-1' }),
      createFeedbackItem({ id: 'feedback-2', timestamp: 4_000 }),
    ]

    const feedbackAudio: FeedbackAudioSourceState = {
      audioUrls: {
        'feedback-1': 'https://cdn.example.com/1.mp3',
        'feedback-2': 'https://cdn.example.com/2.mp3',
      },
      selectAudio: jest.fn(),
      clearActiveAudio: jest.fn(),
      activeAudio: null,
      errors: {},
      clearError: jest.fn(),
      ...overrides?.feedbackAudio,
    }

    const audioController: AudioControllerState = {
      isPlaying: false,
      currentTime: 0,
      duration: 3,
      isLoaded: true,
      seekTime: null,
      setIsPlaying: jest.fn(),
      togglePlayback: jest.fn(),
      handleLoad: jest.fn(),
      handleProgress: jest.fn(),
      handleEnd: jest.fn(),
      handleError: jest.fn(),
      handleSeekComplete: jest.fn(),
      seekTo: jest.fn(),
      reset: jest.fn(),
      ...overrides?.audioController,
    }

    const videoPlayback: VideoPlaybackState & { isPlaying?: boolean; videoEnded?: boolean } = {
      isPlaying: overrides?.videoPlayback?.isPlaying ?? false,
      currentTime: overrides?.videoPlayback?.currentTime ?? 0,
      duration: overrides?.videoPlayback?.duration ?? 0,
      pendingSeek: overrides?.videoPlayback?.pendingSeek ?? null,
      videoEnded: overrides?.videoPlayback?.videoEnded ?? false,
      play: jest.fn(),
      pause: jest.fn(),
      replay: jest.fn(),
      seek: jest.fn(),
      handleProgress: jest.fn(),
      handleLoad: jest.fn(),
      handleEnd: jest.fn(),
      handleSeekComplete: jest.fn(),
      reset: jest.fn(),
      ...overrides?.videoPlayback,
    }

    return { feedbackItems, feedbackAudio, audioController, videoPlayback }
  }

  beforeEach(() => {
    jest.resetAllMocks()

    mockUseBubbleController.mockReturnValue({
      currentBubbleIndex: null,
      bubbleVisible: false,
      checkAndShowBubbleAtTime: jest.fn().mockReturnValue(null),
      showBubble: jest.fn(),
      hideBubble: jest.fn(),
    })

    mockUseFeedbackSelection.mockReturnValue({
      selectedFeedbackId: null,
      highlightedFeedbackId: null,
      highlightSource: null,
      isCoachSpeaking: false,
      selectFeedback: jest.fn(),
      highlightAutoFeedback: jest.fn(),
      clearHighlight: jest.fn(),
      clearSelection: jest.fn(),
      triggerCoachSpeaking: jest.fn(),
    })
  })

  it('exposes highlight state from selection', () => {
    const deps = createDependencies()

    mockUseFeedbackSelection.mockReturnValue({
      selectedFeedbackId: 'feedback-2',
      highlightedFeedbackId: 'feedback-2',
      highlightSource: 'auto',
      isCoachSpeaking: true,
      selectFeedback: jest.fn(),
      highlightAutoFeedback: jest.fn(),
      clearHighlight: jest.fn(),
      clearSelection: jest.fn(),
      triggerCoachSpeaking: jest.fn(),
    })

    const { result } = renderHook(() =>
      useFeedbackCoordinator({
        feedbackItems: deps.feedbackItems,
        feedbackAudio: deps.feedbackAudio,
        audioController: deps.audioController,
        videoPlayback: deps.videoPlayback,
      })
    )

    expect(result.current.highlightedFeedbackId).toBe('feedback-2')
    expect(result.current.isCoachSpeaking).toBe(true)
  })

  it('triggers highlight when progress reaches feedback timestamp', () => {
    const deps = createDependencies({ videoPlayback: { isPlaying: true } })

    const highlightAutoFeedback = jest.fn()
    const checkAndShowBubbleAtTime = jest.fn().mockReturnValue(1) // Return index 1 for second item

    mockUseBubbleController.mockReturnValue({
      currentBubbleIndex: null,
      bubbleVisible: false,
      checkAndShowBubbleAtTime,
      showBubble: jest.fn(),
      hideBubble: jest.fn(),
    })

    mockUseFeedbackSelection.mockReturnValue({
      selectedFeedbackId: null,
      highlightedFeedbackId: null,
      highlightSource: null,
      isCoachSpeaking: false,
      selectFeedback: jest.fn(),
      highlightAutoFeedback,
      clearHighlight: jest.fn(),
      clearSelection: jest.fn(),
      triggerCoachSpeaking: jest.fn(),
    })

    const { result } = renderHook(() =>
      useFeedbackCoordinator({
        feedbackItems: deps.feedbackItems,
        feedbackAudio: deps.feedbackAudio,
        audioController: deps.audioController,
        videoPlayback: deps.videoPlayback,
      })
    )

    act(() => {
      result.current.onProgressTrigger(4)
    })

    expect(checkAndShowBubbleAtTime).toHaveBeenCalledWith(4000)
    expect(highlightAutoFeedback).not.toHaveBeenCalledWith(
      deps.feedbackItems[1],
      expect.objectContaining({ autoDurationMs: expect.anything() })
    )
  })

  it('handles user tap when video is paused', () => {
    const selectFeedback = jest.fn()
    const hideBubble = jest.fn()
    const deps = createDependencies({
      videoPlayback: { isPlaying: false, videoEnded: false },
    })

    mockUseBubbleController.mockReturnValue({
      currentBubbleIndex: null,
      bubbleVisible: false,
      checkAndShowBubbleAtTime: jest.fn().mockReturnValue(null),
      showBubble: jest.fn(),
      hideBubble,
    })

    mockUseFeedbackSelection.mockReturnValue({
      selectedFeedbackId: null,
      highlightedFeedbackId: null,
      highlightSource: null,
      isCoachSpeaking: false,
      selectFeedback,
      highlightAutoFeedback: jest.fn(),
      clearHighlight: jest.fn(),
      clearSelection: jest.fn(),
      triggerCoachSpeaking: jest.fn(),
    })

    const { result } = renderHook(() =>
      useFeedbackCoordinator({
        feedbackItems: deps.feedbackItems,
        feedbackAudio: deps.feedbackAudio,
        audioController: deps.audioController,
        videoPlayback: deps.videoPlayback,
      })
    )

    act(() => {
      result.current.onUserTapFeedback(deps.feedbackItems[0])
    })

    expect(selectFeedback).toHaveBeenCalledWith(deps.feedbackItems[0], {
      seek: true,
      playAudio: false,
    })
    expect(hideBubble).toHaveBeenCalled()
  })

  it('processes pending feedback on play', () => {
    const selectFeedback = jest.fn()
    const deps = createDependencies({
      videoPlayback: { isPlaying: false, videoEnded: false },
    })

    mockUseFeedbackSelection.mockReturnValue({
      selectedFeedbackId: null,
      highlightedFeedbackId: null,
      highlightSource: null,
      isCoachSpeaking: false,
      selectFeedback,
      highlightAutoFeedback: jest.fn(),
      clearHighlight: jest.fn(),
      clearSelection: jest.fn(),
      triggerCoachSpeaking: jest.fn(),
    })

    const { result } = renderHook(() =>
      useFeedbackCoordinator({
        feedbackItems: deps.feedbackItems,
        feedbackAudio: deps.feedbackAudio,
        audioController: deps.audioController,
        videoPlayback: deps.videoPlayback,
      })
    )

    act(() => {
      result.current.onUserTapFeedback(deps.feedbackItems[0])
    })

    act(() => {
      result.current.onPlay()
    })

    expect(selectFeedback).toHaveBeenCalledWith(deps.feedbackItems[0], {
      seek: true,
      playAudio: true,
    })
    expect(deps.videoPlayback.play).toHaveBeenCalled()
  })

  it('clears highlight when panel collapses', () => {
    const clearSelection = jest.fn()
    const clearHighlight = jest.fn()

    mockUseFeedbackSelection.mockReturnValue({
      selectedFeedbackId: null,
      highlightedFeedbackId: null,
      highlightSource: null,
      isCoachSpeaking: false,
      selectFeedback: jest.fn(),
      highlightAutoFeedback: jest.fn(),
      clearHighlight,
      clearSelection,
      triggerCoachSpeaking: jest.fn(),
    })

    const deps = createDependencies()

    const { result } = renderHook(() =>
      useFeedbackCoordinator({
        feedbackItems: deps.feedbackItems,
        feedbackAudio: deps.feedbackAudio,
        audioController: deps.audioController,
        videoPlayback: deps.videoPlayback,
      })
    )

    act(() => {
      result.current.onPanelCollapse()
    })

    expect(clearSelection).toHaveBeenCalled()
    expect(clearHighlight).toHaveBeenCalledWith({ reason: 'panel-collapsed' })
  })

  it('clears highlight when audio overlay closes', () => {
    const clearSelection = jest.fn()
    const clearHighlight = jest.fn()
    const setIsPlaying = jest.fn()
    const clearActiveAudio = jest.fn()

    mockUseFeedbackSelection.mockReturnValue({
      selectedFeedbackId: null,
      highlightedFeedbackId: null,
      highlightSource: null,
      isCoachSpeaking: false,
      selectFeedback: jest.fn(),
      highlightAutoFeedback: jest.fn(),
      clearHighlight,
      clearSelection,
      triggerCoachSpeaking: jest.fn(),
    })

    const deps = createDependencies({
      audioController: { setIsPlaying },
      feedbackAudio: { clearActiveAudio },
    })

    const { result } = renderHook(() =>
      useFeedbackCoordinator({
        feedbackItems: deps.feedbackItems,
        feedbackAudio: deps.feedbackAudio,
        audioController: deps.audioController,
        videoPlayback: deps.videoPlayback,
      })
    )

    act(() => {
      result.current.onAudioOverlayClose()
    })

    expect(clearSelection).toHaveBeenCalled()
    expect(clearHighlight).toHaveBeenCalledWith({ reason: 'audio-overlay-close' })
    expect(setIsPlaying).toHaveBeenCalledWith(false)
    expect(clearActiveAudio).toHaveBeenCalled()
  })

  it('handles audio overlay inactivity', () => {
    const clearSelection = jest.fn()
    const clearHighlight = jest.fn()
    const setIsPlaying = jest.fn()
    const clearActiveAudio = jest.fn()

    mockUseFeedbackSelection.mockReturnValue({
      selectedFeedbackId: 'feedback-1',
      highlightedFeedbackId: 'feedback-1',
      highlightSource: 'auto',
      isCoachSpeaking: true,
      selectFeedback: jest.fn(),
      highlightAutoFeedback: jest.fn(),
      clearHighlight,
      clearSelection,
      triggerCoachSpeaking: jest.fn(),
    })

    const deps = createDependencies({
      audioController: { setIsPlaying },
      feedbackAudio: {
        clearActiveAudio,
        activeAudio: { id: 'feedback-1', url: 'https://cdn.example.com/1.mp3' },
      },
    })

    const { result } = renderHook(() =>
      useFeedbackCoordinator({
        feedbackItems: deps.feedbackItems,
        feedbackAudio: deps.feedbackAudio,
        audioController: deps.audioController,
        videoPlayback: deps.videoPlayback,
      })
    )

    act(() => {
      result.current.onAudioOverlayInactivity()
    })

    expect(clearHighlight).toHaveBeenCalledWith({ reason: 'audio-overlay-inactivity' })
    expect(clearSelection).toHaveBeenCalled()
    expect(setIsPlaying).toHaveBeenCalledWith(false)
    expect(clearActiveAudio).toHaveBeenCalled()
  })

  it('exposes overlay visibility derived from audio controller and active audio', () => {
    const deps = createDependencies({
      audioController: { isPlaying: true },
      feedbackAudio: {
        activeAudio: { id: 'feedback-1', url: 'https://cdn.example.com/1.mp3' },
      },
    })

    const { result } = renderHook(() =>
      useFeedbackCoordinator({
        feedbackItems: deps.feedbackItems,
        feedbackAudio: deps.feedbackAudio,
        audioController: deps.audioController,
        videoPlayback: deps.videoPlayback,
      })
    )

    expect(result.current.overlayVisible).toBe(true)
  })

  it('hides bubble when overlay becomes invisible while bubble is visible', async () => {
    const hideBubble = jest.fn()

    mockUseBubbleController.mockReturnValue({
      currentBubbleIndex: 0,
      bubbleVisible: true,
      checkAndShowBubbleAtTime: jest.fn().mockReturnValue(null),
      showBubble: jest.fn(),
      hideBubble,
    })

    const deps = createDependencies({
      audioController: { isPlaying: false },
      feedbackAudio: {
        activeAudio: { id: 'feedback-1', url: 'https://cdn.example.com/1.mp3' },
      },
    })

    renderHook(() =>
      useFeedbackCoordinator({
        feedbackItems: deps.feedbackItems,
        feedbackAudio: deps.feedbackAudio,
        audioController: deps.audioController,
        videoPlayback: deps.videoPlayback,
      })
    )

    await waitFor(() => {
      expect(hideBubble).toHaveBeenCalled()
    })
  })

  it('realigns bubble when overlay visible and highlight is active but bubble hidden', async () => {
    const showBubble = jest.fn()

    mockUseBubbleController.mockReturnValue({
      currentBubbleIndex: null,
      bubbleVisible: false,
      checkAndShowBubbleAtTime: jest.fn().mockReturnValue(null),
      showBubble,
      hideBubble: jest.fn(),
    })

    mockUseFeedbackSelection.mockReturnValue({
      selectedFeedbackId: 'feedback-2',
      highlightedFeedbackId: 'feedback-2',
      highlightSource: 'auto',
      isCoachSpeaking: true,
      selectFeedback: jest.fn(),
      highlightAutoFeedback: jest.fn(),
      clearHighlight: jest.fn(),
      clearSelection: jest.fn(),
      triggerCoachSpeaking: jest.fn(),
    })

    const deps = createDependencies({
      audioController: { isPlaying: true },
      feedbackAudio: {
        activeAudio: { id: 'feedback-2', url: 'https://cdn.example.com/2.mp3' },
      },
    })

    renderHook(() =>
      useFeedbackCoordinator({
        feedbackItems: deps.feedbackItems,
        feedbackAudio: deps.feedbackAudio,
        audioController: deps.audioController,
        videoPlayback: deps.videoPlayback,
      })
    )

    await waitFor(() => {
      expect(showBubble).toHaveBeenCalledWith(1)
    })
  })

  it('does not force bubble when overlay visible but no highlighted feedback', async () => {
    const showBubble = jest.fn()

    mockUseBubbleController.mockReturnValue({
      currentBubbleIndex: null,
      bubbleVisible: false,
      checkAndShowBubbleAtTime: jest.fn().mockReturnValue(null),
      showBubble,
      hideBubble: jest.fn(),
    })

    const deps = createDependencies({
      audioController: { isPlaying: true },
      feedbackAudio: {
        activeAudio: { id: 'feedback-2', url: 'https://cdn.example.com/2.mp3' },
      },
    })

    renderHook(() =>
      useFeedbackCoordinator({
        feedbackItems: deps.feedbackItems,
        feedbackAudio: deps.feedbackAudio,
        audioController: deps.audioController,
        videoPlayback: deps.videoPlayback,
      })
    )

    await waitFor(() => {
      expect(showBubble).not.toHaveBeenCalled()
    })
  })

  it('re-arms highlight when bubble timer anchors to playback start', () => {
    const highlightAutoFeedback = jest.fn()
    const deps = createDependencies({
      audioController: { isPlaying: false },
      videoPlayback: { isPlaying: false },
    })

    mockUseBubbleController.mockReturnValue({
      currentBubbleIndex: 0,
      bubbleVisible: true,
      checkAndShowBubbleAtTime: jest.fn().mockReturnValue(null),
      showBubble: jest.fn(),
      hideBubble: jest.fn(),
    })

    mockUseFeedbackSelection.mockReturnValue({
      selectedFeedbackId: null,
      highlightedFeedbackId: null,
      highlightSource: null,
      isCoachSpeaking: false,
      selectFeedback: jest.fn(),
      highlightAutoFeedback,
      clearHighlight: jest.fn(),
      clearSelection: jest.fn(),
      triggerCoachSpeaking: jest.fn(),
    })

    const optionsCapture: any[] = []

    mockUseBubbleController.mockImplementation((_, __, ___, ____, _____, options) => {
      optionsCapture.push(options)
      return {
        currentBubbleIndex: 0,
        bubbleVisible: true,
        checkAndShowBubbleAtTime: jest.fn().mockReturnValue(null),
        showBubble: jest.fn(),
        hideBubble: jest.fn(),
      }
    })

    renderHook(() =>
      useFeedbackCoordinator({
        feedbackItems: deps.feedbackItems,
        feedbackAudio: deps.feedbackAudio,
        audioController: deps.audioController,
        videoPlayback: deps.videoPlayback,
      })
    )

    const bubbleOptions = optionsCapture[0]
    const feedbackItem = deps.feedbackItems[0]

    bubbleOptions.onBubbleShow({ index: 0, item: feedbackItem, displayDurationMs: 3500 })
    expect(highlightAutoFeedback).toHaveBeenCalledWith(feedbackItem, {
      seek: false,
      playAudio: true,
      autoDurationMs: undefined,
    })

    bubbleOptions.onBubbleTimerUpdate?.({
      index: 0,
      item: feedbackItem,
      displayDurationMs: 3500,
      reason: 'playback-start',
    })

    expect(highlightAutoFeedback).toHaveBeenCalledWith(feedbackItem, {
      seek: false,
      playAudio: false,
      autoDurationMs: 3500,
    })
  })

  it('stops audio when bubble timer elapses', () => {
    const setIsPlaying = jest.fn()
    const clearActiveAudio = jest.fn()
    const deps = createDependencies({
      audioController: { isPlaying: true, setIsPlaying },
      feedbackAudio: {
        clearActiveAudio,
        activeAudio: { id: 'feedback-1', url: 'https://example.com/1.mp3' },
      },
    })

    let capturedOptions: any

    mockUseBubbleController.mockImplementation((_, __, ___, ____, _____, options) => {
      capturedOptions = options
      return {
        currentBubbleIndex: 0,
        bubbleVisible: true,
        checkAndShowBubbleAtTime: jest.fn().mockReturnValue(null),
        showBubble: jest.fn(),
        hideBubble: jest.fn(),
      }
    })

    renderHook(() =>
      useFeedbackCoordinator({
        feedbackItems: deps.feedbackItems,
        feedbackAudio: deps.feedbackAudio,
        audioController: deps.audioController,
        videoPlayback: deps.videoPlayback,
      })
    )

    const feedbackItem = deps.feedbackItems[0]
    capturedOptions.onBubbleTimerElapsed?.({
      index: 0,
      item: feedbackItem,
      displayDurationMs: 3200,
      reason: 'playback-start',
    })

    expect(setIsPlaying).toHaveBeenCalledWith(false)
    expect(clearActiveAudio).toHaveBeenCalled()
  })
})
