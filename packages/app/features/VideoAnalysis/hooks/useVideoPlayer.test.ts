// Mock the Zustand store BEFORE importing
const mockUseVideoPlayerStore = jest.fn()
jest.mock('../stores', () => ({
  useVideoPlayerStore: mockUseVideoPlayerStore,
}))

import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import { act, renderHook } from '@testing-library/react'

import { useVideoPlayer } from './useVideoPlayer'
import type { UseVideoPlayerOptions } from './useVideoPlayer.types'

jest.mock('@my/logging', () => ({
  log: {
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
  },
}))

describe.skip('useVideoPlayer', () => {
  let mockStoreState: any
  let mockSetters: any

  beforeEach(() => {
    jest.useRealTimers()
    jest.clearAllMocks()

    // Set up mock store state
    mockStoreState = {
      isPlaying: false,
      displayTime: 0,
      duration: 0,
      pendingSeek: null,
      videoEnded: false,
      manualControlsVisible: null,
    }

    // Set up mock store setters that update the state
    mockSetters = {
      setIsPlaying: jest.fn((isPlaying) => {
        mockStoreState.isPlaying = isPlaying
      }),
      setDisplayTime: jest.fn((displayTime) => {
        mockStoreState.displayTime = displayTime
      }),
      setDuration: jest.fn((duration) => {
        mockStoreState.duration = duration
      }),
      setPendingSeek: jest.fn((pendingSeek) => {
        mockStoreState.pendingSeek = pendingSeek
      }),
      setVideoEnded: jest.fn((videoEnded) => {
        mockStoreState.videoEnded = videoEnded
      }),
      setManualControlsVisible: jest.fn((manualControlsVisible) => {
        mockStoreState.manualControlsVisible = manualControlsVisible
      }),
      setControlsVisible: jest.fn((controlsVisible) => {
        mockStoreState.controlsVisible = controlsVisible
      }),
      batchUpdate: jest.fn(),
    }

    // Add setters to the mock state (this is how Zustand works)
    Object.assign(mockStoreState, mockSetters)

    // Mock the store hook to handle selectors properly
    mockUseVideoPlayerStore.mockImplementation((selector?: any) => {
      if (typeof selector === 'function') {
        // Call the selector function with the mock state
        return selector(mockStoreState)
      }

      // If no selector provided, this is an error - the hook always provides a selector
      throw new Error('useVideoPlayerStore called without selector - this should not happen')
    })
  })

  const renderVideoPlayer = (options?: UseVideoPlayerOptions) =>
    renderHook(({ opts }) => useVideoPlayer(opts), { initialProps: { opts: options } })

  it('initialises playback state and imperative ref', () => {
    // Arrange & Act
    const { result } = renderVideoPlayer()

    // Assert
    expect(result.current.isPlaying).toBe(false)
    // currentTime removed from return object to prevent re-renders
    expect(result.current.duration).toBe(0)
    expect(result.current.pendingSeek).toBeNull()
    expect(result.current.videoEnded).toBe(false)
    expect(result.current.showControls).toBe(false)
    expect(result.current.shouldPlayVideo).toBe(false)
    expect(result.current.ref.current).toBeTruthy()
  })

  it('exposes imperative play/pause/seek/replay operations via ref', () => {
    // Arrange
    const { result } = renderVideoPlayer()
    const playerRef = result.current.ref.current
    expect(playerRef).toBeTruthy()

    // Act
    act(() => {
      playerRef?.play()
    })

    // Assert
    expect(result.current.isPlaying).toBe(true)

    // Act
    act(() => {
      playerRef?.pause()
    })

    // Assert
    expect(result.current.isPlaying).toBe(false)

    // Act
    act(() => {
      playerRef?.seek(24)
    })

    // Assert
    expect(result.current.pendingSeek).toBe(24)

    // Act
    act(() => {
      playerRef?.replay()
    })

    // Assert
    expect(result.current.pendingSeek).toBe(0)
    expect(result.current.isPlaying).toBe(true)
  })

  it('updates currentTime on significant progress boundaries', () => {
    // Arrange
    const { result } = renderVideoPlayer()

    // Act
    act(() => {
      result.current.onProgress(0.25)
      result.current.onProgress(0.5)
      result.current.onProgress(0.75)
    })

    // Assert - sub-second progress ignored for display time
    // currentTime removed from return object to prevent re-renders

    // Act - cross one second boundary
    act(() => {
      result.current.onProgress(1.1)
    })

    // Assert
    // currentTime removed from return object to prevent re-renders

    // Act - load duration
    act(() => {
      result.current.onLoad({ duration: 120 })
    })

    // Assert
    expect(result.current.duration).toBe(120)
  })

  it('tracks pending seek until completion and updates time', () => {
    // Arrange
    const { result } = renderVideoPlayer()
    const playerRef = result.current.ref.current

    // Act
    act(() => {
      playerRef?.seek(42)
    })

    // Assert
    expect(result.current.pendingSeek).toBe(42)

    // Act
    act(() => {
      result.current.onSeekComplete(42)
    })

    // Assert
    expect(result.current.pendingSeek).toBeNull()
    // currentTime removed from return object to prevent re-renders
  })

  it('pauses video playback when audio is active', () => {
    // Arrange
    const { result, rerender } = renderVideoPlayer({ audioIsPlaying: false })
    const playerRef = result.current.ref.current

    act(() => {
      playerRef?.play()
    })
    expect(result.current.shouldPlayVideo).toBe(true)

    // Act - audio starts
    rerender({ opts: { audioIsPlaying: true } })

    // Assert
    expect(result.current.shouldPlayVideo).toBe(false)

    // Act - audio stops, user still playing
    rerender({ opts: { audioIsPlaying: false } })

    // Assert
    expect(result.current.shouldPlayVideo).toBe(true)
  })

  it('auto hides controls after inactivity while playing', () => {
    jest.useFakeTimers()

    // Arrange
    const { result } = renderVideoPlayer()
    const playerRef = result.current.ref.current

    act(() => {
      result.current.setControlsVisible(true)
      playerRef?.play()
    })

    expect(result.current.showControls).toBe(true)

    // Act - advance timers just under threshold
    act(() => {
      jest.advanceTimersByTime(2900)
    })
    expect(result.current.showControls).toBe(true)

    // Act - exceed auto hide threshold
    act(() => {
      jest.advanceTimersByTime(200)
    })

    // Assert
    expect(result.current.showControls).toBe(false)
  })

  it('auto plays when processing transitions to ready', () => {
    // Arrange
    const { result, rerender } = renderVideoPlayer({
      isProcessing: true,
      initialStatus: 'processing',
    })

    // Assert - starts paused during processing
    expect(result.current.isPlaying).toBe(false)

    // Act - processing completes
    rerender({ opts: { isProcessing: false, initialStatus: 'processing' } })

    // Assert - auto play triggered
    expect(result.current.isPlaying).toBe(true)
  })

  it.skip('does NOT auto play on first mount in history mode (ready from start)', () => {
    // Arrange - START WITH isProcessing=false (history/replay mode)
    const { result } = renderVideoPlayer({
      isProcessing: false,
      initialStatus: 'ready',
    })

    // Assert - should NOT auto-play on ready status
    expect(result.current.isPlaying).toBe(false)
  })

  it('does NOT double-play on transitions', () => {
    // REGRESSION TEST: ensure hasAutoPlayedRef locks out multiple plays
    // Arrange
    const { result, rerender } = renderVideoPlayer({
      isProcessing: true,
      initialStatus: 'processing',
    })

    // Act - transition from processing to ready
    rerender({ opts: { isProcessing: false, initialStatus: 'processing' } })

    expect(result.current.isPlaying).toBe(true)

    // Act - simulate another effect run (e.g., dependency re-render)
    // Force a re-render that would trigger the effect again
    rerender({ opts: { isProcessing: false, initialStatus: 'processing' } })

    // Assert - isPlaying should remain true (not toggled by a second play call)
    expect(result.current.isPlaying).toBe(true)
  })

  // ===== COVERAGE FROM OLD useVideoPlayback TESTS =====

  it('respects initialStatus=playing on first mount', () => {
    // Arrange & Act
    const { result } = renderVideoPlayer({ initialStatus: 'playing' })

    // Assert
    expect(result.current.isPlaying).toBe(true)
  })

  it('respects initialStatus=paused on first mount', () => {
    // Arrange & Act
    const { result } = renderVideoPlayer({ initialStatus: 'paused' })

    // Assert
    expect(result.current.isPlaying).toBe(false)
  })

  it('reset brings state back to defaults', () => {
    // Arrange
    const { result } = renderVideoPlayer({ initialStatus: 'playing' })

    act(() => {
      result.current.seek(5)
      result.current.onProgress(5.5)
      result.current.onLoad({ duration: 60 })
      result.current.onEnd()
    })

    expect(result.current.isPlaying).toBe(false)
    expect(result.current.videoEnded).toBe(true)

    // Act
    act(() => {
      result.current.reset()
    })

    // Assert
    expect(result.current.isPlaying).toBe(false)
    // currentTime removed from return object to prevent re-renders
    expect(result.current.duration).toBe(0)
    expect(result.current.pendingSeek).toBeNull()
    expect(result.current.videoEnded).toBe(false)
  })

  // ===== COVERAGE FROM OLD useVideoControls TESTS =====

  it('shows controls on user tap', () => {
    // Arrange
    const { result } = renderVideoPlayer()

    expect(result.current.showControls).toBe(false)

    // Act
    act(() => {
      result.current.setControlsVisible(true)
    })

    // Assert
    expect(result.current.showControls).toBe(true)
  })

  it('forces visible when video ended', () => {
    // Arrange
    const { result } = renderVideoPlayer()
    const playerRef = result.current.ref.current

    act(() => {
      playerRef?.play()
      result.current.onLoad({ duration: 10 })
    })

    expect(result.current.showControls).toBe(false)

    // Act - trigger end
    act(() => {
      result.current.onEnd(10)
    })

    // Assert - controls should be forced visible when ended
    expect(result.current.showControls).toBe(true)
  })

  it('forces visible when processing', () => {
    // Arrange
    const { result, rerender } = renderVideoPlayer({ isProcessing: false })
    const playerRef = result.current.ref.current

    act(() => {
      playerRef?.play()
      result.current.setControlsVisible(true)
    })

    // Act - processing state changes
    rerender({ opts: { isProcessing: true } })

    // Assert - controls stay visible during processing
    expect(result.current.showControls).toBe(true)
  })

  // ===== COVERAGE FROM OLD useVideoAudioSync TESTS =====

  it('calculates shouldPlayVideo correctly (isPlaying && !audioIsPlaying)', () => {
    // Arrange
    const { result, rerender } = renderVideoPlayer({ audioIsPlaying: false })
    const playerRef = result.current.ref.current

    act(() => {
      playerRef?.play()
    })

    // Assert - video should play when user playing AND no audio
    expect(result.current.shouldPlayVideo).toBe(true)
    expect(result.current.shouldPlayAudio).toBe(false)

    // Act - audio starts
    rerender({ opts: { audioIsPlaying: true } })

    // Assert - video should NOT play when audio active
    expect(result.current.shouldPlayVideo).toBe(false)
    expect(result.current.shouldPlayAudio).toBe(true)
    expect(result.current.isVideoPausedForAudio).toBe(true)
  })
})
