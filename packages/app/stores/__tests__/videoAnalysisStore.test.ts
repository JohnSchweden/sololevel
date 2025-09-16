import { act, renderHook } from '@testing-library/react-native'
import { useVideoAnalysisStore } from '../videoAnalysisStore'

describe('videoAnalysisStore', () => {
  beforeEach(() => {
    const { result } = renderHook(() => useVideoAnalysisStore())
    act(() => {
      result.current.reset()
    })
  })

  describe('Audio Feedback State Management', () => {
    it('should initialize with default audio feedback state', () => {
      const { result } = renderHook(() => useVideoAnalysisStore())

      expect(result.current.audioUrl).toBeNull()
      expect(result.current.isAudioPlaying).toBe(false)
      expect(result.current.audioCurrentTime).toBe(0)
      expect(result.current.audioDuration).toBe(0)
      expect(result.current.showAudioControls).toBe(false)
    })

    it('should set audio URL and show controls', () => {
      const { result } = renderHook(() => useVideoAnalysisStore())
      const audioUrl = 'https://example.com/audio.mp3'

      act(() => {
        result.current.setAudioUrl(audioUrl)
      })

      expect(result.current.audioUrl).toBe(audioUrl)
      expect(result.current.showAudioControls).toBe(true)
    })

    it('should set audio URL to null and hide controls', () => {
      const { result } = renderHook(() => useVideoAnalysisStore())

      act(() => {
        result.current.setAudioUrl('https://example.com/audio.mp3')
      })
      expect(result.current.showAudioControls).toBe(true)

      act(() => {
        result.current.setAudioUrl(null)
      })

      expect(result.current.audioUrl).toBeNull()
      expect(result.current.showAudioControls).toBe(false)
    })

    it('should set audio playback state', () => {
      const { result } = renderHook(() => useVideoAnalysisStore())

      act(() => {
        result.current.setAudioPlaybackState(true)
      })

      expect(result.current.isAudioPlaying).toBe(true)

      act(() => {
        result.current.setAudioPlaybackState(false)
      })

      expect(result.current.isAudioPlaying).toBe(false)
    })

    it('should set audio current time', () => {
      const { result } = renderHook(() => useVideoAnalysisStore())

      act(() => {
        result.current.setAudioCurrentTime(45)
      })

      expect(result.current.audioCurrentTime).toBe(45)
    })

    it('should set audio duration', () => {
      const { result } = renderHook(() => useVideoAnalysisStore())

      act(() => {
        result.current.setAudioDuration(120)
      })

      expect(result.current.audioDuration).toBe(120)
    })

    it('should set show audio controls', () => {
      const { result } = renderHook(() => useVideoAnalysisStore())

      act(() => {
        result.current.setShowAudioControls(true)
      })

      expect(result.current.showAudioControls).toBe(true)

      act(() => {
        result.current.setShowAudioControls(false)
      })

      expect(result.current.showAudioControls).toBe(false)
    })

    it('should toggle audio controls', () => {
      const { result } = renderHook(() => useVideoAnalysisStore())

      expect(result.current.showAudioControls).toBe(false)

      act(() => {
        result.current.toggleAudioControls()
      })

      expect(result.current.showAudioControls).toBe(true)

      act(() => {
        result.current.toggleAudioControls()
      })

      expect(result.current.showAudioControls).toBe(false)
    })

    it('should reset audio feedback state', () => {
      const { result } = renderHook(() => useVideoAnalysisStore())

      // Set some audio state
      act(() => {
        result.current.setAudioUrl('https://example.com/audio.mp3')
        result.current.setAudioPlaybackState(true)
        result.current.setAudioCurrentTime(30)
        result.current.setAudioDuration(120)
        result.current.setShowAudioControls(true)
      })

      // Verify state is set
      expect(result.current.audioUrl).toBe('https://example.com/audio.mp3')
      expect(result.current.isAudioPlaying).toBe(true)
      expect(result.current.audioCurrentTime).toBe(30)
      expect(result.current.audioDuration).toBe(120)
      expect(result.current.showAudioControls).toBe(true)

      // Reset
      act(() => {
        result.current.reset()
      })

      // Verify reset
      expect(result.current.audioUrl).toBeNull()
      expect(result.current.isAudioPlaying).toBe(false)
      expect(result.current.audioCurrentTime).toBe(0)
      expect(result.current.audioDuration).toBe(0)
      expect(result.current.showAudioControls).toBe(false)
    })
  })

  describe('Integration with Analysis Flow', () => {
    it('should set audio URL when analysis completes', () => {
      const { result } = renderHook(() => useVideoAnalysisStore())

      act(() => {
        result.current.startAnalysis('test-analysis-123')
      })

      expect(result.current.currentAnalysis).toBe('test-analysis-123')
      expect(result.current.isAnalyzing).toBe(true)

      // Simulate analysis completion with audio URL
      act(() => {
        result.current.setAudioUrl('https://example.com/completed-audio.mp3')
        result.current.completeAnalysis()
      })

      expect(result.current.currentAnalysis).toBe(null)
      expect(result.current.isAnalyzing).toBe(false)
      expect(result.current.audioUrl).toBe('https://example.com/completed-audio.mp3')
      expect(result.current.showAudioControls).toBe(true)
    })
  })
})
