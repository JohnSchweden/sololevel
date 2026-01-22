import { act, renderHook, waitFor } from '@testing-library/react'
import { useSharedValue } from 'react-native-reanimated'

import { useProgressBarVisibility } from './useProgressBarVisibility'

describe('useProgressBarVisibility', () => {
  it('always renders both bars (absolute positioning strategy)', () => {
    const collapseProgress = useSharedValue(0)

    const { result } = renderHook(() => useProgressBarVisibility(collapseProgress))

    expect(result.current.shouldRenderNormal).toBe(true)
    expect(result.current.shouldRenderPersistent).toBe(true)
  })

  it('sets mode to normal when collapseProgress <= 0.1', async () => {
    const collapseProgress = useSharedValue(0)

    const { result } = renderHook(() => useProgressBarVisibility(collapseProgress))

    await waitFor(() => {
      expect(result.current.modeShared.value).toBe('normal')
    })

    act(() => {
      collapseProgress.value = 0.1
      result.current.__applyProgressForTests?.(0.1)
    })

    await waitFor(() => {
      expect(result.current.modeShared.value).toBe('normal')
    })
  })

  it('sets mode to transition when collapseProgress exceeds 0.1 but < 0.4', async () => {
    const collapseProgress = useSharedValue(0.101)

    const { result } = renderHook(() => useProgressBarVisibility(collapseProgress))

    await waitFor(() => {
      expect(result.current.modeShared.value).toBe('transition')
    })
  })

  it('sets mode to persistent when collapseProgress >= 0.4', async () => {
    const collapseProgress = useSharedValue(0.4)

    const { result } = renderHook(() => useProgressBarVisibility(collapseProgress))

    await waitFor(() => {
      expect(result.current.modeShared.value).toBe('persistent')
    })

    act(() => {
      collapseProgress.value = 0.6
      result.current.__applyProgressForTests?.(0.6)
    })

    await waitFor(() => {
      expect(result.current.modeShared.value).toBe('persistent')
    })
  })

  it('treats significant negative collapseProgress as transition (overpull)', async () => {
    const collapseProgress = useSharedValue(-1)

    const { result } = renderHook(() => useProgressBarVisibility(collapseProgress))

    await waitFor(() => {
      expect(result.current.modeShared.value).toBe('transition')
    })
  })

  it('treats collapseProgress > 1 as persistent mode', async () => {
    const collapseProgress = useSharedValue(1.5)

    const { result } = renderHook(() => useProgressBarVisibility(collapseProgress))

    await waitFor(() => {
      expect(result.current.modeShared.value).toBe('persistent')
    })
  })

  it('updates modeShared when shared value changes', async () => {
    const collapseProgress = useSharedValue(0.02)

    const { result } = renderHook(() => useProgressBarVisibility(collapseProgress))

    expect(result.current.modeShared.value).toBe('normal')

    act(() => {
      collapseProgress.value = 0.5
      result.current.__applyProgressForTests?.(0.5)
    })

    await waitFor(() => {
      expect(result.current.modeShared.value).toBe('persistent')
    })

    act(() => {
      collapseProgress.value = 0.2
      result.current.__applyProgressForTests?.(0.2)
    })

    await waitFor(() => {
      expect(result.current.modeShared.value).toBe('transition')
    })
  })

  it('keeps normal mode for minor negative overshoot', async () => {
    const collapseProgress = useSharedValue(-0.01)

    const { result } = renderHook(() => useProgressBarVisibility(collapseProgress))

    await waitFor(() => {
      expect(result.current.modeShared.value).toBe('normal')
    })
  })

  it('sets mode to transition when overscroll goes beyond threshold', async () => {
    const collapseProgress = useSharedValue(0)
    const overscroll = useSharedValue(-25)

    const { result } = renderHook(() => useProgressBarVisibility(collapseProgress, overscroll))

    await waitFor(() => {
      expect(result.current.modeShared.value).toBe('transition')
    })
  })

  it('keeps normal mode for small overscroll', async () => {
    const collapseProgress = useSharedValue(0)
    const overscroll = useSharedValue(-2)

    const { result } = renderHook(() => useProgressBarVisibility(collapseProgress, overscroll))

    await waitFor(() => {
      expect(result.current.modeShared.value).toBe('normal')
    })
  })

  it('updates visibility SharedValues for pointer events', async () => {
    const collapseProgress = useSharedValue(0)

    const { result } = renderHook(() => useProgressBarVisibility(collapseProgress))

    expect(result.current.normalVisibility.value).toBe(1)
    expect(result.current.persistentVisibility.value).toBe(0)

    act(() => {
      collapseProgress.value = 0.5
      result.current.__applyProgressForTests?.(0.5)
    })

    await waitFor(() => {
      expect(result.current.normalVisibility.value).toBe(0)
      expect(result.current.persistentVisibility.value).toBe(1)
    })
  })

  it('provides animated styles for opacity control', () => {
    const collapseProgress = useSharedValue(0)

    const { result } = renderHook(() => useProgressBarVisibility(collapseProgress))

    expect(result.current.normalVisibilityAnimatedStyle).toBeDefined()
    expect(result.current.persistentVisibilityAnimatedStyle).toBeDefined()
  })
})
