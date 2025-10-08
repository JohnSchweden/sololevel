/**
 * React hooks for change-tracking logger
 */

import { useEffect, useRef } from 'react'
import { logOnChange } from './logger'

type PrimitiveValue = string | number | boolean | null | undefined

interface UseLogOnChangeOptions<T> {
  /** Extract comparable state signature from full state */
  selector?: (state: T) => Record<string, PrimitiveValue>
  /** Custom comparator operating on signatures (default: shallow equal) */
  comparator?: (
    prev: Record<string, PrimitiveValue>,
    next: Record<string, PrimitiveValue>
  ) => boolean
  /** Log initial state on mount */
  initialLog?: boolean
  /** Default log level for changes */
  level?: 'debug' | 'info' | 'warn' | 'error'
  /** Additional context to include in every log */
  context?: Record<string, unknown>
  /** Disable logging (useful for conditional logging) */
  disabled?: boolean
}

/**
 * React hook wrapper for logOnChange.
 * Tracks state changes and logs only when values change.
 *
 * @param key - Unique identifier for this state (should be stable across renders)
 * @param state - Current state to track
 * @param scope - Logger scope (e.g., component/hook name)
 * @param message - Log message
 * @param options - Configuration options
 *
 * @example
 * ```tsx
 * function useVideoAudioSync(isVideoPlaying: boolean, isAudioActive: boolean) {
 *   const syncState = useMemo(() => ({
 *     isVideoPlaying,
 *     isAudioActive,
 *     shouldPlayVideo: isVideoPlaying && !isAudioActive,
 *     shouldPlayAudio: isAudioActive,
 *     isVideoPausedForAudio: isVideoPlaying && isAudioActive,
 *   }), [isVideoPlaying, isAudioActive])
 *
 *   // Only logs when syncState actually changes
 *   useLogOnChange(
 *     'sync',
 *     syncState,
 *     'useVideoAudioSync',
 *     'Sync state calculated',
 *     { level: 'debug' }
 *   )
 *
 *   return syncState
 * }
 * ```
 */
export function useLogOnChange<T>(
  key: string,
  state: T,
  scope: string,
  message: string,
  options: UseLogOnChangeOptions<T> = {}
): void {
  const { disabled = false, ...logOptions } = options

  // Use a ref to track if this is the first render
  const isFirstRender = useRef(true)

  useEffect(() => {
    if (disabled) return

    logOnChange(key, state, scope, message, logOptions)

    // Mark first render as complete
    if (isFirstRender.current) {
      isFirstRender.current = false
    }
  }, [key, state, scope, message, disabled, logOptions])
}

/**
 * Helper hook to log effect dependencies changes.
 * Useful for debugging why effects are re-running.
 *
 * @example
 * ```tsx
 * useLogDependencies('myEffect', { userId, videoId, isPlaying })
 *
 * useEffect(() => {
 *   // effect logic
 * }, [userId, videoId, isPlaying])
 * ```
 */
export function useLogDependencies(
  name: string,
  dependencies: Record<string, unknown>,
  scope = 'useEffect'
): void {
  useLogOnChange(name, dependencies, scope, `Dependencies changed for ${name}`, {
    level: 'debug',
    initialLog: false,
  })
}
