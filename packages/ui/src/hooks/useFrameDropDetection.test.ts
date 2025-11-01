import type { FrameDropMetrics } from './useFrameDropDetection'
import { applyPendingMetricsForTest } from './useFrameDropDetection'

const createMetrics = (overrides: Partial<FrameDropMetrics> = {}): FrameDropMetrics => ({
  currentFPS: 60,
  averageFPS: 60,
  droppedFrames: 0,
  frameTimes: [],
  frameCount: 0,
  ...overrides,
})

describe('applyPendingMetricsForTest', () => {
  it('updates state when logOnly is false', () => {
    const initialMetrics = createMetrics({ frameCount: 10 })
    const nextMetrics = createMetrics({ currentFPS: 48, averageFPS: 55, frameCount: 11 })

    const metricsRef = { current: initialMetrics }
    const pendingMetricsRef = { current: nextMetrics }
    const setMetrics = jest.fn()

    applyPendingMetricsForTest({
      logOnly: false,
      metricsRef,
      pendingMetricsRef,
      setMetrics,
    })

    expect(setMetrics).toHaveBeenCalledTimes(1)
    expect(setMetrics).toHaveBeenCalledWith(nextMetrics)
    expect(metricsRef.current).toBe(nextMetrics)
    expect(pendingMetricsRef.current).toBeNull()
  })

  it('skips state updates when logOnly is true', () => {
    const initialMetrics = createMetrics({ frameCount: 20 })
    const nextMetrics = createMetrics({ droppedFrames: 3, frameCount: 21 })

    const metricsRef = { current: initialMetrics }
    const pendingMetricsRef = { current: nextMetrics }
    const setMetrics = jest.fn()

    applyPendingMetricsForTest({
      logOnly: true,
      metricsRef,
      pendingMetricsRef,
      setMetrics,
    })

    expect(setMetrics).not.toHaveBeenCalled()
    expect(metricsRef.current).toBe(nextMetrics)
    expect(pendingMetricsRef.current).toBeNull()
  })
})
