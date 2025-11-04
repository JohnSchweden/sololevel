/**
 * ProfilerWrapper - Wraps components with React.Profiler for render tracking
 *
 * Cross-platform component that tracks render counts, phases, and durations
 * for performance diagnosis. Works on both web and native.
 *
 * Usage:
 * ```tsx
 * <ProfilerWrapper id="VideoAnalysisLayout">
 *   <VideoAnalysisLayout {...props} />
 * </ProfilerWrapper>
 * ```
 *
 * Or use the hook:
 * ```tsx
 * const renderCount = useRenderCount('VideoAnalysisLayout');
 * ```
 */

import { log } from '@my/logging'
import React, { type ProfilerOnRenderCallback, useRef, useState } from 'react'
import type { ReactElement } from 'react'

export type RenderPhase = 'mount' | 'update'

export interface RenderMetrics {
  phase: RenderPhase
  actualDuration: number
  baseDuration: number
  startTime: number
  commitTime: number
  renderCount: number
}

export interface RenderMetricsWithId extends RenderMetrics {
  id: string
}

type MetricsStore = Map<string, RenderMetrics[]>

// Global store for metrics (persists across component unmounts)
const metricsStore: MetricsStore = new Map()

// Listeners for metrics updates
const listeners = new Set<(id: string, metrics: RenderMetrics) => void>()

/**
 * Subscribe to render metrics updates
 */
export function subscribeToMetrics(
  callback: (id: string, metrics: RenderMetrics) => void
): () => void {
  listeners.add(callback)
  return () => {
    listeners.delete(callback)
  }
}

/**
 * Get all metrics for a component
 */
export function getMetrics(id: string): RenderMetrics[] {
  return metricsStore.get(id) || []
}

/**
 * Clear metrics for a component
 */
export function clearMetrics(id: string): void {
  metricsStore.delete(id)
}

/**
 * Clear all metrics
 */
export function clearAllMetrics(): void {
  metricsStore.clear()
}

interface ProfilerWrapperProps {
  id: string
  children: React.ReactNode
  onRender?: (metrics: RenderMetrics) => void
  logToConsole?: boolean
}

/**
 * Wraps children with React.Profiler to track render performance
 */
export function ProfilerWrapper({
  id,
  children,
  onRender,
  logToConsole = false,
}: ProfilerWrapperProps): ReactElement {
  const renderCountRef = useRef(0)

  const onRenderCallback: ProfilerOnRenderCallback = (
    _componentId,
    phase,
    actualDuration,
    baseDuration,
    startTime,
    commitTime
  ) => {
    renderCountRef.current += 1

    const metrics: RenderMetrics = {
      phase: phase === 'mount' ? 'mount' : 'update',
      actualDuration,
      baseDuration,
      startTime,
      commitTime,
      renderCount: renderCountRef.current,
    }

    // Store metrics
    const existing = metricsStore.get(id) || []
    metricsStore.set(id, [...existing, metrics])

    // Notify listeners
    listeners.forEach((listener) => {
      listener(id, metrics)
    })

    // Call custom callback
    if (onRender) {
      onRender(metrics)
    }

    // Logger (dev only)
    if (logToConsole) {
      log.debug(`ProfilerWrapper:${id}`, 'Render metrics', {
        phase: metrics.phase,
        render: renderCountRef.current,
        actual: `${actualDuration.toFixed(2)}ms`,
        base: `${baseDuration.toFixed(2)}ms`,
        start: `${startTime.toFixed(2)}ms`,
        commit: `${commitTime.toFixed(2)}ms`,
      })
    }
  }

  return (
    <React.Profiler
      id={id}
      onRender={onRenderCallback}
    >
      {children}
    </React.Profiler>
  )
}

/**
 * Hook to track render count for a component
 *
 * Usage:
 * ```tsx
 * const renderCount = useRenderCount('MyComponent');
 * log.debug('MyComponent', `Rendered ${renderCount} times`);
 * ```
 */
export function useRenderCount(id: string): number {
  const [renderCount, setRenderCount] = useState(0)

  React.useEffect(() => {
    const metrics = getMetrics(id)
    setRenderCount(metrics.length)

    const unsubscribe = subscribeToMetrics((metricsId, metrics) => {
      if (metricsId === id) {
        setRenderCount(metrics.renderCount)
      }
    })

    return unsubscribe
  }, [id])

  return renderCount
}
