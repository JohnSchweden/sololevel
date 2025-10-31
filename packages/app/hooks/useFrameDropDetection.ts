import { log } from '@my/logging'
import { useEffect, useRef, useState } from 'react'

/**
 * Configuration for frame drop detection
 */
export interface UseFrameDropDetectionConfig {
  /** Whether monitoring is active */
  isActive: boolean
  /** Expected frame time in ms (default: 16.67 for 60fps) */
  expectedFrameTime?: number
  /** Threshold multiplier for dropped frames (default: 2, frame > 2x expected = dropped) */
  dropThreshold?: number
  /** Window size for frame time tracking (default: 60, ~1 second at 60fps) */
  windowSize?: number
  /** Warning threshold for dropped frames count (default: 5) */
  warningThreshold?: number
  /** Component name for logging context */
  componentName?: string
  /** Animation name/identifier for logging */
  animationName?: string
}

/**
 * Frame drop metrics
 */
export interface FrameDropMetrics {
  /** Current FPS */
  currentFPS: number
  /** Average FPS over window */
  averageFPS: number
  /** Total dropped frames count */
  droppedFrames: number
  /** Frame times in ms */
  frameTimes: number[]
  /** Number of frames tracked */
  frameCount: number
}

/**
 * Return value from useFrameDropDetection hook
 */
export interface UseFrameDropDetectionReturn {
  /** Current frame drop metrics */
  metrics: FrameDropMetrics
  /** Whether frame drops are above warning threshold */
  hasFrameDrops: boolean
  /** Reset metrics */
  reset: () => void
}

/**
 * Hook for detecting frame drops and jank during animations.
 *
 * Uses requestAnimationFrame to monitor frame rendering performance,
 * detecting when frames take longer than expected (indicating jank).
 *
 * ## How It Works:
 *
 * 1. Monitors frame rendering via requestAnimationFrame
 * 2. Calculates time between frames
 * 3. Detects dropped frames (duration > threshold * expected)
 * 4. Tracks FPS and dropped frame count
 * 5. Warns when drops exceed threshold
 *
 * ## Frame Drop Detection:
 *
 * A frame is considered "dropped" when:
 * - Frame duration > `expectedFrameTime * dropThreshold`
 * - Example: > 33.34ms at 60fps with threshold 2 (normal frame = 16.67ms)
 *
 * @example
 * ```tsx
 * // Monitor frame drops during controls animation
 * const frameDrops = useFrameDropDetection({
 *   isActive: controlsVisible,
 *   componentName: 'VideoControls',
 *   animationName: 'controls-overlay',
 * })
 *
 * // Check for frame drops
 * if (frameDrops.hasFrameDrops) {
 *   console.warn('Frame drops detected!', frameDrops.metrics)
 * }
 * ```
 *
 * @param config - Configuration for frame drop detection
 * @returns Object with frame drop metrics and utilities
 */
export function useFrameDropDetection(
  config: UseFrameDropDetectionConfig
): UseFrameDropDetectionReturn {
  const {
    isActive,
    expectedFrameTime = 1000 / 60, // 16.67ms for 60fps
    dropThreshold = 2,
    windowSize = 60,
    warningThreshold = 5,
    componentName = 'Animation',
    animationName = 'animation',
  } = config

  const frameCountRef = useRef(0)
  const lastFrameTimeRef = useRef<number | null>(null)
  const frameTimesRef = useRef<number[]>([])
  const droppedFramesRef = useRef(0)
  const rafIdRef = useRef<number | null>(null)
  const pendingMetricsRef = useRef<FrameDropMetrics | null>(null)

  const [metrics, setMetrics] = useState<FrameDropMetrics>({
    currentFPS: 60,
    averageFPS: 60,
    droppedFrames: 0,
    frameTimes: [],
    frameCount: 0,
  })

  // Frame monitoring loop
  useEffect(() => {
    if (!isActive) {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = null
      }
      return
    }

    const measureFrame = (currentTime: number): void => {
      if (lastFrameTimeRef.current !== null) {
        const frameDuration = currentTime - lastFrameTimeRef.current
        const expectedDuration = expectedFrameTime

        // Detect dropped frames (frame took longer than threshold * expected)
        if (frameDuration > expectedDuration * dropThreshold) {
          const dropped = Math.floor(frameDuration / expectedDuration) - 1
          droppedFramesRef.current += Math.max(0, dropped)
        }

        // Track frame time
        frameTimesRef.current.push(frameDuration)

        // Keep only last N frames
        if (frameTimesRef.current.length > windowSize) {
          frameTimesRef.current.shift()
        }

        // Calculate metrics
        const currentFPS = frameDuration > 0 ? Math.round(1000 / frameDuration) : 60
        const average =
          frameTimesRef.current.reduce((a, b) => a + b, 0) / frameTimesRef.current.length
        const averageFPS = average > 0 ? Math.round(1000 / average) : 60

        // Store in ref instead of calling setState during RAF
        pendingMetricsRef.current = {
          currentFPS,
          averageFPS,
          droppedFrames: droppedFramesRef.current,
          frameTimes: [...frameTimesRef.current],
          frameCount: frameCountRef.current,
        }
      }

      lastFrameTimeRef.current = currentTime
      frameCountRef.current++
      rafIdRef.current = requestAnimationFrame(measureFrame)
    }

    // Reset when starting
    lastFrameTimeRef.current = null
    frameCountRef.current = 0
    droppedFramesRef.current = 0
    frameTimesRef.current = []

    // Start monitoring
    rafIdRef.current = requestAnimationFrame(measureFrame)

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = null
      }
    }
  }, [isActive, expectedFrameTime, dropThreshold, windowSize])

  // Sync pending metrics to state in a separate effect (after RAF has run)
  useEffect(() => {
    if (pendingMetricsRef.current) {
      setMetrics(pendingMetricsRef.current)
      pendingMetricsRef.current = null
    }
  })

  // Warn on frame drops
  useEffect(() => {
    if (metrics.droppedFrames >= warningThreshold && metrics.frameCount > 10) {
      // Only warn after tracking for a bit
      log.warn(componentName, '⚠️ Frame drops detected', {
        animationName,
        droppedFrames: metrics.droppedFrames,
        currentFPS: metrics.currentFPS,
        averageFPS: metrics.averageFPS,
        frameCount: metrics.frameCount,
      })
    }
  }, [metrics, warningThreshold, componentName, animationName])

  const hasFrameDrops = metrics.droppedFrames >= warningThreshold

  const reset = (): void => {
    frameCountRef.current = 0
    droppedFramesRef.current = 0
    frameTimesRef.current = []
    lastFrameTimeRef.current = null
    setMetrics({
      currentFPS: 60,
      averageFPS: 60,
      droppedFrames: 0,
      frameTimes: [],
      frameCount: 0,
    })
  }

  return {
    metrics,
    hasFrameDrops,
    reset,
  }
}
