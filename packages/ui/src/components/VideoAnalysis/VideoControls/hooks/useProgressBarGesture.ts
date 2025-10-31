import { log } from '@my/logging'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Gesture } from 'react-native-gesture-handler'
import {
  SharedValue,
  cancelAnimation,
  runOnJS,
  useAnimatedReaction,
  useSharedValue,
} from 'react-native-reanimated'

/**
 * Hook managing progress bar gesture interactions (tap & drag) for both normal and persistent bars.
 *
 * **Gesture Flow Diagram:**
 *
 * ```
 *   Touch Event
 *       ↓
 *   onBegin → Store initial position in lastScrubbedPositionShared
 *       ↓
 *   onStart → Log touch details
 *       ↓
 *   onUpdate → Detect drag threshold (3px)
 *       ├─ BELOW 3px → Treated as tap (not in scrubbing mode yet)
 *       └─ ABOVE 3px → Enter scrubbing mode
 *           ├─ Track position updates in real-time
 *           ├─ Show controls + reset timer
 *           └─ Update scrubbing state
 *       ↓
 *   onEnd → Exit gesture
 *       ├─ If was scrubbing: Seek to final position
 *       ├─ Clear scrubbing state
 *       └─ Set lastScrubbedPosition for snapback prevention
 *       ↓
 *   onFinalize → Cleanup on cancellation or force end
 * ```
 *
 * **State Machine:**
 *
 * ```
 *   ┌──────┐
 *   │ Idle │ (isScrubbing = false, scrubbingPosition = null)
 *   └──┬───┘
 *      │ onUpdate with translationX/Y > 3px
 *      ↓
 *   ┌──────────────┐
 *   │  Scrubbing   │ (isScrubbing = true, scrubbingPosition = current%)
 *   └──┬───────────┘
 *      │ onEnd or onFinalize
 *      ↓
 *   ┌─────────────────────────────┐
 *   │ Snapback Prevention Window  │ (lastScrubbedPosition held)
 *   │ (until video catches up)     │
 *   └──┬────────────────────────────┘
 *      │ currentTime within 1% tolerance
 *      ↓
 *   ┌──────┐
 *   │ Idle │ (ready for next gesture)
 *   └──────┘
 * ```
 *
 * **Snapback Prevention:**
 * After a scrub gesture ends, `lastScrubbedPosition` is held (not cleared to null) until
 * the actual video playback catches up to within 1% tolerance. This prevents the progress
 * bar from "snapping back" if there's a delay between user intent and video position update.
 *
 * **Dual Progress Bars (Normal vs Persistent):**
 * - `barType` parameter determines which progress bar this hook manages
 * - Normal bar: Only visible when controls are shown; can be tapped/dragged for seeking
 * - Persistent bar: Always visible; alternative scrubbing surface
 * - Both bars use identical gesture logic but maintain independent state
 *
 * @param config - Hook configuration object
 * @param config.barType - Which progress bar variant: 'normal' or 'persistent'
 * @param config.duration - Total video duration in seconds
 * @param config.currentTime - Current video playback time in seconds (for snapback prevention)
 * @param config.progressBarWidthShared - Reanimated shared value of progress bar width in pixels
 * @param config.onSeek - Callback invoked when user seeks (receives time in seconds)
 * @param config.showControlsAndResetTimer - Callback to show controls and reset auto-hide timer
 *
 * @returns Object containing gesture state, handlers, and utilities
 * @returns .isScrubbing - Whether user is currently scrubbing (dragging) the progress bar
 * @returns .scrubbingPosition - Current drag position as percentage (0-100), or null if idle
 * @returns .lastScrubbedPosition - Last scrubbed position before user released, held for snapback prevention
 * @returns .combinedGesture - Gesture handler for tap + drag (immediate seek on tap, continuous scrub on drag)
 * @returns .mainGesture - Gesture handler for drag only (scrubbing surface)
 * @returns .calculateProgress - Utility to calculate progress percentage from time values
 * @returns .progressBarWidth - Current width of progress bar in pixels
 * @returns .setProgressBarWidth - Function to update progress bar width
 *
 * @example
 * ```typescript
 * // Extract gesture logic for normal progress bar
 * const normal = useProgressBarGesture({
 *   barType: 'normal',
 *   duration: 120,
 *   currentTime: 45,
 *   progressBarWidthShared: progressBarWidth,
 *   onSeek: (time) => videoRef.current?.seek(time),
 *   showControlsAndResetTimer: handleShowControls,
 * })
 *
 * // Use in GestureDetector with combinedGesture
 * // <GestureDetector gesture={normal.combinedGesture}>
 * //   <Animated.View style={[normalBarAnimatedStyle]}>
 * //     Progress bar content
 * //   </Animated.View>
 * // </GestureDetector>
 *
 * // Track scrubbing state for UI feedback
 * if (normal.isScrubbing) {
 *   // Show scrubbing indicator
 * }
 * ```
 *
 * @see {@link https://react-native-gesture-handler.com/docs/fundamentals/states} Gesture states
 * @see {@link https://docs.swmansion.com/react-native-reanimated/} Reanimated documentation
 */
export interface UseProgressBarGestureConfig {
  barType: 'normal' | 'persistent'
  duration: number
  currentTime: number
  progressBarWidthShared: SharedValue<number>
  onSeek: (time: number) => void
  showControlsAndResetTimer: () => void
}

export interface UseProgressBarGestureReturn {
  // State
  isScrubbing: boolean
  scrubbingPosition: number | null
  lastScrubbedPosition: number | null

  // Gestures
  combinedGesture: ReturnType<typeof Gesture.Pan>
  mainGesture: ReturnType<typeof Gesture.Pan>

  // Helpers
  calculateProgress: (currentTime: number, duration: number) => number
  progressBarWidth: number
  setProgressBarWidth: (width: number) => void
}

export function useProgressBarGesture(
  config: UseProgressBarGestureConfig
): UseProgressBarGestureReturn {
  const {
    barType,
    duration,
    currentTime,
    progressBarWidthShared,
    onSeek,
    showControlsAndResetTimer,
  } = config

  // State management - consolidated from original component
  const [isScrubbing, setIsScrubbing] = useState(false)
  const [scrubbingPosition, setScrubbingPosition] = useState<number | null>(null)
  const [lastScrubbedPosition, setLastScrubbedPosition] = useState<number | null>(null)
  const [progressBarWidth, setProgressBarWidth] = useState(300) // default width

  // Shared values for worklet access
  // Use shared values instead of refs to avoid Reanimated warnings about modifying
  // objects that have been passed to worklets
  const lastScrubbedPositionShared = useSharedValue<number>(0)
  const isScrubbingShared = useSharedValue<boolean>(isScrubbing)

  // Keep shared value in sync with state
  // This ensures gesture handlers always have access to current scrubbing state
  // without needing to recreate the entire gesture handler
  useEffect(() => {
    isScrubbingShared.value = isScrubbing
  }, [isScrubbing, isScrubbingShared])

  // Create listeners for shared values to prevent "no listeners" warnings
  // These shared values are updated in gesture handlers but need observers
  useAnimatedReaction(
    () => isScrubbingShared.value,
    () => {
      // Dummy listener - just observes the value to register it
      // This prevents the "onAnimatedValueUpdate with no listeners" warning
    }
  )
  useAnimatedReaction(
    () => lastScrubbedPositionShared.value,
    () => {
      // Dummy listener - just observes the value to register it
      // This prevents the "onAnimatedValueUpdate with no listeners" warning
    }
  )

  // Cleanup shared values on unmount to prevent memory corruption
  useEffect(() => {
    return () => {
      // Cancel any pending animations on the shared value
      // This prevents worklets from accessing freed memory if component unmounts
      cancelAnimation(lastScrubbedPositionShared)
      cancelAnimation(isScrubbingShared)
    }
  }, [lastScrubbedPositionShared, isScrubbingShared])

  // Snapback prevention: Clear lastScrubbedPosition when video catches up to the scrubbed position
  useEffect(() => {
    if (lastScrubbedPosition !== null && duration > 0) {
      const currentProgress = (currentTime / duration) * 100
      const tolerance = 1 // 1% tolerance
      if (Math.abs(currentProgress - lastScrubbedPosition) < tolerance) {
        setLastScrubbedPosition(null)
      }
    }
  }, [currentTime, duration, lastScrubbedPosition])

  // Sync progress bar width to shared value for worklet access
  useEffect(() => {
    progressBarWidthShared.value = progressBarWidth
  }, [progressBarWidth, progressBarWidthShared])

  // Progress calculation helper
  const calculateProgress = useCallback((currentTime: number, duration: number): number => {
    if (duration <= 0) return 0
    return Math.min(100, Math.max(0, (currentTime / duration) * 100))
  }, [])

  // Combined gesture handler (tap + drag) - minimal implementation for GREEN phase
  const combinedGesture = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(0) // Allow immediate activation (for taps)
        .maxPointers(1) // Single finger only for reliability
        .activateAfterLongPress(0) // Immediate activation
        .onBegin((event) => {
          // Early activation - more reliable than onStart
          const seekPercentage =
            progressBarWidthShared.value > 0
              ? Math.max(0, Math.min(100, (event.x / progressBarWidthShared.value) * 100))
              : 0

          lastScrubbedPositionShared.value = seekPercentage
          runOnJS(log.debug)('VideoControls', `${barType} progress bar touch begin`, {
            eventX: event.x,
            eventY: event.y,
            progressBarWidth: progressBarWidthShared.value,
            seekPercentage,
            duration,
          })
        })
        .onStart((event) => {
          // Calculate seek percentage from touch position
          const seekPercentage =
            progressBarWidthShared.value > 0
              ? Math.max(0, Math.min(100, (event.x / progressBarWidthShared.value) * 100))
              : 0

          // Store position for potential drag
          lastScrubbedPositionShared.value = seekPercentage
          runOnJS(log.debug)('VideoControls', `${barType} progress bar touch start`, {
            eventX: event.x,
            progressBarWidth: progressBarWidthShared.value,
            seekPercentage,
            duration,
          })

          // For immediate taps (no dragging), seek right away
          if (duration > 0 && seekPercentage >= 0) {
            const seekTime = (seekPercentage / 100) * duration
            runOnJS(log.debug)('VideoControls', `${barType} immediate seek`, {
              seekPercentage,
              seekTime,
              duration,
            })
            runOnJS(onSeek)(seekTime)
          }
        })
        .onUpdate((event) => {
          // Lower threshold for drag detection - more responsive
          const dragThreshold = 3
          if (
            Math.abs(event.translationX) > dragThreshold ||
            Math.abs(event.translationY) > dragThreshold
          ) {
            runOnJS(setIsScrubbing)(true)
            runOnJS(showControlsAndResetTimer)()

            const seekPercentage =
              progressBarWidthShared.value > 0
                ? Math.max(0, Math.min(100, (event.x / progressBarWidthShared.value) * 100))
                : 0

            runOnJS(setScrubbingPosition)(seekPercentage)
            lastScrubbedPositionShared.value = seekPercentage
            runOnJS(log.debug)('VideoControls', `${barType} progress bar drag`, {
              eventX: event.x,
              translationX: event.translationX,
              progressBarWidth: progressBarWidthShared.value,
              seekPercentage,
            })
          }
        })
        .onEnd(() => {
          // Only seek again if we were in scrubbing mode (dragging)
          // Use shared value instead of state to avoid capturing stale closure
          const wasScrubbing = isScrubbingShared.value
          runOnJS(setIsScrubbing)(false)

          if (wasScrubbing) {
            const currentPosition = lastScrubbedPositionShared.value
            runOnJS(setLastScrubbedPosition)(currentPosition)
            runOnJS(setScrubbingPosition)(null)

            if (duration > 0 && currentPosition >= 0) {
              const seekTime = (currentPosition / 100) * duration
              runOnJS(log.debug)('VideoControls', `${barType} drag end seek`, {
                seekPercentage: currentPosition,
                seekTime,
                duration,
              })
              runOnJS(onSeek)(seekTime)
            }
          }
        })
        .onFinalize(() => {
          // Ensure cleanup on gesture cancellation
          runOnJS(setIsScrubbing)(false)
          runOnJS(setScrubbingPosition)(null)
        })
        .simultaneousWithExternalGesture(),
    [barType, duration, onSeek, showControlsAndResetTimer, progressBarWidthShared]
    // Note: isScrubbing removed from deps - we use isScrubbingShared instead
    // This prevents gesture handler recreation on every scrubbing state toggle
  )

  // Main gesture handler (drag only) - minimal implementation for GREEN phase
  const mainGesture = useMemo(
    () =>
      Gesture.Pan()
        .maxPointers(1) // Single finger only for reliability
        .activateAfterLongPress(0) // Immediate activation
        .onBegin((event) => {
          // Early activation - more reliable
          runOnJS(setIsScrubbing)(true)
          runOnJS(showControlsAndResetTimer)()

          const seekPercentage =
            progressBarWidthShared.value > 0
              ? Math.max(0, Math.min(100, (event.x / progressBarWidthShared.value) * 100))
              : 0

          lastScrubbedPositionShared.value = seekPercentage
          runOnJS(log.debug)('VideoControls', `${barType} main gesture begin`, {
            eventX: event.x,
            eventY: event.y,
            progressBarWidth: progressBarWidthShared.value,
            seekPercentage,
          })
        })
        .onStart((event) => {
          runOnJS(setIsScrubbing)(true)
          runOnJS(showControlsAndResetTimer)()

          const seekPercentage =
            progressBarWidthShared.value > 0
              ? Math.max(0, Math.min(100, (event.x / progressBarWidthShared.value) * 100))
              : 0
          runOnJS(setScrubbingPosition)(seekPercentage)
          lastScrubbedPositionShared.value = seekPercentage
        })
        .onUpdate((event) => {
          // More lenient horizontal gesture detection - reduced threshold
          const horizontalThreshold = 3
          if (
            Math.abs(event.translationY) > Math.abs(event.translationX) &&
            Math.abs(event.translationY) > horizontalThreshold
          ) {
            return
          }

          const seekPercentage =
            progressBarWidthShared.value > 0
              ? Math.max(0, Math.min(100, (event.x / progressBarWidthShared.value) * 100))
              : 0
          runOnJS(setScrubbingPosition)(seekPercentage)
          lastScrubbedPositionShared.value = seekPercentage
        })
        .onEnd(() => {
          // Seek ONLY on gesture end with the final scrubbed position
          const currentPosition = lastScrubbedPositionShared.value
          runOnJS(setIsScrubbing)(false)
          runOnJS(setLastScrubbedPosition)(currentPosition)
          runOnJS(setScrubbingPosition)(null)

          // SEEK ONLY ONCE AT END with final position - allow seeking to 0%
          if (duration > 0 && currentPosition >= 0) {
            const seekTime = (currentPosition / 100) * duration
            runOnJS(log.debug)('VideoControls', `${barType} main gesture end - seeking`, {
              seekPercentage: currentPosition,
              seekTime,
              duration,
            })
            runOnJS(onSeek)(seekTime)
          }
        })
        .onFinalize(() => {
          const currentPosition = lastScrubbedPositionShared.value
          runOnJS(setIsScrubbing)(false)
          runOnJS(setLastScrubbedPosition)(currentPosition)
          runOnJS(setScrubbingPosition)(null)
        })
        .simultaneousWithExternalGesture(),
    [barType, duration, onSeek, showControlsAndResetTimer, progressBarWidthShared]
  )

  return {
    // State
    isScrubbing,
    scrubbingPosition,
    lastScrubbedPosition,

    // Gestures
    combinedGesture,
    mainGesture,

    // Helpers
    calculateProgress,
    progressBarWidth,
    setProgressBarWidth,
  }
}
