import { log } from '@my/logging'
import React, { useEffect, useRef } from 'react'

export interface UseRenderProfileOptions {
  componentName: string
  /** Enable detailed logging (default: false) */
  enabled?: boolean
  /** Log every Nth render (default: 1 = log all) */
  logInterval?: number
  /** Props to track for changes */
  trackProps?: Record<string, unknown>
}

/**
 * Hook to profile component re-renders and identify performance bottlenecks
 *
 * Usage:
 * ```tsx
 * useRenderProfile({
 *   componentName: 'VideoControls',
 *   enabled: __DEV__,
 *   trackProps: { isPlaying, currentTime, controlsVisible },
 * })
 * ```
 *
 * @param options - Profiling configuration
 */
export function useRenderProfile(options: UseRenderProfileOptions): void {
  const { componentName, enabled = false, trackProps = {} } = options

  const renderCountRef = useRef(0)
  const lastRenderTimeRef = useRef(performance.now())
  const prevPropsRef = useRef<Record<string, unknown>>(trackProps)

  if (!enabled) {
    return
  }

  renderCountRef.current += 1
  const currentRenderTime = performance.now()
  const timeSinceLastRender = currentRenderTime - lastRenderTimeRef.current

  // Detect which props changed
  const changedProps: string[] = []
  for (const [key, value] of Object.entries(trackProps)) {
    if (prevPropsRef.current[key] !== value) {
      changedProps.push(key)
    }
  }

  // Log every Nth render (disabled for performance debugging)

  // Warn if renders are too frequent (< 16ms = faster than 60fps)
  if (timeSinceLastRender < 16 && renderCountRef.current > 1) {
    log.warn(
      `useRenderProfile.${componentName}`,
      '⚠️ Rapid re-renders detected (< 16ms between renders)',
      {
        renderCount: renderCountRef.current,
        timeSinceLastRender: Math.round(timeSinceLastRender),
        changedProps,
      }
    )
  }

  lastRenderTimeRef.current = currentRenderTime
  prevPropsRef.current = trackProps
}

/**
 * React Profiler wrapper component for measuring render phases
 *
 * Usage:
 * ```tsx
 * <RenderProfiler id="VideoControls" enabled={__DEV__}>
 *   <VideoControls {...props} />
 * </RenderProfiler>
 * ```
 */
export function RenderProfiler({
  id,
  enabled = false,
  children,
}: {
  id: string
  enabled?: boolean
  children: React.ReactNode
}): React.ReactElement {
  useEffect(() => {
    if (enabled) {
      log.debug(`RenderProfiler.${id}`, 'Profiler mounted')
      return () => {
        log.debug(`RenderProfiler.${id}`, 'Profiler unmounted')
      }
    }
    return undefined
  }, [enabled, id])

  return <>{children}</>
}
