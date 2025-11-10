import { describe, expect, it, jest } from '@jest/globals'
import { act, renderHook } from '@testing-library/react'

import { useFeedbackAudioStore } from '../stores/feedbackAudio'
import { useFeedbackCoordinatorStore } from '../stores/feedbackCoordinatorStore'
import type { FeedbackPanelItem } from '../types'
import { useFeedbackSelection } from './useFeedbackSelection'

jest.mock('@my/logging', () => ({
  logOnChange: jest.fn(),
  log: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}))

describe('useFeedbackSelection', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.clearAllMocks()
    // Reset store to initial state before each test
    useFeedbackCoordinatorStore.getState().reset()
    useFeedbackAudioStore.setState((state) => ({
      ...state,
      activeAudio: null,
      isPlaying: false,
      controller: null,
    }))
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  const createFeedbackDeps = () => {
    // Mock feedback audio store
    useFeedbackAudioStore.setState((state) => ({
      ...state,
      audioUrls: {
        '1': 'https://cdn.example.com/audio.mp3',
      },
      activeAudio: null,
      errors: {},
      isPlaying: false,
      controller: null,
    }))

    const audioController = {
      setIsPlaying: jest.fn(),
      seekTo: jest.fn(),
    }

    const videoPlayback = {
      seek: jest.fn(),
      currentTime: 5,
    }

    const item: FeedbackPanelItem = {
      id: '1',
      timestamp: 2000,
      text: 'Feedback text',
      type: 'suggestion',
      category: 'voice',
      ssmlStatus: 'completed',
      audioStatus: 'completed',
      confidence: 1,
    }

    return { audioController, videoPlayback, item }
  }

  it('selects feedback and triggers audio playback', () => {
    const deps = createFeedbackDeps()

    const { result } = renderHook(() =>
      useFeedbackSelection(deps.audioController as any, deps.videoPlayback as any)
    )

    act(() => {
      result.current.selectFeedback(deps.item)
    })

    // Read from store to verify state
    const storeState = useFeedbackCoordinatorStore.getState()
    expect(storeState.selectedFeedbackId).toBe('1')
    expect(storeState.highlightedFeedbackId).toBe('1')
    expect(storeState.highlightSource).toBe('user')
    expect(deps.videoPlayback.seek).toHaveBeenCalledWith(2)
    expect(useFeedbackAudioStore.getState().isPlaying).toBe(true)
  })

  it('respects select options for seek/audio toggles', () => {
    const deps = createFeedbackDeps()

    const { result } = renderHook(() =>
      useFeedbackSelection(deps.audioController as any, deps.videoPlayback as any)
    )

    act(() => {
      result.current.selectFeedback(deps.item, { seek: false, playAudio: false })
    })

    expect(deps.videoPlayback.seek).not.toHaveBeenCalled()

    act(() => {
      result.current.selectFeedback(deps.item, { seek: true, playAudio: true })
    })

    act(() => {
      result.current.clearSelection()
    })

    // Read from store to verify state
    const storeState = useFeedbackCoordinatorStore.getState()
    expect(storeState.selectedFeedbackId).toBeNull()
    expect(storeState.highlightedFeedbackId).toBeNull()
    const audioStoreState = useFeedbackAudioStore.getState()
    expect(audioStoreState.activeAudio).toBeNull()
    expect(audioStoreState.isPlaying).toBe(false)
  })

  it('allows manually triggering coach speaking duration', () => {
    const deps = createFeedbackDeps()

    const { result } = renderHook(() =>
      useFeedbackSelection(deps.audioController as any, deps.videoPlayback as any)
    )

    act(() => {
      result.current.triggerCoachSpeaking(10)
    })

    // Read from store to verify state
    expect(useFeedbackCoordinatorStore.getState().isCoachSpeaking).toBe(true)

    act(() => {
      result.current.triggerCoachSpeaking(0)
    })

    expect(useFeedbackCoordinatorStore.getState().isCoachSpeaking).toBe(false)
  })

  it('handles auto highlight with custom duration and cleanup', () => {
    const deps = createFeedbackDeps()

    const { result } = renderHook(() =>
      useFeedbackSelection(deps.audioController as any, deps.videoPlayback as any)
    )

    act(() => {
      result.current.highlightAutoFeedback(deps.item, {
        seek: false,
        playAudio: true,
        autoDurationMs: 5,
      })
    })

    // Read from store to verify state
    const storeState = useFeedbackCoordinatorStore.getState()
    expect(storeState.highlightedFeedbackId).toBe('1')
    expect(storeState.highlightSource).toBe('auto')
    expect(deps.videoPlayback.seek).not.toHaveBeenCalled()

    act(() => {
      jest.runAllTimers()
    })

    expect(useFeedbackCoordinatorStore.getState().highlightedFeedbackId).toBeNull()
  })

  it('clearHighlight respects matchId and sources', () => {
    const deps = createFeedbackDeps()

    const { result } = renderHook(() =>
      useFeedbackSelection(deps.audioController as any, deps.videoPlayback as any)
    )

    act(() => {
      result.current.highlightAutoFeedback(deps.item, { seek: false, playAudio: false })
    })

    act(() => {
      result.current.clearHighlight({ matchId: 'other-id' })
    })

    // Read from store to verify state
    expect(useFeedbackCoordinatorStore.getState().highlightedFeedbackId).toBe('1')

    act(() => {
      result.current.clearHighlight({ sources: ['user'] })
    })

    expect(useFeedbackCoordinatorStore.getState().highlightedFeedbackId).toBe('1')

    act(() => {
      result.current.clearHighlight({ matchId: '1', sources: ['auto'], reason: 'manual-test' })
    })

    expect(useFeedbackCoordinatorStore.getState().highlightedFeedbackId).toBeNull()
  })

  describe('Task 5.2: Batched Selection State Updates', () => {
    it('batches state updates in single store transaction', () => {
      const deps = createFeedbackDeps()

      const { result } = renderHook(() =>
        useFeedbackSelection(deps.audioController as any, deps.videoPlayback as any)
      )

      // Act - Select feedback (triggers batchUpdate with multiple state changes)
      act(() => {
        result.current.selectFeedback(deps.item)
      })

      // Verify all state was set correctly in single transaction
      const storeState = useFeedbackCoordinatorStore.getState()
      expect(storeState.selectedFeedbackId).toBe('1')
      expect(storeState.highlightedFeedbackId).toBe('1')
      expect(storeState.highlightSource).toBe('user')
      expect(storeState.isCoachSpeaking).toBe(true)
    })

    it('urgent seek operation happens immediately without batching', () => {
      const deps = createFeedbackDeps()

      const { result } = renderHook(() =>
        useFeedbackSelection(deps.audioController as any, deps.videoPlayback as any)
      )

      const seekStartTime = performance.now()

      act(() => {
        result.current.selectFeedback(deps.item)
      })

      const seekEndTime = performance.now()
      const seekDuration = seekEndTime - seekStartTime

      // Seek should be called immediately (not deferred)
      expect(deps.videoPlayback.seek).toHaveBeenCalledWith(2)

      // Should complete quickly (< 50ms, accounting for test overhead)
      expect(seekDuration).toBeLessThan(50)
    })
  })

  describe('Priority 3: Batch State Updates', () => {
    it('batches clearSelection state updates in single transaction', () => {
      const deps = createFeedbackDeps()

      const { result } = renderHook(() =>
        useFeedbackSelection(deps.audioController as any, deps.videoPlayback as any)
      )

      // Arrange - Select feedback first
      act(() => {
        result.current.selectFeedback(deps.item)
      })

      // Act - Clear selection (batched in store transaction)
      act(() => {
        result.current.clearSelection()
      })

      // Verify all state was cleared correctly
      const storeState = useFeedbackCoordinatorStore.getState()
      expect(storeState.selectedFeedbackId).toBeNull()
      expect(storeState.highlightedFeedbackId).toBeNull()
      expect(storeState.isCoachSpeaking).toBe(false)
      const audioState = useFeedbackAudioStore.getState()
      expect(audioState.activeAudio).toBeNull()
      expect(audioState.isPlaying).toBe(false)
    })
  })

  describe('Task 5.3: Optimize coachSpeaking Timer', () => {
    it('does not trigger update when timer is cleared if speaking is already false', () => {
      const deps = createFeedbackDeps()

      const { result } = renderHook(() =>
        useFeedbackSelection(deps.audioController as any, deps.videoPlayback as any)
      )

      // Act - Trigger speaking with 0 duration (should set to false without timer)
      act(() => {
        result.current.triggerCoachSpeaking(0)
      })

      // Should be false (no change from initial state)
      expect(useFeedbackCoordinatorStore.getState().isCoachSpeaking).toBe(false)

      // Second call with 0 duration should not cause update (already false)
      act(() => {
        result.current.triggerCoachSpeaking(0)
      })

      expect(useFeedbackCoordinatorStore.getState().isCoachSpeaking).toBe(false)
    })

    it('only triggers update when isCoachSpeaking actually changes', () => {
      const deps = createFeedbackDeps()

      const { result } = renderHook(() =>
        useFeedbackSelection(deps.audioController as any, deps.videoPlayback as any)
      )

      // Start speaking
      act(() => {
        result.current.triggerCoachSpeaking(100)
      })

      // Read from store
      expect(useFeedbackCoordinatorStore.getState().isCoachSpeaking).toBe(true)

      // Interrupt with another speaking call (should clear previous timer)
      act(() => {
        result.current.triggerCoachSpeaking(100)
      })

      // Should still be true (no redundant update)
      expect(useFeedbackCoordinatorStore.getState().isCoachSpeaking).toBe(true)
    })

    it('prevents redundant state updates when timer expires', () => {
      const deps = createFeedbackDeps()

      const { result } = renderHook(() =>
        useFeedbackSelection(deps.audioController as any, deps.videoPlayback as any)
      )

      // Trigger speaking
      act(() => {
        result.current.triggerCoachSpeaking(10)
      })

      expect(useFeedbackCoordinatorStore.getState().isCoachSpeaking).toBe(true)

      // Let timer expire
      act(() => {
        jest.advanceTimersByTime(10)
      })

      // Read from store - should be false after timer expires
      expect(useFeedbackCoordinatorStore.getState().isCoachSpeaking).toBe(false)

      // Manually set to false again (should not cause update)
      act(() => {
        result.current.triggerCoachSpeaking(0)
      })

      // Should still be false (no redundant update)
      expect(useFeedbackCoordinatorStore.getState().isCoachSpeaking).toBe(false)
    })
  })
})
