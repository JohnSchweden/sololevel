import { log } from '@my/logging'
import { useCallback, useEffect, useRef, useState } from 'react'
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
import { useGestureConflictDetector } from './useGestureConflictDetector'

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
    return 'normal'
  }

  // Find closest mode based on scroll position
  const modes: VideoMode[] = ['max', 'normal', 'min']
  let nearestMode: VideoMode = 'max'
  let minDistance = Math.abs(scrollValue - MODE_SCROLL_POSITIONS.max)

  for (const mode of modes) {
    const distance = Math.abs(scrollValue - MODE_SCROLL_POSITIONS[mode])
    if (distance < minDistance) {
      minDistance = distance
      nearestMode = mode
    }
  }

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
 * - Feedback area touches (at top) → direction + velocity-based delegation:
 *   - Fast swipe UP (>0.3 px/ms) → video mode change (normal → min)
 *   - Slow swipe UP → feedback ScrollView scrolling
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
 * │    │  ├─ Fast swipe (>0.3 px/ms)?                       │
 * │    │  │  └─ YES: Block scroll, change video mode        │
 * │    │  └─ Slow swipe (<0.3 px/ms)?                       │
 * │    │     └─ YES: Hand off to ScrollView                 │
 * │    └─ All other cases: Commit to gesture control        │
 * │                                                            │
 * │ 3. Update scroll position: scrollY -= changeY            │
 * │                                                            │
 * │ 4. Detect pull-to-reveal: scrollY < -PULL_THRESHOLD?    │
 * │    └─ YES: Set isPullingToReveal = true (UI indicator)   │
 * │                                                            │
 * │ 5. Sync scroll ref: scrollTo(scrollRef, 0, scrollY)      │
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
 * @returns Gesture controller interface with pan gesture, scroll state, and callbacks
 *
 * @example
 * ```typescript
 * // In useVideoAnalysisOrchestrator:
 * const animation = useAnimationController()
 * const gesture = useGestureController(
 *   animation.scrollY,
 *   animation.feedbackContentOffsetY,
 *   animation.scrollRef
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
export interface UseGestureControllerReturn {
  /** Pan gesture handler for root view */
  rootPan: GestureType
  /** Ref for the root pan gesture (must be passed to GestureDetector) */
  rootPanRef: React.MutableRefObject<GestureType | undefined>
  /** Whether feedback ScrollView should accept scroll events */
  feedbackScrollEnabled: boolean
  /** Whether feedback ScrollView should be completely blocked (for fast swipes) */
  blockFeedbackScrollCompletely: boolean
  /** JavaScript-accessible pull-to-reveal state (for UI indicators) */
  isPullingToRevealJS: boolean
  /** Callback to update feedback scroll position from ScrollView */
  onFeedbackScrollY: (scrollY: number) => void
  /** Callback when feedback scroll momentum ends */
  onFeedbackMomentumScrollEnd: () => void
}

export function useGestureController(
  scrollY: SharedValue<number>,
  feedbackContentOffsetY: SharedValue<number>,
  scrollRef: AnimatedRef<Animated.ScrollView>
): UseGestureControllerReturn {
  // AI-powered gesture conflict detection
  const gestureDetector = useGestureConflictDetector()

  // Scroll blocking state - controls whether feedback ScrollView can scroll
  const [feedbackScrollEnabled, setFeedbackScrollEnabled] = useState(true)
  const [blockFeedbackScrollCompletely, setBlockFeedbackScrollCompletely] = useState(false)

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

  // Pull-to-reveal state (JavaScript-accessible for UI indicators)
  const [isPullingToRevealJS, setIsPullingToRevealJS] = useState(false)

  // Bridge UI-thread pull state to JS for context consumers
  useAnimatedReaction(
    () => isPullingToReveal.value,
    (value, prev) => {
      if (value !== prev) {
        runOnJS(setIsPullingToRevealJS)(value)
      }
    },
    []
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
  ])

  // Ref for gesture handler
  const rootPanRef = useRef<GestureType | undefined>(undefined)

  // Feedback scroll callbacks
  const onFeedbackScrollY = useCallback(
    (scrollYValue: number) => {
      const prevOffset = feedbackContentOffsetY.value
      feedbackContentOffsetY.value = scrollYValue

      // Only log significant changes to reduce noise
      if (Math.abs(scrollYValue - prevOffset) > 5) {
        log.debug('VideoAnalysisScreen.onFeedbackScrollY', 'Feedback scroll position changed', {
          prevOffset: Math.round(prevOffset * 100) / 100,
          newOffset: Math.round(scrollYValue * 100) / 100,
          delta: Math.round((scrollYValue - prevOffset) * 100) / 100,
          scrollY: Math.round(scrollY.value * 100) / 100,
          gestureIsActive: gestureIsActive.value,
          committedToVideoControl: committedToVideoControl.value,
        })
      }
    },
    [feedbackContentOffsetY, scrollY, gestureIsActive, committedToVideoControl]
  )

  const onFeedbackMomentumScrollEnd = useCallback(() => {
    log.debug('VideoAnalysisScreen.onFeedbackMomentumScrollEnd', 'Momentum scroll ended', {
      feedbackOffset: Math.round(feedbackContentOffsetY.value * 100) / 100,
      scrollY: Math.round(scrollY.value * 100) / 100,
      gestureIsActive: gestureIsActive.value,
      committedToVideoControl: committedToVideoControl.value,
    })
  }, [feedbackContentOffsetY, scrollY, gestureIsActive, committedToVideoControl])

  // Pan gesture with YouTube-style delegation
  // CRITICAL: Only activate on vertical movement to avoid claiming back navigation gestures
  // Use failOffsetX to fail immediately on any rightward horizontal swipe
  const rootPan = Gesture.Pan()
    .withRef(rootPanRef)
    .minDistance(5)
    // Only activate on vertical movement (up/down) - NOT horizontal
    // This prevents claiming rightward swipes used for back navigation
    .activeOffsetY([-20, 20])
    // Don't use activeOffsetX - we only want vertical gestures
    // Fail immediately on rightward horizontal swipes (back navigation area)
    // This fails BEFORE activation can occur, allowing system back gesture
    .failOffsetX([Number.NEGATIVE_INFINITY, 10])
    .onTouchesDown((event) => {
      'worklet'
      // Track gesture event for AI analysis
      runOnJS(gestureDetector.trackGestureEvent)({
        gestureType: 'rootPan',
        phase: 'begin',
        location: {
          x: event.allTouches[0]?.x ?? 0,
          y: event.allTouches[0]?.y ?? 0,
        },
        translation: { x: 0, y: 0 },
        velocity: { x: 0, y: 0 },
      })
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
        runOnJS(setFeedbackScrollEnabled)(false)
      }
      // Left-edge touches and feedback area touches wait for direction in onChange
    })
    .onStart((event) => {
      'worklet'
      if (!gestureIsActive.value) return

      // Track gesture start for AI analysis
      runOnJS(gestureDetector.trackGestureEvent)({
        gestureType: 'rootPan',
        phase: 'start',
        location: { x: event.x, y: event.y },
        translation: { x: event.translationX, y: event.translationY },
        velocity: { x: event.velocityX, y: event.velocityY },
      })

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
          runOnJS(setFeedbackScrollEnabled)(true)
          return
        }

        // Left-edge touch that's NOT horizontal-right: commit to gesture control for vertical gestures
        if (!committedToVideoControl.value) {
          const isPrimarilyVertical = Math.abs(e.changeY) > Math.abs(e.changeX)
          if (isPrimarilyVertical && Math.abs(e.changeY) > 5) {
            // Left-edge vertical gesture - commit to video control
            committedToVideoControl.value = true
            runOnJS(setFeedbackScrollEnabled)(false)
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

      // Detect gesture direction and velocity on first significant movement
      if (gestureDirection.value === 'unknown' && Math.abs(e.changeY) > 8) {
        gestureDirection.value = e.changeY > 0 ? 'down' : 'up'

        // Calculate velocity (pixels per millisecond)
        const timeDelta = Date.now() - gestureStartTime.value
        gestureVelocity.value = Math.abs(e.changeY) / Math.max(timeDelta, 1)

        // Use initial touch area for consistent decision making
        const scrollValue = scrollY.value
        const currentVideoHeight = calculateVideoHeight(scrollValue)
        const isInVideoArea = initialIsInVideoArea.value // Use stored initial value
        const isAtTop = feedbackContentOffsetY.value <= 0
        const isNormalMode =
          scrollValue >= MODE_SCROLL_POSITIONS.max && scrollValue <= MODE_SCROLL_POSITIONS.normal

        // Fast swipe threshold (adjust based on testing) - more lenient for reliability
        const FAST_SWIPE_THRESHOLD = 0.3 // pixels per millisecond (300 px/s) - reduced for easier triggering
        const isFastSwipe = gestureVelocity.value > FAST_SWIPE_THRESHOLD

        // Decision logic for feedback area touches:
        if (!isInVideoArea && isAtTop && gestureDirection.value === 'up') {
          if (isNormalMode && isFastSwipe) {
            // Fast swipe UP in normal mode → Change to min mode (don't scroll feedback)
            isFastSwipeVideoModeChange.value = true
            committedToVideoControl.value = true
            runOnJS(setFeedbackScrollEnabled)(false)
            runOnJS(setBlockFeedbackScrollCompletely)(true)
            runOnJS(log.debug)(
              'VideoAnalysisScreen.rootPan',
              'Fast swipe detected - video mode change (COMMITTED)',
              {
                direction: gestureDirection.value,
                velocity: Math.round(gestureVelocity.value * 1000) / 1000,
                isNormalMode,
                isFastSwipe,
                threshold: FAST_SWIPE_THRESHOLD,
                initialTouchY: initialTouchY.value,
                currentVideoHeight,
                isInVideoArea,
                isAtTop,
                scrollValue,
                initialScrollY: initialScrollY.value,
              }
            )
          } else {
            // Slow swipe UP → Hand off to ScrollView for feedback scrolling
            const wasActive = gestureIsActive.value
            gestureIsActive.value = false
            runOnJS(setFeedbackScrollEnabled)(true)
            runOnJS(log.debug)(
              'VideoAnalysisScreen.rootPan',
              'Slow swipe - handed off to ScrollView (NOT COMMITTED)',
              {
                wasActive,
                nowActive: false,
                direction: gestureDirection.value,
                velocity: Math.round(gestureVelocity.value * 1000) / 1000,
                isNormalMode,
                isFastSwipe,
                threshold: FAST_SWIPE_THRESHOLD,
                initialTouchY: initialTouchY.value,
                currentVideoHeight,
                isInVideoArea,
                isAtTop,
                scrollValue,
                initialScrollY: initialScrollY.value,
                committedToVideoControl: committedToVideoControl.value,
              }
            )
            return
          }
        } else if (!isInVideoArea && !isAtTop) {
          // CRITICAL FIX: Feedback area is already scrolled (not at top)
          // Do NOT commit to video control - this would steal the scroll gesture
          // and reset the feedback scroll position
          const wasActive = gestureIsActive.value
          gestureIsActive.value = false
          runOnJS(setFeedbackScrollEnabled)(true)
          runOnJS(log.debug)(
            'VideoAnalysisScreen.rootPan',
            'Feedback area scrolled - handed off to ScrollView (NOT COMMITTED)',
            {
              wasActive,
              nowActive: false,
              direction: gestureDirection.value,
              velocity: Math.round(gestureVelocity.value * 1000) / 1000,
              isInVideoArea,
              isAtTop,
              feedbackOffset: feedbackContentOffsetY.value,
              scrollValue,
              initialScrollY: initialScrollY.value,
              reason: 'feedback-already-scrolled',
            }
          )
          return
        } else {
          // All other cases: Commit to gesture control
          committedToVideoControl.value = true
          runOnJS(setFeedbackScrollEnabled)(false)
          runOnJS(log.debug)('VideoAnalysisScreen.rootPan', 'Gesture committed to video control', {
            direction: gestureDirection.value,
            velocity: Math.round(gestureVelocity.value * 1000) / 1000,
            isInVideoArea,
            isAtTop,
            initialTouchY: initialTouchY.value,
            currentVideoHeight,
            scrollValue,
            isNormalMode,
            isFastSwipe,
            threshold: FAST_SWIPE_THRESHOLD,
            initialScrollY: initialScrollY.value,
            committedToVideoControl: committedToVideoControl.value,
          })
        }
      }

      // changeY < 0 when dragging up → increase scroll (collapse video)
      // changeY > 0 when dragging down → decrease scroll (expand video)
      const prevScrollY = scrollY.value
      const next = clampWorklet(scrollY.value - e.changeY, -PULL_EXPAND, MODE_SCROLL_POSITIONS.min)
      const scrollYChanged = Math.abs(next - prevScrollY) > 0.1

      if (scrollYChanged) {
        scrollY.value = next
        // Detect pull-to-reveal gesture when overscrolling beyond top
        isPullingToReveal.value = next < -PULL_THRESHOLD
        scrollTo(scrollRef, 0, next, false)

        runOnJS(log.debug)('VideoAnalysisScreen.rootPan', 'onChange - scrollY moved', {
          prevScrollY: Math.round(prevScrollY * 100) / 100,
          nextScrollY: Math.round(next * 100) / 100,
          changeY: Math.round(e.changeY * 100) / 100,
          totalChange: Math.round((next - initialScrollY.value) * 100) / 100,
          gestureActive: gestureIsActive.value,
          committedToVideoControl: committedToVideoControl.value,
          isPullingToReveal: isPullingToReveal.value,
          feedbackOffset: feedbackContentOffsetY.value,
        })
      }

      // Track gesture change for AI analysis
      runOnJS(gestureDetector.trackGestureEvent)({
        gestureType: 'rootPan',
        phase: 'change',
        location: { x: e.x, y: e.y },
        translation: { x: e.translationX, y: e.translationY },
        velocity: { x: e.velocityX, y: e.velocityY },
      })
    })
    .onEnd((event) => {
      'worklet'
      const currentScrollY = scrollY.value
      const scrollYDelta = currentScrollY - initialScrollY.value

      runOnJS(log.debug)('VideoAnalysisScreen.rootPan', 'Gesture end - evaluating snap', {
        gestureIsActive: gestureIsActive.value,
        committedToVideoControl: committedToVideoControl.value,
        isFastSwipeVideoModeChange: isFastSwipeVideoModeChange.value,
        isPullingToReveal: isPullingToReveal.value,
        initialScrollY: Math.round(initialScrollY.value * 100) / 100,
        currentScrollY: Math.round(currentScrollY * 100) / 100,
        scrollYDelta: Math.round(scrollYDelta * 100) / 100,
        feedbackOffset: feedbackContentOffsetY.value,
        gestureDirection: gestureDirection.value,
        translation: {
          x: Math.round(event.translationX * 100) / 100,
          y: Math.round(event.translationY * 100) / 100,
        },
        velocity: {
          x: Math.round(event.velocityX * 100) / 100,
          y: Math.round(event.velocityY * 100) / 100,
        },
      })

      if (!gestureIsActive.value) {
        runOnJS(log.debug)(
          'VideoAnalysisScreen.rootPan',
          'Gesture end - SKIPPED (gesture not active, no snap)',
          {
            scrollYDelta: Math.round(scrollYDelta * 100) / 100,
            committedToVideoControl: committedToVideoControl.value,
          }
        )
        return
      }

      // Track gesture end for AI analysis
      runOnJS(gestureDetector.trackGestureEvent)({
        gestureType: 'rootPan',
        phase: 'end',
        location: { x: event.x, y: event.y },
        translation: { x: event.translationX, y: event.translationY },
        velocity: { x: event.velocityX, y: event.velocityY },
      })

      // ← CRITICAL: Re-enable ScrollView when gesture ends
      runOnJS(setFeedbackScrollEnabled)(true)
      runOnJS(setBlockFeedbackScrollCompletely)(false)
      runOnJS(log.debug)('VideoAnalysisScreen.rootPan', 'Gesture end - re-enabled scroll', {
        feedbackScrollEnabled: true,
        blockFeedbackScrollCompletely: false,
        feedbackOffset: feedbackContentOffsetY.value,
        scrollY: scrollY.value,
        gestureWasActive: gestureIsActive.value,
        committedToVideoControl: committedToVideoControl.value,
      })

      const targetMode = scrollToMode(currentScrollY)
      const targetScrollPos = modeToScroll(targetMode)

      runOnJS(log.debug)('VideoAnalysisScreen.rootPan', 'Gesture end - SNAPPING to mode', {
        targetMode,
        targetScrollPos,
        fromScrollY: Math.round(currentScrollY * 100) / 100,
        snapDistance: Math.round((targetScrollPos - currentScrollY) * 100) / 100,
        committedToVideoControl: committedToVideoControl.value,
        isFastSwipeVideoModeChange: isFastSwipeVideoModeChange.value,
        isPullingToReveal: isPullingToReveal.value,
        scrollYDelta: Math.round(scrollYDelta * 100) / 100,
        feedbackOffset: feedbackContentOffsetY.value,
        reason: committedToVideoControl.value
          ? 'committed to video control'
          : isFastSwipeVideoModeChange.value
            ? 'fast swipe mode change'
            : isPullingToReveal.value
              ? 'pull-to-reveal'
              : 'gesture active but not committed (possible bug)',
      })

      scrollY.value = withTiming(targetScrollPos, {
        duration: SNAP_DURATION_MS,
        easing: SNAP_EASING,
      })
      scrollTo(scrollRef, 0, targetScrollPos, true)

      // Log if feedback offset is non-zero when snapping - this might indicate an issue
      if (feedbackContentOffsetY.value > 0) {
        runOnJS(log.warn)(
          'VideoAnalysisScreen.rootPan',
          'Feedback panel has non-zero offset during mode snap - may cause scroll issues',
          {
            feedbackOffset: feedbackContentOffsetY.value,
            targetMode,
            fromScrollY: currentScrollY,
            targetScrollPos,
          }
        )
      }
    })
    .onFinalize((event) => {
      'worklet'
      // Track gesture finalize for AI analysis
      runOnJS(gestureDetector.trackGestureEvent)({
        gestureType: 'rootPan',
        phase: 'finalize',
        location: { x: event.x, y: event.y },
        translation: { x: event.translationX, y: event.translationY },
        velocity: { x: event.velocityX, y: event.velocityY },
      })

      runOnJS(log.debug)('VideoAnalysisScreen.rootPan', 'Gesture finalize - resetting state', {
        wasActive: gestureIsActive.value,
        wasCommitted: committedToVideoControl.value,
        finalScrollY: Math.round(scrollY.value * 100) / 100,
        initialScrollY: Math.round(initialScrollY.value * 100) / 100,
        scrollYDelta: Math.round((scrollY.value - initialScrollY.value) * 100) / 100,
        feedbackOffset: feedbackContentOffsetY.value,
      })

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
    })

  return {
    rootPan,
    rootPanRef,
    feedbackScrollEnabled,
    blockFeedbackScrollCompletely,
    isPullingToRevealJS,
    onFeedbackScrollY,
    onFeedbackMomentumScrollEnd,
  }
}
