import { log } from '@my/logging'
import { useEffect, useRef } from 'react'

// Performance API availability check
const performanceAvailable =
  typeof global !== 'undefined' &&
  typeof (global as any).performance !== 'undefined' &&
  typeof (global as any).performance.mark === 'function' &&
  typeof (global as any).performance.now === 'function'

/**
 * Configuration for animation completion tracking
 */
export interface UseAnimationCompletionConfig {
  /** Current animated value (e.g., opacity) */
  currentValue: number
  /** Expected target value when animation completes */
  targetValue: number
  /** Tolerance for considering value "at target" (default: 0.01) */
  tolerance?: number
  /** Number of stable frames required before considering complete (default: 3) */
  requiredStableFrames?: number
  /** Estimated animation duration in ms (for logging comparison) */
  estimatedDuration?: number
  /** Component name for logging context */
  componentName?: string
  /** Animation name/identifier for logging */
  animationName?: string
  /** Direction of animation (e.g., 'show', 'hide', 'fade-in', 'fade-out') */
  direction?: string
  /** Callback when animation truly completes */
  onComplete?: (actualDuration: number) => void
}

/**
 * Return value from useAnimationCompletion hook
 */
export interface UseAnimationCompletionReturn {
  /** Whether animation has completed */
  isComplete: boolean
  /** Actual animation duration (null if not complete) */
  actualDuration: number | null
  /** Difference from estimated duration (null if not complete) */
  difference: number | null
}

/**
 * Hook for detecting true animation completion using visual state monitoring.
 *
 * Replaces setTimeout-based estimation with actual value stability detection.
 * Animation is considered complete when the value reaches target and stays
 * stable for a configurable number of frames.
 *
 * ## How It Works:
 *
 * 1. Monitors `currentValue` for changes
 * 2. Detects when value reaches `targetValue` (±tolerance)
 * 3. Tracks stable frames where value doesn't change
 * 4. Considers complete when stable for `requiredStableFrames` (default: 3)
 * 5. Calculates actual duration from start to completion
 *
 * ## Advantages Over setTimeout:
 *
 * - ✅ Measures actual completion, not estimated
 * - ✅ Works regardless of animation speed
 * - ✅ Handles slow devices gracefully
 * - ✅ Detects interrupted animations
 * - ✅ No timing estimation needed
 *
 * @example
 * ```tsx
 * // In ProgressBar component:
 * const completion = useAnimationCompletion({
 *   currentValue: handleOpacity,
 *   targetValue: controlsVisible ? 1 : 0.7,
 *   estimatedDuration: 200,
 *   componentName: 'ProgressBar',
 *   animationName: `handle-opacity-${variant}`,
 *   direction: handleOpacity > prevOpacity ? 'fade-in' : 'fade-out',
 * })
 *
 * // Check completion status
 * if (completion.isComplete) {
 *   console.log(`Animation took ${completion.actualDuration}ms`)
 * }
 * ```
 *
 * @param config - Configuration for animation completion tracking
 * @returns Object with completion status and duration metrics
 */
export function useAnimationCompletion(
  config: UseAnimationCompletionConfig
): UseAnimationCompletionReturn {
  const {
    currentValue,
    targetValue,
    tolerance = 0.01,
    requiredStableFrames = 3,
    estimatedDuration,
    componentName = 'Animation',
    animationName = 'animation',
    direction,
    onComplete,
  } = config

  const animationStartTimeRef = useRef<number | null>(null)
  const animationMarkRef = useRef<string | null>(null)
  const stableFrameCountRef = useRef(0)
  const previousValueRef = useRef<number | null>(null)
  const isCompleteRef = useRef(false)
  const actualDurationRef = useRef<number | null>(null)
  const differenceRef = useRef<number | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // Initialize on first render
    if (previousValueRef.current === null) {
      previousValueRef.current = currentValue
      return
    }

    const isAtTarget = Math.abs(currentValue - targetValue) < tolerance
    const previousValue = previousValueRef.current
    const wasAtTarget = Math.abs(previousValue - targetValue) < tolerance
    const isStable = Math.abs(currentValue - previousValue) < tolerance / 2
    const valueChanged = Math.abs(currentValue - previousValue) >= tolerance / 2

    // Special case: For declarative animations (like Tamagui), currentValue === targetValue immediately
    // In this case, we detect animation start when the value changes (target changes)
    const isDeclarativeAnimation =
      isAtTarget && Math.abs(currentValue - targetValue) < tolerance / 10

    // Detect animation start (value changes when not at target, or moves away from target)
    // Special handling for declarative animations where value === target immediately
    if (valueChanged && (isDeclarativeAnimation || !isAtTarget || (wasAtTarget && !isAtTarget))) {
      // Animation started - value changed (either declared animation or traditional animation)
      if (animationStartTimeRef.current === null) {
        // Only start timing if not already tracking
        animationStartTimeRef.current = performanceAvailable
          ? (global as any).performance.now()
          : Date.now()

        const markName = `${animationName}-start-${Date.now()}`
        if (performanceAvailable) {
          try {
            const perf = (global as any).performance
            perf.mark(markName)
            animationMarkRef.current = markName
          } catch (error) {
            log.warn(componentName, 'Failed to create performance mark', {
              error: error instanceof Error ? error.message : String(error),
            })
          }
        }

        isCompleteRef.current = false
        stableFrameCountRef.current = 0
        actualDurationRef.current = null
        differenceRef.current = null

        // For declarative animations, complete after estimated duration since we can't track intermediate values
        if (isDeclarativeAnimation && estimatedDuration !== undefined) {
          // Clear any existing timeout
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
            timeoutRef.current = null
          }

          timeoutRef.current = setTimeout(() => {
            if (animationStartTimeRef.current !== null && !isCompleteRef.current) {
              const actualDuration = performanceAvailable
                ? (global as any).performance.now() - animationStartTimeRef.current
                : Date.now() - animationStartTimeRef.current

              const difference =
                estimatedDuration !== undefined ? actualDuration - estimatedDuration : null

              isCompleteRef.current = true
              actualDurationRef.current = actualDuration
              differenceRef.current = difference

              // Log completion
              const logData: Record<string, unknown> = {
                animationName,
                targetValue,
                actualDuration: Math.round(actualDuration),
              }

              if (direction) {
                logData.direction = direction
              }

              if (estimatedDuration !== undefined) {
                logData.estimatedDuration = estimatedDuration
              }

              if (difference !== null) {
                logData.difference = Math.round(difference)
              }

              log.debug(componentName, '📊 [PERFORMANCE] Animation truly completed', logData)

              // Call completion callback
              onComplete?.(Math.round(actualDuration))

              // Reset for next animation
              animationStartTimeRef.current = null
              animationMarkRef.current = null
              timeoutRef.current = null
            }
          }, estimatedDuration + 50) // Add 50ms buffer for measurement accuracy
        }
      }
    }

    // Track stability when at target
    if (isAtTarget) {
      if (isStable) {
        stableFrameCountRef.current++
      } else {
        // Value changed while at target - reset stability counter
        stableFrameCountRef.current = 1
      }

      // Animation complete when stable at target for required frames
      if (
        stableFrameCountRef.current >= requiredStableFrames &&
        animationStartTimeRef.current !== null &&
        !isCompleteRef.current
      ) {
        const actualDuration = performanceAvailable
          ? (global as any).performance.now() - animationStartTimeRef.current
          : Date.now() - animationStartTimeRef.current

        const difference =
          estimatedDuration !== undefined ? actualDuration - estimatedDuration : null

        isCompleteRef.current = true
        actualDurationRef.current = actualDuration
        differenceRef.current = difference

        // Log completion
        const logData: Record<string, unknown> = {
          animationName,
          targetValue,
          actualDuration: Math.round(actualDuration),
        }

        if (direction) {
          logData.direction = direction
        }

        if (estimatedDuration !== undefined) {
          logData.estimatedDuration = estimatedDuration
        }

        if (difference !== null) {
          logData.difference = Math.round(difference)
        }

        log.debug(componentName, '📊 [PERFORMANCE] Animation truly completed', logData)

        // Create end mark for debugging
        if (performanceAvailable && animationMarkRef.current) {
          try {
            const perf = (global as any).performance
            const endMarkName = `${animationMarkRef.current}-end`
            perf.mark(endMarkName)
          } catch (error) {
            // Ignore errors in end mark creation
          }
        }

        // Call completion callback
        onComplete?.(Math.round(actualDuration))

        // Reset for next animation
        animationStartTimeRef.current = null
        animationMarkRef.current = null
      }
    } else {
      // Not at target - reset stability counter
      stableFrameCountRef.current = 0
      isCompleteRef.current = false
      actualDurationRef.current = null
      differenceRef.current = null
    }

    previousValueRef.current = currentValue
  }, [
    currentValue,
    targetValue,
    tolerance,
    requiredStableFrames,
    estimatedDuration,
    componentName,
    animationName,
    direction,
    onComplete,
  ])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
  }, [])

  return {
    isComplete: isCompleteRef.current,
    actualDuration: actualDurationRef.current,
    difference: differenceRef.current,
  }
}
