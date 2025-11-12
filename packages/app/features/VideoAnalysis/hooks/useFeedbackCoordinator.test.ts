import { act, renderHook, waitFor } from '@testing-library/react'

import { useVideoPlayerStore } from '../stores'
import type { FeedbackPanelItem } from '../types'
import type { AudioControllerState } from './useAudioController'
import { useFeedbackCoordinator } from './useFeedbackCoordinator'
import type { VideoPlaybackState } from './useVideoPlayer.types'

jest.mock('./useFeedbackSelection', () => ({
  useFeedbackSelection: jest.fn(),
}))

jest.mock('./useBubbleController', () => ({
  useBubbleController: jest.fn(),
}))

jest.mock('../stores/feedbackAudio', () => {
  const storeState = {
    audioUrls: {} as Record<string, string>,
    activeAudio: null as { id: string; url: string } | null,
    errors: {} as Record<string, string>,
    controller: null as { duration?: number; setIsPlaying?: (value: boolean) => void } | null,
    isPlaying: false,
    setAudioUrls: jest.fn(),
    setActiveAudio: jest.fn(),
    setIsPlaying: jest.fn(),
    setErrors: jest.fn(),
    clearError: jest.fn(),
  }

  const subscribers = new Set<unknown>()

  const notifySubscribers = () => {
    subscribers.forEach((listener) => {
      if (typeof listener === 'function') {
        ;(listener as any)(storeState)
      }
    })
  }

  const resetStoreState = () => {
    storeState.audioUrls = {}
    storeState.activeAudio = null
    storeState.errors = {}
    storeState.controller = null
    storeState.isPlaying = false

    storeState.setAudioUrls.mockImplementation((urls: Record<string, string>) => {
      storeState.audioUrls = urls
      notifySubscribers()
    })
    storeState.setActiveAudio.mockImplementation((audio: { id: string; url: string } | null) => {
      storeState.activeAudio = audio
      if (!audio) {
        storeState.isPlaying = false
      }
      notifySubscribers()
    })
    storeState.setIsPlaying.mockImplementation((value: boolean) => {
      storeState.isPlaying = value
      if (storeState.controller?.setIsPlaying) {
        storeState.controller.setIsPlaying(value)
      }
      notifySubscribers()
    })
    storeState.setErrors.mockImplementation((errors: Record<string, string>) => {
      storeState.errors = errors
      notifySubscribers()
    })
    storeState.clearError.mockImplementation((feedbackId: string) => {
      delete storeState.errors[feedbackId]
      notifySubscribers()
    })
  }

  resetStoreState()

  const useFeedbackAudioStore = jest.fn(() => storeState) as jest.Mock & {
    getState: jest.Mock
    subscribe: jest.Mock
    __reset: () => void
  }

  useFeedbackAudioStore.getState = jest.fn(() => storeState)
  useFeedbackAudioStore.subscribe = jest.fn((listener: (state: any) => void) => {
    subscribers.add(listener)
    listener(storeState)
    return () => {
      subscribers.delete(listener)
    }
  })
  useFeedbackAudioStore.__reset = () => {
    resetStoreState()
    subscribers.clear()
  }

  return {
    useFeedbackAudioStore,
  }
})

jest.mock('../stores/feedbackCoordinatorStore', () => {
  const storeState = {
    selectedFeedbackId: null as string | null,
    highlightedFeedbackId: null as string | null,
    highlightSource: null as 'user' | 'auto' | null,
    isCoachSpeaking: false,
    bubbleState: {
      currentBubbleIndex: null as number | null,
      bubbleVisible: false,
    },
    overlayVisible: false,
    activeAudio: null as { id: string; url: string } | null,
    setSelectedFeedbackId: jest.fn(),
    setHighlightedFeedbackId: jest.fn(),
    setHighlightSource: jest.fn(),
    setIsCoachSpeaking: jest.fn(),
    setBubbleState: jest.fn(),
    setOverlayVisible: jest.fn(),
    setActiveAudio: jest.fn(),
    batchUpdate: jest.fn(),
    reset: jest.fn(),
  }

  const resetStoreState = () => {
    storeState.selectedFeedbackId = null
    storeState.highlightedFeedbackId = null
    storeState.highlightSource = null
    storeState.isCoachSpeaking = false
    storeState.bubbleState = { currentBubbleIndex: null, bubbleVisible: false }
    storeState.overlayVisible = false
    storeState.activeAudio = null

    storeState.setSelectedFeedbackId.mockImplementation((id: string | null) => {
      storeState.selectedFeedbackId = id
    })
    storeState.setHighlightedFeedbackId.mockImplementation((id: string | null) => {
      storeState.highlightedFeedbackId = id
    })
    storeState.setHighlightSource.mockImplementation((source: 'user' | 'auto' | null) => {
      storeState.highlightSource = source
    })
    storeState.setIsCoachSpeaking.mockImplementation((speaking: boolean) => {
      storeState.isCoachSpeaking = speaking
    })
    storeState.setBubbleState.mockImplementation(
      (state: { currentBubbleIndex: number | null; bubbleVisible: boolean }) => {
        storeState.bubbleState = state
      }
    )
    storeState.setOverlayVisible.mockImplementation((visible: boolean) => {
      storeState.overlayVisible = visible
    })
    storeState.setActiveAudio.mockImplementation((audio: { id: string; url: string } | null) => {
      storeState.activeAudio = audio
    })
    storeState.batchUpdate.mockImplementation((updates: any) => {
      if ('selectedFeedbackId' in updates) {
        storeState.selectedFeedbackId = updates.selectedFeedbackId ?? null
      }
      if ('highlightedFeedbackId' in updates) {
        storeState.highlightedFeedbackId = updates.highlightedFeedbackId ?? null
      }
      if ('highlightSource' in updates) {
        storeState.highlightSource = updates.highlightSource ?? null
      }
      if ('isCoachSpeaking' in updates) {
        storeState.isCoachSpeaking = updates.isCoachSpeaking ?? false
      }
      if ('bubbleState' in updates && updates.bubbleState) {
        storeState.bubbleState = updates.bubbleState
      }
      if ('overlayVisible' in updates) {
        storeState.overlayVisible = updates.overlayVisible ?? false
      }
      if ('activeAudio' in updates) {
        storeState.activeAudio = updates.activeAudio ?? null
      }
    })
    storeState.reset.mockImplementation(() => {
      resetStoreState()
    })
  }

  resetStoreState()

  const useFeedbackCoordinatorStore = jest.fn(() => storeState) as jest.Mock & {
    getState: jest.Mock
    __reset: () => void
  }

  useFeedbackCoordinatorStore.getState = jest.fn(() => storeState)
  useFeedbackCoordinatorStore.__reset = () => {
    resetStoreState()
  }

  return {
    useFeedbackCoordinatorStore,
  }
})

const { useFeedbackSelection } = jest.requireMock('./useFeedbackSelection') as {
  useFeedbackSelection: jest.Mock
}

// Note: store mocks registered via jest.mock above

const { useBubbleController } = jest.requireMock('./useBubbleController') as {
  useBubbleController: jest.Mock
}

const { useFeedbackAudioStore } = jest.requireMock('../stores/feedbackAudio') as {
  useFeedbackAudioStore: jest.Mock & {
    getState: jest.Mock
    subscribe: jest.Mock
    __reset: () => void
  }
}

const { useFeedbackCoordinatorStore } = jest.requireMock('../stores/feedbackCoordinatorStore') as {
  useFeedbackCoordinatorStore: jest.Mock & {
    getState: jest.Mock
    __reset: () => void
  }
}

describe('useFeedbackCoordinator', () => {
  const mockUseFeedbackSelection = useFeedbackSelection as jest.Mock
  const mockUseBubbleController = useBubbleController as jest.Mock
  const mockUseFeedbackAudioStore = useFeedbackAudioStore
  const mockUseFeedbackCoordinatorStore = useFeedbackCoordinatorStore

  type SelectionMock = {
    selectedFeedbackId: string | null
    highlightedFeedbackId: string | null
    highlightSource: 'user' | 'auto' | null
    isCoachSpeaking: boolean
    selectFeedback: jest.Mock
    highlightAutoFeedback: jest.Mock
    clearHighlight: jest.Mock
    clearSelection: jest.Mock
    triggerCoachSpeaking: jest.Mock
  }

  const setSelectionMock = (overrides: Partial<SelectionMock> = {}): SelectionMock => {
    const selection: SelectionMock = {
      selectedFeedbackId: null,
      highlightedFeedbackId: null,
      highlightSource: null,
      isCoachSpeaking: false,
      selectFeedback: jest.fn(),
      highlightAutoFeedback: jest.fn(),
      clearHighlight: jest.fn(),
      clearSelection: jest.fn(),
      triggerCoachSpeaking: jest.fn(),
      ...overrides,
    }

    mockUseFeedbackSelection.mockReturnValue(selection)

    const store = mockUseFeedbackCoordinatorStore.getState()
    store.setSelectedFeedbackId(selection.selectedFeedbackId)
    store.setHighlightedFeedbackId(selection.highlightedFeedbackId)
    store.setHighlightSource(selection.highlightSource)
    store.setIsCoachSpeaking(selection.isCoachSpeaking)

    return selection
  }

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
    audioController?: Partial<AudioControllerState>
    videoPlayback?: Partial<VideoPlaybackState & { isPlaying?: boolean; videoEnded?: boolean }>
  }) => {
    const feedbackItems = overrides?.feedbackItems ?? [
      createFeedbackItem({ id: 'feedback-1' }),
      createFeedbackItem({ id: 'feedback-2', timestamp: 4_000 }),
    ]

    // Note: Store mocks are set up at module level above

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
      handleEnd: jest.fn(() => true),
      handleError: jest.fn(),
      handleSeekComplete: jest.fn(),
      seekTo: jest.fn(),
      reset: jest.fn(),
      ...overrides?.audioController,
    }

    const videoPlayback: VideoPlaybackState & { isPlaying?: boolean; videoEnded?: boolean } = {
      isPlaying: overrides?.videoPlayback?.isPlaying ?? false,
      // currentTime removed from VideoPlaybackState - consumers read from store directly
      duration: overrides?.videoPlayback?.duration ?? 0,
      pendingSeek: overrides?.videoPlayback?.pendingSeek ?? null,
      videoEnded: overrides?.videoPlayback?.videoEnded ?? false,
      // Ref-based access for performance
      currentTimeRef: { current: 0 }, // currentTime removed from VideoPlaybackState
      getPreciseCurrentTime: jest.fn(() => 0), // currentTime removed from VideoPlaybackState
      play: jest.fn(),
      pause: jest.fn(),
      replay: jest.fn(),
      seek: jest.fn(),
      handleProgress: jest.fn(),
      handleLoad: jest.fn(),
      handleEnd: jest.fn(() => true),
      handleSeekComplete: jest.fn(),
      reset: jest.fn(),
      ...overrides?.videoPlayback,
    }

    return { feedbackItems, audioController, videoPlayback }
  }

  beforeEach(() => {
    jest.clearAllMocks()

    mockUseFeedbackAudioStore.__reset()
    mockUseFeedbackCoordinatorStore.__reset()
    useVideoPlayerStore.getState().reset()

    mockUseBubbleController.mockReturnValue({
      currentBubbleIndex: null,
      bubbleVisible: false,
      checkAndShowBubbleAtTime: jest.fn().mockReturnValue(null),
      findTriggerCandidate: jest.fn(() => null),
      showBubble: jest.fn(),
      hideBubble: jest.fn(),
    })

    setSelectionMock()
  })

  it('exposes highlight state from selection', () => {
    const deps = createDependencies()

    setSelectionMock({
      selectedFeedbackId: 'feedback-2',
      highlightedFeedbackId: 'feedback-2',
      highlightSource: 'auto',
      isCoachSpeaking: true,
    })

    const { result } = renderHook(() =>
      useFeedbackCoordinator({
        feedbackItems: deps.feedbackItems,
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
    useVideoPlayerStore.getState().setIsPlaying(true)

    const showBubble = jest.fn()
    const findTriggerCandidate = jest.fn().mockReturnValue({
      index: 1,
      item: deps.feedbackItems[1],
    })

    mockUseBubbleController.mockReturnValue({
      currentBubbleIndex: null,
      bubbleVisible: false,
      checkAndShowBubbleAtTime: jest.fn(),
      findTriggerCandidate,
      showBubble,
      hideBubble: jest.fn(),
    })

    setSelectionMock({
      highlightAutoFeedback,
    })

    const { result } = renderHook(() =>
      useFeedbackCoordinator({
        feedbackItems: deps.feedbackItems,
        audioController: deps.audioController,
        videoPlayback: deps.videoPlayback,
      })
    )

    act(() => {
      result.current.onProgressTrigger(4)
    })

    expect(findTriggerCandidate).toHaveBeenCalledWith(4000)
    expect(showBubble).toHaveBeenCalledWith(1)
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

    setSelectionMock({
      selectFeedback,
    })

    const { result } = renderHook(() =>
      useFeedbackCoordinator({
        feedbackItems: deps.feedbackItems,
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

    setSelectionMock({
      selectFeedback,
    })

    const { result, rerender } = renderHook(() =>
      useFeedbackCoordinator({
        feedbackItems: deps.feedbackItems,
        audioController: deps.audioController,
        videoPlayback: deps.videoPlayback,
      })
    )

    act(() => {
      result.current.onUserTapFeedback(deps.feedbackItems[0])
    })

    // Verify first call (from onUserTapFeedback) - should have playAudio: false
    expect(selectFeedback).toHaveBeenCalledTimes(1)
    expect(selectFeedback).toHaveBeenNthCalledWith(1, deps.feedbackItems[0], {
      seek: true,
      playAudio: false,
    })

    // Wait for state update to complete - rerender will trigger hook recalculation
    act(() => {
      rerender()
    })

    // Get fresh reference to onPlay after state update
    const onPlayAfterUpdate = result.current.onPlay

    act(() => {
      onPlayAfterUpdate()
    })

    // Verify second call (from onPlay) - should have playAudio: true, seek: false (already at position)
    expect(selectFeedback).toHaveBeenCalledTimes(2)
    expect(selectFeedback).toHaveBeenNthCalledWith(2, deps.feedbackItems[0], {
      seek: false,
      playAudio: true,
    })
    // Note: Video no longer resumes immediately - it waits for audio to end naturally
    // Video will resume via handleAudioNaturalEnd when audio completes
  })

  it('clears highlight when panel collapses', () => {
    const clearSelection = jest.fn()
    const clearHighlight = jest.fn()

    setSelectionMock({
      clearHighlight,
      clearSelection,
    })

    const deps = createDependencies()

    const { result } = renderHook(() =>
      useFeedbackCoordinator({
        feedbackItems: deps.feedbackItems,
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

    setSelectionMock({
      selectedFeedbackId: 'feedback-1',
      highlightedFeedbackId: 'feedback-1',
      highlightSource: 'auto',
      isCoachSpeaking: true,
      clearHighlight,
      clearSelection,
    })

    const audioStore = mockUseFeedbackAudioStore.getState()
    audioStore.setActiveAudio = clearActiveAudio
    audioStore.setIsPlaying = setIsPlaying
    audioStore.activeAudio = { id: 'feedback-1', url: 'mock-url' }
    audioStore.isPlaying = true

    mockUseFeedbackCoordinatorStore.getState().setBubbleState({
      currentBubbleIndex: 0,
      bubbleVisible: true,
    })

    const deps = createDependencies({
      audioController: { setIsPlaying },
    })

    const { result } = renderHook(() =>
      useFeedbackCoordinator({
        feedbackItems: deps.feedbackItems,
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

    setSelectionMock({
      selectedFeedbackId: 'feedback-1',
      highlightedFeedbackId: 'feedback-1',
      highlightSource: 'auto',
      isCoachSpeaking: true,
      clearHighlight,
      clearSelection,
    })

    const audioStore = mockUseFeedbackAudioStore.getState()
    audioStore.setActiveAudio = clearActiveAudio
    audioStore.setIsPlaying = setIsPlaying
    audioStore.activeAudio = { id: 'feedback-1', url: 'mock-url' }
    audioStore.isPlaying = true

    mockUseFeedbackCoordinatorStore.getState().setBubbleState({
      currentBubbleIndex: 0,
      bubbleVisible: true,
    })

    const deps = createDependencies({
      audioController: { setIsPlaying },
    })

    const { result } = renderHook(() =>
      useFeedbackCoordinator({
        feedbackItems: deps.feedbackItems,
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
    })

    const audioStore = mockUseFeedbackAudioStore.getState()
    audioStore.activeAudio = { id: 'feedback-1', url: 'mock-url' }
    audioStore.isPlaying = true

    mockUseFeedbackCoordinatorStore.getState().setBubbleState({
      currentBubbleIndex: 0,
      bubbleVisible: true,
    })

    const { result } = renderHook(() =>
      useFeedbackCoordinator({
        feedbackItems: deps.feedbackItems,
        audioController: deps.audioController,
        videoPlayback: deps.videoPlayback,
      })
    )

    expect(result.current.overlayVisible).toBe(true)
  })

  it('keeps bubble visible when overlay becomes invisible due to pause (not stop)', async () => {
    const hideBubble = jest.fn()

    mockUseBubbleController.mockReturnValue({
      currentBubbleIndex: 0,
      bubbleVisible: true,
      checkAndShowBubbleAtTime: jest.fn().mockReturnValue(null),
      findTriggerCandidate: jest.fn(() => null),
      showBubble: jest.fn(),
      hideBubble,
    })

    const deps = createDependencies({
      audioController: { isPlaying: false },
    })

    const audioStore = mockUseFeedbackAudioStore.getState()
    audioStore.activeAudio = { id: 'feedback-1', url: 'mock-url' }
    audioStore.isPlaying = true

    renderHook(() =>
      useFeedbackCoordinator({
        feedbackItems: deps.feedbackItems,
        audioController: deps.audioController,
        videoPlayback: deps.videoPlayback,
      })
    )

    // Bubble should stay visible when paused (activeAudio still exists)
    await waitFor(() => {
      expect(hideBubble).not.toHaveBeenCalled()
    })
  })

  it('hides bubble when audio actually stops (activeAudio cleared)', async () => {
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
    })

    renderHook(() =>
      useFeedbackCoordinator({
        feedbackItems: deps.feedbackItems,
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

    setSelectionMock({
      selectedFeedbackId: 'feedback-2',
      highlightedFeedbackId: 'feedback-2',
      highlightSource: 'auto',
      isCoachSpeaking: true,
    })

    const deps = createDependencies({
      audioController: { isPlaying: true },
    })

    const audioStore = mockUseFeedbackAudioStore.getState()
    audioStore.activeAudio = { id: 'feedback-2', url: 'mock-url' }
    audioStore.isPlaying = true

    const coordinatorStore = mockUseFeedbackCoordinatorStore.getState()
    coordinatorStore.setBubbleState({ currentBubbleIndex: null, bubbleVisible: false })
    coordinatorStore.setOverlayVisible(true)

    renderHook(() =>
      useFeedbackCoordinator({
        feedbackItems: deps.feedbackItems,
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
      findTriggerCandidate: jest.fn(() => null),
      showBubble,
      hideBubble: jest.fn(),
    })

    const deps = createDependencies({
      audioController: { isPlaying: true },
    })

    renderHook(() =>
      useFeedbackCoordinator({
        feedbackItems: deps.feedbackItems,
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
      findTriggerCandidate: jest.fn(() => null),
      showBubble: jest.fn(),
      hideBubble: jest.fn(),
    })

    setSelectionMock({
      highlightAutoFeedback,
    })

    const optionsCapture: any[] = []

    mockUseBubbleController.mockImplementation((_, __, ___, ____, _____, options) => {
      optionsCapture.push(options)
      return {
        currentBubbleIndex: 0,
        bubbleVisible: true,
        checkAndShowBubbleAtTime: jest.fn().mockReturnValue(null),
        findTriggerCandidate: jest.fn(() => null),
        showBubble: jest.fn(),
        hideBubble: jest.fn(),
      }
    })

    renderHook(() =>
      useFeedbackCoordinator({
        feedbackItems: deps.feedbackItems,
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
      autoDurationMs: 3500,
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

  it('does not stop audio when bubble timer elapses', () => {
    const setIsPlaying = jest.fn()
    const clearActiveAudio = jest.fn()
    const deps = createDependencies({
      audioController: { isPlaying: true, setIsPlaying },
    })

    let capturedOptions: any

    mockUseBubbleController.mockImplementation((_, __, ___, ____, _____, options) => {
      capturedOptions = options
      return {
        currentBubbleIndex: 0,
        bubbleVisible: true,
        checkAndShowBubbleAtTime: jest.fn().mockReturnValue(null),
        findTriggerCandidate: jest.fn(() => null),
        showBubble: jest.fn(),
        hideBubble: jest.fn(),
      }
    })

    renderHook(() =>
      useFeedbackCoordinator({
        feedbackItems: deps.feedbackItems,
        audioController: deps.audioController,
        videoPlayback: deps.videoPlayback,
      })
    )

    const audioStore = mockUseFeedbackAudioStore.getState()
    audioStore.setIsPlaying = setIsPlaying
    audioStore.setActiveAudio = clearActiveAudio
    audioStore.isPlaying = true
    audioStore.activeAudio = { id: 'feedback-1', url: 'mock-url' }
    // Set up audioUrls so hasAudioForFeedback returns true
    audioStore.audioUrls = { 'feedback-1': 'mock-url' }

    mockUseFeedbackCoordinatorStore.getState().setBubbleState({
      currentBubbleIndex: 0,
      bubbleVisible: true,
    })

    const feedbackItem = deps.feedbackItems[0]
    const elapsedResult = capturedOptions.onBubbleTimerElapsed?.({
      index: 0,
      item: feedbackItem,
      displayDurationMs: 3200,
      reason: 'playback-start',
    })

    expect(elapsedResult).toBe(true)
    expect(setIsPlaying).not.toHaveBeenCalled()
    expect(clearActiveAudio).not.toHaveBeenCalled()
  })

  it('allows bubble controller to hide when timer elapses without active audio', () => {
    const deps = createDependencies({
      audioController: { isPlaying: false },
    })

    let capturedOptions: any

    mockUseBubbleController.mockImplementation((_, __, ___, ____, _____, options) => {
      capturedOptions = options
      return {
        currentBubbleIndex: 0,
        bubbleVisible: true,
        checkAndShowBubbleAtTime: jest.fn().mockReturnValue(null),
        findTriggerCandidate: jest.fn(() => null),
        showBubble: jest.fn(),
        hideBubble: jest.fn(),
      }
    })

    renderHook(() =>
      useFeedbackCoordinator({
        feedbackItems: deps.feedbackItems,
        audioController: deps.audioController,
        videoPlayback: deps.videoPlayback,
      })
    )

    const audioStore = mockUseFeedbackAudioStore.getState()
    audioStore.isPlaying = false
    audioStore.activeAudio = null

    const result = capturedOptions.onBubbleTimerElapsed?.({
      index: 0,
      item: deps.feedbackItems[0],
      displayDurationMs: 2000,
      reason: 'initial',
    })

    expect(result).toBe(false)
  })

  /**
   * PERFORMANCE TEST: Verify coordinator doesn't re-render on progress events
   *
   * Context: currentVideoTime was stored as state, causing coordinator to re-render
   * on every progress event (every 250ms), which cascaded to VideoAnalysisScreen
   * and created phantom pendingSeek changes.
   *
   * Fix: Convert currentVideoTime to ref - no re-renders, but still accessible
   * by useBubbleController which needs it for bubble timing calculations.
   *
   * NOTE: The return object is already stable via refs, but we need to ensure
   * the hook doesn't cause parent component re-renders due to internal state changes.
   */
  it('does not cause parent re-renders when onProgressTrigger is called', () => {
    // Arrange
    const deps = createDependencies()
    let renderCount = 0

    // Wrapper component that tracks re-renders
    const TestComponent = () => {
      renderCount++
      const coordinator = useFeedbackCoordinator({
        feedbackItems: deps.feedbackItems,
        audioController: deps.audioController,
        videoPlayback: deps.videoPlayback,
      })
      return coordinator
    }

    const { result } = renderHook(() => TestComponent())
    const initialRenderCount = renderCount
    const initialOnProgressTrigger = result.current.onProgressTrigger

    // Act - Simulate multiple progress events (like video playing)
    act(() => {
      initialOnProgressTrigger(0.25)
    })

    act(() => {
      initialOnProgressTrigger(0.5)
    })

    act(() => {
      initialOnProgressTrigger(0.75)
    })

    // Assert - Render count should not increase after initial render
    // (progress events should not trigger re-renders)
    expect(renderCount).toBe(initialRenderCount)
  })
})
