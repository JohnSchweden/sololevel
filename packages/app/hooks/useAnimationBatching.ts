import { log } from '@my/logging'
import { useCallback, useEffect, useRef } from 'react'
// TODO: Refactor to use new animation hooks or remove if unused
// import { useAnimationPerformance } from './useAnimationPerformance'

/**
 * Configuration for batched animation performance tracking
 */
export interface AnimationBatchingConfig {
  /** Animation type: 'quick' (200ms), 'lazy' (300ms), or 'initial' (no target) */
  type: 'quick' | 'lazy' | 'initial'
  /** Target duration in milliseconds */
  targetDuration: number
  /** Component name for logging scope */
  componentName: string
  /** Whether tracking is enabled (useful for production sampling) */
  enabled?: boolean
  /** Minimum duration to track (filter out trivial animations) */
  minDurationThreshold?: number
  /** Maximum number of animations to batch together */
  maxBatchSize?: number
  /** Debounce delay in milliseconds to wait for more animations */
  debounceDelay?: number
}

/**
 * Individual animation that can be batched
 */
export interface BatchedAnimation {
  /** Unique identifier for this animation */
  id: string
  /** Animation type */
  type: 'quick' | 'lazy' | 'initial'
  /** Target duration */
  targetDuration: number
  /** Component name */
  componentName: string
  /** Callback when animation starts */
  onStart?: () => void
  /** Callback when animation ends */
  onEnd?: () => void
}

/**
 * Return value from useAnimationBatching hook
 */
export interface UseAnimationBatchingReturn {
  /** Add an animation to the batch */
  addAnimation: (animation: BatchedAnimation) => void
  /** Force flush the current batch */
  flushBatch: () => void
  /** Clear all pending animations */
  clearBatch: () => void
  /** Get current batch status */
  getBatchStatus: () => {
    pendingCount: number
    isBatching: boolean
    batchStartTime: number | null
  }
}

/**
 * Hook for batching multiple animations together to improve performance
 *
 * Instead of tracking each animation individually, this hook collects
 * animations that start within a short time window and tracks them as
 * a single batch, reducing the overhead of multiple performance tracking
 * instances.
 *
 * @example
 * ```tsx
 * const batching = useAnimationBatching({
 *   type: 'quick',
 *   targetDuration: 200,
 *   componentName: 'VideoControlsBatch',
 *   debounceDelay: 50, // Wait 50ms for more animations
 *   maxBatchSize: 5,    // Max 5 animations per batch
 * })
 *
 * // Add animations to batch
 * batching.addAnimation({
 *   id: 'controls-fade',
 *   type: 'lazy',
 *   targetDuration: 200,
 *   componentName: 'CenterControlsFade',
 *   onStart: () => console.log('Controls fade started'),
 *   onEnd: () => console.log('Controls fade ended'),
 * })
 *
 * batching.addAnimation({
 *   id: 'progress-bar',
 *   type: 'quick',
 *   targetDuration: 150,
 *   componentName: 'ProgressBarHandle',
 * })
 * ```
 *
 * @param config - Configuration for animation batching
 * @returns Object with batching methods
 */
export function useAnimationBatching(config: AnimationBatchingConfig): UseAnimationBatchingReturn {
  const {
    // type, // TODO: Used by old API, will be refactored
    // targetDuration, // TODO: Used by old API, will be refactored
    componentName,
    enabled = true,
    // minDurationThreshold = 0, // TODO: Used by old API, will be refactored
    maxBatchSize = 5,
    debounceDelay = 50,
  } = config

  // Performance tracking for the entire batch
  // TODO: Refactor to use new animation hooks (useAnimationCompletion, useSmoothnessTracking, useFrameDropDetection)
  // const performance = useAnimationPerformance({
  //   type,
  //   targetDuration,
  //   componentName,
  //   enabled,
  //   minDurationThreshold,
  // })

  // Temporary stub until refactored - matches old API interface
  const performance = {
    startWithFrameTracking: () => {},
    end: (_withFrameTracking?: boolean) => ({}) as any, // Return empty object to satisfy spread
    cleanup: () => {},
  }

  // Batch state
  const batchRef = useRef<BatchedAnimation[]>([])
  const batchTimeoutRef = useRef<ReturnType<typeof setTimeout> | number | null>(null)
  const batchStartTimeRef = useRef<number | null>(null)
  const isBatchingRef = useRef(false)
  const safetyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Clear existing timeout or animation frame
  const clearBatchTimeout = useCallback(() => {
    if (batchTimeoutRef.current !== null) {
      // Clear timeout (works for both setTimeout and requestAnimationFrame IDs in React Native)
      clearTimeout(batchTimeoutRef.current as any)
      // Only cancel animation frame if it's actually an animation frame ID
      // In React Native, setTimeout returns a number, so we can't distinguish easily
      // Just clearTimeout should work for both
      batchTimeoutRef.current = null
    }
  }, [])

  // Process the current batch
  const processBatch = useCallback(() => {
    if (!enabled || batchRef.current.length === 0) return

    const batch = [...batchRef.current] // Create a copy to avoid mutations
    const batchSize = batch.length

    // Prevent processing if already batching
    if (isBatchingRef.current) {
      log.debug(componentName, 'Skipping batch processing - already batching', {
        pendingCount: batchRef.current.length,
        currentBatchSize: batchSize,
      })
      return
    }

    // Clear the batch immediately to prevent interference from new animations
    batchRef.current = []

    // Clear any existing safety timeout
    if (safetyTimeoutRef.current) {
      clearTimeout(safetyTimeoutRef.current)
    }

    // Safety timeout to prevent animations from getting stuck
    safetyTimeoutRef.current = setTimeout(() => {
      if (isBatchingRef.current) {
        log.warn(componentName, 'Animation batch stuck - forcing cleanup', {
          batchSize,
          duration: Date.now() - (batchStartTimeRef.current || 0),
        })

        // Force cleanup
        batchRef.current = []
        isBatchingRef.current = false
        batchStartTimeRef.current = null
        batchTimeoutRef.current = null
        safetyTimeoutRef.current = null
      }
    }, 5000) // 5 second safety timeout

    // Start batch performance tracking
    batchStartTimeRef.current = Date.now()
    isBatchingRef.current = true
    performance.startWithFrameTracking()

    // Call onStart for all animations in batch
    batch.forEach((animation) => {
      try {
        animation.onStart?.()
      } catch (error) {
        log.warn(componentName, 'Error in animation onStart callback', {
          animationId: animation.id,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    })

    // End batch after the longest target duration
    const maxDuration = Math.max(...batch.map((a) => a.targetDuration))

    // Use requestAnimationFrame for immediate processing when duration is very short
    if (maxDuration <= 16) {
      // For very short animations, use requestAnimationFrame instead of setTimeout
      const frameId = requestAnimationFrame(() => {
        // Double-check that this frame callback should still fire
        const frameMismatch = batchTimeoutRef.current !== frameId
        if (frameMismatch) {
          log.debug(
            componentName,
            'Frame callback fired but frame ID mismatch - cleaning up anyway',
            {
              storedId: batchTimeoutRef.current,
              currentId: frameId,
            }
          )
          // Even if frame ID doesn't match, we should still reset batching state
          if (isBatchingRef.current) {
            isBatchingRef.current = false
            batchStartTimeRef.current = null
            batchTimeoutRef.current = null
            if (safetyTimeoutRef.current) {
              clearTimeout(safetyTimeoutRef.current)
              safetyTimeoutRef.current = null
            }
          }
          return
        }

        // Double-check that we're still batching
        if (!isBatchingRef.current) {
          log.debug(componentName, 'Frame callback fired but not batching - ignoring')
          return
        }

        // End performance tracking
        const metrics = performance.end(true)

        // Call onEnd for all animations in batch
        batch.forEach((animation) => {
          try {
            animation.onEnd?.()
          } catch (error) {
            log.warn(componentName, 'Error in animation onEnd callback', {
              animationId: animation.id,
              error: error instanceof Error ? error.message : String(error),
            })
          }
        })

        // Log batch performance
        if (metrics) {
          log.debug(componentName, 'Animation batch completed', {
            batchSize,
            animations: batch.map((a) => ({
              id: a.id,
              type: a.type,
              targetDuration: a.targetDuration,
            })),
            ...metrics,
          })
        }

        // Reset batch state
        batchRef.current = []
        isBatchingRef.current = false
        batchStartTimeRef.current = null
        batchTimeoutRef.current = null

        // Clear safety timeout
        if (safetyTimeoutRef.current) {
          clearTimeout(safetyTimeoutRef.current)
          safetyTimeoutRef.current = null
        }
      })

      // Store frame ID for cleanup
      batchTimeoutRef.current = frameId
    } else {
      // Use setTimeout for longer animations
      log.debug(componentName, 'Setting timeout for batch completion', {
        maxDuration,
        batchSize,
        animations: batch.map((a) => ({
          id: a.id,
          type: a.type,
          targetDuration: a.targetDuration,
        })),
      })

      const timeoutId = setTimeout(() => {
        // Double-check that this timeout should still fire
        // (the timeout ID should match what we stored)
        const timeoutMismatch = batchTimeoutRef.current !== timeoutId
        if (timeoutMismatch) {
          log.debug(
            componentName,
            'Timeout callback fired but timeout ID mismatch - cleaning up anyway',
            {
              storedId: batchTimeoutRef.current,
              currentId: timeoutId,
            }
          )
          // Even if timeout ID doesn't match, we should still reset batching state
          // because this timeout callback firing means the batch duration has elapsed
          if (isBatchingRef.current) {
            isBatchingRef.current = false
            batchStartTimeRef.current = null
            batchTimeoutRef.current = null
            if (safetyTimeoutRef.current) {
              clearTimeout(safetyTimeoutRef.current)
              safetyTimeoutRef.current = null
            }
          }
          return
        }

        // Double-check that we're still batching
        if (!isBatchingRef.current) {
          log.debug(componentName, 'Timeout callback fired but not batching - ignoring')
          return
        }

        log.debug(componentName, 'Timeout fired - completing batch', {
          maxDuration,
          batchSize,
          actualDuration: Date.now() - (batchStartTimeRef.current || 0),
          timeoutId,
          storedTimeoutId: batchTimeoutRef.current,
        })

        // End performance tracking
        const metrics = performance.end(true)

        // Call onEnd for all animations in batch
        batch.forEach((animation) => {
          try {
            animation.onEnd?.()
          } catch (error) {
            log.warn(componentName, 'Error in animation onEnd callback', {
              animationId: animation.id,
              error: error instanceof Error ? error.message : String(error),
            })
          }
        })

        // Log batch performance
        if (metrics) {
          log.debug(componentName, 'Animation batch completed', {
            batchSize,
            animations: batch.map((a) => ({
              id: a.id,
              type: a.type,
              targetDuration: a.targetDuration,
            })),
            ...metrics,
          })
        }

        // Reset batch state - CRITICAL: Must reset isBatchingRef to allow new animations
        batchRef.current = []
        isBatchingRef.current = false
        batchStartTimeRef.current = null
        batchTimeoutRef.current = null

        // Clear safety timeout
        if (safetyTimeoutRef.current) {
          clearTimeout(safetyTimeoutRef.current)
          safetyTimeoutRef.current = null
        }
      }, maxDuration)

      // Store timeout ID immediately after creation
      batchTimeoutRef.current = timeoutId
    }
  }, [enabled, componentName, performance])

  // Add animation to batch
  const addAnimation = useCallback(
    (animation: BatchedAnimation) => {
      if (!enabled) return

      // If we're already batching, skip adding new animations
      // (they'll be processed after current batch completes)
      if (isBatchingRef.current) {
        log.debug(componentName, 'Animation already batching, skipping', {
          animationId: animation.id,
          pendingCount: batchRef.current.length,
        })
        return
      }

      // Prevent duplicate animations with same ID
      const existingIndex = batchRef.current.findIndex((a) => a.id === animation.id)
      if (existingIndex >= 0) {
        // Replace existing animation instead of adding duplicate
        batchRef.current[existingIndex] = animation
      } else {
        // Add new animation to batch
        batchRef.current.push(animation)
      }

      // Check if we should flush immediately
      if (batchRef.current.length >= maxBatchSize) {
        // Clear existing timeout before processing immediately
        clearBatchTimeout()
        processBatch()
        return
      }

      // Clear existing timeout only if we're setting a new one
      clearBatchTimeout()

      // Set timeout to process batch after debounce delay
      batchTimeoutRef.current = setTimeout(() => {
        processBatch()
      }, debounceDelay)
    },
    [enabled, maxBatchSize, debounceDelay, clearBatchTimeout, processBatch]
  )

  // Force flush the current batch
  const flushBatch = useCallback(() => {
    clearBatchTimeout()
    processBatch()
  }, [clearBatchTimeout, processBatch])

  // Clear all pending animations
  const clearBatch = useCallback(() => {
    clearBatchTimeout()
    batchRef.current = []
    isBatchingRef.current = false
    batchStartTimeRef.current = null
  }, [clearBatchTimeout])

  // Get current batch status
  const getBatchStatus = useCallback(
    () => ({
      pendingCount: batchRef.current.length,
      isBatching: isBatchingRef.current,
      batchStartTime: batchStartTimeRef.current,
    }),
    []
  )

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearBatchTimeout()
      performance.cleanup()
    }
  }, [clearBatchTimeout, performance])

  return {
    addAnimation,
    flushBatch,
    clearBatch,
    getBatchStatus,
  }
}
