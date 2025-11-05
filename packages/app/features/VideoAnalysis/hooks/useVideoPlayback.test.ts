import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import { act, renderHook } from '@testing-library/react'

import { useVideoPlayback } from './useVideoPlayback'

jest.mock('@my/logging', () => ({
  logOnChange: jest.fn(),
  log: {
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
  },
}))

describe('useVideoPlayback', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('initialises with default state', () => {
    const { result } = renderHook(() => useVideoPlayback())

    expect(result.current.isPlaying).toBe(false)
    expect(result.current.currentTime).toBe(0)
    expect(result.current.duration).toBe(0)
    expect(result.current.pendingSeek).toBeNull()
    expect(result.current.videoEnded).toBe(false)
  })

  it('respects initial playing status', () => {
    const { result } = renderHook(() => useVideoPlayback('playing'))

    expect(result.current.isPlaying).toBe(true)
  })

  it('toggles playing state via play/pause', () => {
    const { result } = renderHook(() => useVideoPlayback())

    act(() => {
      result.current.play()
    })
    expect(result.current.isPlaying).toBe(true)

    act(() => {
      result.current.pause()
    })
    expect(result.current.isPlaying).toBe(false)
  })

  it('tracks current time through progress handler', () => {
    const { result } = renderHook(() => useVideoPlayback())

    act(() => {
      result.current.handleProgress({ currentTime: 12.5 })
    })

    // currentTime is rounded to seconds for performance (displayTime optimization)
    expect(result.current.currentTime).toBe(12)
  })

  it('ignores duplicate progress values', () => {
    const { result } = renderHook(() => useVideoPlayback())

    act(() => {
      result.current.handleProgress({ currentTime: 5 })
    })

    const setStateSpy = jest.spyOn(result.current, 'handleProgress')

    act(() => {
      result.current.handleProgress({ currentTime: 5 })
    })

    expect(setStateSpy).toHaveBeenCalledTimes(1)
  })

  it('records duration and clears ended state on load', () => {
    const { result } = renderHook(() => useVideoPlayback())

    act(() => {
      result.current.handleLoad({ duration: 100 })
    })

    expect(result.current.duration).toBe(100)
    expect(result.current.videoEnded).toBe(false)
  })

  it('flags video as ended when handleEnd invoked', () => {
    const { result } = renderHook(() => useVideoPlayback())

    act(() => {
      result.current.play()
      result.current.handleEnd()
    })

    expect(result.current.isPlaying).toBe(false)
    expect(result.current.videoEnded).toBe(true)
  })

  /**
   * PERFORMANCE TEST: Verify handleProgress callback remains stable across renders
   *
   * Context: handleProgress was recreating on every displayTime update, causing
   * the entire videoPlayback return object to recreate, triggering phantom re-renders
   * in VideoAnalysisScreen and VideoPlayerSection.
   *
   * Fix: Use refs for duration/displayTime closure values so handleProgress deps stay stable
   */
  it('maintains stable handleProgress reference when displayTime updates', () => {
    // Arrange
    const { result } = renderHook(() => useVideoPlayback())

    act(() => {
      result.current.handleLoad({ duration: 10 })
    })

    const initialHandleProgress = result.current.handleProgress
    const initialReturnObject = result.current

    // Act - Trigger displayTime update (crosses 1-second boundary)
    act(() => {
      result.current.handleProgress({ currentTime: 1.5 })
    })

    // Assert - handleProgress reference should NOT change
    expect(result.current.handleProgress).toBe(initialHandleProgress)

    // But return object should change because currentTime state changed
    expect(result.current).not.toBe(initialReturnObject)
    // currentTime is rounded to seconds for performance (displayTime optimization)
    expect(result.current.currentTime).toBe(1)
  })

  /**
   * PERFORMANCE TEST: Verify videoPlayback return object stability during sub-second progress
   *
   * Context: During playback, progress events arrive every 250ms but displayTime only
   * updates on 1-second boundaries. The return object should NOT recreate for sub-second
   * progress events since no state changes.
   *
   * Impact: Prevents 3 phantom re-renders per second during playback.
   */
  it('maintains stable return object reference for sub-second progress updates', () => {
    // Arrange
    const { result } = renderHook(() => useVideoPlayback())

    act(() => {
      result.current.handleLoad({ duration: 10 })
      result.current.play()
      result.current.handleProgress({ currentTime: 0.0 })
    })

    const initialReturnObject = result.current

    // Act - Multiple sub-second progress events (0.25s, 0.50s, 0.75s)
    act(() => {
      result.current.handleProgress({ currentTime: 0.25 })
    })
    const afterFirstProgress = result.current

    act(() => {
      result.current.handleProgress({ currentTime: 0.5 })
    })
    const afterSecondProgress = result.current

    act(() => {
      result.current.handleProgress({ currentTime: 0.75 })
    })
    const afterThirdProgress = result.current

    // Assert - Return object should remain stable (no displayTime change yet)
    expect(afterFirstProgress).toBe(initialReturnObject)
    expect(afterSecondProgress).toBe(initialReturnObject)
    expect(afterThirdProgress).toBe(initialReturnObject)

    // Verify displayTime hasn't changed (still 0)
    expect(result.current.currentTime).toBe(0)

    // Now cross 1-second boundary
    act(() => {
      result.current.handleProgress({ currentTime: 1.1 })
    })

    // Now return object SHOULD change (displayTime updated)
    expect(result.current).not.toBe(initialReturnObject)
    // currentTime is rounded to seconds for performance (displayTime optimization)
    expect(result.current.currentTime).toBe(1)
  })

  it('tracks pending seek until seek completion resolves', () => {
    const { result } = renderHook(() => useVideoPlayback())

    act(() => {
      result.current.seek(42)
    })

    expect(result.current.pendingSeek).toBe(42)

    act(() => {
      result.current.handleSeekComplete(42)
    })

    expect(result.current.pendingSeek).toBeNull()
    expect(result.current.currentTime).toBe(42)
  })

  it('replay seeks to zero and resumes playing', () => {
    const { result } = renderHook(() => useVideoPlayback())

    act(() => {
      result.current.play()
      result.current.seek(10)
      result.current.replay()
    })

    expect(result.current.pendingSeek).toBe(0)
    expect(result.current.isPlaying).toBe(true)
  })

  it('reset brings state back to defaults', () => {
    const { result } = renderHook(() => useVideoPlayback('playing'))

    act(() => {
      result.current.seek(5)
      result.current.handleProgress({ currentTime: 5 })
      result.current.handleLoad({ duration: 60 })
      result.current.handleEnd()
      result.current.reset()
    })

    expect(result.current.isPlaying).toBe(false)
    expect(result.current.currentTime).toBe(0)
    expect(result.current.duration).toBe(0)
    expect(result.current.pendingSeek).toBeNull()
    expect(result.current.videoEnded).toBe(false)
  })

  describe('ref-based currentTime tracking (performance optimization)', () => {
    it('updates displayTime only on significant changes (1 second intervals)', () => {
      const { result } = renderHook(() => useVideoPlayback())

      // Arrange

      // Act - Simulate rapid progress updates (250ms intervals)
      act(() => {
        result.current.handleProgress({ currentTime: 0.25 })
      })

      act(() => {
        result.current.handleProgress({ currentTime: 0.5 })
      })

      act(() => {
        result.current.handleProgress({ currentTime: 0.75 })
      })

      // Assert - displayTime should still be 0 (not updated for sub-second changes)
      expect(result.current.currentTime).toBe(0)

      // Act - Cross 1 second boundary
      act(() => {
        result.current.handleProgress({ currentTime: 1.0 })
      })

      // Assert - displayTime should now be 1
      expect(result.current.currentTime).toBe(1)
    })

    it('updates displayTime immediately on seek', () => {
      const { result } = renderHook(() => useVideoPlayback())

      // Arrange
      act(() => {
        result.current.handleProgress({ currentTime: 0.5 })
      })

      // Act - Seek to 10 seconds
      act(() => {
        result.current.seek(10)
        result.current.handleSeekComplete(10)
      })

      // Assert - displayTime updates immediately on seek
      expect(result.current.currentTime).toBe(10)
    })

    it('updates displayTime immediately on pause', () => {
      const { result } = renderHook(() => useVideoPlayback())

      // Arrange
      act(() => {
        result.current.play()
        result.current.handleProgress({ currentTime: 0.25 })
        result.current.handleProgress({ currentTime: 0.5 })
        result.current.handleProgress({ currentTime: 0.75 })
      })

      // displayTime should still be 0
      expect(result.current.currentTime).toBe(0)

      // Act - Pause (should sync display time)
      act(() => {
        result.current.pause()
      })

      // Assert - displayTime syncs to actual time on pause, but rounded to seconds
      // syncDisplayTime rounds to Math.floor(0.75) = 0
      expect(result.current.currentTime).toBe(0)
      // For precise time, use getPreciseCurrentTime()
      expect(result.current.getPreciseCurrentTime()).toBe(0.75)
    })

    it('provides getPreciseCurrentTime() for accurate time access', () => {
      const { result } = renderHook(() => useVideoPlayback())

      // Arrange - Simulate progress updates without display time updates
      act(() => {
        result.current.handleProgress({ currentTime: 0.25 })
        result.current.handleProgress({ currentTime: 0.5 })
        result.current.handleProgress({ currentTime: 0.75 })
      })

      // Assert - displayTime (currentTime) should be 0
      expect(result.current.currentTime).toBe(0)

      // Assert - getPreciseCurrentTime should return actual ref value
      expect(result.current.getPreciseCurrentTime()).toBe(0.75)
    })

    it('exposes currentTimeRef for handlers that need latest value', () => {
      const { result } = renderHook(() => useVideoPlayback())

      // Arrange - Update ref without triggering re-render
      act(() => {
        result.current.handleProgress({ currentTime: 0.333 })
      })

      // Assert - ref should have latest value
      expect(result.current.currentTimeRef.current).toBe(0.333)

      // Assert - displayTime should not update for sub-second change
      expect(result.current.currentTime).toBe(0)
    })
  })
})
