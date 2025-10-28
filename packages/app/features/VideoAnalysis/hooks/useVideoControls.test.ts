import { act, renderHook } from '@testing-library/react'

import { useVideoControls } from './useVideoControls'

describe('useVideoControls', () => {
  it('forces controls visible when processing', () => {
    const { result, rerender } = renderHook(
      ({ processing }) => useVideoControls(processing, true, false),
      {
        initialProps: { processing: false },
      }
    )

    expect(result.current.showControls).toBe(false)

    // User must interact first before controls show during normal playback
    act(() => {
      result.current.setControlsVisible(true)
    })
    expect(result.current.showControls).toBe(true)

    // When processing starts, controls stay visible (forced)
    rerender({ processing: true })

    expect(result.current.showControls).toBe(true)
    expect(result.current.showReplayButton).toBe(false)
  })

  it('shows replay button when video ended', () => {
    const { result } = renderHook(() => useVideoControls(false, false, true))

    // When video ends, controls are forced visible (to show replay button)
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

    expect(result.current.showControls).toBe(false)

    act(() => {
      result.current.setControlsVisible(true)
    })

    expect(result.current.showControls).toBe(true)

    rerender({ processing: true, ended: false })

    act(() => {
      result.current.setControlsVisible(false)
    })

    expect(result.current.showControls).toBe(true)

    rerender({ processing: false, ended: false })

    expect(result.current.showControls).toBe(false)
  })
})
