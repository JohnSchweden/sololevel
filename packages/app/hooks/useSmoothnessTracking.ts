import { log } from '@my/logging'
import { useEffect, useRef } from 'react'

/**
 * Configuration for smoothness tracking
 */
export interface UseSmoothnessTrackingConfig {
  /** Animation duration measurements to track */
  duration: number | null
  /** Component name for logging context */
  componentName?: string
  /** Animation name/identifier for logging */
  animationName?: string
  /** Window size for calculating smoothness (default: 10) */
  windowSize?: number
  /** Threshold for janky frames in ms (default: 20, 2x expected frame time) */
  jankThreshold?: number
  /** Minimum smoothness score to log warning (default: 80) */
  warningThreshold?: number
}

/**
 * Smoothness metrics calculated from duration tracking
 */
export interface SmoothnessMetrics {
  /** Smoothness score (0-100, higher = smoother) */
  smoothnessScore: number
  /** Standard deviation of frame times */
  stdDev: number
  /** Variance in frame times */
  variance: number
  /** Number of janky frames detected */
  jankyFrames: number
  /** Average frame time */
  averageFrameTime: number
  /** Total samples tracked */
  sampleCount: number
}

/**
 * Return value from useSmoothnessTracking hook
 */
export interface UseSmoothnessTrackingReturn {
  /** Current smoothness metrics */
  metrics: SmoothnessMetrics
  /** Whether smoothness score is below warning threshold */
  isLowSmoothness: boolean
  /** Reset tracked metrics */
  reset: () => void
}

/**
 * Hook for tracking animation smoothness by analyzing duration variance.
 *
 * Calculates smoothness score from frame time measurements, detecting
 * janky animations and performance regressions.
 *
 * ## How It Works:
 *
 * 1. Tracks animation duration measurements
 * 2. Calculates variance and standard deviation
 * 3. Identifies janky frames (duration > threshold)
 * 4. Computes smoothness score (0-100)
 * 5. Warns when smoothness drops below threshold
 *
 * ## Smoothness Score:
 *
 * - **100**: Perfect consistency (no variance)
 * - **80-99**: Good smoothness (minimal variance)
 * - **60-79**: Moderate smoothness (noticeable variance)
 * - **<60**: Poor smoothness (high variance, janky)
 *
 * @example
 * ```tsx
 * // Track smoothness from completion hook
 * const completion = useAnimationCompletion({ ... })
 * const smoothness = useSmoothnessTracking({
 *   duration: completion.actualDuration,
 *   componentName: 'ProgressBar',
 *   animationName: 'handle-opacity',
 * })
 *
 * // Check smoothness
 * if (smoothness.isLowSmoothness) {
 *   console.warn('Low smoothness detected!', smoothness.metrics)
 * }
 * ```
 *
 * @param config - Configuration for smoothness tracking
 * @returns Object with smoothness metrics and utilities
 */
export function useSmoothnessTracking(
  config: UseSmoothnessTrackingConfig
): UseSmoothnessTrackingReturn {
  const {
    duration,
    componentName = 'Animation',
    animationName = 'animation',
    windowSize = 10,
    jankThreshold = 20,
    warningThreshold = 80,
  } = config

  const durationsRef = useRef<number[]>([])
  const lastDurationRef = useRef<number | null>(null)

  // Add new duration to tracking window
  useEffect(() => {
    if (duration === null) {
      return
    }

    // Calculate variance from previous duration if available
    if (lastDurationRef.current !== null) {
      const variance = Math.abs(duration - lastDurationRef.current)
      durationsRef.current.push(variance)

      // Keep only last N measurements
      if (durationsRef.current.length > windowSize) {
        durationsRef.current.shift()
      }
    }

    lastDurationRef.current = duration
  }, [duration, windowSize])

  // Calculate smoothness metrics
  const calculateMetrics = (): SmoothnessMetrics => {
    const durations = durationsRef.current

    if (durations.length === 0) {
      return {
        smoothnessScore: 100,
        stdDev: 0,
        variance: 0,
        jankyFrames: 0,
        averageFrameTime: 0,
        sampleCount: 0,
      }
    }

    const average = durations.reduce((a, b) => a + b, 0) / durations.length
    const variance =
      durations.reduce((sum, time) => sum + (time - average) ** 2, 0) / durations.length
    const stdDev = Math.sqrt(variance)

    // Count janky frames (variance > threshold)
    const jankyFrames = durations.filter((v) => v > jankThreshold).length
    const jankPercentage = (jankyFrames / durations.length) * 100

    // Smoothness score: 100 = perfect, 0 = very janky
    const smoothnessScore = Math.max(0, Math.round(100 - jankPercentage * 2))

    return {
      smoothnessScore,
      stdDev: Math.round(stdDev),
      variance: Math.round(variance),
      jankyFrames,
      averageFrameTime: Math.round(average),
      sampleCount: durations.length,
    }
  }

  const metrics = calculateMetrics()
  const isLowSmoothness = metrics.smoothnessScore < warningThreshold

  // Track previous metrics to avoid duplicate warnings
  const previousMetricsRef = useRef<SmoothnessMetrics | null>(null)
  const hasWarnedRef = useRef(false)

  // Warn on low smoothness (only when metrics change or threshold crossed)
  useEffect(() => {
    const prevMetrics = previousMetricsRef.current

    // Check if metrics actually changed
    const metricsChanged =
      prevMetrics === null ||
      prevMetrics.smoothnessScore !== metrics.smoothnessScore ||
      prevMetrics.sampleCount !== metrics.sampleCount ||
      prevMetrics.stdDev !== metrics.stdDev ||
      prevMetrics.jankyFrames !== metrics.jankyFrames

    // Only warn if:
    // 1. We have enough samples (>= 3)
    // 2. Smoothness is low
    // 3. Metrics have changed (to avoid duplicate warnings)
    // 4. We haven't already warned for this exact state
    if (
      isLowSmoothness &&
      metrics.sampleCount >= 3 &&
      metricsChanged &&
      (!hasWarnedRef.current || prevMetrics?.smoothnessScore !== metrics.smoothnessScore)
    ) {
      log.warn(componentName, '⚠️ Low smoothness score detected', {
        animationName,
        smoothnessScore: metrics.smoothnessScore,
        stdDev: metrics.stdDev,
        jankyFrames: metrics.jankyFrames,
        sampleCount: metrics.sampleCount,
      })
      hasWarnedRef.current = true
    } else if (!isLowSmoothness && hasWarnedRef.current) {
      // Reset warning flag when smoothness improves
      hasWarnedRef.current = false
    }

    previousMetricsRef.current = metrics
  }, [isLowSmoothness, metrics, componentName, animationName])

  // Debug log smoothness metrics periodically
  useEffect(() => {
    if (metrics.sampleCount > 0 && metrics.sampleCount % 10 === 0) {
      // Log every 10 samples
      log.debug(componentName, '📊 Smoothness metrics', {
        animationName,
        ...metrics,
      })
    }
  }, [metrics, componentName, animationName])

  const reset = (): void => {
    durationsRef.current = []
    lastDurationRef.current = null
  }

  return {
    metrics,
    isLowSmoothness,
    reset,
  }
}
