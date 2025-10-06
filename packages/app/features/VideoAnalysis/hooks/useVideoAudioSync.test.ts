import { renderHook } from '@testing-library/react'
import { useVideoAudioSync } from './useVideoAudioSync'

describe('useVideoAudioSync', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('initial state', () => {
    it('should initialize with video playing and audio not active', () => {
      const { result } = renderHook(() =>
        useVideoAudioSync({
          isVideoPlaying: true,
          isAudioActive: false,
        })
      )

      expect(result.current.shouldPlayVideo).toBe(true)
      expect(result.current.shouldPlayAudio).toBe(false)
      expect(result.current.isVideoPausedForAudio).toBe(false)
    })
  })

  describe('video-audio coordination', () => {
    it('should pause video when audio becomes active', () => {
      const { result, rerender } = renderHook((props) => useVideoAudioSync(props), {
        initialProps: {
          isVideoPlaying: true,
          isAudioActive: false,
        },
      })

      // Video should be playing initially
      expect(result.current.shouldPlayVideo).toBe(true)
      expect(result.current.isVideoPausedForAudio).toBe(false)

      // Audio becomes active - hook indicates video should be paused
      rerender({
        isVideoPlaying: true,
        isAudioActive: true,
      })

      expect(result.current.shouldPlayVideo).toBe(false)
      expect(result.current.isVideoPausedForAudio).toBe(true)
    })

    it('should resume video when audio becomes inactive', () => {
      const { result, rerender } = renderHook((props) => useVideoAudioSync(props), {
        initialProps: {
          isVideoPlaying: false, // Video paused
          isAudioActive: true,
        },
      })

      // Video should be paused due to active audio
      expect(result.current.shouldPlayVideo).toBe(false)
      expect(result.current.isVideoPausedForAudio).toBe(true)

      // Audio becomes inactive - video can resume if user wants it to
      rerender({
        isVideoPlaying: true, // User wants video to play
        isAudioActive: false,
      })

      expect(result.current.shouldPlayVideo).toBe(true)
      expect(result.current.isVideoPausedForAudio).toBe(false)
    })

    it('should not resume video if user manually paused it before audio', () => {
      const { result, rerender } = renderHook((props) => useVideoAudioSync(props), {
        initialProps: {
          isVideoPlaying: false, // User manually paused
          isAudioActive: false,
        },
      })

      // Video should remain paused (user's choice)
      expect(result.current.shouldPlayVideo).toBe(false)
      expect(result.current.isVideoPausedForAudio).toBe(false)

      // Audio becomes active - video still shouldn't play (user choice takes precedence)
      rerender({
        isVideoPlaying: false,
        isAudioActive: true,
      })

      expect(result.current.shouldPlayVideo).toBe(false)
      expect(result.current.isVideoPausedForAudio).toBe(true) // Audio is active, so video is blocked
    })

    it('should handle video state changes while audio is active', () => {
      const { result, rerender } = renderHook((props) => useVideoAudioSync(props), {
        initialProps: {
          isVideoPlaying: true,
          isAudioActive: false,
        },
      })

      // Audio becomes active - video should not play
      rerender({
        isVideoPlaying: true, // User wants video to play
        isAudioActive: true,
      })

      expect(result.current.shouldPlayVideo).toBe(false) // But audio blocks it
      expect(result.current.isVideoPausedForAudio).toBe(true)
    })
  })

  describe('audio control state', () => {
    it('should indicate audio should play when active', () => {
      const { result, rerender } = renderHook((props) => useVideoAudioSync(props), {
        initialProps: {
          isVideoPlaying: true,
          isAudioActive: false,
        },
      })

      expect(result.current.shouldPlayAudio).toBe(false)

      rerender({
        isVideoPlaying: true,
        isAudioActive: true,
      })

      expect(result.current.shouldPlayAudio).toBe(true)
    })

    it('should track when video was playing before audio interrupted', () => {
      const { result, rerender } = renderHook((props) => useVideoAudioSync(props), {
        initialProps: {
          isVideoPlaying: true, // Video was playing
          isAudioActive: false,
        },
      })

      // Audio becomes active
      rerender({
        isVideoPlaying: false, // Video is paused
        isAudioActive: true,
      })

      expect(result.current.isVideoPausedForAudio).toBe(true)
      expect(result.current.shouldPlayVideo).toBe(false)

      // Audio becomes inactive - video can now play if user wants it to
      rerender({
        isVideoPlaying: true, // User wants video to play
        isAudioActive: false,
      })

      expect(result.current.shouldPlayVideo).toBe(true)
      expect(result.current.isVideoPausedForAudio).toBe(false)
    })
  })

  describe('state transitions', () => {
    it('should handle multiple audio on/off cycles', () => {
      const { result, rerender } = renderHook((props) => useVideoAudioSync(props), {
        initialProps: {
          isVideoPlaying: true,
          isAudioActive: false,
        },
      })

      // First audio activation
      rerender({
        isVideoPlaying: true, // User wants video
        isAudioActive: true,
      })
      expect(result.current.shouldPlayVideo).toBe(false) // But audio blocks it

      // Audio deactivation - video can play
      rerender({
        isVideoPlaying: true, // User wants video
        isAudioActive: false,
      })
      expect(result.current.shouldPlayVideo).toBe(true)

      // Second audio activation
      rerender({
        isVideoPlaying: true, // User wants video
        isAudioActive: true,
      })
      expect(result.current.shouldPlayVideo).toBe(false) // Audio blocks it again

      // Final audio deactivation
      rerender({
        isVideoPlaying: true, // User wants video
        isAudioActive: false,
      })
      expect(result.current.shouldPlayVideo).toBe(true)
    })
  })
})
