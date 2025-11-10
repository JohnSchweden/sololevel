import { act, renderHook, waitFor } from '@testing-library/react'
import { useSharedValue } from 'react-native-reanimated'

import { useProgressBarVisibility } from './useProgressBarVisibility'

describe('useProgressBarVisibility', () => {
  it('should render normal bar while collapseProgress <= 0.03', async () => {
    const collapseProgress = useSharedValue(0)

    const { result } = renderHook(() => useProgressBarVisibility(collapseProgress))

    await waitFor(() => {
      expect(result.current.shouldRenderNormal).toBe(true)
      expect(result.current.shouldRenderPersistent).toBe(false)
    })

    act(() => {
      collapseProgress.value = 0.03
    })

    await waitFor(() => {
      expect(result.current.shouldRenderNormal).toBe(true)
      expect(result.current.shouldRenderPersistent).toBe(false)
    })
  })

  it('should hide normal bar when collapseProgress exceeds 0.03', async () => {
    const collapseProgress = useSharedValue(0.031)

    const { result } = renderHook(() => useProgressBarVisibility(collapseProgress))

    await waitFor(() => {
      expect(result.current.shouldRenderNormal).toBe(false)
      expect(result.current.shouldRenderPersistent).toBe(false)
    })
  })

  it('should render persistent bar when collapseProgress >= 0.45', async () => {
    const collapseProgress = useSharedValue(0.45)

    const { result } = renderHook(() => useProgressBarVisibility(collapseProgress))

    await waitFor(() => {
      expect(result.current.shouldRenderPersistent).toBe(true)
      expect(result.current.shouldRenderNormal).toBe(false)
    })

    act(() => {
      collapseProgress.value = 0.6
    })

    await waitFor(() => {
      expect(result.current.shouldRenderPersistent).toBe(true)
      expect(result.current.shouldRenderNormal).toBe(false)
    })
  })

  it('should hide persistent bar while collapseProgress < 0.45', async () => {
    const collapseProgress = useSharedValue(0.449)

    const { result } = renderHook(() => useProgressBarVisibility(collapseProgress))

    await waitFor(() => {
      expect(result.current.shouldRenderPersistent).toBe(false)
      expect(result.current.shouldRenderNormal).toBe(false)
    })
  })

  it('treats significant negative collapseProgress as transition (overpull)', async () => {
    const collapseProgress = useSharedValue(-1)

    const { result } = renderHook(() => useProgressBarVisibility(collapseProgress))

    await waitFor(() => {
      expect(result.current.shouldRenderNormal).toBe(false)
      expect(result.current.shouldRenderPersistent).toBe(false)
    })
  })

  it('treats collapseProgress > 1 as min mode', async () => {
    const collapseProgress = useSharedValue(1.5)

    const { result } = renderHook(() => useProgressBarVisibility(collapseProgress))

    await waitFor(() => {
      expect(result.current.shouldRenderNormal).toBe(false)
      expect(result.current.shouldRenderPersistent).toBe(true)
    })
  })

  it('updates visibility flags when shared value changes', async () => {
    const collapseProgress = useSharedValue(0.02)

    const { result } = renderHook(() => useProgressBarVisibility(collapseProgress))

    expect(result.current.shouldRenderNormal).toBe(true)
    expect(result.current.shouldRenderPersistent).toBe(false)

    act(() => {
      collapseProgress.value = 0.5
      result.current.__applyProgressForTests?.(0.5)
    })

    await waitFor(() => {
      expect(result.current.shouldRenderNormal).toBe(false)
      expect(result.current.shouldRenderPersistent).toBe(true)
    })

    act(() => {
      collapseProgress.value = 0.2
      result.current.__applyProgressForTests?.(0.2)
    })

    await waitFor(() => {
      expect(result.current.shouldRenderNormal).toBe(false)
      expect(result.current.shouldRenderPersistent).toBe(false)
    })
  })

  it('keeps normal mode visible for minor negative overshoot', async () => {
    const collapseProgress = useSharedValue(-0.01)

    const { result } = renderHook(() => useProgressBarVisibility(collapseProgress))

    await waitFor(() => {
      expect(result.current.shouldRenderNormal).toBe(true)
      expect(result.current.shouldRenderPersistent).toBe(false)
    })
  })

  it('hides normal bar when overscroll goes beyond threshold', async () => {
    const collapseProgress = useSharedValue(0)
    const overscroll = useSharedValue(-25)

    const { result } = renderHook(() => useProgressBarVisibility(collapseProgress, overscroll))

    await waitFor(() => {
      expect(result.current.shouldRenderNormal).toBe(false)
      expect(result.current.shouldRenderPersistent).toBe(false)
    })
  })

  it('keeps normal bar visible for small overscroll', async () => {
    const collapseProgress = useSharedValue(0)
    const overscroll = useSharedValue(-2)

    const { result } = renderHook(() => useProgressBarVisibility(collapseProgress, overscroll))

    await waitFor(() => {
      expect(result.current.shouldRenderNormal).toBe(true)
      expect(result.current.shouldRenderPersistent).toBe(false)
    })
  })
})
