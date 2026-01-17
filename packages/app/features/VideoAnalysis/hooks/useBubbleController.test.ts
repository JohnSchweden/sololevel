import { describe, expect, it, jest } from '@jest/globals'
import { act, renderHook } from '@testing-library/react'

import { useFeedbackCoordinatorStore } from '../stores/feedbackCoordinatorStore'
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

type BubbleState = ReturnType<typeof useFeedbackCoordinatorStore.getState>['bubbleState']

describe('useBubbleController', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    useFeedbackCoordinatorStore.getState().reset()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
    useFeedbackCoordinatorStore.getState().reset()
  })

  it('shows bubble when timestamp threshold is met', () => {
    const { result } = renderHook(() => useBubbleController(createFeedbackItems(), 0, true, {}, 3))

    act(() => {
      const index = result.current.checkAndShowBubbleAtTime(1020)
      expect(index).toBe(0)
    })

    const bubbleState = useFeedbackCoordinatorStore.getState().bubbleState
    expect(bubbleState.currentBubbleIndex).toBe(0)
    expect(bubbleState.bubbleVisible).toBe(true)
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

    let bubbleState: BubbleState = useFeedbackCoordinatorStore.getState().bubbleState
    expect(bubbleState.bubbleVisible).toBe(true)

    act(() => {
      rerender({ isPlaying: true, audioDuration: 5 })
    })

    act(() => {
      jest.advanceTimersByTime(4999)
    })
    bubbleState = useFeedbackCoordinatorStore.getState().bubbleState
    expect(bubbleState.bubbleVisible).toBe(true)

    act(() => {
      jest.advanceTimersByTime(1)
    })

    bubbleState = useFeedbackCoordinatorStore.getState().bubbleState
    expect(bubbleState.bubbleVisible).toBe(false)
    expect(bubbleState.currentBubbleIndex).toBeNull()
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
    let bubbleState: BubbleState = useFeedbackCoordinatorStore.getState().bubbleState
    expect(bubbleState.bubbleVisible).toBe(true)

    act(() => {
      rerender({ audioDuration: 5 })
    })

    act(() => {
      jest.advanceTimersByTime(4999)
    })
    bubbleState = useFeedbackCoordinatorStore.getState().bubbleState
    expect(bubbleState.bubbleVisible).toBe(true)

    act(() => {
      jest.advanceTimersByTime(1)
    })
    expect(useFeedbackCoordinatorStore.getState().bubbleState.bubbleVisible).toBe(false)
  })

  it('keeps bubble visible and pauses timer when playback pauses after timer start', () => {
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

    let bubbleState: BubbleState = useFeedbackCoordinatorStore.getState().bubbleState
    expect(bubbleState.bubbleVisible).toBe(true)

    // Advance time to start the timer
    act(() => {
      jest.advanceTimersByTime(100)
    })

    act(() => {
      rerender({ isPlaying: false })
    })

    // Bubble should stay visible when paused (timer pauses, bubble doesn't hide)
    bubbleState = useFeedbackCoordinatorStore.getState().bubbleState
    expect(bubbleState.bubbleVisible).toBe(true)
    expect(bubbleState.currentBubbleIndex).toBe(0)

    // Resume playback - timer should resume
    act(() => {
      rerender({ isPlaying: true })
    })

    bubbleState = useFeedbackCoordinatorStore.getState().bubbleState
    expect(bubbleState.bubbleVisible).toBe(true)
    expect(bubbleState.currentBubbleIndex).toBe(0)
  })

  it('respects minimum display duration when no audio URL', () => {
    const { result } = renderHook(() => useBubbleController(createFeedbackItems(), 0, true, {}, 0))

    act(() => {
      result.current.showBubble(0)
    })

    act(() => {
      jest.advanceTimersByTime(1500)
    })

    const bubbleState = useFeedbackCoordinatorStore.getState().bubbleState
    expect(bubbleState.bubbleVisible).toBe(true)

    act(() => {
      jest.advanceTimersByTime(600)
    })

    expect(useFeedbackCoordinatorStore.getState().bubbleState.bubbleVisible).toBe(false)
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

    // Act: Progress event just after first timestamp (2.6s) catches first feedback
    act(() => {
      const index = result.current.checkAndShowBubbleAtTime(2600)
      expect(index).toBe(0)
    })
    expect(useFeedbackCoordinatorStore.getState().bubbleState.currentBubbleIndex).toBe(0)

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
    expect(useFeedbackCoordinatorStore.getState().bubbleState.currentBubbleIndex).toBe(1)
    expect(useFeedbackCoordinatorStore.getState().bubbleState.bubbleVisible).toBe(true)
  })

  it('does not re-trigger already-shown feedback', () => {
    // Arrange: Single feedback at 2.5s
    const feedbackItems = [{ id: '1', timestamp: 2500 }]
    const { result } = renderHook(() => useBubbleController(feedbackItems, 0, true, {}, 3))

    // Act: First check at 2.0s triggers feedback
    act(() => {
      const index = result.current.checkAndShowBubbleAtTime(2600)
      expect(index).toBe(0)
    })
    expect(useFeedbackCoordinatorStore.getState().bubbleState.bubbleVisible).toBe(true)

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
    expect(useFeedbackCoordinatorStore.getState().bubbleState.bubbleVisible).toBe(false)
  })

  describe('findTriggerCandidate - forward seek detection', () => {
    it('does not trigger feedback early during normal playback', () => {
      // Arrange: Feedback at 2.5s, video playing normally
      const feedbackItems = [
        { id: '1', timestamp: 2500 },
        { id: '2', timestamp: 4100 },
      ]
      const { result } = renderHook(() => useBubbleController(feedbackItems, 0, true, {}, 3))

      // Act: Simulate normal playback progression
      // lastCheck=1500ms, currentTime=2000ms, feedback at 2500ms
      // timeDelta=500ms < 1500ms threshold → NOT a forward seek
      // Range check: 2500 > 1500 && 2500 <= 2000 → FALSE (not in range)
      act(() => {
        result.current.checkAndShowBubbleAtTime(1500)
      })

      act(() => {
        const candidate = result.current.findTriggerCandidate(2000)
        // Assert: Should NOT find candidate (feedback at 2500ms not yet reached)
        expect(candidate).toBeNull()
      })
    })

    it('triggers feedback when video crosses timestamp during normal playback', () => {
      // Arrange: Feedback at 2.5s
      const feedbackItems = [{ id: '1', timestamp: 2500 }]
      const { result } = renderHook(() => useBubbleController(feedbackItems, 0, true, {}, 3))

      // Act: Simulate playback reaching feedback timestamp
      // lastCheck=2000ms, currentTime=2600ms, feedback at 2500ms
      // timeDelta=600ms < 1500ms threshold → NOT a forward seek
      // Range check: 2500 > 2000 && 2500 <= 2600 → TRUE (in range)
      act(() => {
        result.current.checkAndShowBubbleAtTime(2000)
      })

      act(() => {
        const candidate = result.current.findTriggerCandidate(2600)
        // Assert: Should find candidate when timestamp is crossed
        expect(candidate).not.toBeNull()
        expect(candidate?.item.id).toBe('1')
        expect(candidate?.item.timestamp).toBe(2500)
      })
    })

    it('uses threshold check for forward seeks to prevent triggering skipped feedbacks', () => {
      // Arrange: Two feedbacks at 2.5s and 4.1s
      const feedbackItems = [
        { id: '1', timestamp: 2500 },
        { id: '2', timestamp: 4100 },
      ]
      const { result } = renderHook(() => useBubbleController(feedbackItems, 0, true, {}, 3))

      // Act: Simulate user seeking from 1.5s to 4.1s
      // lastCheck=1500ms, currentTime=4100ms
      // timeDelta=2600ms > 1500ms threshold → IS a forward seek
      // Threshold check: |2500 - 4100| = 1600ms > 500ms → FALSE (first feedback too far)
      // Threshold check: |4100 - 4100| = 0ms < 500ms → TRUE (second feedback matches)
      act(() => {
        result.current.checkAndShowBubbleAtTime(1500)
      })

      act(() => {
        const candidate = result.current.findTriggerCandidate(4100)
        // Assert: Should find second feedback (at seek position), not first (skipped)
        expect(candidate).not.toBeNull()
        expect(candidate?.item.id).toBe('2')
        expect(candidate?.item.timestamp).toBe(4100)
      })
    })
  })

  describe('text-based duration estimation', () => {
    it('uses text-based duration when no audio is available', () => {
      // Arrange: Feedback with medium length text (40 chars)
      const feedbackItems = [
        { id: '1', timestamp: 1000, text: 'Your grip technique needs improvement.' },
      ]
      const { result } = renderHook(() =>
        useBubbleController(feedbackItems, 0, true, {}, 0, {
          onBubbleShow: jest.fn(),
        })
      )

      const onBubbleShow = jest.fn()
      result.current = renderHook(() =>
        useBubbleController(feedbackItems, 0, true, {}, 0, {
          onBubbleShow,
        })
      ).result.current

      // Act: Show bubble for feedback without audio
      act(() => {
        result.current.showBubble(0)
      })

      // Assert: onBubbleShow called with text-based duration
      // 40 chars / 20 chars/sec = 2000ms + 500ms buffer = 2500ms (minimum 2000ms)
      expect(onBubbleShow).toHaveBeenCalledWith({
        index: 0,
        item: feedbackItems[0],
        displayDurationMs: expect.any(Number),
      })
      const displayDuration = (onBubbleShow.mock.calls[0][0] as { displayDurationMs: number })
        .displayDurationMs
      expect(displayDuration).toBeGreaterThanOrEqual(2000) // Minimum duration
      expect(displayDuration).toBeLessThanOrEqual(3000) // ~2.5s for 40 chars
    })

    it('uses minimum duration for feedback without text', () => {
      // Arrange: Feedback with no text field
      const feedbackItems = [{ id: '1', timestamp: 1000 }]
      const onBubbleShow = jest.fn()

      const { result } = renderHook(() =>
        useBubbleController(feedbackItems, 0, true, {}, 0, {
          onBubbleShow,
        })
      )

      // Act: Show bubble
      act(() => {
        result.current.showBubble(0)
      })

      // Assert: Uses minimum duration (2000ms)
      expect(onBubbleShow).toHaveBeenCalledWith({
        index: 0,
        item: feedbackItems[0],
        displayDurationMs: 2000,
      })
    })

    it('scales duration with longer text', () => {
      // Arrange: Feedback with long text (100 chars)
      const longText =
        'Your grip technique needs improvement. Try adjusting your hand position for better club control.'
      const feedbackItems = [{ id: '1', timestamp: 1000, text: longText }]
      const onBubbleShow = jest.fn()

      const { result } = renderHook(() =>
        useBubbleController(feedbackItems, 0, true, {}, 0, {
          onBubbleShow,
        })
      )

      // Act: Show bubble
      act(() => {
        result.current.showBubble(0)
      })

      // Assert: Duration scales with text length
      // 100 chars / 20 chars/sec = 5000ms + 500ms buffer = 5500ms
      const displayDuration = (onBubbleShow.mock.calls[0][0] as { displayDurationMs: number })
        .displayDurationMs
      expect(displayDuration).toBeGreaterThanOrEqual(5000)
      expect(displayDuration).toBeLessThanOrEqual(6000)
    })
  })

  describe('fallback timer pause/resume with isFallbackTimerActive', () => {
    it('pauses timer when isFallbackTimerActive becomes false for feedback without audio', () => {
      // Arrange: Feedback without audio, timer should run based on isFallbackTimerActive
      const feedbackItems = [{ id: '1', timestamp: 1000, text: 'Test feedback' }]

      // Start with timer active
      act(() => {
        useFeedbackCoordinatorStore.getState().setFallbackTimerActive(true)
        useFeedbackCoordinatorStore.getState().setBubbleState({
          currentBubbleIndex: 0,
          bubbleVisible: true,
        })
      })

      const { result, rerender } = renderHook(() =>
        useBubbleController(feedbackItems, 0, false, {}, 0, {})
      )

      // Trigger show bubble to start timer
      act(() => {
        result.current.showBubble(0)
      })

      // Act: Set isFallbackTimerActive to false (simulate user pause)
      act(() => {
        useFeedbackCoordinatorStore.getState().setFallbackTimerActive(false)
        // Re-render to trigger effect that checks isFallbackTimerActive
        rerender()
      })

      // Advance time significantly - bubble should still be visible because timer was paused
      act(() => {
        jest.advanceTimersByTime(3000)
      })

      const bubbleState = useFeedbackCoordinatorStore.getState().bubbleState
      expect(bubbleState.bubbleVisible).toBe(true)
      expect(bubbleState.currentBubbleIndex).toBe(0)
    })

    it('resumes timer when isFallbackTimerActive becomes true for feedback without audio', () => {
      // Arrange: Feedback without audio
      const feedbackItems = [{ id: '1', timestamp: 1000, text: 'Test feedback' }]

      const { result, rerender } = renderHook(() =>
        useBubbleController(feedbackItems, 0, false, {}, 0, {})
      )

      // Start timer by setting isFallbackTimerActive to true and showing bubble
      act(() => {
        useFeedbackCoordinatorStore.getState().setFallbackTimerActive(true)
        result.current.showBubble(0)
      })

      // Pause timer by setting isFallbackTimerActive to false
      act(() => {
        useFeedbackCoordinatorStore.getState().setFallbackTimerActive(false)
        // Re-render to trigger effect that pauses timer
        rerender()
      })

      // Advance time - bubble should still be visible (timer paused)
      act(() => {
        jest.advanceTimersByTime(1000)
      })

      let bubbleState = useFeedbackCoordinatorStore.getState().bubbleState
      expect(bubbleState.bubbleVisible).toBe(true)

      // Act: Resume timer by setting isFallbackTimerActive to true
      act(() => {
        useFeedbackCoordinatorStore.getState().setFallbackTimerActive(true)
        // Re-render to trigger effect that resumes timer
        rerender()
      })

      // Advance remaining time - bubble should hide after duration
      act(() => {
        jest.advanceTimersByTime(2500) // ~2.5s for text-based duration
      })

      bubbleState = useFeedbackCoordinatorStore.getState().bubbleState
      expect(bubbleState.bubbleVisible).toBe(false)
    })

    it('uses isPlaying for feedback with audio, ignores isFallbackTimerActive', () => {
      // Arrange: Feedback WITH audio URL - should use isPlaying, not isFallbackTimerActive
      const feedbackItems = [{ id: '1', timestamp: 1000 }]
      const audioUrls = { '1': 'https://example.com/audio.mp3' }

      const { result, rerender } = renderHook(
        ({ isPlaying }) => useBubbleController(feedbackItems, 0, isPlaying, audioUrls, 5, {}),
        {
          initialProps: { isPlaying: true },
        }
      )

      act(() => {
        result.current.showBubble(0)
      })

      // Set isFallbackTimerActive to true - should NOT affect timer for feedback with audio
      act(() => {
        useFeedbackCoordinatorStore.getState().setFallbackTimerActive(true)
      })

      // Advance time - timer should continue based on isPlaying
      act(() => {
        jest.advanceTimersByTime(4999)
      })

      let bubbleState = useFeedbackCoordinatorStore.getState().bubbleState
      expect(bubbleState.bubbleVisible).toBe(true)

      // Act: Pause isPlaying (should pause timer)
      act(() => {
        rerender({ isPlaying: false })
      })

      // Advance more time - timer should be paused
      act(() => {
        jest.advanceTimersByTime(2000)
      })

      bubbleState = useFeedbackCoordinatorStore.getState().bubbleState
      expect(bubbleState.bubbleVisible).toBe(true) // Still visible because paused

      // Resume isPlaying
      act(() => {
        rerender({ isPlaying: true })
      })

      // Advance remaining time
      act(() => {
        jest.advanceTimersByTime(1)
      })

      bubbleState = useFeedbackCoordinatorStore.getState().bubbleState
      expect(bubbleState.bubbleVisible).toBe(false)
    })
  })
})
