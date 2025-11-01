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

  // Track controlsVisible in ref for stable access in callback
  const controlsVisibleRef = useRef(controlsVisible)

  // Sync ref with state
  useEffect(() => {
    controlsVisibleRef.current = controlsVisible
  }, [controlsVisible])

  // Performance tracking refs for auto-hide timer
  const timerStartTimeRef = useRef<number | null>(null)
  const timerMarkRef = useRef<string | null>(null)

  const pendingCallbackRef = useRef<{
    visible: boolean
    isUserInteraction: boolean
    context: string
  } | null>(null)

  const updateVisibility = useCallback(
    (visible: boolean, isUserInteraction: boolean, context: string) => {
      let didChange = false

      setControlsVisible((prev) => {
        if (prev === visible) {
          return prev
        }

        didChange = true
        controlsVisibleRef.current = visible

        log.debug('useControlsVisibility', `${context} - controls visibility changed`, {
          previousValue: prev,
          newValue: visible,
          isUserInteraction,
        })

        pendingCallbackRef.current = {
          visible,
          isUserInteraction,
          context,
        }

        return visible
      })

      if (!didChange) {
        return false
      }

      return true
    },
    []
  )

  // Auto-hide timer reset logic
  // Memoized without controlsVisible dependency to prevent recreation on every visibility change
  // The effect that calls this already has controlsVisible in its deps, so it will re-run when needed
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
    // 3. Controls are currently visible (read from ref to avoid dependency cycle)
    // Note: Timer should start when controls are visible and playing, regardless of showControls
    // showControls only affects forced visibility, timer manages auto-hide
    const shouldStartTimer = isPlaying && !isScrubbing && controlsVisibleRef.current

    log.debug('useControlsVisibility', 'resetAutoHideTimer called', {
      isPlaying,
      isScrubbing,
      showControls,
      controlsVisible: controlsVisibleRef.current,
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
        updateVisibility(false, false, 'auto-hide-timer')
        hideTimeoutRef.current = null
      }, autoHideDelayMs)
    } else {
      // Timer not starting - clear performance tracking if it exists
      timerStartTimeRef.current = null
      timerMarkRef.current = null
    }
  }, [isPlaying, isScrubbing, showControls, autoHideDelayMs, updateVisibility])

  // Show controls and reset timer
  const showControlsAndResetTimer = useCallback(() => {
    // Dedupe rapid calls (within 50ms) - prevents duplicate calls when both normal and persistent
    // progress bar gesture handlers fire simultaneously (e.g., when bars overlap or simultaneousGesture triggers both)
    const now = Date.now()
    const lastCall = lastShowControlsCallRef.current ?? 0
    if (now - lastCall < 50) {
      log.debug('useControlsVisibility', 'showControlsAndResetTimer - deduped rapid call', {
        timeSinceLastCall: now - lastCall,
      })
      return
    }
    lastShowControlsCallRef.current = now

    log.debug('useControlsVisibility', 'showControlsAndResetTimer called')
    const changed = updateVisibility(true, true, 'showControlsAndResetTimer')
    // Trigger the reset effect by incrementing the trigger counter regardless of visibility change
    // This allows users to reset the auto-hide timer while controls remain visible
    setResetTrigger((prev) => prev + 1)

    if (!changed) {
      log.debug(
        'useControlsVisibility',
        'showControlsAndResetTimer - visibility unchanged, timer reset only'
      )
    }
  }, [updateVisibility])

  // Track if this is the initial mount
  const isInitialMount = useRef(true)
  // Track if user has manually interacted via handlePress (tap-to-toggle)
  const userHasManuallyInteractedRef = useRef(false)
  // Track last call timestamp to dedupe rapid calls from multiple gesture handlers
  const lastShowControlsCallRef = useRef<number>(0)

  // Sync with external showControls prop
  useEffect(() => {
    // Check if this is initial mount BEFORE updating the ref
    const isInitial = isInitialMount.current

    // On initial mount, notify parent of initial state (controls start hidden)
    if (isInitial) {
      isInitialMount.current = false // Mark that we've completed initial mount
      if (showControls) {
        // Only if forced visible by prop
        updateVisibility(true, false, 'initial-mount-showControls-true')
      } else {
        // Notify parent that controls start hidden (maintain previous behavior)
        try {
          onControlsVisibilityChange?.(false, false)
        } catch (error) {
          log.error('useControlsVisibility', 'Error in onControlsVisibilityChange callback', {
            error,
            context: 'initial-mount-showControls-false',
          })
        }
      }
      return // Skip the rest of the logic on initial mount
    }

    // After initial mount, sync showControls prop:
    // 1. Always force visible when showControls is true (e.g., video ended, processing)
    //    This handles cases like video end where controls must be shown even if user has interacted
    // 2. When showControls is false, do NOT force hide - only removes "forced visible" state
    //    Let timer/handlePress manage visibility when showControls is false
    if (showControls) {
      // Always force controls visible when showControls is true (regardless of interaction state)
      if (controlsVisibleRef.current !== true) {
        updateVisibility(true, false, 'sync-showControls-prop-true')
      }
    }
    // When showControls is false, we don't force hide - controls remain at current visibility
    // This allows timer or handlePress to manage hide behavior
  }, [showControls, updateVisibility, onControlsVisibilityChange])

  // Tap-to-toggle handler
  const handlePress = useCallback(() => {
    // Mark that user has manually interacted
    userHasManuallyInteractedRef.current = true

    const nextVisible = !controlsVisibleRef.current
    const changed = updateVisibility(nextVisible, true, 'handlePress')

    if (!changed) {
      return
    }

    // If showing controls while video is playing, trigger timer reset
    // If hiding controls, clear the timer
    if (nextVisible && isPlaying) {
      // Video is playing and user tapped to show controls
      setResetTrigger((prev) => prev + 1)
    } else if (!nextVisible && hideTimeoutRef.current) {
      // Hiding controls - clear timer
      clearTimeout(hideTimeoutRef.current)
      hideTimeoutRef.current = null
    }
  }, [isPlaying, updateVisibility])

  // Reset timer when dependencies change or when explicitly triggered
  // Include showControls to reset timer when visibility control changes
  useEffect(() => {
    resetAutoHideTimer()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, isScrubbing, controlsVisible, showControls, autoHideDelayMs, resetTrigger])

  // Process pending callback after state updates complete (avoids triggering during render)
  useEffect(() => {
    if (!pendingCallbackRef.current) {
      return
    }

    const { visible, isUserInteraction, context } = pendingCallbackRef.current
    pendingCallbackRef.current = null

    try {
      onControlsVisibilityChange?.(visible, isUserInteraction)
    } catch (error) {
      log.error('useControlsVisibility', 'Error in onControlsVisibilityChange callback', {
        error,
        context,
      })
    }
  }, [controlsVisible, onControlsVisibilityChange])

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
