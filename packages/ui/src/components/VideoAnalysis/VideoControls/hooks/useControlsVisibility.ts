import { log } from '@my/logging'
import { useCallback, useEffect, useRef, useState } from 'react'

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
  onControlsVisibilityChange?: (visible: boolean) => void
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
    autoHideDelayMs = 1000,
    onControlsVisibilityChange,
  } = config

  // State
  const [controlsVisible, setControlsVisible] = useState(false)
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [resetTrigger, setResetTrigger] = useState(0)

  // Store callback in ref to avoid recreating resetAutoHideTimer when callback changes
  const onControlsVisibilityChangeRef = useRef(onControlsVisibilityChange)
  onControlsVisibilityChangeRef.current = onControlsVisibilityChange

  // Auto-hide timer reset logic
  // Memoized with all dependencies to ensure it updates when conditions change
  const resetAutoHideTimer = useCallback(() => {
    // Clear existing timer
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current)
      hideTimeoutRef.current = null
    }

    // Only start timer if:
    // 1. Video is playing
    // 2. User is not scrubbing
    // 3. Controls are currently visible
    // Note: showControls can be true or false - timer should start in both cases when playing
    // showControls true = user tapped to show controls (should auto-hide)
    // showControls false = external API showing controls (should auto-hide)
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
      hideTimeoutRef.current = setTimeout(() => {
        log.debug('useControlsVisibility', 'Auto-hide timer fired - hiding controls')
        setControlsVisible(false)
        onControlsVisibilityChangeRef.current?.(false)
      }, autoHideDelayMs)
    }
  }, [isPlaying, isScrubbing, controlsVisible, autoHideDelayMs])

  // Show controls and reset timer
  const showControlsAndResetTimer = useCallback(() => {
    log.debug('useControlsVisibility', 'showControlsAndResetTimer called')
    setControlsVisible(true)
    onControlsVisibilityChangeRef.current?.(true)
    // Trigger the reset effect by incrementing the trigger counter
    setResetTrigger((prev) => prev + 1)
  }, [])

  // Tap-to-toggle handler
  const handlePress = useCallback(() => {
    setControlsVisible((prev) => {
      const newValue = !prev
      log.debug('useControlsVisibility', 'handlePress - toggling controls', {
        previousValue: prev,
        newValue,
        isPlaying,
      })
      onControlsVisibilityChangeRef.current?.(newValue)

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
  }, [isPlaying])

  // Track if this is the initial mount
  const isInitialMount = useRef(true)

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
        onControlsVisibilityChangeRef.current?.(true)
      } else {
        // Notify parent that controls start hidden
        onControlsVisibilityChangeRef.current?.(false)
      }
      return // Skip the rest of the logic on initial mount
    }

    if (showControls) {
      // Force controls visible when showControls is true
      setControlsVisible(true)
      onControlsVisibilityChangeRef.current?.(true)
    }
    // When showControls is false, keep current visibility
    // and let the timer effect or handlePress manage hide
  }, [showControls])

  // Reset timer when dependencies change or when explicitly triggered
  useEffect(() => {
    resetAutoHideTimer()
  }, [resetAutoHideTimer, resetTrigger])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current)
        hideTimeoutRef.current = null
      }
    }
  }, [])

  return {
    controlsVisible,
    handlePress,
    showControlsAndResetTimer,
    resetAutoHideTimer,
  }
}
