import { act, renderHook } from '@testing-library/react'

import { useVideoControls } from './useVideoControls'

describe('useVideoControls', () => {
  describe('before user interaction', () => {
    it('keeps controls hidden during normal playback until user interacts', () => {
      const { result } = renderHook(() => useVideoControls(false, true, false))

      // Controls hidden until user has interacted
      expect(result.current.showControls).toBe(false)
      expect(result.current.showReplayButton).toBe(false)
    })

    it('keeps controls hidden even when processing, if user hasnt interacted yet', () => {
      const { result } = renderHook(() => useVideoControls(true, true, false))

      // Still hidden because user hasn't interacted
      expect(result.current.showControls).toBe(false)
    })

    it('keeps controls hidden even when video ends, if user hasnt interacted yet', () => {
      const { result } = renderHook(() => useVideoControls(false, false, true))

      // Still hidden because user hasn't interacted
      expect(result.current.showControls).toBe(false)
      expect(result.current.showReplayButton).toBe(true)
    })
  })

  describe('after user interaction', () => {
    it('shows controls after user interacts, then forces them visible when processing', () => {
      const { result, rerender } = renderHook(
        ({ processing }) => useVideoControls(processing, true, false),
        {
          initialProps: { processing: false },
        }
      )

      // Initially hidden (no interaction yet)
      expect(result.current.showControls).toBe(false)

      // User taps to show controls
      act(() => {
        result.current.setControlsVisible(true)
      })
      expect(result.current.showControls).toBe(true)

      // When processing starts, controls stay visible (forced)
      rerender({ processing: true })
      expect(result.current.showControls).toBe(true)
      expect(result.current.showReplayButton).toBe(false)
    })

    it('shows controls when paused after user has interacted', () => {
      const { result, rerender } = renderHook(
        ({ playing }) => useVideoControls(false, playing, false),
        {
          initialProps: { playing: true },
        }
      )

      // User must interact first
      act(() => {
        result.current.setControlsVisible(true)
      })

      // Pause video (isPlaying = false)
      rerender({ playing: false })

      // Controls forced visible because video is paused
      expect(result.current.showControls).toBe(true)
    })

    it('shows replay button and controls when video ends after interaction', () => {
      const { result, rerender } = renderHook(({ ended }) => useVideoControls(false, true, ended), {
        initialProps: { ended: false },
      })

      // User interacts
      act(() => {
        result.current.setControlsVisible(true)
      })

      // Video ends
      rerender({ ended: true })

      // Controls and replay button are visible
      expect(result.current.showControls).toBe(true)
      expect(result.current.showReplayButton).toBe(true)
    })

    it('manual toggle only applies when not forced visible', () => {
      const { result, rerender } = renderHook(
        ({ processing, ended }: { processing: boolean; ended: boolean }) =>
          useVideoControls(processing, true, ended),
        {
          initialProps: { processing: false, ended: false },
        }
      )

      // User interacts to show controls
      act(() => {
        result.current.setControlsVisible(true)
      })
      expect(result.current.showControls).toBe(true)

      // When processing starts (forced visible)
      rerender({ processing: true, ended: false })
      expect(result.current.showControls).toBe(true)

      // User tries to hide controls, but they stay visible (forced)
      act(() => {
        result.current.setControlsVisible(false)
      })
      expect(result.current.showControls).toBe(true)

      // When processing stops, controls hide (not forced anymore)
      rerender({ processing: false, ended: false })
      expect(result.current.showControls).toBe(false)
    })
  })
})
