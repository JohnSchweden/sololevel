import { log } from '@my/logging'
import { useCallback, useEffect, useRef, useState } from 'react'

// Performance API availability check
const performanceAvailable =
  typeof global !== 'undefined' &&
  typeof (global as any).performance !== 'undefined' &&
  typeof (global as any).performance.mark === 'function' &&
  typeof (global as any).performance.now === 'function'

/**
 * Configuration for controls visibility management
 *
 * @property showControls - External control for forcing controls visibility
 * @property isPlaying - Current playback state
 * @property isScrubbing - Whether user is currently scrubbing the progress bar
 * @property autoHideDelayMs - Delay in milliseconds before auto-hiding controls (default: 1000ms)
 * @property onControlsVisibilityChange - Callback when controls visibility changes
 */
export interface UseControlsVisibilityConfig {
  /** External control for forcing controls visibility */
  showControls: boolean
  /** Current playback state */
  isPlaying: boolean
  /** Whether user is currently scrubbing the progress bar */
  isScrubbing: boolean
  /** Delay in milliseconds before auto-hiding controls (default: 1000ms) */
  autoHideDelayMs?: number
  /** Callback when controls visibility changes */
  onControlsVisibilityChange?: (visible: boolean, isUserInteraction?: boolean) => void
}

/**
 * Return value from useControlsVisibility hook
 *
 * @property controlsVisible - Current visibility state of controls
 * @property handlePress - Handler for tap-to-toggle controls visibility
 * @property showControlsAndResetTimer - Show controls and reset auto-hide timer
 * @property resetAutoHideTimer - Reset auto-hide timer without changing visibility
 */
export interface UseControlsVisibilityReturn {
  /** Current visibility state of controls */
  controlsVisible: boolean
  /** Handler for tap-to-toggle controls visibility */
  handlePress: () => void
  /** Show controls and reset auto-hide timer */
  showControlsAndResetTimer: () => void
  /** Reset auto-hide timer without changing visibility */
  resetAutoHideTimer: () => void
}

/**
 * Hook managing controls visibility and auto-hide timer logic.
 *
 * Provides centralized management of video controls visibility including:
 * - Auto-hide timer that hides controls after inactivity during playback
 * - Tap-to-toggle functionality for showing/hiding controls
 * - State synchronization with external showControls prop
 * - Scrubbing state prevention of auto-hide
 * - **Controls start HIDDEN on initial mount and remain hidden until user taps**
 *
 * ## Key Behavior:
 *
 * **Initial State**: Controls are always HIDDEN on mount, regardless of:
 * - Video playing status
 * - External showControls prop
 * - Processing state
 *
 * **User Interaction Required**: Controls only become visible when:
 * - User taps the video (triggers handlePress)
 * - showControls prop is forced true (external override)
 *
 * **Important**: Internal visibility changes (callbacks) do NOT count as user interaction.
 * Only actual user taps (handlePress) enable the normal visibility rules.
 *
 * ## State Flow Diagram:
 *
 * ```
 *                    ┌─────────────────────────────────────────┐
 *                    │    Initial Mount                        │
 *                    │    controlsVisible = FALSE              │
 *                    └────────────┬────────────────────────────┘
 *                                 │
 *                    ┌────────────▼──────────┐
 *                    │   HIDDEN STATE        │
 *                    │   (default start)     │
 *                    │   Stays here until... │
 *                    └────────┬───────────────┘
 *                             │
 *        ┌────────────────────┼────────────────────┐
 *        │                    │                    │
 *        ▼                    ▼                    ▼
 *   ┌─────────┐      ┌──────────────┐         ┌─────────┐
 *   │ VISIBLE │      │ HIDDEN       │         │ FORCED  │
 *   │ (true)  │      │ (false)      │         │ (true)  │
 *   │         │      │              │         │         │
 *   └────┬────┘      └──────┬───────┘         └────┬────┘
 *        │                  │                      │
 *        │ User taps        │ User taps            │ showControls=true
 *        │ or scrub ends    │ or showControls      │ (forces visible)
 *        │                  │ becomes true         │
 *        │                  │                      │
 *        └──────────────────┴──────────────────────┘
 *
 *  TIMER LOGIC (only active in VISIBLE state):
 *  ┌──────────────────────────────────────────────────────────┐
 *  │ Timer starts when ALL conditions are met:                │
 *  │ • isPlaying = true                                       │
 *  │ • isScrubbing = false                                    │
 *  │ • showControls = false (not forced)                      │
 *  │ • controlsVisible = true (currently showing)             │
 *  │                                                          │
 *  │ Timer fires after {autoHideDelayMs}ms → hides controls   │
 *  │                                                          │
 *  │ Timer stops when ANY condition changes:                  │
 *  │ • isPlaying → false (paused)                             │
 *  │ • isScrubbing → true (user dragging)                     │
 *  │ • showControls → true (forced visible)                   │
 *  │ • controlsVisible → false (manually hidden)              │
 *  │ • showControlsAndResetTimer() called                     │
 *  └──────────────────────────────────────────────────────────┘
 * ```
 *
 * ## Auto-hide Timer Behavior:
 *
 * **Timer starts when:**
 * - Video is playing (isPlaying = true)
 * - User is not scrubbing (isScrubbing = false)
 * - Controls are not forced visible (showControls = false)
 * - Controls are currently visible (controlsVisible = true)
 *
 * **Timer stops when:**
 * - Video is paused (isPlaying = false)
 * - User starts scrubbing (isScrubbing = true)
 * - Controls are forced visible (showControls = true)
 * - Controls are hidden (controlsVisible = false)
 *
 * ## Tap-to-Toggle Behavior:
 *
 * **When controls are hidden (initial state):**
 * - Tap shows controls and enables normal behavior
 * - Auto-hide timer starts (if playing)
 *
 * **When controls are visible:**
 * - Tap hides controls
 * - Auto-hide timer is cleared
 *
 * ## Effect Dependencies & Execution Order:
 *
 * ```
 * 1. Initial Mount
 *    └─ controlsVisible = false (always hidden)
 *       └─ If showControls=true, show immediately (external override)
 *    ↓
 * 2. Sync with showControls prop (external control)
 *    ↓
 * 3. Reset auto-hide timer (based on all conditions)
 *    ↓
 * 4. Setup cleanup on unmount
 * ```
 *
 * ## Usage Example:
 *
 * ```tsx
 * const VideoControls = ({ isPlaying, showControls, ... }) => {
 *   const normalProgressBar = useProgressBarGesture({ ... })
 *   const persistentProgressBar = useProgressBarGesture({ ... })
 *
 *   const isScrubbing = normalProgressBar.isScrubbing || persistentProgressBar.isScrubbing
 *
 *   const visibility = useControlsVisibility({
 *     showControls,
 *     isPlaying,
 *     isScrubbing,
 *     onControlsVisibilityChange: (visible) => console.log('Controls:', visible),
 *   })
 *
 *   return (
 *     <Pressable onPress={visibility.handlePress}>
 *       <YStack opacity={visibility.controlsVisible ? 1 : 0}>
 *         {/* Controls content *\/}
 *       </YStack>
 *     </Pressable>
 *   )
 * }
 * ```
 *
 * @param config - Configuration object for controls visibility
 * @returns Object containing visibility state and control functions
 *
 * @see {@link UseControlsVisibilityConfig}
 * @see {@link UseControlsVisibilityReturn}
 */
export function useControlsVisibility(
  config: UseControlsVisibilityConfig
): UseControlsVisibilityReturn {
  const {
    showControls,
    isPlaying,
    isScrubbing,
    autoHideDelayMs = 2000,
    onControlsVisibilityChange,
  } = config

  // State
  const [controlsVisible, setControlsVisible] = useState(false)
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [resetTrigger, setResetTrigger] = useState(0)

  // Performance tracking refs for auto-hide timer
  const timerStartTimeRef = useRef<number | null>(null)
  const timerMarkRef = useRef<string | null>(null)

  // Auto-hide timer reset logic
  // Memoized with all dependencies to ensure it updates when conditions change
  const resetAutoHideTimer = useCallback(() => {
    // Clear existing timer
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current)
      hideTimeoutRef.current = null
      // Clear performance tracking when timer is cleared
      timerStartTimeRef.current = null
      timerMarkRef.current = null
    }

    // Only start timer if:
    // 1. Video is playing
    // 2. User is not scrubbing
    // 3. Controls are currently visible
    // Note: Timer should start when controls are visible and playing, regardless of showControls
    // showControls only affects forced visibility, timer manages auto-hide
    const shouldStartTimer = isPlaying && !isScrubbing && controlsVisible

    log.debug('useControlsVisibility', 'resetAutoHideTimer called', {
      isPlaying,
      isScrubbing,
      showControls,
      controlsVisible,
      shouldStartTimer,
      autoHideDelayMs,
    })

    if (shouldStartTimer) {
      // Clear existing timer if present
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current)
        hideTimeoutRef.current = null
      }

      // Start performance tracking for auto-hide timer
      const markName = `auto-hide-timer-start-${Date.now()}`

      if (performanceAvailable) {
        try {
          const perf = (global as any).performance
          perf.mark(markName)
          timerMarkRef.current = markName
          timerStartTimeRef.current = perf.now()
        } catch (error) {
          log.warn('useControlsVisibility', 'Failed to create performance mark for timer', {
            error: error instanceof Error ? error.message : String(error),
          })
        }
      } else {
        // Fallback to Date.now() if Performance API is not available
        timerStartTimeRef.current = Date.now()
      }

      hideTimeoutRef.current = setTimeout(() => {
        // Measure timer accuracy
        if (timerStartTimeRef.current !== null) {
          if (performanceAvailable && timerMarkRef.current) {
            try {
              const perf = (global as any).performance
              const endTime = perf.now()
              const actualDuration = endTime - timerStartTimeRef.current
              log.debug('useControlsVisibility', '📊 [PERFORMANCE] Auto-hide timer completed', {
                expectedDelay: autoHideDelayMs,
                actualDuration: Math.round(actualDuration),
                difference: Math.round(actualDuration - autoHideDelayMs),
                accuracy: Math.round(
                  (1 - Math.abs(actualDuration - autoHideDelayMs) / autoHideDelayMs) * 100
                ),
              })
            } catch (error) {
              log.warn('useControlsVisibility', 'Failed to measure timer performance', {
                error: error instanceof Error ? error.message : String(error),
              })
              // Fall through to fallback timing
              const actualDuration = Date.now() - timerStartTimeRef.current
              log.debug(
                'useControlsVisibility',
                '📊 [PERFORMANCE] Auto-hide timer completed (fallback timing)',
                {
                  expectedDelay: autoHideDelayMs,
                  actualDuration,
                  difference: actualDuration - autoHideDelayMs,
                }
              )
            }
          } else {
            // Fallback timing measurement
            const actualDuration = Date.now() - timerStartTimeRef.current
            log.debug(
              'useControlsVisibility',
              '📊 [PERFORMANCE] Auto-hide timer completed (fallback timing)',
              {
                expectedDelay: autoHideDelayMs,
                actualDuration,
                difference: actualDuration - autoHideDelayMs,
              }
            )
          }
        }
        timerStartTimeRef.current = null
        timerMarkRef.current = null

        log.debug('useControlsVisibility', 'Auto-hide timer fired - hiding controls')
        setControlsVisible(false)
        // Wrap callback in try-catch to prevent errors from breaking timer
        try {
          onControlsVisibilityChange?.(false, false) // false = automatic, not user interaction
        } catch (error) {
          log.error('useControlsVisibility', 'Error in onControlsVisibilityChange callback', {
            error,
            context: 'auto-hide-timer',
          })
        }
      }, autoHideDelayMs)
    } else {
      // Timer not starting - clear performance tracking if it exists
      timerStartTimeRef.current = null
      timerMarkRef.current = null
    }
  }, [isPlaying, isScrubbing, controlsVisible, autoHideDelayMs, onControlsVisibilityChange])

  // Show controls and reset timer
  const showControlsAndResetTimer = useCallback(() => {
    log.debug('useControlsVisibility', 'showControlsAndResetTimer called')
    setControlsVisible(true)
    // Wrap callback in try-catch to prevent errors from breaking visibility state
    try {
      onControlsVisibilityChange?.(true, true) // true = user interaction
    } catch (error) {
      log.error('useControlsVisibility', 'Error in onControlsVisibilityChange callback', {
        error,
        context: 'showControlsAndResetTimer',
      })
    }
    // Trigger the reset effect by incrementing the trigger counter
    setResetTrigger((prev) => prev + 1)
  }, [onControlsVisibilityChange])

  // Track if this is the initial mount
  const isInitialMount = useRef(true)
  // Track if user has manually interacted via handlePress (tap-to-toggle)
  const userHasManuallyInteractedRef = useRef(false)

  // Sync with external showControls prop
  useEffect(() => {
    // Check if this is initial mount BEFORE updating the ref
    const isInitial = isInitialMount.current

    // On initial mount, notify parent of initial state (controls start hidden)
    if (isInitial) {
      isInitialMount.current = false // Mark that we've completed initial mount
      if (showControls) {
        // Only if forced visible by prop
        setControlsVisible(true)
        try {
          onControlsVisibilityChange?.(true)
        } catch (error) {
          log.error('useControlsVisibility', 'Error in onControlsVisibilityChange callback', {
            error,
            context: 'initial-mount-showControls-true',
          })
        }
      } else {
        // Notify parent that controls start hidden
        try {
          onControlsVisibilityChange?.(false, false) // Initial state, not user interaction
        } catch (error) {
          log.error('useControlsVisibility', 'Error in onControlsVisibilityChange callback', {
            error,
            context: 'initial-mount-showControls-false',
          })
        }
      }
      return // Skip the rest of the logic on initial mount
    }

    // After initial mount, only sync showControls if:
    // 1. User hasn't manually interacted yet, OR
    // 2. showControls is being forced to false (external reset)
    if (!userHasManuallyInteractedRef.current || !showControls) {
      if (showControls) {
        // Force controls visible when showControls is true
        setControlsVisible(true)
        try {
          onControlsVisibilityChange?.(true, false) // false = automatic, not user interaction
        } catch (error) {
          log.error('useControlsVisibility', 'Error in onControlsVisibilityChange callback', {
            error,
            context: 'sync-showControls-prop',
          })
        }
      }
    }
    // When showControls is false and user has interacted, keep current visibility
    // and let the timer effect or handlePress manage hide
  }, [showControls, onControlsVisibilityChange])

  // Tap-to-toggle handler
  const handlePress = useCallback(() => {
    // Mark that user has manually interacted
    userHasManuallyInteractedRef.current = true

    setControlsVisible((prev) => {
      const newValue = !prev
      log.debug('useControlsVisibility', 'handlePress - toggling controls', {
        previousValue: prev,
        newValue,
        isPlaying,
      })
      // Wrap callback in try-catch to prevent errors from breaking toggle
      try {
        onControlsVisibilityChange?.(newValue, true) // true = user interaction
      } catch (error) {
        log.error('useControlsVisibility', 'Error in onControlsVisibilityChange callback', {
          error,
          context: 'handlePress-toggle',
        })
      }

      // If showing controls while video is playing, trigger timer reset
      // If hiding controls, clear the timer
      if (newValue && isPlaying) {
        // Video is playing and user tapped to show controls
        // Trigger timer to start via resetTrigger
        setResetTrigger((prev) => prev + 1)
      } else if (!newValue && hideTimeoutRef.current) {
        // Hiding controls - clear timer
        clearTimeout(hideTimeoutRef.current)
        hideTimeoutRef.current = null
      }

      return newValue
    })
  }, [isPlaying, onControlsVisibilityChange])

  // Reset timer when dependencies change or when explicitly triggered
  // Include showControls to reset timer when visibility control changes
  useEffect(() => {
    resetAutoHideTimer()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, isScrubbing, controlsVisible, showControls, autoHideDelayMs, resetTrigger])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current)
        hideTimeoutRef.current = null
      }
      // Clear performance tracking on unmount
      timerStartTimeRef.current = null
      timerMarkRef.current = null
    }
  }, [])

  return {
    controlsVisible,
    handlePress,
    showControlsAndResetTimer,
    resetAutoHideTimer,
  }
}
