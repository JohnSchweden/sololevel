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

    expect(result.current.currentTime).toBe(12.5)
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
})
