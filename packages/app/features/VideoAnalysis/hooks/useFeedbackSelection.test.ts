import { describe, expect, it, jest } from '@jest/globals'
import { act, renderHook } from '@testing-library/react'

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
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  const createFeedbackDeps = () => {
    const feedbackAudio = {
      audioUrls: {
        '1': 'https://cdn.example.com/audio.mp3',
      },
      selectAudio: jest.fn(),
      clearActiveAudio: jest.fn(),
      errors: {},
    }

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

    return { feedbackAudio, audioController, videoPlayback, item }
  }

  it('selects feedback and triggers audio playback', () => {
    const deps = createFeedbackDeps()

    const { result } = renderHook(() =>
      useFeedbackSelection(
        deps.feedbackAudio as any,
        deps.audioController as any,
        deps.videoPlayback as any
      )
    )

    act(() => {
      result.current.selectFeedback(deps.item)
    })

    expect(result.current.selectedFeedbackId).toBe('1')
    expect(deps.videoPlayback.seek).toHaveBeenCalledWith(2)
    expect(deps.feedbackAudio.selectAudio).toHaveBeenCalledWith('1')
    expect(deps.audioController.setIsPlaying).toHaveBeenCalledWith(true)
  })

  it('respects select options for seek/audio toggles', () => {
    const deps = createFeedbackDeps()

    const { result } = renderHook(() =>
      useFeedbackSelection(
        deps.feedbackAudio as any,
        deps.audioController as any,
        deps.videoPlayback as any
      )
    )

    act(() => {
      result.current.selectFeedback(deps.item, { seek: false, playAudio: false })
    })

    expect(deps.videoPlayback.seek).not.toHaveBeenCalled()
    expect(deps.feedbackAudio.selectAudio).not.toHaveBeenCalled()

    act(() => {
      result.current.selectFeedback(deps.item, { seek: true, playAudio: true })
    })

    act(() => {
      result.current.clearSelection()
    })

    expect(result.current.selectedFeedbackId).toBeNull()
    expect(deps.feedbackAudio.clearActiveAudio).toHaveBeenCalled()
    expect(deps.audioController.setIsPlaying).toHaveBeenCalledWith(false)
  })

  it('allows manually triggering coach speaking duration', () => {
    const deps = createFeedbackDeps()

    const { result } = renderHook(() =>
      useFeedbackSelection(
        deps.feedbackAudio as any,
        deps.audioController as any,
        deps.videoPlayback as any
      )
    )

    act(() => {
      result.current.triggerCoachSpeaking(10)
    })

    expect(result.current.isCoachSpeaking).toBe(true)

    act(() => {
      result.current.triggerCoachSpeaking(0)
    })

    expect(result.current.isCoachSpeaking).toBe(false)
  })

  it('handles auto highlight with custom duration and cleanup', () => {
    const deps = createFeedbackDeps()

    const { result } = renderHook(() =>
      useFeedbackSelection(
        deps.feedbackAudio as any,
        deps.audioController as any,
        deps.videoPlayback as any
      )
    )

    act(() => {
      result.current.highlightAutoFeedback(deps.item, {
        seek: false,
        playAudio: true,
        autoDurationMs: 5,
      })
    })

    expect(result.current.highlightedFeedbackId).toBe('1')
    expect(result.current.highlightSource).toBe('auto')
    expect(deps.videoPlayback.seek).not.toHaveBeenCalled()
    expect(deps.feedbackAudio.selectAudio).toHaveBeenCalledWith('1')

    act(() => {
      jest.runAllTimers()
    })

    expect(result.current.highlightedFeedbackId).toBeNull()
  })

  it('clearHighlight respects matchId and sources', () => {
    const deps = createFeedbackDeps()

    const { result } = renderHook(() =>
      useFeedbackSelection(
        deps.feedbackAudio as any,
        deps.audioController as any,
        deps.videoPlayback as any
      )
    )

    act(() => {
      result.current.highlightAutoFeedback(deps.item, { seek: false, playAudio: false })
    })

    act(() => {
      result.current.clearHighlight({ matchId: 'other-id' })
    })

    expect(result.current.highlightedFeedbackId).toBe('1')

    act(() => {
      result.current.clearHighlight({ sources: ['user'] })
    })

    expect(result.current.highlightedFeedbackId).toBe('1')

    act(() => {
      result.current.clearHighlight({ matchId: '1', sources: ['auto'], reason: 'manual-test' })
    })

    expect(result.current.highlightedFeedbackId).toBeNull()
  })

  describe('Task 5.2: Batched Selection State Updates', () => {
    it('batches non-urgent UI state updates with startTransition', () => {
      const deps = createFeedbackDeps()
      let renderCount = 0

      const { result, rerender } = renderHook(() => {
        renderCount++
        return useFeedbackSelection(
          deps.feedbackAudio as any,
          deps.audioController as any,
          deps.videoPlayback as any
        )
      })

      const initialRenderCount = renderCount

      // Act - Select feedback (triggers 4 state updates: highlight, selected, audio, speaking)
      act(() => {
        result.current.selectFeedback(deps.item)
      })

      // Force a rerender to see batched updates
      rerender()

      const finalRenderCount = renderCount
      const additionalRenders = finalRenderCount - initialRenderCount

      // Without startTransition: ~4 renders (one per state update)
      // With startTransition: 1-2 renders (batched)
      expect(additionalRenders).toBeLessThanOrEqual(2)

      // Verify all state was still set correctly
      expect(result.current.selectedFeedbackId).toBe('1')
      expect(result.current.highlightedFeedbackId).toBe('1')
      expect(result.current.isCoachSpeaking).toBe(true)
    })

    it('urgent seek operation happens immediately without batching', () => {
      const deps = createFeedbackDeps()

      const { result } = renderHook(() =>
        useFeedbackSelection(
          deps.feedbackAudio as any,
          deps.audioController as any,
          deps.videoPlayback as any
        )
      )

      const seekStartTime = performance.now()

      act(() => {
        result.current.selectFeedback(deps.item)
      })

      const seekEndTime = performance.now()
      const seekDuration = seekEndTime - seekStartTime

      // Seek should be called immediately (not deferred by startTransition)
      expect(deps.videoPlayback.seek).toHaveBeenCalledWith(2)

      // Should complete quickly (< 50ms, accounting for test overhead)
      expect(seekDuration).toBeLessThan(50)
    })
  })

  describe('Priority 3: Batch State Updates', () => {
    it('batches clearSelection state updates in single transaction', () => {
      const deps = createFeedbackDeps()
      let renderCount = 0

      const { result, rerender } = renderHook(() => {
        renderCount++
        return useFeedbackSelection(
          deps.feedbackAudio as any,
          deps.audioController as any,
          deps.videoPlayback as any
        )
      })

      // Arrange - Select feedback first
      act(() => {
        result.current.selectFeedback(deps.item)
      })

      const beforeClearRenderCount = renderCount

      // Act - Clear selection (5 state updates: clearHighlight, setSelectedId, clearActiveAudio, setIsPlaying, triggerCoachSpeaking)
      act(() => {
        result.current.clearSelection()
      })

      // Force a rerender to see batched updates
      rerender()

      const afterClearRenderCount = renderCount
      const additionalRenders = afterClearRenderCount - beforeClearRenderCount

      // Assert - With startTransition batching: 1-2 renders (batched)
      // Without batching: ~5 renders (one per state update)
      expect(additionalRenders).toBeLessThanOrEqual(2)

      // Verify all state was cleared correctly
      expect(result.current.selectedFeedbackId).toBeNull()
      expect(result.current.highlightedFeedbackId).toBeNull()
      expect(result.current.isCoachSpeaking).toBe(false)
      expect(deps.feedbackAudio.clearActiveAudio).toHaveBeenCalled()
      expect(deps.audioController.setIsPlaying).toHaveBeenCalledWith(false)
    })
  })

  describe('Task 5.3: Optimize coachSpeaking Timer', () => {
    it('does not trigger re-render when timer is cleared if speaking is already false', () => {
      const deps = createFeedbackDeps()
      let renderCount = 0

      const { result } = renderHook(() => {
        renderCount++
        return useFeedbackSelection(
          deps.feedbackAudio as any,
          deps.audioController as any,
          deps.videoPlayback as any
        )
      })

      // Act - Trigger speaking with 0 duration (should set to false without timer)
      act(() => {
        result.current.triggerCoachSpeaking(0)
      })

      const afterFirstCall = renderCount

      // Should not trigger re-render if already false
      act(() => {
        result.current.triggerCoachSpeaking(0)
      })

      const afterSecondCall = renderCount

      // Assert - Second call with 0 duration should not cause render (already false)
      expect(afterSecondCall).toBe(afterFirstCall)
      expect(result.current.isCoachSpeaking).toBe(false)
    })

    it('only triggers re-render when isCoachSpeaking actually changes', () => {
      const deps = createFeedbackDeps()
      let renderCount = 0

      const { result } = renderHook(() => {
        renderCount++
        return useFeedbackSelection(
          deps.feedbackAudio as any,
          deps.audioController as any,
          deps.videoPlayback as any
        )
      })

      // Start speaking
      act(() => {
        result.current.triggerCoachSpeaking(100)
      })

      const afterStart = renderCount

      // Interrupt with another speaking call (should clear previous timer)
      act(() => {
        result.current.triggerCoachSpeaking(100)
      })

      const afterInterrupt = renderCount

      // Assert - Interrupting should not cause extra render (already true)
      // Should only set new timer without state change
      expect(afterInterrupt).toBe(afterStart)
      expect(result.current.isCoachSpeaking).toBe(true)
    })

    it('prevents redundant state updates when timer expires', () => {
      const deps = createFeedbackDeps()
      let renderCount = 0

      const { result } = renderHook(() => {
        renderCount++
        return useFeedbackSelection(
          deps.feedbackAudio as any,
          deps.audioController as any,
          deps.videoPlayback as any
        )
      })

      // Trigger speaking
      act(() => {
        result.current.triggerCoachSpeaking(10)
      })

      const beforeTimeout = renderCount

      // Let timer expire
      act(() => {
        jest.advanceTimersByTime(10)
      })

      const afterTimeout = renderCount

      // Assert - Timer expiring should cause one render to set false
      expect(afterTimeout).toBe(beforeTimeout + 1)
      expect(result.current.isCoachSpeaking).toBe(false)

      // Manually set to false again (should not cause render)
      const beforeSecondSet = renderCount
      act(() => {
        result.current.triggerCoachSpeaking(0)
      })

      const afterSecondSet = renderCount

      // Should not render again (already false)
      expect(afterSecondSet).toBe(beforeSecondSet)
    })
  })
})
