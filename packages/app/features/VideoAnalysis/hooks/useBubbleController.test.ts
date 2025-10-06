import { describe, expect, it, jest } from '@jest/globals'
import { act, renderHook } from '@testing-library/react'

import { useBubbleController } from './useBubbleController'

jest.mock('@my/logging', () => ({
  log: {
    info: jest.fn(),
    warn: jest.fn(),
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

  it('hides bubble after audio duration elapsed', () => {
    const audioUrls = { '1': 'https://example.com/audio.mp3' }
    const { result } = renderHook(() =>
      useBubbleController(createFeedbackItems(), 0, true, audioUrls, 4)
    )

    act(() => {
      result.current.showBubble(0)
    })

    expect(result.current.bubbleVisible).toBe(true)

    act(() => {
      jest.advanceTimersByTime(4000)
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

  it('does not hide bubble if pause occurred recently', () => {
    const { result, rerender } = renderHook(
      ({ isPlaying }) => useBubbleController(createFeedbackItems(), 0, isPlaying, {}, 0),
      {
        initialProps: { isPlaying: true },
      }
    )

    act(() => {
      result.current.showBubble(0)
    })

    rerender({ isPlaying: false })
    act(() => {
      jest.advanceTimersByTime(50)
    })

    expect(result.current.bubbleVisible).toBe(true)
  })

  it('hides bubble when paused long enough', () => {
    const { result, rerender } = renderHook(
      ({ isPlaying }) => useBubbleController(createFeedbackItems(), 0, isPlaying, {}, 0),
      {
        initialProps: { isPlaying: true },
      }
    )

    act(() => {
      result.current.showBubble(0)
    })

    act(() => {
      jest.advanceTimersByTime(3000)
    })

    rerender({ isPlaying: false })

    act(() => {
      jest.advanceTimersByTime(150)
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
})
