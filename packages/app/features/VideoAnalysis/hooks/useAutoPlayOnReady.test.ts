import { renderHook } from '@testing-library/react'

import { useAutoPlayOnReady } from './useAutoPlayOnReady'

describe('useAutoPlayOnReady', () => {
  it('plays video when processing completes and video is not playing', () => {
    const playVideo = jest.fn()

    const { rerender } = renderHook(
      ({ isProcessing, isPlaying }) => useAutoPlayOnReady(isProcessing, isPlaying, playVideo),
      {
        initialProps: { isProcessing: true, isPlaying: false },
      }
    )

    // Transition from processing to ready
    rerender({ isProcessing: false, isPlaying: false })

    expect(playVideo).toHaveBeenCalledTimes(1)
  })

  it('does not play video when processing completes but video is already playing', () => {
    const playVideo = jest.fn()

    const { rerender } = renderHook(
      ({ isProcessing, isPlaying }) => useAutoPlayOnReady(isProcessing, isPlaying, playVideo),
      {
        initialProps: { isProcessing: true, isPlaying: true },
      }
    )

    // Transition from processing to ready while already playing
    rerender({ isProcessing: false, isPlaying: true })

    expect(playVideo).not.toHaveBeenCalled()
  })

  it('does not play video when still processing', () => {
    const playVideo = jest.fn()

    const { rerender } = renderHook(
      ({ isProcessing, isPlaying }) => useAutoPlayOnReady(isProcessing, isPlaying, playVideo),
      {
        initialProps: { isProcessing: true, isPlaying: false },
      }
    )

    // Stay in processing state
    rerender({ isProcessing: true, isPlaying: false })

    expect(playVideo).not.toHaveBeenCalled()
  })

  it('does not play video when transitioning from ready to processing', () => {
    const playVideo = jest.fn()

    const { rerender } = renderHook(
      ({ isProcessing, isPlaying }) => useAutoPlayOnReady(isProcessing, isPlaying, playVideo),
      {
        initialProps: { isProcessing: true, isPlaying: false },
      }
    )

    // First transition: processing → ready (should play)
    rerender({ isProcessing: false, isPlaying: false })
    expect(playVideo).toHaveBeenCalledTimes(1)

    // Clear mock for next assertion
    playVideo.mockClear()

    // Transition back: ready → processing (should not play)
    rerender({ isProcessing: true, isPlaying: false })

    expect(playVideo).not.toHaveBeenCalled()
  })

  it('plays video only once on transition from processing to ready', () => {
    const playVideo = jest.fn()

    const { rerender } = renderHook(
      ({ isProcessing, isPlaying }) => useAutoPlayOnReady(isProcessing, isPlaying, playVideo),
      {
        initialProps: { isProcessing: true, isPlaying: false },
      }
    )

    // First transition: processing → ready
    rerender({ isProcessing: false, isPlaying: false })
    expect(playVideo).toHaveBeenCalledTimes(1)

    // Stay in ready state
    rerender({ isProcessing: false, isPlaying: true })
    expect(playVideo).toHaveBeenCalledTimes(1)

    // Back to processing and then to ready again
    rerender({ isProcessing: true, isPlaying: true })
    rerender({ isProcessing: false, isPlaying: true })
    expect(playVideo).toHaveBeenCalledTimes(1) // Still only once
  })
})
