import { log } from '@my/logging'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { Dimensions } from 'react-native'
import { Gesture } from 'react-native-gesture-handler'
import type { GestureType } from 'react-native-gesture-handler'
import Animated, {
  Easing,
  runOnJS,
  scrollTo,
  useAnimatedReaction,
  useSharedValue,
  withTiming,
  cancelAnimation,
  type AnimatedRef,
  type SharedValue,
} from 'react-native-reanimated'
// MEMORY LEAK FIX: Commented out gesture conflict detector (dormant AI analysis feature)
// import { useGestureConflictDetector } from './useGestureConflictDetector'

// Animation constants - Mode-based system
const { height: SCREEN_H } = Dimensions.get('window')

type VideoMode = 'min' | 'normal' | 'max'

// Discrete video heights per mode
const VIDEO_HEIGHTS = {
  max: SCREEN_H, // 100% - full screen
  normal: Math.round(SCREEN_H * 0.6), // 60% - default viewing
  min: Math.round(SCREEN_H * 0.33), // 33% - collapsed dock
} as const

// Pull-to-reveal gesture thresholds
const PULL_EXPAND = 200 // Maximum pull distance for reveal effect
const PULL_THRESHOLD = 170 // Minimum pull to trigger reveal

// Mode transition scroll positions (for backward compatibility with scroll-based gestures)
const MODE_SCROLL_POSITIONS = {
  max: 0,
  normal: VIDEO_HEIGHTS.max - VIDEO_HEIGHTS.normal, // 40% of screen
  min: VIDEO_HEIGHTS.max - VIDEO_HEIGHTS.min, // 67% of screen
} as const

// Snap animation timing
const SNAP_DURATION_MS = 600
const SNAP_EASING = Easing.bezier(0.15, 0.0, 0.15, 1)

/**
 * Clamps a value between min and max boundaries (worklet-compatible)
 * Runs on UI thread - no JS bridge overhead
 * @param v - Value to clamp
 * @param min - Minimum boundary
 * @param max - Maximum boundary
 * @returns Clamped value: Math.max(min, Math.min(v, max))
 * @worklet
 */
const clampWorklet = (v: number, min: number, max: number) => {
  'worklet'
  return Math.max(min, Math.min(v, max))
}

/**
 * Determines the nearest video mode based on current scroll position
 * Uses distance calculation to find closest mode snap point
 *
 * Special case: If scrollY < -PULL_THRESHOLD (overscroll), always returns 'normal'
 * to snap back to default mode when gesture ends
 *
 * @param scrollValue - Current scroll position (0 = max, >0 = collapsed)
 * @returns Nearest mode: 'max' | 'normal' | 'min'
 *
 * Snap boundaries:
 * - max: 0 (full screen)
 * - normal: ~237px (60% layout)
 * - min: ~401px (33% layout)
 *
 * @worklet
 */
const scrollToMode = (scrollValue: number): VideoMode => {
  'worklet'
  // Pull-to-reveal gesture - snap back to normal
  if (scrollValue < -PULL_THRESHOLD) {
    // MEMORY LEAK FIX: Commented out runOnJS(log.debug) to prevent closure accumulation
    // runOnJS(log.debug)(
    //   'useGestureController.scrollToMode',
    //   'Pull-to-reveal detected - snapping to normal',
    //   {
    //     scrollValue: Math.round(scrollValue * 100) / 100,
    //     threshold: -PULL_THRESHOLD,
    //   }
    // )
    return 'normal'
  }

  // Find closest mode based on scroll position - unrolled loop to avoid array allocation per frame
  let nearestMode: VideoMode = 'max'
  let minDistance = Math.abs(scrollValue - MODE_SCROLL_POSITIONS.max)

  const normalDistance = Math.abs(scrollValue - MODE_SCROLL_POSITIONS.normal)
  if (normalDistance < minDistance) {
    minDistance = normalDistance
    nearestMode = 'normal'
  }

  const minModeDistance = Math.abs(scrollValue - MODE_SCROLL_POSITIONS.min)
  if (minModeDistance < minDistance) {
    minDistance = minModeDistance
    nearestMode = 'min'
  }

  // MEMORY LEAK FIX: Commented out runOnJS(log.debug) to prevent closure accumulation
  // runOnJS(log.debug)('useGestureController.scrollToMode', 'Nearest mode calculated', {
  //   scrollValue: Math.round(scrollValue * 100) / 100,
  //   distances: {
  //     max: Math.round(distances.max * 100) / 100,
  //     normal: Math.round(distances.normal * 100) / 100,
  //     min: Math.round(distances.min * 100) / 100,
  //   },
  //   nearestMode,
  //   minDistance: Math.round(minDistance * 100) / 100,
  //   modePositions: {
  //     max: MODE_SCROLL_POSITIONS.max,
  //     normal: MODE_SCROLL_POSITIONS.normal,
  //     min: MODE_SCROLL_POSITIONS.min,
  //   },
  // })

  return nearestMode
}

/**
 * Gets the scroll position for a given video mode
 * Direct lookup: mode → scroll position
 *
 * @param mode - Target mode: 'max' | 'normal' | 'min'
 * @returns Scroll position to animate to
 * @worklet
 */
const modeToScroll = (mode: VideoMode): number => {
  'worklet'
  return MODE_SCROLL_POSITIONS[mode]
}

/**
 * Calculates the current video height from scroll position
 * Handles three phases:
 *
 * 1. **Pull-to-reveal** (scrollY < 0):
 *    Video expands beyond max height with easing (1.4x multiplier)
 *    Used for visual feedback when user overscrolls upward
 *
 * 2. **Phase 1: max → normal** (0 ≤ scrollY ≤ ~237px):
 *    Linearly interpolates from VIDEO_HEIGHTS.max → VIDEO_HEIGHTS.normal
 *    Progress: scrollY / MODE_SCROLL_POSITIONS.normal
 *
 * 3. **Phase 2: normal → min** (scrollY > ~237px):
 *    Linearly interpolates from VIDEO_HEIGHTS.normal → VIDEO_HEIGHTS.min
 *    Progress: (scrollY - normal) / (min - normal)
 *
 * @param scrollValue - Current scroll position
 * @returns Interpolated video height in pixels
 *
 * Examples:
 * - scrollValue = 0    → ~640px (max, full screen)
 * - scrollValue = 237  → ~385px (normal, 60%)
 * - scrollValue = 401  → ~211px (min, 33%)
 * - scrollValue = -170 → ~896px+ (pull-to-reveal, beyond max)
 *
 * @worklet
 */
const calculateVideoHeight = (scrollValue: number): number => {
  'worklet'
  if (scrollValue < 0) {
    // Pull-to-reveal: expand beyond max
    const pullDistance = Math.abs(scrollValue)
    const easedPull = pullDistance > PULL_EXPAND ? PULL_EXPAND * 1.4 : pullDistance * 1.4
    return VIDEO_HEIGHTS.max + easedPull
  }
  if (scrollValue <= MODE_SCROLL_POSITIONS.normal) {
    // Phase 1: Max → Normal
    const progress = scrollValue / MODE_SCROLL_POSITIONS.normal
    return VIDEO_HEIGHTS.max - (VIDEO_HEIGHTS.max - VIDEO_HEIGHTS.normal) * progress
  }
  // Phase 2: Normal → Min
  const progress =
    (scrollValue - MODE_SCROLL_POSITIONS.normal) /
    (MODE_SCROLL_POSITIONS.min - MODE_SCROLL_POSITIONS.normal)
  return VIDEO_HEIGHTS.normal - (VIDEO_HEIGHTS.normal - VIDEO_HEIGHTS.min) * progress
}

/**
 * YouTube-style gesture delegation controller for VideoAnalysisScreen
 *
 * Manages touch delegation between video pan gestures and feedback ScrollView using a
 * sophisticated decision tree based on touch location, velocity, and direction:
 *
 * - Video area touches → immediate gesture control (pan video up/down)
 * - Feedback area touches (at top) → direction + velocity/distance-based delegation:
 *   - Fast swipe UP (>0.3 px/ms) OR long swipe UP (>80px) → video mode change (normal → min)
 *   - Slow AND short swipe UP → feedback ScrollView scrolling
 *   - Any swipe DOWN → gesture control (expand video)
 * - Pull-to-reveal (scroll < -PULL_THRESHOLD) → visual indicator for expand-beyond-max
 * - Scroll blocking prevents concurrent scroll conflicts during fast gestures
 *
 * ## Gesture Flow Diagram
 *
 * ```
 * Touch Down
 *     ↓
 * ┌──────────────────────────────────────────────────────────┐
 * │ onTouchesDown: Capture initial touch location & log state │
 * └──────────────────────────────────────────────────────────┘
 *     ↓
 * ┌──────────────────────────────────────────────────────────┐
 * │ onBegin: Determine initial gesture activation            │
 * │                                                            │
 * │ Is touch in video area?                                  │
 * │ ├─ YES → gestureIsActive = true, disable ScrollView      │
 * │ ├─ NO but feedback at top → gestureIsActive = true (wait)│
 * │ └─ NO and feedback scrolled → gestureIsActive = false    │
 * └──────────────────────────────────────────────────────────┘
 *     ↓
 * ┌──────────────────────────────────────────────────────────┐
 * │ onStart: Initialize tracking if gesture is active        │
 * │ - Reset gesture state (direction, velocity, time)        │
 * │ - Clear pull-to-reveal flag                              │
 * └──────────────────────────────────────────────────────────┘
 *     ↓
 * ┌──────────────────────────────────────────────────────────┐
 * │ onChange (continuous): Main gesture logic                │
 * │                                                            │
 * │ 1. Detect direction & velocity on first significant move │
 * │    (>8px threshold)                                       │
 * │                                                            │
 * │ 2. Decision tree for feedback area touches (initial):     │
 * │    ┌─ NOT in video area AND at top AND UP               │
 * │    │  ├─ Fast swipe (>0.3 px/ms) OR long swipe (>80px)?│
 * │    │  │  └─ YES: Block scroll, change video mode        │
 * │    │  └─ Slow AND short swipe?                          │
 * │    │     └─ YES: Hand off to ScrollView                 │
 * │    └─ All other cases: Commit to gesture control        │
 * │                                                            │
 * │ 3. Ongoing gesture check (continuous):                    │
 * │    └─ If long swipe detected during gesture → commit     │
 * │                                                            │
 * │ 4. Update scroll position: scrollY -= changeY            │
 * │                                                            │
 * │ 5. Detect pull-to-reveal: scrollY < -PULL_THRESHOLD?    │
 * │    └─ YES: Set isPullingToReveal = true (UI indicator)   │
 * │                                                            │
 * │ 6. Sync scroll ref: scrollTo(scrollRef, 0, scrollY)      │
 * └──────────────────────────────────────────────────────────┘
 *     ↓ (user lifts finger)
 * ┌──────────────────────────────────────────────────────────┐
 * │ onEnd: Snap to nearest mode with animation               │
 * │ - Calculate target mode from current scroll position     │
 * │ - Animate to target: withTiming(targetScroll, 600ms)    │
 * │ - Re-enable feedback ScrollView                          │
 * └──────────────────────────────────────────────────────────┘
 *     ↓
 * ┌──────────────────────────────────────────────────────────┐
 * │ onFinalize: Clean up gesture state                       │
 * │ - Reset all tracking values                              │
 * │ - Set gestureIsActive = false                            │
 * └──────────────────────────────────────────────────────────┘
 * ```
 *
 * ## Video Mode System
 *
 * Three discrete video heights define the layout:
 * - **max** (scroll=0): Full screen video (100% of screen height)
 * - **normal** (scroll≈40% of screen): Default viewing with feedback panel visible
 * - **min** (scroll≈67% of screen): Collapsed dock with video at bottom
 *
 * ## Pull-to-Reveal System
 *
 * When user overscrolls video upward beyond max:
 * - Scroll position becomes negative
 * - `isPullingToReveal` flag set when scrollY < -PULL_THRESHOLD (-170px)
 * - Provides visual feedback (e.g., subtle pull indicator animation)
 * - On gesture end, always snaps back to normal mode
 *
 * ## Scroll Blocking Strategy
 *
 * Two-stage scroll blocking prevents concurrent scroll during fast gestures:
 * 1. `feedbackScrollEnabled`: Standard blocking during any gesture
 * 2. `blockFeedbackScrollCompletely`: Additional blocking for fast swipe mode changes
 *
 * Re-enabled immediately when gesture ends to allow normal feedback scrolling.
 *
 * ## Performance Considerations
 *
 * - All calculations run on UI thread via worklets (no JS bridge overhead)
 * - Shared values track state without JS-thread round-trips
 * - Logging only in development; production logs are no-ops
 * - Pull-to-reveal state bridges to JS via useAnimatedReaction for UI consumers
 *
 * ## Integration with useAnimationController
 *
 * This hook coordinates with animation controller for smooth transitions:
 * - Receives scrollY and feedbackContentOffsetY from animation controller
 * - Modifies scrollY via direct assignment and scrollTo
 * - Animation controller interpolates header/content based on scrollY changes
 * - No direct knowledge of animation constants; gesture is animation-agnostic
 *
 * ## Testing Notes
 *
 * Unit tests validate:
 * - Hook initialization and interface
 * - Callback availability
 * - Gesture lifecycle handler registration
 *
 * Behavior testing requires integration test with:
 * - React Native gesture handler environment
 * - Reanimated worklet execution
 * - Touch event simulation
 * - Physical device or simulator verification
 *
 * @param scrollY - Shared value tracking video scroll position (0 = max, positive = collapsed)
 * @param feedbackContentOffsetY - Shared value tracking feedback panel scroll position
 * @param scrollRef - Animated ref to the main scroll container
 * @param isProcessing - Whether video analysis is in progress (disables gestures when true)
 * @returns Gesture controller interface with pan gesture, scroll state, and callbacks
 *
 * @example
 * ```typescript
 * // In useVideoAnalysisOrchestrator:
 * const animation = useAnimationController()
 * const gesture = useGestureController(
 *   animation.scrollY,
 *   animation.feedbackContentOffsetY,
 *   animation.scrollRef,
 *   isProcessing
 * )
 *
 * // Pass to layout:
 * <GestureDetector gesture={gesture.rootPan}>
 *   <VideoAnalysisLayout
 *     gesture={gesture}
 *     animation={animation}
 *   />
 * </GestureDetector>
 * ```
 */
export interface FeedbackScrollSnapshot {
  enabled: boolean
  blockCompletely: boolean
}

export interface FeedbackScrollControl {
  subscribe: (listener: () => void) => () => void
  getSnapshot: () => FeedbackScrollSnapshot
}

export interface PullToRevealControl {
  subscribe: (listener: () => void) => () => void
  getSnapshot: () => boolean
}

export interface UseGestureControllerReturn {
  /** Pan gesture handler for root view */
  rootPan: GestureType
  /** Ref for the root pan gesture (must be passed to GestureDetector) */
  rootPanRef: React.MutableRefObject<GestureType | undefined>
  /** Subscription interface for feedback scroll blocking state */
  feedbackScroll: FeedbackScrollControl
  /** Subscription interface for pull-to-reveal state (for UI indicators) */
  pullToReveal: PullToRevealControl
  /** Callback to update feedback scroll position from ScrollView */
  onFeedbackScrollY: (scrollY: number) => void
  /** Callback when feedback scroll momentum ends */
  onFeedbackMomentumScrollEnd: () => void
  /** Shared value for scroll enabled state (UI-thread, zero latency) */
  feedbackScrollEnabledShared: SharedValue<boolean>
  /** Ref for feedback panel's native scroll gesture (for blocksExternalGesture) */
  feedbackScrollGestureRef: React.MutableRefObject<GestureType | undefined>
}

export function useGestureController(
  scrollY: SharedValue<number>,
  feedbackContentOffsetY: SharedValue<number>,
  scrollRef: AnimatedRef<Animated.ScrollView>,
  isProcessing = false
): UseGestureControllerReturn {
  // MEMORY LEAK FIX: Commented out gesture conflict detection (dormant AI analysis feature)
  // const gestureDetector = useGestureConflictDetector()

  // PERFORMANCE FIX: Shared value for scroll enabled (eliminates 16-50ms JS-thread delay)
  // NOTE: With blocksExternalGesture, this is kept always true - blocking happens at gesture level
  // When at top: blocksExternalGesture prevents scroll gesture from activating
  // When scrolled: simultaneousWithExternalGesture + high activeOffsetY prevents conflicts
  const feedbackScrollEnabledShared = useSharedValue(true)

  // Log initial state
  useEffect(() => {
    log.debug('useGestureController', 'Initialized', {
      initialScrollEnabled: feedbackScrollEnabledShared.value,
    })
  }, [feedbackScrollEnabledShared])

  // Scroll blocking state - custom subscription store to avoid parent re-renders
  const feedbackScrollStateRef = useRef<FeedbackScrollSnapshot>({
    enabled: true,
    blockCompletely: false,
  })
  const feedbackScrollListenersRef = useRef(new Set<() => void>())

  const getFeedbackScrollSnapshot = useCallback(
    (): FeedbackScrollSnapshot => feedbackScrollStateRef.current,
    []
  )

  const notifyFeedbackScrollSubscribers = useCallback(() => {
    feedbackScrollListenersRef.current.forEach((listener) => {
      try {
        listener()
      } catch (error) {
        log.warn('useGestureController', '⚠️ Error notifying feedback scroll listener', {
          error,
        })
      }
    })
  }, [])

  const setFeedbackScrollEnabled = useCallback(
    (value: boolean) => {
      const current = feedbackScrollStateRef.current
      if (current.enabled === value) {
        return current.enabled
      }

      feedbackScrollStateRef.current = {
        ...current,
        enabled: value,
      }
      // NOTE: feedbackScrollEnabledShared kept always true - blocksExternalGesture handles blocking
      // feedbackScrollEnabledShared.value = value // REMOVED: causes scroll to break
      log.debug('useGestureController', 'setFeedbackScrollEnabled', { value })
      notifyFeedbackScrollSubscribers()
      return value
    },
    [notifyFeedbackScrollSubscribers]
  )

  const setBlockFeedbackScrollCompletely = useCallback(
    (value: boolean) => {
      const current = feedbackScrollStateRef.current
      if (current.blockCompletely === value) {
        return current.blockCompletely
      }

      feedbackScrollStateRef.current = {
        ...current,
        blockCompletely: value,
      }
      notifyFeedbackScrollSubscribers()
      return value
    },
    [notifyFeedbackScrollSubscribers]
  )

  const feedbackScrollControl = useMemo<FeedbackScrollControl>(
    () => ({
      subscribe: (listener: () => void) => {
        feedbackScrollListenersRef.current.add(listener)
        return () => {
          feedbackScrollListenersRef.current.delete(listener)
        }
      },
      getSnapshot: getFeedbackScrollSnapshot,
    }),
    [getFeedbackScrollSnapshot]
  )

  // Gesture state tracking (shared values for worklet access)
  const gestureIsActive = useSharedValue(false)
  const gestureDirection = useSharedValue<'up' | 'down' | 'unknown'>('unknown')
  const gestureVelocity = useSharedValue(0)
  const gestureStartTime = useSharedValue(0)
  const initialTouchY = useSharedValue(0)
  const initialTouchX = useSharedValue(0)
  const isPullingToReveal = useSharedValue(false)
  const initialIsInVideoArea = useSharedValue(false)
  const isFastSwipeVideoModeChange = useSharedValue(false)
  // Track if we actually committed to video control (moved scrollY)
  const committedToVideoControl = useSharedValue(false)
  // Track initial scrollY when gesture started
  const initialScrollY = useSharedValue(0)
  // Track if this is a left-edge swipe (for back navigation detection)
  const isLeftEdgeSwipe = useSharedValue(false)
  // Track total translation distance for long swipe detection
  const totalTranslationY = useSharedValue(0)

  // Pull-to-reveal state (JavaScript-accessible for UI indicators)
  const isPullingToRevealRef = useRef(false)
  const pullToRevealListenersRef = useRef(new Set<() => void>())

  const subscribePullToReveal = useCallback((listener: () => void) => {
    pullToRevealListenersRef.current.add(listener)
    return () => {
      pullToRevealListenersRef.current.delete(listener)
    }
  }, [])

  const getPullToRevealSnapshot = useCallback(() => isPullingToRevealRef.current, [])

  const notifyPullToRevealListeners = useCallback(() => {
    pullToRevealListenersRef.current.forEach((listener) => listener())
  }, [])

  // Cleanup listeners on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      feedbackScrollListenersRef.current.clear()
      pullToRevealListenersRef.current.clear()
    }
  }, [])

  // OPTIMIZATION: Single consolidated reaction to observe all internal tracking shared values
  // Prevents "onAnimatedValueUpdate with no listeners" warnings while minimizing overhead.
  // Consolidates 12 separate reactions into 1 worklet registration (12x reduction).
  // These values are read within worklets but need registered listeners to avoid warnings.
  useAnimatedReaction(
    () => {
      'worklet'
      // Read all values to register them as observed (prevents warnings)
      // Values are intentionally unused - this is just for observation registration
      return {
        gestureIsActive: gestureIsActive.value,
        gestureDirection: gestureDirection.value,
        gestureVelocity: gestureVelocity.value,
        gestureStartTime: gestureStartTime.value,
        initialTouchY: initialTouchY.value,
        initialTouchX: initialTouchX.value,
        initialIsInVideoArea: initialIsInVideoArea.value,
        isFastSwipeVideoModeChange: isFastSwipeVideoModeChange.value,
        committedToVideoControl: committedToVideoControl.value,
        initialScrollY: initialScrollY.value,
        isLeftEdgeSwipe: isLeftEdgeSwipe.value,
        totalTranslationY: totalTranslationY.value,
      }
    },
    () => {
      // Listener intentionally empty - ensures values are observed by UI runtime
      // This single reaction replaces 12 separate ones, reducing initialization overhead
    }
  )

  const setFeedbackScrollEnabledTransition = useCallback(
    (value: boolean) => {
      setFeedbackScrollEnabled(value)
    },
    [setFeedbackScrollEnabled]
  )

  // Removed: setBlockFeedbackScrollCompletelyTransition - unused
  // Now handled by batchScrollStateUpdate for better performance

  // MEMORY LEAK FIX: Batched function to reduce runOnJS closure allocations
  // Combines setFeedbackScrollEnabledTransition + setBlockFeedbackScrollCompletelyTransition
  // into a single closure instead of two separate ones
  const batchScrollStateUpdate = useCallback(
    (updates: { scrollEnabled: boolean; blockCompletely: boolean }) => {
      setFeedbackScrollEnabled(updates.scrollEnabled)
      const previous = feedbackScrollStateRef.current.blockCompletely
      if (previous !== updates.blockCompletely) {
        if (__DEV__) {
          log.debug('useGestureController', '🔍 setBlockFeedbackScrollCompletelyTransition', {
            prev: previous,
            next: updates.blockCompletely,
          })
        }
      }
      setBlockFeedbackScrollCompletely(updates.blockCompletely)
    },
    [setFeedbackScrollEnabled, setBlockFeedbackScrollCompletely]
  )

  const updatePullingToRevealJS = useCallback(
    (value: boolean) => {
      if (isPullingToRevealRef.current === value) {
        return
      }
      isPullingToRevealRef.current = value
      notifyPullToRevealListeners()
    },
    [notifyPullToRevealListeners]
  )

  // Bridge UI-thread pull state to JS for context consumers
  useAnimatedReaction(
    () => isPullingToReveal.value,
    (value, prev) => {
      if (value !== prev) {
        runOnJS(updatePullingToRevealJS)(value)
      }
    },
    [updatePullingToRevealJS]
  )

  // Cleanup internal shared values on unmount to prevent memory leaks
  // Note: scrollY and feedbackContentOffsetY are owned by animation controller
  useEffect(() => {
    return () => {
      'worklet'
      cancelAnimation(gestureIsActive)
      cancelAnimation(gestureDirection)
      cancelAnimation(gestureVelocity)
      cancelAnimation(gestureStartTime)
      cancelAnimation(initialTouchY)
      cancelAnimation(initialTouchX)
      cancelAnimation(isPullingToReveal)
      cancelAnimation(initialIsInVideoArea)
      cancelAnimation(isFastSwipeVideoModeChange)
      cancelAnimation(committedToVideoControl)
      cancelAnimation(initialScrollY)
      cancelAnimation(isLeftEdgeSwipe)
      cancelAnimation(totalTranslationY)
      cancelAnimation(feedbackScrollEnabledShared)
    }
  }, [
    gestureIsActive,
    gestureDirection,
    gestureVelocity,
    gestureStartTime,
    initialTouchY,
    initialTouchX,
    isPullingToReveal,
    initialIsInVideoArea,
    isFastSwipeVideoModeChange,
    committedToVideoControl,
    initialScrollY,
    isLeftEdgeSwipe,
    totalTranslationY,
    feedbackScrollEnabledShared,
  ])

  // Ref for gesture handler
  const rootPanRef = useRef<GestureType | undefined>(undefined)

  // Ref for feedback scroll gesture (for blocksExternalGesture coordination)
  const feedbackScrollGestureRef = useRef<GestureType | undefined>(undefined)

  // Feedback scroll callbacks - use refs for stable references
  // These callbacks don't need to recreate when state changes - they use refs internally
  const feedbackScrollYRef = useRef<((scrollYValue: number) => void) | undefined>(undefined)
  const feedbackMomentumScrollEndRef = useRef<(() => void) | undefined>(undefined)

  // Update refs when dependencies change (but keep callback references stable)
  useEffect(() => {
    feedbackScrollYRef.current = (scrollYValue: number) => {
      feedbackContentOffsetY.value = scrollYValue
    }

    feedbackMomentumScrollEndRef.current = () => {
      log.debug('VideoAnalysisScreen.onFeedbackMomentumScrollEnd', 'Momentum scroll ended', {
        feedbackOffset: Math.round(feedbackContentOffsetY.value * 100) / 100,
        scrollY: Math.round(scrollY.value * 100) / 100,
        gestureIsActive: gestureIsActive.value,
        committedToVideoControl: committedToVideoControl.value,
      })
    }
  }, [feedbackContentOffsetY, scrollY, gestureIsActive, committedToVideoControl])

  // Stable callback wrappers that use refs
  const onFeedbackScrollY = useCallback((scrollYValue: number) => {
    feedbackScrollYRef.current?.(scrollYValue)
  }, [])

  const onFeedbackMomentumScrollEnd = useCallback(() => {
    feedbackMomentumScrollEndRef.current?.()
  }, [])

  // PERFORMANCE: Track feedback scroll position on UI thread only
  // Using SharedValue instead of useState avoids JS-thread hops and re-renders
  // The gesture handlers can read this directly in worklets with zero latency
  const isFeedbackAtTop = useSharedValue(feedbackContentOffsetY.value <= 0)

  // Watch feedback scroll position and update SharedValue on UI thread
  // Only logs in DEV when crossing threshold (no JS-thread hop for the actual state)
  useAnimatedReaction(
    () => feedbackContentOffsetY.value,
    (currentOffset, prevOffset) => {
      'worklet'
      const isAtTop = currentOffset <= 0
      const wasAtTop = prevOffset === null || prevOffset <= 0

      // Only update when crossing threshold
      if (isAtTop !== wasAtTop) {
        isFeedbackAtTop.value = isAtTop
        if (__DEV__) {
          runOnJS(log.debug)('useGestureController', 'Feedback scroll position threshold crossed', {
            isAtTop,
            scrollOffset: currentOffset,
          })
        }
      }
    },
    []
  )

  // Pan gesture with YouTube-style delegation
  // CONDITIONAL activeOffsetY: Adjust sensitivity based on feedback scroll position
  // CRITICAL: Only activate on vertical movement to avoid claiming back navigation gestures
  // Use failOffsetX to fail immediately on any rightward horizontal swipe
  // PERFORMANCE FIX: Use blocksExternalGesture to prevent scroll gesture from activating during pan
  // Pan gesture with simultaneousWithExternalGesture (allows both gestures to run)
  // Scroll blocking is handled dynamically in onBegin via feedbackScrollEnabledShared
  const rootPan = useMemo(
    () =>
      Gesture.Pan()
        .withRef(rootPanRef)
        .enabled(!isProcessing) // Disable all gestures when video is processing
        .minDistance(5)
        // Only activate on vertical movement (up/down) - NOT horizontal
        // This prevents claiming rightward swipes used for back navigation
        .activeOffsetY([-20, 20]) // Normal sensitivity - dynamic blocking handles scroll conflicts
        // Don't use activeOffsetX - we only want vertical gestures
        // Fail immediately on rightward horizontal swipes (back navigation area)
        // This fails BEFORE activation can occur, allowing system back gesture
        .failOffsetX([Number.NEGATIVE_INFINITY, 10])
        // Allow both gestures to run simultaneously - scroll control via feedbackScrollEnabledShared
        .simultaneousWithExternalGesture(feedbackScrollGestureRef)
        .onTouchesDown(() => {
          'worklet'
          // MEMORY LEAK FIX: Removed unused touchX/touchY (only used in commented-out tracking/logging)
          // MEMORY LEAK FIX: Commented out runOnJS(log.debug) to prevent closure accumulation
          // runOnJS(log.debug)('VideoAnalysisScreen.rootPan', 'Touch down', {
          //   pointerCount,
          // })
          // MEMORY LEAK FIX: Commented out gesture tracking (dormant AI analysis feature)
          // runOnJS(gestureDetector.trackGestureEvent)({
          //   gestureType: 'rootPan',
          //   phase: 'begin',
          //   location: {
          //     x: touch?.x ?? 0,
          //     y: touch?.y ?? 0,
          //   },
          //   translation: { x: 0, y: 0 },
          //   velocity: { x: 0, y: 0 },
          // })
        })
        .onBegin((event) => {
          'worklet'
          // Reset tracking values and store initial touch info
          gestureDirection.value = 'unknown'
          gestureVelocity.value = 0
          gestureStartTime.value = Date.now()
          initialTouchY.value = event.y
          initialTouchX.value = event.x
          isFastSwipeVideoModeChange.value = false
          committedToVideoControl.value = false
          isLeftEdgeSwipe.value = false
          totalTranslationY.value = 0

          // Check if touch started in video area or if feedback panel is at top
          const touchX = event.x
          const touchY = event.y
          const scrollValue = scrollY.value
          initialScrollY.value = scrollValue
          const currentVideoHeight = calculateVideoHeight(scrollValue)
          const isInVideoArea = touchY < currentVideoHeight
          const isAtTop = feedbackContentOffsetY.value <= 0

          // Detect if touch started from left edge (back navigation region)
          const LEFT_EDGE_THRESHOLD = 20
          const touchStartsFromLeftEdge = touchX < LEFT_EDGE_THRESHOLD
          isLeftEdgeSwipe.value = touchStartsFromLeftEdge

          // Store initial touch area for consistent decision making
          initialIsInVideoArea.value = isInVideoArea

          // Initial activation logic:
          // - Video area touches: Activate immediately (but left-edge waits for direction before committing)
          // - Feedback area touches: Only activate if at top (will refine based on direction later)
          // - Left-edge touches: Activate BUT don't commit yet - wait for direction in onChange
          // Always activate if in video area or at top - but left-edge won't commit immediately
          gestureIsActive.value = isInVideoArea || isAtTop

          if (isInVideoArea && !touchStartsFromLeftEdge) {
            // Video area touches (NOT left-edge): Immediately commit to gesture control
            committedToVideoControl.value = true
            // DYNAMIC SCROLL BLOCKING: Only disable scroll when at top to prevent offset jumps
            // Reading SharedValue.value directly in worklet = zero latency
            if (isFeedbackAtTop.value) {
              feedbackScrollEnabledShared.value = false
              runOnJS(log.debug)('Gesture', 'onBegin: Disabled scroll (at top)', {
                isInVideoArea,
                touchStartsFromLeftEdge,
              })
            }
            runOnJS(setFeedbackScrollEnabledTransition)(false)
          }
          // Left-edge touches and feedback area touches wait for direction in onChange
        })
        .onStart(() => {
          'worklet'
          if (!gestureIsActive.value) return

          // MEMORY LEAK FIX: Commented out gesture tracking (dormant AI analysis feature)
          // runOnJS(gestureDetector.trackGestureEvent)({
          //   gestureType: 'rootPan',
          //   phase: 'start',
          //   location: { x: event.x, y: event.y },
          //   translation: { x: event.translationX, y: event.translationY },
          //   velocity: { x: event.velocityX, y: event.velocityY },
          // })

          isPullingToReveal.value = false
        })
        .onChange((e) => {
          'worklet'
          if (!gestureIsActive.value) return

          // CRITICAL: Check if this is a horizontal swipe from left edge (back navigation)
          // If so, deactivate gesture to allow system back gesture to handle it
          if (isLeftEdgeSwipe.value) {
            const isPrimarilyHorizontal = Math.abs(e.changeX) > Math.abs(e.changeY)
            const isSwipingRight = e.changeX > 0

            if (isPrimarilyHorizontal && isSwipingRight) {
              // This is a left-edge swipe-right gesture - allow back navigation
              gestureIsActive.value = false
              committedToVideoControl.value = false
              // NOTE: feedbackScrollEnabledShared kept always true
              runOnJS(setFeedbackScrollEnabledTransition)(true)
              return
            }

            // Left-edge touch that's NOT horizontal-right: commit to gesture control for vertical gestures
            if (!committedToVideoControl.value) {
              const isPrimarilyVertical = Math.abs(e.changeY) > Math.abs(e.changeX)
              if (isPrimarilyVertical && Math.abs(e.changeY) > 5) {
                // Left-edge vertical gesture - commit to video control
                committedToVideoControl.value = true
                // DYNAMIC SCROLL BLOCKING: Only disable scroll when at top
                if (isFeedbackAtTop.value) {
                  feedbackScrollEnabledShared.value = false
                }
                runOnJS(setFeedbackScrollEnabledTransition)(false)
              } else if (Math.abs(e.changeX) > Math.abs(e.changeY)) {
                // Left-edge but swiping left (not right) - might still want back nav, but don't commit
                return
              }
            }
          }

          // Only process vertical gestures (existing logic)
          const isPrimarilyVertical = Math.abs(e.changeY) > Math.abs(e.changeX)
          if (!isPrimarilyVertical && !isLeftEdgeSwipe.value) {
            return
          }

          // If we haven't committed yet and it's not a vertical gesture, don't process
          if (!committedToVideoControl.value && !isPrimarilyVertical) {
            return
          }

          // Track total translation distance for long swipe detection
          // translationY is negative for upward swipes (which we want)
          totalTranslationY.value = Math.abs(e.translationY)

          // Detect gesture direction and velocity on first significant movement
          if (gestureDirection.value === 'unknown' && Math.abs(e.changeY) > 8) {
            gestureDirection.value = e.changeY > 0 ? 'down' : 'up'

            // Calculate velocity (pixels per millisecond)
            const timeDelta = Date.now() - gestureStartTime.value
            gestureVelocity.value = Math.abs(e.changeY) / Math.max(timeDelta, 1)

            // Use initial touch area for consistent decision making
            const scrollValue = scrollY.value
            // const currentVideoHeight = calculateVideoHeight(scrollValue)
            const isInVideoArea = initialIsInVideoArea.value // Use stored initial value
            const isAtTop = feedbackContentOffsetY.value <= 0
            const isNormalMode =
              scrollValue >= MODE_SCROLL_POSITIONS.max &&
              scrollValue <= MODE_SCROLL_POSITIONS.normal

            // Modern swipe detection: Fast swipe OR long swipe triggers mode change
            const FAST_SWIPE_THRESHOLD = 0.3 // pixels per millisecond (300 px/s)
            const LONG_SWIPE_THRESHOLD = 80 // pixels - total translation distance
            const isFastSwipe = gestureVelocity.value > FAST_SWIPE_THRESHOLD
            const isLongSwipe = totalTranslationY.value > LONG_SWIPE_THRESHOLD
            const shouldTriggerModeChange = isFastSwipe || isLongSwipe

            // Decision logic for feedback area touches:
            if (!isInVideoArea && isAtTop && gestureDirection.value === 'up') {
              if (isNormalMode && shouldTriggerModeChange) {
                // Fast swipe OR long swipe UP in normal mode → Change to min mode (don't scroll feedback)
                isFastSwipeVideoModeChange.value = true
                committedToVideoControl.value = true
                runOnJS(log.debug)('Gesture', 'UP swipe mode change triggered', {
                  isNormalMode,
                  isFastSwipe,
                  isLongSwipe: totalTranslationY.value > 80,
                })
                // MEMORY LEAK FIX: Batched into single runOnJS call to reduce closure allocation
                runOnJS(batchScrollStateUpdate)({
                  scrollEnabled: false,
                  blockCompletely: true,
                })
                // MEMORY LEAK FIX: Commented out runOnJS(log.debug) to prevent closure accumulation
                // runOnJS(log.debug)(
                //   'useGestureController.rootPan',
                //   'Mode change triggered (fast or long swipe)',
                //   {
                //     direction: gestureDirection.value,
                //     velocity: Math.round(gestureVelocity.value * 1000) / 1000,
                //     translationDistance: Math.round(totalTranslationY.value * 100) / 100,
                //     isNormalMode,
                //     isFastSwipe,
                //     isLongSwipe,
                //     fastThreshold: FAST_SWIPE_THRESHOLD,
                //     longThreshold: LONG_SWIPE_THRESHOLD,
                //     scrollValue,
                //     initialScrollY: initialScrollY.value,
                //   }
                // )
              } else if (!committedToVideoControl.value) {
                // Slow AND short swipe UP → Hand off to ScrollView for feedback scrolling
                gestureIsActive.value = false
                // NOTE: feedbackScrollEnabledShared kept always true
                runOnJS(setFeedbackScrollEnabledTransition)(true)
                // MEMORY LEAK FIX: Commented out runOnJS(log.debug) to prevent closure accumulation
                // runOnJS(log.debug)(
                //   'useGestureController.rootPan',
                //   'Slow/short swipe - handed off to ScrollView (NOT COMMITTED)',
                //   {
                //     direction: gestureDirection.value,
                //     velocity: Math.round(gestureVelocity.value * 1000) / 1000,
                //     translationDistance: Math.round(totalTranslationY.value * 100) / 100,
                //     isNormalMode,
                //     isFastSwipe,
                //     isLongSwipe,
                //     fastThreshold: FAST_SWIPE_THRESHOLD,
                //     longThreshold: LONG_SWIPE_THRESHOLD,
                //     scrollValue,
                //     initialScrollY: initialScrollY.value,
                //     committedToVideoControl: committedToVideoControl.value,
                //   }
                // )
                return
              }
              // If committed, continue with gesture processing
            } else if (!isInVideoArea && !isAtTop && !committedToVideoControl.value) {
              // CRITICAL FIX: Feedback area is already scrolled (not at top)
              // Do NOT commit to video control - this would steal the scroll gesture
              // and reset the feedback scroll position
              // BUT: If we've already committed to video control, don't deactivate
              // const wasActive = gestureIsActive.value
              gestureIsActive.value = false
              // RE-ENABLE SCROLL: Always re-enable after gesture ends
              feedbackScrollEnabledShared.value = true
              runOnJS(setFeedbackScrollEnabledTransition)(true)
              // MEMORY LEAK FIX: Commented out runOnJS(log.debug) to prevent closure accumulation
              // runOnJS(log.debug)(
              //   'useGestureController.rootPan',
              //   'Feedback area scrolled - handed off to ScrollView (NOT COMMITTED)',
              //   {
              //     isInVideoArea,
              //     isAtTop,
              //     feedbackOffset: feedbackContentOffsetY.value,
              //     scrollValue,
              //     initialScrollY: initialScrollY.value,
              //     committedToVideoControl: committedToVideoControl.value,
              //     reason: 'feedback-already-scrolled',
              //   }
              // )
              return
            } else if (!isInVideoArea && isAtTop && gestureDirection.value === 'down') {
              // DOWN swipe at top of feedback area → ALWAYS trigger mode transition (expand video)
              // Unlike UP swipe, DOWN at top has no scrolling use case - there's nothing above to scroll to
              // So any DOWN swipe at top should expand the video
              isFastSwipeVideoModeChange.value = true
              committedToVideoControl.value = true
              runOnJS(log.debug)('Gesture', 'DOWN swipe at top - expanding video', {
                isAtTop,
                direction: gestureDirection.value,
              })
              runOnJS(batchScrollStateUpdate)({
                scrollEnabled: false,
                blockCompletely: true,
              })
            } else {
              // All other cases: Commit to gesture control
              committedToVideoControl.value = true
              // DYNAMIC SCROLL BLOCKING: Only disable scroll when at top
              if (isFeedbackAtTop.value) {
                feedbackScrollEnabledShared.value = false
              }
              runOnJS(log.debug)('Gesture', 'ELSE block: Committing to video control', {
                isInVideoArea,
                isAtTop,
                direction: gestureDirection.value,
                committedToVideoControl: committedToVideoControl.value,
              })
              runOnJS(setFeedbackScrollEnabledTransition)(false)
              // runOnJS(log.debug)('VideoAnalysisScreen.rootPan', 'Gesture committed to video control', {
              //   direction: gestureDirection.value,
              //   velocity: Math.round(gestureVelocity.value * 1000) / 1000,
              //   isInVideoArea,
              //   isAtTop,
              //   initialTouchY: initialTouchY.value,
              //   currentVideoHeight,
              //   scrollValue,
              //   isNormalMode,
              //   isFastSwipe,
              //   threshold: FAST_SWIPE_THRESHOLD,
              //   initialScrollY: initialScrollY.value,
              //   committedToVideoControl: committedToVideoControl.value,
              // })
            }
          }

          // Also check for long swipe during ongoing gesture (not just initial detection)
          // This allows mode change even if initial velocity was slow but user continues swiping
          if (
            !initialIsInVideoArea.value &&
            feedbackContentOffsetY.value <= 0 &&
            gestureDirection.value === 'up' &&
            !committedToVideoControl.value
          ) {
            const scrollValue = scrollY.value
            const isNormalMode =
              scrollValue >= MODE_SCROLL_POSITIONS.max &&
              scrollValue <= MODE_SCROLL_POSITIONS.normal
            const LONG_SWIPE_THRESHOLD = 80 // pixels
            const isLongSwipe = totalTranslationY.value > LONG_SWIPE_THRESHOLD

            if (isNormalMode && isLongSwipe) {
              // Long swipe detected during gesture → commit to mode change
              isFastSwipeVideoModeChange.value = true
              committedToVideoControl.value = true
              // MEMORY LEAK FIX: Batched into single runOnJS call to reduce closure allocation
              runOnJS(batchScrollStateUpdate)({
                scrollEnabled: false,
                blockCompletely: true,
              })
              // MEMORY LEAK FIX: Commented out runOnJS(log.debug) to prevent closure accumulation
              // runOnJS(log.debug)(
              //   'useGestureController.rootPan',
              //   'Long swipe detected during gesture - committing to mode change',
              //   {
              //     translationDistance: Math.round(totalTranslationY.value * 100) / 100,
              //     threshold: LONG_SWIPE_THRESHOLD,
              //     scrollValue,
              //   }
              // )
            }
          }

          // Only update scrollY if we've committed to video control OR we're in video area
          // This prevents auto-commit from slow feedback scrolling
          if (committedToVideoControl.value || initialIsInVideoArea.value) {
            // changeY < 0 when dragging up → increase scroll (collapse video)
            // changeY > 0 when dragging down → decrease scroll (expand video)
            const prevScrollY = scrollY.value
            const next = clampWorklet(
              scrollY.value - e.changeY,
              -PULL_EXPAND,
              MODE_SCROLL_POSITIONS.min
            )
            const scrollYChanged = Math.abs(next - prevScrollY) > 0.1

            if (scrollYChanged) {
              scrollY.value = next
              // Detect pull-to-reveal gesture when overscrolling beyond top
              isPullingToReveal.value = next < -PULL_THRESHOLD
              scrollTo(scrollRef, 0, next, false)
            }
          }

          // MEMORY LEAK FIX: Commented out gesture tracking (dormant AI analysis feature)
          // runOnJS(gestureDetector.trackGestureEvent)({
          //   gestureType: 'rootPan',
          //   phase: 'change',
          //   location: { x: e.x, y: e.y },
          //   translation: { x: e.translationX, y: e.translationY },
          //   velocity: { x: e.velocityX, y: e.velocityY },
          // })
        })
        .onEnd(() => {
          'worklet'
          const currentScrollY = scrollY.value
          // MEMORY LEAK FIX: Removed unused scrollYDelta (was only used in commented-out log)
          // MEMORY LEAK FIX: Commented out runOnJS(log.debug) to prevent closure accumulation
          // runOnJS(log.debug)('useGestureController.rootPan', 'Gesture end - evaluating snap', {
          //   gestureIsActive: gestureIsActive.value,
          //   committedToVideoControl: committedToVideoControl.value,
          //   isFastSwipeVideoModeChange: isFastSwipeVideoModeChange.value,
          //   isPullingToReveal: isPullingToReveal.value,
          //   initialScrollY: Math.round(initialScrollY.value * 100) / 100,
          //   currentScrollY: Math.round(currentScrollY * 100) / 100,
          //   scrollYDelta: Math.round(scrollYDelta * 100) / 100,
          //   feedbackOffset: Math.round(feedbackContentOffsetY.value * 100) / 100,
          //   gestureDirection: gestureDirection.value,
          //   translation: {
          //     x: Math.round(event.translationX * 100) / 100,
          //     y: Math.round(event.translationY * 100) / 100,
          //   },
          //   velocity: {
          //     x: Math.round(event.velocityX * 100) / 100,
          //     y: Math.round(event.velocityY * 100) / 100,
          //   },
          // })

          if (!gestureIsActive.value) {
            // MEMORY LEAK FIX: Commented out runOnJS(log.debug) to prevent closure accumulation
            // runOnJS(log.debug)(
            //   'useGestureController.rootPan',
            //   'Gesture end - SKIPPED (gesture not active, no snap)',
            //   {
            //     scrollYDelta: Math.round(scrollYDelta * 100) / 100,
            //     committedToVideoControl: committedToVideoControl.value,
            //     currentScrollY: Math.round(currentScrollY * 100) / 100,
            //   }
            // )
            return
          }

          // MEMORY LEAK FIX: Commented out gesture tracking (dormant AI analysis feature)
          // runOnJS(gestureDetector.trackGestureEvent)({
          //   gestureType: 'rootPan',
          //   phase: 'end',
          //   location: { x: event.x, y: event.y },
          //   translation: { x: event.translationX, y: event.translationY },
          //   velocity: { x: event.velocityX, y: event.velocityY },
          // })

          // ← CRITICAL: Re-enable ScrollView when gesture ends
          // RE-ENABLE SCROLL: Set shared value directly on UI thread for zero-latency
          feedbackScrollEnabledShared.value = true
          runOnJS(log.debug)('Gesture', 'onEnd: Re-enabled scroll', {
            scrollEnabledValue: feedbackScrollEnabledShared.value,
          })
          // MEMORY LEAK FIX: Batched into single runOnJS call to reduce closure allocation
          runOnJS(batchScrollStateUpdate)({
            scrollEnabled: true,
            blockCompletely: false,
          })
          // MEMORY LEAK FIX: Commented out runOnJS(log.debug) to prevent closure accumulation
          // runOnJS(log.debug)('useGestureController.rootPan', 'Gesture end - re-enabled scroll', {
          //   feedbackScrollEnabled: true,
          //   blockFeedbackScrollCompletely: false,
          //   feedbackOffset: Math.round(feedbackContentOffsetY.value * 100) / 100,
          //   scrollY: Math.round(scrollY.value * 100) / 100,
          //   gestureWasActive: gestureIsActive.value,
          //   committedToVideoControl: committedToVideoControl.value,
          // })

          const targetMode = scrollToMode(currentScrollY)
          const targetScrollPos = modeToScroll(targetMode)

          // MEMORY LEAK FIX: Commented out runOnJS(log.debug) to prevent closure accumulation
          // runOnJS(log.debug)('useGestureController.rootPan', 'Gesture end - SNAPPING to mode', {
          //   targetMode,
          //   targetScrollPos,
          //   fromScrollY: Math.round(currentScrollY * 100) / 100,
          //   snapDistance: Math.round((targetScrollPos - currentScrollY) * 100) / 100,
          //   committedToVideoControl: committedToVideoControl.value,
          //   isFastSwipeVideoModeChange: isFastSwipeVideoModeChange.value,
          //   isPullingToReveal: isPullingToReveal.value,
          //   scrollYDelta: Math.round(scrollYDelta * 100) / 100,
          //   feedbackOffset: Math.round(feedbackContentOffsetY.value * 100) / 100,
          //   reason: committedToVideoControl.value
          //     ? 'committed to video control'
          //     : isFastSwipeVideoModeChange.value
          //       ? 'fast swipe mode change'
          //       : isPullingToReveal.value
          //         ? 'pull-to-reveal'
          //         : 'gesture active but not committed (possible bug)',
          //   snapDuration: SNAP_DURATION_MS,
          // })

          scrollY.value = withTiming(targetScrollPos, {
            duration: SNAP_DURATION_MS,
            easing: SNAP_EASING,
          })
          scrollTo(scrollRef, 0, targetScrollPos, true)

          // MEMORY LEAK FIX: Commented out runOnJS(log.warn) to prevent closure accumulation
          // Log if feedback offset is non-zero when snapping - this might indicate an issue
          // if (feedbackContentOffsetY.value > 0) {
          //   runOnJS(log.warn)(
          //     'useGestureController.rootPan',
          //     'Feedback panel has non-zero offset during mode snap - may cause scroll issues',
          //     {
          //       feedbackOffset: Math.round(feedbackContentOffsetY.value * 100) / 100,
          //       targetMode,
          //       fromScrollY: Math.round(currentScrollY * 100) / 100,
          //       targetScrollPos,
          //     }
          //   )
          // }
        })
        .onFinalize(() => {
          'worklet'
          // MEMORY LEAK FIX: Commented out gesture tracking (dormant AI analysis feature)
          // runOnJS(gestureDetector.trackGestureEvent)({
          //   gestureType: 'rootPan',
          //   phase: 'finalize',
          //   location: { x: event.x, y: event.y },
          //   translation: { x: event.translationX, y: event.translationY },
          //   velocity: { x: event.velocityX, y: event.velocityY },
          // })

          // Gesture finalize - resetting state
          gestureIsActive.value = false
          gestureDirection.value = 'unknown'
          gestureVelocity.value = 0
          gestureStartTime.value = 0
          initialTouchY.value = 0
          initialTouchX.value = 0
          initialIsInVideoArea.value = false
          isFastSwipeVideoModeChange.value = false
          committedToVideoControl.value = false
          initialScrollY.value = 0
          isLeftEdgeSwipe.value = false
          totalTranslationY.value = 0
        }),
    [
      isProcessing, // Recreate gesture when processing state changes
      rootPanRef,
      feedbackScrollGestureRef,
      // Note: isFeedbackAtTop is a SharedValue - its .value changes don't trigger re-renders
      // Scroll blocking is handled dynamically in gesture handlers via isFeedbackAtTop.value checks
      // Callbacks (setFeedbackScrollEnabledTransition, batchScrollStateUpdate) are stable via useCallback
    ]
  )

  // Memoize return value with PRIMITIVE deps (not rootPan which changes every render)
  // rootPan MUST be new every render (Reanimated), but we accept that and only memoize
  // based on the primitive state values and stable callbacks
  const pullToRevealControl = useMemo<PullToRevealControl>(
    () => ({
      subscribe: subscribePullToReveal,
      getSnapshot: getPullToRevealSnapshot,
    }),
    [getPullToRevealSnapshot, subscribePullToReveal]
  )

  return useMemo(
    () =>
      ({
        rootPan,
        rootPanRef,
        feedbackScroll: feedbackScrollControl,
        pullToReveal: pullToRevealControl,
        onFeedbackScrollY,
        onFeedbackMomentumScrollEnd,
        feedbackScrollEnabledShared,
        feedbackScrollGestureRef,
      }) as UseGestureControllerReturn,
    [
      rootPan,
      rootPanRef,
      feedbackScrollControl,
      pullToRevealControl,
      onFeedbackScrollY,
      onFeedbackMomentumScrollEnd,
      feedbackScrollEnabledShared,
      feedbackScrollGestureRef,
    ]
  )
}
