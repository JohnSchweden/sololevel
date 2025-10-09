import { describe, expect, it, jest } from '@jest/globals'
import { act, renderHook } from '@testing-library/react'

import { useBubbleController } from './useBubbleController'

jest.mock('@my/logging', () => ({
  logOnChange: jest.fn(),
  log: {
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}))

const createFeedbackItems = () => [
  { id: '1', timestamp: 1000 },
  { id: '2', timestamp: 2500 },
  { id: '3', timestamp: 5000 },
]

describe('useBubbleController', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  it('shows bubble when timestamp threshold is met', () => {
    const { result } = renderHook(() => useBubbleController(createFeedbackItems(), 0, true, {}, 3))

    act(() => {
      const index = result.current.checkAndShowBubbleAtTime(1020)
      expect(index).toBe(0)
    })

    expect(result.current.currentBubbleIndex).toBe(0)
    expect(result.current.bubbleVisible).toBe(true)
  })

  it('delays timer start until playback begins when audio is pending', () => {
    const audioUrls = { '1': 'https://example.com/audio.mp3' }
    const { result, rerender } = renderHook(
      ({ isPlaying, audioDuration }) =>
        useBubbleController(createFeedbackItems(), 0, isPlaying, audioUrls, audioDuration),
      {
        initialProps: { isPlaying: false, audioDuration: 5 },
      }
    )

    act(() => {
      result.current.showBubble(0)
    })

    act(() => {
      jest.advanceTimersByTime(4000)
    })

    expect(result.current.bubbleVisible).toBe(true)

    act(() => {
      rerender({ isPlaying: true, audioDuration: 5 })
    })

    act(() => {
      jest.advanceTimersByTime(4999)
    })
    expect(result.current.bubbleVisible).toBe(true)

    act(() => {
      jest.advanceTimersByTime(1)
    })

    expect(result.current.bubbleVisible).toBe(false)
    expect(result.current.currentBubbleIndex).toBeNull()
  })

  it('recomputes timer when audio duration becomes available', () => {
    const audioUrls = { '1': 'https://example.com/audio.mp3' }
    const { result, rerender } = renderHook(
      ({ audioDuration }) =>
        useBubbleController(createFeedbackItems(), 0, true, audioUrls, audioDuration),
      {
        initialProps: { audioDuration: 0 },
      }
    )

    act(() => {
      result.current.showBubble(0)
    })

    act(() => {
      jest.advanceTimersByTime(2800)
    })
    expect(result.current.bubbleVisible).toBe(true)

    act(() => {
      rerender({ audioDuration: 5 })
    })

    act(() => {
      jest.advanceTimersByTime(4999)
    })
    expect(result.current.bubbleVisible).toBe(true)

    act(() => {
      jest.advanceTimersByTime(1)
    })
    expect(result.current.bubbleVisible).toBe(false)
  })

  it('hides bubble immediately when playback pauses after timer start', () => {
    const audioUrls = { '1': 'https://example.com/audio.mp3' }
    const { result, rerender } = renderHook(
      ({ isPlaying }) => useBubbleController(createFeedbackItems(), 0, isPlaying, audioUrls, 4),
      {
        initialProps: { isPlaying: true },
      }
    )

    act(() => {
      result.current.showBubble(0)
    })

    expect(result.current.bubbleVisible).toBe(true)

    act(() => {
      rerender({ isPlaying: false })
    })

    expect(result.current.bubbleVisible).toBe(false)
    expect(result.current.currentBubbleIndex).toBeNull()
  })

  it('respects minimum display duration when no audio URL', () => {
    const { result } = renderHook(() => useBubbleController(createFeedbackItems(), 0, true, {}, 0))

    act(() => {
      result.current.showBubble(0)
    })

    act(() => {
      jest.advanceTimersByTime(2500)
    })

    expect(result.current.bubbleVisible).toBe(true)

    act(() => {
      jest.advanceTimersByTime(600)
    })

    expect(result.current.bubbleVisible).toBe(false)
  })

  it('cleans up timers on unmount', () => {
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout')
    const { unmount, result } = renderHook(() =>
      useBubbleController(createFeedbackItems(), 0, true, {}, 0)
    )

    act(() => {
      result.current.showBubble(0)
    })

    expect(clearTimeoutSpy).toHaveBeenCalledTimes(0)

    unmount()

    expect(clearTimeoutSpy).toHaveBeenCalled()
  })

  it('catches feedback in range between sparse progress events', () => {
    // Arrange: Feedback at 2.5s and 4.1s
    const feedbackItems = [
      { id: '1', timestamp: 2500 },
      { id: '2', timestamp: 4100 },
    ]
    const { result } = renderHook(() => useBubbleController(feedbackItems, 0, true, {}, 3))

    // Act: First progress event at 2.25s (catches first feedback)
    act(() => {
      const index = result.current.checkAndShowBubbleAtTime(2250)
      expect(index).toBe(0)
    })
    expect(result.current.currentBubbleIndex).toBe(0)

    // Act: Simulate progress jump from 3.5s to 4.75s (range includes 4.1s feedback)
    act(() => {
      result.current.hideBubble('manual')
    })

    act(() => {
      // First check at 3.5s (after first feedback audio ends)
      result.current.checkAndShowBubbleAtTime(3500)
    })

    // Act: Next progress event at 4.75s (should catch feedback at 4.1s via range check)
    act(() => {
      const index = result.current.checkAndShowBubbleAtTime(4750)
      expect(index).toBe(1)
    })

    // Assert: Second feedback was triggered
    expect(result.current.currentBubbleIndex).toBe(1)
    expect(result.current.bubbleVisible).toBe(true)
  })

  it('does not re-trigger already-shown feedback', () => {
    // Arrange: Single feedback at 2.5s
    const feedbackItems = [{ id: '1', timestamp: 2500 }]
    const { result } = renderHook(() => useBubbleController(feedbackItems, 0, true, {}, 3))

    // Act: First check at 2.0s triggers feedback
    act(() => {
      const index = result.current.checkAndShowBubbleAtTime(2000)
      expect(index).toBe(0)
    })
    expect(result.current.bubbleVisible).toBe(true)

    act(() => {
      result.current.hideBubble('manual')
    })

    // Act: Check at 3.0s - range would be 2000-3500ms which includes 2500ms,
    // but should NOT re-trigger because timestamp <= lastCheck (2000ms)
    act(() => {
      const index = result.current.checkAndShowBubbleAtTime(3000)
      expect(index).toBeNull()
    })

    // Assert: Bubble remains hidden
    expect(result.current.bubbleVisible).toBe(false)
  })
})
