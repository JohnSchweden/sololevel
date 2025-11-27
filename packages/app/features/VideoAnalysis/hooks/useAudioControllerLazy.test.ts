import { describe, expect, it, jest } from '@jest/globals'
import { act, renderHook } from '@testing-library/react'
import { useAudioControllerLazy } from './useAudioControllerLazy'

jest.mock('@my/logging', () => ({
  logOnChange: jest.fn(),
  log: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}))

jest.mock('react-native-video', () => ({
  __esModule: true,
  default: 'Video',
}))

jest.mock('./useAudioController', () => {
  const mockController = {
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    isLoaded: false,
    seekTime: null,
    setIsPlaying: jest.fn(),
    togglePlayback: jest.fn(),
    handleLoad: jest.fn(),
    handleProgress: jest.fn(),
    handleEnd: jest.fn(),
    handleError: jest.fn(),
    handleSeekComplete: jest.fn(),
    seekTo: jest.fn(),
    reset: jest.fn(),
  }

  return {
    useAudioController: jest.fn(() => mockController),
  }
})

describe('useAudioControllerLazy', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('lazy initialization', () => {
    it('should call useAudioController with null audioUrl on mount (React hooks rule)', () => {
      const { useAudioController } = require('./useAudioController')
      renderHook(() => useAudioControllerLazy(null))

      // React hooks must be called unconditionally, so useAudioController is always called
      // But it's called with null audioUrl and lazy=true, so effects don't execute
      expect(useAudioController).toHaveBeenCalledTimes(1)
      expect(useAudioController).toHaveBeenCalledWith(null, {}, true)
    })

    it('should return stub controller with default state on mount', () => {
      const { result } = renderHook(() => useAudioControllerLazy(null))

      expect(result.current.isPlaying).toBe(false)
      expect(result.current.currentTime).toBe(0)
      expect(result.current.duration).toBe(0)
      expect(result.current.isLoaded).toBe(false)
    })

    it('should initialize real controller with actual audioUrl on first setIsPlaying(true) call', () => {
      const { useAudioController } = require('./useAudioController')
      const { result } = renderHook(() => useAudioControllerLazy('https://example.com/audio.mp3'))

      // Hook called with null and lazy=true initially (React rule)
      expect(useAudioController).toHaveBeenCalledWith(null, {}, true)

      // Trigger initialization by calling setIsPlaying(true)
      act(() => {
        result.current.setIsPlaying(true)
      })

      // Now useAudioController should be called with actual audioUrl and lazy=false
      expect(useAudioController).toHaveBeenCalledWith(
        'https://example.com/audio.mp3',
        expect.any(Object),
        false
      )
    })

    it('should initialize real controller on first togglePlayback() call', () => {
      const { useAudioController } = require('./useAudioController')
      const { result } = renderHook(() => useAudioControllerLazy('https://example.com/audio.mp3'))

      // Initially called with null and lazy=true
      expect(useAudioController).toHaveBeenCalledWith(null, {}, true)

      act(() => {
        result.current.togglePlayback()
      })

      // Should be called with actual audioUrl and lazy=false after initialization
      expect(useAudioController).toHaveBeenCalledWith(
        'https://example.com/audio.mp3',
        expect.any(Object),
        false
      )
    })

    it('should NOT initialize controller on setIsPlaying(false) call', () => {
      const { useAudioController } = require('./useAudioController')
      const { result } = renderHook(() => useAudioControllerLazy('https://example.com/audio.mp3'))

      // Initially called with null and lazy=true
      expect(useAudioController).toHaveBeenCalledWith(null, {}, true)

      act(() => {
        result.current.setIsPlaying(false)
      })

      // Should NOT be called with actual audioUrl - false doesn't trigger initialization
      // Note: Hook may be called again due to re-render, but should still be with null and lazy=true
      const callsWithAudioUrl = useAudioController.mock.calls.filter(
        (call: any[]) => call[0] === 'https://example.com/audio.mp3'
      )
      expect(callsWithAudioUrl.length).toBe(0)
    })

    it('should initialize controller on seekTo() call', () => {
      const { useAudioController } = require('./useAudioController')
      const { result } = renderHook(() => useAudioControllerLazy('https://example.com/audio.mp3'))

      // Initially called with null and lazy=true
      expect(useAudioController).toHaveBeenCalledWith(null, {}, true)

      act(() => {
        result.current.seekTo(5.0)
      })

      // Should be called with actual audioUrl and lazy=false after initialization
      expect(useAudioController).toHaveBeenCalledWith(
        'https://example.com/audio.mp3',
        expect.any(Object),
        false
      )
    })
  })

  describe('controller behavior after initialization', () => {
    it('should delegate to real controller after initialization', () => {
      const { useAudioController } = require('./useAudioController')
      const mockController = useAudioController()
      const { result } = renderHook(() => useAudioControllerLazy('https://example.com/audio.mp3'))

      // Initialize
      act(() => {
        result.current.setIsPlaying(true)
      })

      // Now delegate to real controller
      act(() => {
        result.current.setIsPlaying(false)
      })

      expect(mockController.setIsPlaying).toHaveBeenCalledWith(false)
    })
  })

  describe('effect deferral', () => {
    it('should pass lazy=true to useAudioController on mount', () => {
      const { useAudioController } = require('./useAudioController')
      renderHook(() => useAudioControllerLazy('https://example.com/audio.mp3'))

      // Verify hook is called with lazy=true initially
      // This ensures effects are registered but return early (no execution)
      expect(useAudioController).toHaveBeenCalledWith(null, {}, true)
    })

    it('should pass lazy=false after initialization', () => {
      const { useAudioController } = require('./useAudioController')
      const { result } = renderHook(() => useAudioControllerLazy('https://example.com/audio.mp3'))

      // Initialize
      act(() => {
        result.current.setIsPlaying(true)
      })

      // After initialization, lazy should be false (effects now execute)
      expect(useAudioController).toHaveBeenCalledWith(
        'https://example.com/audio.mp3',
        expect.any(Object),
        false
      )
    })
  })

  describe('performance benchmarks', () => {
    it('should verify lazy flag is passed correctly for performance optimization', () => {
      // Performance benchmark: Verify lazy flag behavior
      // In production, lazy=true defers 14 useEffects until initialization
      // This test verifies the mechanism works correctly
      const { useAudioController } = require('./useAudioController')

      // Baseline: Direct useAudioController (lazy=false) - all effects execute immediately
      renderHook(() => useAudioController('https://example.com/audio.mp3', {}, false))

      // Optimized: useAudioControllerLazy (lazy=true initially) - effects deferred
      renderHook(() => useAudioControllerLazy('https://example.com/audio.mp3'))
      const lazyCalls = useAudioController.mock.calls.filter((call: any[]) => call[2] === true)

      // Verify lazy=true is passed (effects deferred)
      expect(lazyCalls.length).toBeGreaterThan(0)
      expect(lazyCalls[0]).toEqual([null, {}, true])

      // Note: Actual mount time reduction (~50-100ms) should be measured in production
      // with real React rendering, not in test environment with mocks
    })
  })
})
