import { describe, expect, it, jest } from '@jest/globals'
import { act, renderHook } from '@testing-library/react'
import { useAudioController } from './useAudioController'

jest.mock('@my/logging', () => ({
  logOnChange: jest.fn(),
  log: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}))

// Mock react-native-video
jest.mock('react-native-video', () => ({
  __esModule: true,
  default: 'Video',
}))

describe('useAudioController', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('initial state', () => {
    it('should initialize with default state when no audioUrl provided', () => {
      const { result } = renderHook(() => useAudioController(null))

      expect(result.current.isPlaying).toBe(false)
      expect(result.current.currentTime).toBe(0)
      expect(result.current.duration).toBe(0)
      expect(result.current.isLoaded).toBe(false)
    })

    it('should initialize with default state when audioUrl provided', () => {
      const { result } = renderHook(() => useAudioController('https://example.com/audio.mp3'))

      expect(result.current.isPlaying).toBe(false)
      expect(result.current.currentTime).toBe(0)
      expect(result.current.duration).toBe(0)
      expect(result.current.isLoaded).toBe(false)
    })
  })

  describe('playback controls', () => {
    it('should allow setting isPlaying state', () => {
      const { result } = renderHook(() => useAudioController('https://example.com/audio.mp3'))

      expect(result.current.isPlaying).toBe(false)

      act(() => {
        result.current.setIsPlaying(true)
      })

      expect(result.current.isPlaying).toBe(true)

      act(() => {
        result.current.setIsPlaying(false)
      })

      expect(result.current.isPlaying).toBe(false)
    })

    it('should toggle isPlaying state', () => {
      const { result } = renderHook(() => useAudioController('https://example.com/audio.mp3'))

      expect(result.current.isPlaying).toBe(false)

      act(() => {
        result.current.togglePlayback()
      })

      expect(result.current.isPlaying).toBe(true)

      act(() => {
        result.current.togglePlayback()
      })

      expect(result.current.isPlaying).toBe(false)
    })
  })

  describe('progress handling', () => {
    it('should update currentTime from progress data', () => {
      const { result } = renderHook(() => useAudioController('https://example.com/audio.mp3'))

      act(() => {
        result.current.handleProgress({
          currentTime: 5.5,
          playableDuration: 10,
          seekableDuration: 10,
        })
      })

      expect(result.current.currentTime).toBe(5.5)
    })

    it('should update duration from load data', () => {
      const { result } = renderHook(() => useAudioController('https://example.com/audio.mp3'))

      act(() => {
        result.current.handleLoad({ duration: 15.3 })
      })

      expect(result.current.duration).toBe(15.3)
      expect(result.current.isLoaded).toBe(true)
    })

    it('should handle end event and reset playback state after progress', () => {
      const { result } = renderHook(() => useAudioController('https://example.com/audio.mp3'))

      // Set up playing state
      act(() => {
        result.current.setIsPlaying(true)
        result.current.handleProgress({ currentTime: 10 })
      })

      expect(result.current.isPlaying).toBe(true)
      expect(result.current.currentTime).toBe(10)

      // Handle end event
      act(() => {
        result.current.handleEnd()
      })

      expect(result.current.isPlaying).toBe(false)
      expect(result.current.currentTime).toBe(0)
    })

    it('should end playback even when currentTime is near zero but duration is known', () => {
      const { result } = renderHook(() => useAudioController('https://example.com/audio.mp3'))

      act(() => {
        result.current.setIsPlaying(true)
        result.current.handleLoad({ duration: 12 })
      })

      expect(result.current.isPlaying).toBe(true)
      expect(result.current.duration).toBe(12)

      act(() => {
        result.current.handleEnd()
      })

      expect(result.current.isPlaying).toBe(false)
      expect(result.current.currentTime).toBe(0)
    })

    it('should end playback gracefully before audio is loaded', () => {
      const { result } = renderHook(() => useAudioController('https://example.com/audio.mp3'))

      act(() => {
        result.current.setIsPlaying(true)
      })

      expect(result.current.isPlaying).toBe(true)

      act(() => {
        result.current.handleEnd()
      })

      expect(result.current.isPlaying).toBe(false)
      expect(result.current.currentTime).toBe(0)
    })

    it('should end playback after seek completion using latest progress state', () => {
      const { result } = renderHook(() => useAudioController('https://example.com/audio.mp3'))

      act(() => {
        result.current.setIsPlaying(true)
        result.current.handleProgress({ currentTime: 2 })
        result.current.seekTo(8)
        result.current.handleSeekComplete()
        result.current.handleProgress({ currentTime: 8.05 })
      })

      expect(result.current.isPlaying).toBe(true)
      expect(result.current.currentTime).toBe(8.05)
      expect(result.current.seekTime).toBe(null)

      act(() => {
        result.current.handleEnd()
      })

      expect(result.current.isPlaying).toBe(false)
      expect(result.current.currentTime).toBe(0)
      expect(result.current.seekTime).toBe(null)
    })
  })

  describe('seek functionality', () => {
    it('should update seekTime when seekTo is called', () => {
      const { result } = renderHook(() => useAudioController('https://example.com/audio.mp3'))

      act(() => {
        result.current.seekTo(7.5)
      })

      expect(result.current.seekTime).toBe(7.5)
    })

    it('should clear seekTime after seek complete', () => {
      const { result } = renderHook(() => useAudioController('https://example.com/audio.mp3'))

      act(() => {
        result.current.seekTo(7.5)
      })

      expect(result.current.seekTime).toBe(7.5)

      act(() => {
        result.current.handleSeekComplete()
      })

      expect(result.current.seekTime).toBe(null)
    })
  })

  describe('reset functionality', () => {
    it('should reset all state to initial values', () => {
      const { result } = renderHook(() => useAudioController('https://example.com/audio.mp3'))

      // Set up some state
      act(() => {
        result.current.setIsPlaying(true)
        result.current.handleLoad({ duration: 20 })
        result.current.handleProgress({ currentTime: 10 })
        result.current.seekTo(15)
      })

      expect(result.current.isPlaying).toBe(true)
      expect(result.current.duration).toBe(20)
      expect(result.current.currentTime).toBe(10)
      expect(result.current.isLoaded).toBe(true)
      expect(result.current.seekTime).toBe(15)

      // Reset
      act(() => {
        result.current.reset()
      })

      expect(result.current.isPlaying).toBe(false)
      expect(result.current.duration).toBe(0)
      expect(result.current.currentTime).toBe(0)
      expect(result.current.isLoaded).toBe(false)
      expect(result.current.seekTime).toBe(null)
    })
  })

  describe('audio URL changes', () => {
    it('should reset state when audioUrl changes', () => {
      const { result, rerender } = renderHook(({ audioUrl }) => useAudioController(audioUrl), {
        initialProps: { audioUrl: 'https://example.com/audio1.mp3' },
      })

      // Set up some state for first URL
      act(() => {
        result.current.setIsPlaying(true)
        result.current.handleLoad({ duration: 10 })
      })

      expect(result.current.isPlaying).toBe(true)
      expect(result.current.duration).toBe(10)
      expect(result.current.isLoaded).toBe(true)

      // Change audio URL
      rerender({ audioUrl: 'https://example.com/audio2.mp3' })

      expect(result.current.isPlaying).toBe(true) // isPlaying state is preserved when URL changes
      expect(result.current.duration).toBe(0)
      expect(result.current.currentTime).toBe(0)
      expect(result.current.isLoaded).toBe(false)
      expect(result.current.seekTime).toBe(null)
    })

    it('should not reset when same audioUrl is provided', () => {
      const { result, rerender } = renderHook(({ audioUrl }) => useAudioController(audioUrl), {
        initialProps: { audioUrl: 'https://example.com/audio.mp3' },
      })

      // Set up some state
      act(() => {
        result.current.setIsPlaying(true)
        result.current.handleLoad({ duration: 10 })
      })

      expect(result.current.isPlaying).toBe(true)

      // Re-render with same URL
      rerender({ audioUrl: 'https://example.com/audio.mp3' })

      expect(result.current.isPlaying).toBe(true)
      expect(result.current.duration).toBe(10)
    })
  })

  describe('error handling', () => {
    it('should handle load errors gracefully', () => {
      const { result } = renderHook(() => useAudioController('https://example.com/audio.mp3'))

      act(() => {
        result.current.handleError({ error: { code: 'E_LOAD', message: 'Failed to load audio' } })
      })

      // Should not crash, state should remain unchanged
      expect(result.current.isLoaded).toBe(false)
      expect(result.current.isPlaying).toBe(false)
    })

    it('should handle progress errors gracefully', () => {
      const { result } = renderHook(() => useAudioController('https://example.com/audio.mp3'))

      act(() => {
        result.current.handleProgress({ currentTime: Number.NaN })
      })

      // Should handle NaN gracefully
      expect(result.current.currentTime).toBe(0)
    })
  })
})
