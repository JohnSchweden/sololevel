//import { log } from '@my/logging'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Gesture } from 'react-native-gesture-handler'
import {
  SharedValue,
  cancelAnimation,
  runOnJS,
  runOnUI,
  useAnimatedReaction,
  useSharedValue,
} from 'react-native-reanimated'

/**
 * Throttle interval for live scrubbing seeks (milliseconds)
 * Target: ~10 seeks/sec = 100ms interval to avoid excessive video seeks during drag
 */
const SEEK_THROTTLE_MS = 100

/**
 * Threshold for detecting duplicate gesture handlers (milliseconds)
 * If onStart fires twice within this window, ignore the second one (likely from nested gesture)
 */
const DUPLICATE_GESTURE_THRESHOLD_MS = 50

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
 * ### UI-thread progress sync
 * When `progressSharedOverride` is supplied, the hook forwards scrubbing updates directly to the caller-provided
 * shared value instead of mutating its internal shared value. This keeps persistent progress bars perfectly aligned
 * with coordinator-driven highlights because Reanimated worklets can read the shared value on the UI thread without
 * waiting for React commits. The internal shared value remains available for cases where no override is supplied
 * (tests, storybook, legacy consumers).
 *
 * @param config - Hook configuration object
 * @param config.barType - Which progress bar variant: 'normal' or 'persistent'
 * @param config.duration - Total video duration in seconds
 * @param config.currentTime - Current video playback time in seconds (for snapback prevention)
 * @param config.progressBarWidthShared - Reanimated shared value of progress bar width in pixels
 * @param config.onSeek - Callback invoked when user seeks (receives time in seconds)
 * @param config.showControlsAndResetTimer - Combined callback to show controls and reset auto-hide timer
 *
 * @returns Object containing gesture state, handlers, and utilities
 * @returns .isScrubbing - Whether user is currently scrubbing (dragging) the progress bar
 * @returns .scrubbingPosition - Current drag position as percentage (0-100), or null if idle
 * @returns .lastScrubbedPosition - Last scrubbed position before user released, held for snapback prevention
 * @returns .combinedGesture - Gesture handler for tap + drag (handles entire 44px touch area, including handle)
 * @returns .mainGesture - DEPRECATED: No longer used in ProgressBar component (handle is visual only)
 * @returns .calculateProgress - Utility to calculate progress percentage from time values
 * @returns .progressBarWidth - Current width of progress bar in pixels
 * @returns .setProgressBarWidth - Function to update progress bar width
 *
 * ### Gesture Architecture (Single Handler)
 * **CRITICAL:** Only `combinedGesture` is used by ProgressBar component:
 * - `combinedGesture` wraps the entire 44px touch area (track + handle)
 * - Handle is visual ONLY (`pointerEvents="none"`) - no separate gesture handler
 * - `mainGesture` is still returned for backward compatibility but is not used
 * - This eliminates duplicate gesture handlers that caused duplicate seeks
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
  /** Optional: Shared scrubbing state across multiple progress bars to prevent simultaneous activation */
  globalScrubbingShared?: SharedValue<boolean>
  /** Optional: Horizontal inset (px) from gesture view's left to visual track's left */
  trackLeftInset?: number
  /**
   * When false, skips React-state scrubbing telemetry updates to avoid render spam.
   * Shared values continue to update for gesture worklets.
   */
  enableScrubbingTelemetry?: boolean
  /**
   * Optional external shared value (0-100) controlled by caller. When provided,
   * the hook writes scrubbing progress directly to this shared value instead of
   * its internal one, allowing UI-thread animations to stay in sync with playback.
   */
  progressSharedOverride?: SharedValue<number>
}

export interface UseProgressBarGestureReturn {
  // State
  isScrubbing: boolean
  scrubbingPosition: number | null
  lastScrubbedPosition: number | null
  progressShared: SharedValue<number>

  // Gestures
  combinedGesture: ReturnType<typeof Gesture.Pan>
  mainGesture: ReturnType<typeof Gesture.Pan>

  // Helpers
  calculateProgress: (currentTime: number, duration: number) => number
  progressBarWidth: number
  setProgressBarWidth: (width: number) => void
}

type SharedValueSetter<T> = (shared: SharedValue<T>, value: T) => void

function createSharedValueSetter<T>(): SharedValueSetter<T> {
  if (typeof runOnUI !== 'function') {
    return (shared: SharedValue<T>, value: T) => {
      shared.value = value
    }
  }

  const setter = runOnUI((shared: SharedValue<T>, value: T) => {
    'worklet'
    shared.value = value
  }) as SharedValueSetter<T>

  return (shared: SharedValue<T>, value: T) => {
    setter(shared, value)
  }
}

const setNumberSharedValueOnUI = createSharedValueSetter<number>()
const setBooleanSharedValueOnUI = createSharedValueSetter<boolean>()

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
    globalScrubbingShared,
    trackLeftInset = 0,
    enableScrubbingTelemetry = true,
    progressSharedOverride,
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
  const gestureStartPercentageShared = useSharedValue<number>(0)
  // Track if showControlsAndResetTimer was already called in onStart (tap-to-seek)
  // Prevents duplicate call in onUpdate when user just taps without dragging
  const controlsShownForThisGestureShared = useSharedValue<boolean>(false)
  const isScrubbingFlagRef = useRef(false)
  // Throttle seeks during drag to avoid excessive video seeks (target: ~10 seeks/sec = 100ms interval)
  const lastSeekTimestampShared = useSharedValue<number>(0)
  // CRITICAL: Track last onStart timestamp to prevent duplicate seeks from nested gestures
  // If onStart fires twice within DUPLICATE_GESTURE_THRESHOLD_MS, ignore the second one (likely from nested gesture handler)
  const lastOnStartTimestampShared = useSharedValue<number>(0)
  // Track last onBegin timestamp to prevent duplicate logs (optional - onBegin doesn't cause seeks, but reduces log noise)
  const lastOnBeginTimestampShared = useSharedValue<number>(0)
  // Track last scrubbed position to prevent redundant seeks when position hasn't changed
  // This prevents seeks when onUpdate fires but finger hasn't actually moved (>0.5% threshold)
  const lastScrubbedPositionForSeekShared = useSharedValue<number>(-1)

  // MEMORY LEAK FIX: Batched functions to reduce runOnJS closure allocations
  // Batch seek + show controls (common pattern: tap to seek)
  const batchSeekAndControls = useCallback(
    (seekTime: number) => {
      onSeek(seekTime)
      showControlsAndResetTimer()
    },
    [onSeek, showControlsAndResetTimer]
  )

  // Batch scrubbing start (isScrubbing + showControls)
  const batchScrubbingStart = useCallback(
    (updates: { isScrubbing?: boolean; showControls?: boolean }) => {
      if (updates.isScrubbing !== undefined) {
        setIsScrubbing(updates.isScrubbing)
      }
      if (updates.showControls) {
        showControlsAndResetTimer()
      }
    },
    [setIsScrubbing, showControlsAndResetTimer]
  )

  // Batch scrubbing end cleanup (multiple state updates)
  const batchScrubbingEnd = useCallback(
    (updates: {
      isScrubbing?: boolean
      lastPosition?: number
      currentPosition?: number | null
    }) => {
      if (updates.isScrubbing !== undefined) {
        setIsScrubbing(updates.isScrubbing)
      }
      if (updates.lastPosition !== undefined) {
        setLastScrubbedPosition(updates.lastPosition)
      }
      if (updates.currentPosition !== undefined) {
        setScrubbingPosition(updates.currentPosition)
      }
    },
    [setIsScrubbing, setLastScrubbedPosition, setScrubbingPosition]
  )

  // Keep shared value in sync with state
  // This ensures gesture handlers always have access to current scrubbing state
  // without needing to recreate the entire gesture handler
  useEffect(() => {
    if (enableScrubbingTelemetry) {
      setBooleanSharedValueOnUI(isScrubbingShared, isScrubbing)
      // Also update global scrubbing state if provided (for multi-bar coordination)
      if (globalScrubbingShared) {
        setBooleanSharedValueOnUI(globalScrubbingShared, isScrubbing)
      }
    }
  }, [enableScrubbingTelemetry, isScrubbing, isScrubbingShared, globalScrubbingShared])

  // OPTIMIZATION: Single consolidated reaction to observe all internal shared values
  // Prevents "onAnimatedValueUpdate with no listeners" warnings while minimizing overhead.
  // Consolidates 3 separate reactions into 1 worklet registration (3x reduction).
  // These values are updated in gesture handlers but need observers to avoid warnings.
  useAnimatedReaction(
    () => {
      'worklet'
      // Read all values to register them as observed (prevents warnings)
      // Values are intentionally unused - this is just for observation registration
      return {
        isScrubbing: isScrubbingShared.value,
        lastScrubbedPosition: lastScrubbedPositionShared.value,
        controlsShownForThisGesture: controlsShownForThisGestureShared.value,
      }
    },
    () => {
      // Listener intentionally empty - ensures values are observed by UI runtime
      // This single reaction replaces 3 separate ones, reducing initialization overhead
    }
  )

  // Cleanup shared values on unmount to prevent memory corruption
  useEffect(() => {
    return () => {
      // Cancel any pending animations on the shared value
      // This prevents worklets from accessing freed memory if component unmounts
      cancelAnimation(lastScrubbedPositionShared)
      cancelAnimation(isScrubbingShared)
      cancelAnimation(controlsShownForThisGestureShared)
    }
  }, [lastScrubbedPositionShared, isScrubbingShared, controlsShownForThisGestureShared])

  // Snapback prevention: Clear lastScrubbedPosition when video catches up to the scrubbed position
  useEffect(() => {
    if (!enableScrubbingTelemetry) {
      return
    }
    if (lastScrubbedPosition !== null && duration > 0) {
      const currentProgress = (currentTime / duration) * 100
      const tolerance = 1 // 1% tolerance
      if (Math.abs(currentProgress - lastScrubbedPosition) < tolerance) {
        setLastScrubbedPosition(null)
      }
    }
  }, [enableScrubbingTelemetry, currentTime, duration, lastScrubbedPosition])

  // Sync progress bar width to shared value for worklet access
  useEffect(() => {
    setNumberSharedValueOnUI(progressBarWidthShared, progressBarWidth)
  }, [progressBarWidth, progressBarWidthShared])

  // Progress calculation helper
  const calculateProgress = useCallback((currentTime: number, duration: number): number => {
    if (duration <= 0) return 0
    return Math.min(100, Math.max(0, (currentTime / duration) * 100))
  }, [])

  const internalProgressShared = useSharedValue(calculateProgress(currentTime, duration))
  const progressShared = progressSharedOverride ?? internalProgressShared

  useEffect(() => {
    if (isScrubbingFlagRef.current) {
      return
    }
    if (progressSharedOverride) {
      return
    }
    const nextProgress = calculateProgress(currentTime, duration)
    setNumberSharedValueOnUI(internalProgressShared, nextProgress)
  }, [calculateProgress, currentTime, duration, internalProgressShared, progressSharedOverride])

  // Tap + drag gesture builder shared by normal and persistent bars
  const buildTapDragGesture = useCallback(() => {
    return Gesture.Pan()
      .minDistance(0) // Allow immediate activation (for taps)
      .maxPointers(1) // Single finger only for reliability
      .activateAfterLongPress(0) // Immediate activation
      .onBegin((event) => {
        // SAFETY NET: Prevent duplicate onBegin events (defensive programming)
        // NOTE: Handle GestureDetector was removed, so nested gestures shouldn't fire anymore.
        // This guard remains as a safety net in case React Native Gesture Handler fires events twice
        // or if there are multiple component instances.
        const now = performance.now()
        const lastOnBeginTime = lastOnBeginTimestampShared.value
        const timeSinceLastOnBegin =
          lastOnBeginTime === 0 ? Number.POSITIVE_INFINITY : now - lastOnBeginTime

        if (timeSinceLastOnBegin < DUPLICATE_GESTURE_THRESHOLD_MS) {
          // Duplicate onBegin detected - skip processing
          // onBegin doesn't cause seeks, so this is just for log cleanliness
          return
        }

        // Update timestamp to prevent duplicate processing
        lastOnBeginTimestampShared.value = now

        // Early activation - more reliable than onStart
        const relativeX = Math.max(0, event.x - trackLeftInset)
        const seekPercentage =
          progressBarWidthShared.value > 0
            ? Math.max(0, Math.min(100, (relativeX / progressBarWidthShared.value) * 100))
            : 0

        lastScrubbedPositionShared.value = seekPercentage
        progressShared.value = seekPercentage
        // Reset gesture-level flag on each new gesture
        controlsShownForThisGestureShared.value = false
        // MEMORY LEAK FIX: Commented out runOnJS(log.debug) to prevent closure accumulation
        // runOnJS(log.debug)('VideoControls', `${barType} progress bar touch begin`, {
        //   eventX: event.x,
        //   trackLeftInset,
        //   relativeX,
        //   progressBarWidth: progressBarWidthShared.value,
        //   seekPercentage,
        //   duration,
        // })
      })
      .onStart((event) => {
        // SAFETY NET: Prevent duplicate seeks (defensive programming)
        // NOTE: Handle GestureDetector was removed, so nested gestures shouldn't fire anymore.
        // This guard remains as a safety net in case React Native Gesture Handler fires events twice
        // or if there are multiple component instances.
        // If onStart fires twice within 50ms, ignore the second one (likely duplicate gesture)
        const now = performance.now()
        const lastOnStartTime = lastOnStartTimestampShared.value
        const timeSinceLastOnStart =
          lastOnStartTime === 0 ? Number.POSITIVE_INFINITY : now - lastOnStartTime

        if (timeSinceLastOnStart < DUPLICATE_GESTURE_THRESHOLD_MS) {
          // Duplicate gesture detected - ignore this onStart call
          // MEMORY LEAK FIX: Commented out runOnJS(log.debug) to prevent closure accumulation
          // runOnJS(log.debug)(
          //   'VideoControls',
          //   `${barType} progress bar touch start - DUPLICATE IGNORED`,
          //   {
          //     eventX: event.x,
          //     timeSinceLastOnStart: Math.round(timeSinceLastOnStart * 100) / 100,
          //     threshold: DUPLICATE_GESTURE_THRESHOLD_MS,
          //   }
          // )
          return
        }

        // Update timestamp to prevent duplicate processing
        lastOnStartTimestampShared.value = now

        // Calculate seek percentage from touch position, accounting for track left inset
        const relativeX = Math.max(0, event.x - trackLeftInset)
        const correctedSeekPercentage =
          progressBarWidthShared.value > 0
            ? Math.max(0, Math.min(100, (relativeX / progressBarWidthShared.value) * 100))
            : 0

        // MEMORY LEAK FIX: Commented out runOnJS(log.debug) to prevent closure accumulation
        // DEBUG: Log corrected calculation to validate fix
        // runOnJS(log.debug)(
        //   'VideoControls',
        //   `${barType} progress bar touch start - CORRECTED CALCULATION`,
        //   {
        //     eventX: event.x,
        //     trackLeftInset,
        //     relativeX,
        //     progressBarWidth: progressBarWidthShared.value,
        //     correctedSeekPercentage,
        //     duration,
        //     expectedSeekTimeCorrected:
        //       duration > 0 ? (correctedSeekPercentage / 100) * duration : 0,
        //   }
        // )

        // Store position for potential drag
        lastScrubbedPositionShared.value = correctedSeekPercentage
        progressShared.value = correctedSeekPercentage
        // MEMORY LEAK FIX: Commented out runOnJS(log.debug) to prevent closure accumulation
        // runOnJS(log.debug)('VideoControls', `${barType} progress bar touch start`, {
        //   eventX: event.x,
        //   trackLeftInset,
        //   relativeX,
        //   progressBarWidth: progressBarWidthShared.value,
        //   seekPercentage: correctedSeekPercentage,
        //   duration,
        // })

        // For immediate taps (no dragging), seek right away
        if (duration > 0 && correctedSeekPercentage >= 0) {
          // Force seek to end if within 2% threshold (prevents off-by-frame issues)
          const seekTime =
            correctedSeekPercentage > 98 ? duration : (correctedSeekPercentage / 100) * duration
          // MEMORY LEAK FIX: Commented out runOnJS(log.debug) to prevent closure accumulation
          // runOnJS(log.debug)('VideoControls', `${barType} immediate seek`, {
          //   seekPercentage: correctedSeekPercentage,
          //   seekTime,
          //   duration,
          //   isEndSeek: correctedSeekPercentage > 98,
          // })
          // MEMORY LEAK FIX: Batched into single runOnJS call to reduce closure allocation
          controlsShownForThisGestureShared.value = true
          runOnJS(batchSeekAndControls)(seekTime)
        }
      })
      .onUpdate((event) => {
        // CRITICAL: Only trigger scrubbing on HORIZONTAL drag (left/right on progress bar)
        // Vertical movement (translationY) should NOT trigger scrubbing - user might be scrolling
        // Use higher threshold for horizontal movement to require intentional drag
        const horizontalDragThreshold = 5 // Require 5px horizontal movement
        const verticalMovementThreshold = 10 // Ignore if vertical movement > 10px (likely scrolling)

        const absTranslationX = Math.abs(event.translationX)
        const absTranslationY = Math.abs(event.translationY)
        const isHorizontalDrag = absTranslationX > horizontalDragThreshold
        const isVerticalScroll = absTranslationY > verticalMovementThreshold

        // Only activate scrubbing if:
        // 1. Horizontal drag is significant (>5px) AND
        // 2. Vertical movement is NOT dominant (not scrolling)
        if (!isHorizontalDrag || isVerticalScroll) {
          // Not a horizontal drag - ignore this update
          // This prevents accidental scrubbing from tiny finger movements or vertical scrolling
          return
        }

        // Check if ANY progress bar is already scrubbing (prevents simultaneous activation)
        const globalScrubbing = globalScrubbingShared?.value ?? false
        const wasScrubbing = isScrubbingShared.value

        // Only activate if this bar was already scrubbing OR no other bar is active
        if (!wasScrubbing && globalScrubbing) {
          // Another bar is already active - ignore this gesture
          return
        }

        if (!wasScrubbing) {
          // Set shared value FIRST before any runOnJS calls to ensure subsequent
          // onUpdate calls see the updated value immediately (prevents duplicate calls)
          isScrubbingShared.value = true
          if (globalScrubbingShared) {
            globalScrubbingShared.value = true
          }
          isScrubbingFlagRef.current = true

          // Reset seek timestamp and position tracking to allow immediate first seek when scrubbing starts
          lastSeekTimestampShared.value = 0
          lastScrubbedPositionForSeekShared.value = -1 // Reset to trigger first seek

          // Only call showControlsAndResetTimer if it wasn't already called in onStart
          // This prevents duplicate calls when user taps and then slightly moves finger
          const controlsAlreadyShown = controlsShownForThisGestureShared.value
          // MEMORY LEAK FIX: Batched into single runOnJS call to reduce closure allocation
          if (enableScrubbingTelemetry || !controlsAlreadyShown) {
            if (!controlsAlreadyShown) {
              controlsShownForThisGestureShared.value = true
            }
            runOnJS(batchScrubbingStart)({
              isScrubbing: enableScrubbingTelemetry ? true : undefined,
              showControls: !controlsAlreadyShown,
            })
          }

          // MEMORY LEAK FIX: Commented out runOnJS(log.debug) to prevent closure accumulation
          // Log when scrubbing starts from onUpdate (user dragged after tap)
          // runOnJS(log.debug)('VideoControls', `${barType} scrubbing started (drag detected)`, {
          //   translationX: event.translationX,
          //   translationY: event.translationY,
          //   eventX: event.x,
          // })
        }

        const relativeX = Math.max(0, event.x - trackLeftInset)
        const correctedSeekPercentage =
          progressBarWidthShared.value > 0
            ? Math.max(0, Math.min(100, (relativeX / progressBarWidthShared.value) * 100))
            : 0

        // MEMORY LEAK FIX: Removed runOnJS(setScrubbingPosition) - components should subscribe to lastScrubbedPositionShared directly
        lastScrubbedPositionShared.value = correctedSeekPercentage
        progressShared.value = correctedSeekPercentage

        // LIVE SCRUBBING: Seek video during drag with throttling
        // CRITICAL: Only seek if position has changed significantly (>0.5%) to prevent redundant seeks
        // This prevents seeks when onUpdate fires but finger hasn't actually moved
        const positionChange = Math.abs(
          correctedSeekPercentage - lastScrubbedPositionForSeekShared.value
        )
        const MIN_POSITION_CHANGE_FOR_SEEK = 0.5 // 0.5% threshold to prevent redundant seeks

        if (
          duration > 0 &&
          correctedSeekPercentage >= 0 &&
          (lastScrubbedPositionForSeekShared.value < 0 ||
            positionChange >= MIN_POSITION_CHANGE_FOR_SEEK)
        ) {
          const now = performance.now()
          const lastSeekTime = lastSeekTimestampShared.value
          // If lastSeekTime is 0, this is the first seek (immediately allowed after reset)
          // Otherwise, check if enough time has passed since last seek
          const timeSinceLastSeek =
            lastSeekTime === 0 ? Number.POSITIVE_INFINITY : now - lastSeekTime

          if (timeSinceLastSeek >= SEEK_THROTTLE_MS) {
            // Enough time has passed (or first seek) AND position has changed - seek to new position
            lastSeekTimestampShared.value = now
            lastScrubbedPositionForSeekShared.value = correctedSeekPercentage
            const seekTime = (correctedSeekPercentage / 100) * duration
            // MEMORY LEAK FIX: Commented out runOnJS(log.debug) to prevent closure accumulation
            // runOnJS(log.debug)('VideoControls', `${barType} scrubbing seek`, {
            //   seekTime,
            //   seekPercentage: correctedSeekPercentage,
            //   translationX: event.translationX,
            //   positionChange: Math.round(positionChange * 100) / 100,
            // })
            runOnJS(onSeek)(seekTime)
          }
        }
      })
      .onEnd(() => {
        // Only seek again if we were in scrubbing mode (dragging)
        // Use shared value instead of state to avoid capturing stale closure
        const wasScrubbing = isScrubbingShared.value
        const currentPosition = lastScrubbedPositionShared.value

        // MEMORY LEAK FIX: Commented out runOnJS(log.debug) to prevent closure accumulation
        // runOnJS(log.debug)('VideoControls', `${barType} gesture ended`, {
        //   wasScrubbing,
        //   finalPosition: currentPosition,
        //   finalSeekTime:
        //     duration > 0 && currentPosition >= 0 ? (currentPosition / 100) * duration : 0,
        // })

        // MEMORY LEAK FIX: Removed runOnJS(setIsScrubbing) - components should subscribe to isScrubbingShared directly
        isScrubbingShared.value = false
        isScrubbingFlagRef.current = false

        // Reset global scrubbing state if this bar was active
        if (wasScrubbing && globalScrubbingShared) {
          globalScrubbingShared.value = false
        }

        if (wasScrubbing) {
          // MEMORY LEAK FIX: Removed runOnJS for state setters - components should subscribe to shared values directly
          if (enableScrubbingTelemetry) {
            setLastScrubbedPosition(currentPosition)
            setScrubbingPosition(null)
          }
          progressShared.value = currentPosition

          if (duration > 0 && currentPosition >= 0) {
            const seekTime = (currentPosition / 100) * duration
            // MEMORY LEAK FIX: Commented out runOnJS(log.debug) to prevent closure accumulation
            // runOnJS(log.debug)('VideoControls', `${barType} drag end seek`, {
            //   finalSeekPercentage: currentPosition,
            //   finalSeekTime: seekTime,
            //   duration,
            // })
            runOnJS(onSeek)(seekTime)
          }
        }
      })
      .onFinalize(() => {
        // Ensure cleanup on gesture cancellation
        // MEMORY LEAK FIX: Commented out runOnJS(log.debug) to prevent closure accumulation
        // runOnJS(log.debug)('VideoControls', `${barType} gesture finalized`, {
        //   wasScrubbing,
        // })

        // MEMORY LEAK FIX: Removed runOnJS for state setters - components should subscribe to shared values directly
        if (enableScrubbingTelemetry) {
          setIsScrubbing(false)
          setScrubbingPosition(null)
        }
        isScrubbingShared.value = false
        isScrubbingFlagRef.current = false
        progressShared.value = lastScrubbedPositionShared.value
        // Reset global scrubbing state on cancellation
        if (globalScrubbingShared) {
          globalScrubbingShared.value = false
        }
        // Reset duplicate gesture timestamps after gesture ends to allow legitimate subsequent gestures
        lastOnStartTimestampShared.value = 0
        lastOnBeginTimestampShared.value = 0
        // Reset seek timestamp and position tracking to prevent stale seeks
        lastSeekTimestampShared.value = 0
        lastScrubbedPositionForSeekShared.value = -1
      })
      .simultaneousWithExternalGesture()
  }, [
    barType,
    duration,
    enableScrubbingTelemetry,
    globalScrubbingShared,
    onSeek,
    progressBarWidthShared,
    progressShared,
    setIsScrubbing,
    setLastScrubbedPosition,
    setScrubbingPosition,
    showControlsAndResetTimer,
    trackLeftInset,
  ])

  // Combined gesture handler (tap + drag)
  const combinedGesture = useMemo(() => buildTapDragGesture(), [buildTapDragGesture])

  // Main gesture handler (DEPRECATED: No longer used in ProgressBar component)
  // NOTE: ProgressBar component removed handle GestureDetector - handle is visual only.
  // This gesture is still returned for backward compatibility but is not used.
  // TODO: Remove this gesture and update callers to not pass mainGesture to ProgressBar.
  const mainGesture = useMemo(() => {
    if (barType === 'persistent') {
      // DEPRECATED: Persistent bar no longer needs separate handle gesture.
      // Handle is visual only - track's combinedGesture handles everything.
      // Returning buildTapDragGesture() for backward compatibility only.
      /*
        return Gesture.Pan()
          .maxPointers(1)
          .activateAfterLongPress(0)
          .onBegin((event) => {
            const relativeX = Math.max(0, event.x - trackLeftInset)
            const seekPercentage =
              progressBarWidthShared.value > 0
                ? Math.max(0, Math.min(100, (relativeX / progressBarWidthShared.value) * 100))
                : 0

            lastScrubbedPositionShared.value = seekPercentage
            runOnJS(log.debug)('VideoControls', `${barType} main gesture begin`, {
              eventX: event.x,
              trackLeftInset,
              relativeX,
              progressBarWidth: progressBarWidthShared.value,
              seekPercentage,
            })
          })
          .onStart((event) => {
            const relativeX = Math.max(0, event.x - trackLeftInset)
            const seekPercentage =
              progressBarWidthShared.value > 0
                ? Math.max(0, Math.min(100, (relativeX / progressBarWidthShared.value) * 100))
                : 0
            // MEMORY LEAK FIX: Removed runOnJS(setScrubbingPosition) - components should subscribe to lastScrubbedPositionShared directly
            lastScrubbedPositionShared.value = seekPercentage
          })
          .onUpdate((event) => {
            const horizontalThreshold = 3
            if (
              Math.abs(event.translationY) > Math.abs(event.translationX) &&
              Math.abs(event.translationY) > horizontalThreshold
            ) {
              return
            }

            const relativeX = Math.max(0, event.x - trackLeftInset)
            const seekPercentage =
              progressBarWidthShared.value > 0
                ? Math.max(0, Math.min(100, (relativeX / progressBarWidthShared.value) * 100))
                : 0
            // MEMORY LEAK FIX: Removed runOnJS(setScrubbingPosition) - components should subscribe to lastScrubbedPositionShared directly
            lastScrubbedPositionShared.value = seekPercentage
          })
          .onEnd(() => {
            const currentPosition = lastScrubbedPositionShared.value
            // MEMORY LEAK FIX: Removed runOnJS for state setters - components should subscribe to shared values directly
            if (enableScrubbingTelemetry) {
              setIsScrubbing(false)
              setLastScrubbedPosition(currentPosition)
              setScrubbingPosition(null)
            }
            isScrubbingShared.value = false

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
            // MEMORY LEAK FIX: Removed runOnJS for state setters - components should subscribe to shared values directly
            if (enableScrubbingTelemetry) {
              setIsScrubbing(false)
              setLastScrubbedPosition(currentPosition)
              setScrubbingPosition(null)
            }
            isScrubbingShared.value = false
          })
          .simultaneousWithExternalGesture()
        */
      return buildTapDragGesture()
    }

    return (
      Gesture.Pan()
        .maxPointers(1) // Single finger only for reliability
        .minDistance(5) // CRITICAL: Require 5px movement before activation (prevents firing on taps)
        .activateAfterLongPress(0) // Immediate activation once minDistance is met
        // NOTE: No onBegin handler - minDistance(5) prevents onBegin from being useful for taps.
        // This gesture only activates when user drags (5px movement), so onStart is sufficient.
        .onStart(() => {
          // CRITICAL: This only fires after minDistance(5px) is met, so we know user is dragging.
          // Initialize drag state here (not in onBegin) to prevent duplicate events on taps.
          const currentProgress = Math.max(0, Math.min(100, progressShared.value))
          isScrubbingShared.value = true
          isScrubbingFlagRef.current = true
          gestureStartPercentageShared.value = currentProgress
          lastScrubbedPositionShared.value = currentProgress
          progressShared.value = currentProgress

          // Show controls when user starts dragging handle
          runOnJS(showControlsAndResetTimer)()

          // MEMORY LEAK FIX: Commented out runOnJS(log.debug) to prevent closure accumulation
          // runOnJS(log.debug)('VideoControls', `${barType} main gesture start (drag detected)`, {
          //   eventX: event.x,
          //   trackLeftInset,
          //   progressBarWidth: progressBarWidthShared.value,
          //   seekPercentage: currentProgress,
          //   translationX: event.translationX,
          //   translationY: event.translationY,
          // })
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

          const width = progressBarWidthShared.value
          const startPercent = gestureStartPercentageShared.value
          const deltaPercent = width > 0 ? (event.translationX / width) * 100 : 0
          const seekPercentage = Math.max(0, Math.min(100, startPercent + deltaPercent))
          // MEMORY LEAK FIX: Removed runOnJS(setScrubbingPosition) - components should subscribe to lastScrubbedPositionShared directly
          lastScrubbedPositionShared.value = seekPercentage
          progressShared.value = seekPercentage
        })
        .onEnd(() => {
          // Seek ONLY on gesture end with the final scrubbed position
          // NOTE: This only fires if minDistance (5px) was met, preventing duplicate seeks on taps
          const currentPosition = lastScrubbedPositionShared.value
          // MEMORY LEAK FIX: Batched into single runOnJS call to reduce closure allocation
          if (enableScrubbingTelemetry) {
            runOnJS(batchScrubbingEnd)({
              isScrubbing: false,
              lastPosition: currentPosition,
              currentPosition: null,
            })
          }
          isScrubbingShared.value = false
          isScrubbingFlagRef.current = false
          gestureStartPercentageShared.value = 0
          progressShared.value = currentPosition

          // SEEK ONLY ONCE AT END with final position - allow seeking to 0%
          if (duration > 0 && currentPosition >= 0) {
            const seekTime = (currentPosition / 100) * duration
            // MEMORY LEAK FIX: Commented out runOnJS(log.debug) to prevent closure accumulation
            // runOnJS(log.debug)('VideoControls', `${barType} main gesture end - seeking`, {
            //   seekPercentage: currentPosition,
            //   seekTime,
            //   duration,
            // })
            runOnJS(onSeek)(seekTime)
          }
        })
        .onFinalize(() => {
          const currentPosition = lastScrubbedPositionShared.value
          // MEMORY LEAK FIX: Batched into single runOnJS call to reduce closure allocation
          if (enableScrubbingTelemetry) {
            runOnJS(batchScrubbingEnd)({
              isScrubbing: false,
              lastPosition: currentPosition,
              currentPosition: null,
            })
          }
          isScrubbingShared.value = false
          isScrubbingFlagRef.current = false
          gestureStartPercentageShared.value = 0
          progressShared.value = currentPosition
        })
        .simultaneousWithExternalGesture()
    )
  }, [
    barType,
    buildTapDragGesture,
    duration,
    enableScrubbingTelemetry,
    onSeek,
    progressBarWidthShared,
    progressShared,
    setIsScrubbing,
    setLastScrubbedPosition,
    setScrubbingPosition,
    showControlsAndResetTimer,
    trackLeftInset,
  ])

  return {
    // State
    isScrubbing,
    scrubbingPosition,
    lastScrubbedPosition,
    progressShared,

    // Gestures
    combinedGesture,
    mainGesture,

    // Helpers
    calculateProgress,
    progressBarWidth,
    setProgressBarWidth,
  }
}
