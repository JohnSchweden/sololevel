import { log } from '@my/logging'
import { useCallback, useRef, useState } from 'react'
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
  const isPullingToReveal = useSharedValue(false)
  const initialIsInVideoArea = useSharedValue(false)
  const isFastSwipeVideoModeChange = useSharedValue(false)

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

  // Ref for gesture handler
  const rootPanRef = useRef<GestureType | undefined>(undefined)

  // Feedback scroll callbacks
  const onFeedbackScrollY = useCallback(
    (scrollYValue: number) => {
      feedbackContentOffsetY.value = scrollYValue
    },
    [feedbackContentOffsetY]
  )

  const onFeedbackMomentumScrollEnd = useCallback(() => {
    log.debug('VideoAnalysisScreen.onFeedbackMomentumScrollEnd', 'Momentum scroll ended', {
      feedbackOffset: feedbackContentOffsetY.value,
    })
  }, [feedbackContentOffsetY])

  // Pan gesture with YouTube-style delegation
  const rootPan = Gesture.Pan()
    .withRef(rootPanRef)
    .minDistance(5)
    .activeOffsetY([-20, 20])
    .activeOffsetX([-40, 40])
    .onTouchesDown((event) => {
      'worklet'
      const touchY = event.allTouches[0]?.y ?? 0
      const scrollValue = scrollY.value
      const currentVideoHeight = calculateVideoHeight(scrollValue)
      const isInVideoArea = touchY < currentVideoHeight

      // Track gesture event for AI analysis
      runOnJS(gestureDetector.trackGestureEvent)({
        gestureType: 'rootPan',
        phase: 'begin',
        location: {
          x: event.allTouches[0]?.x ?? 0,
          y: touchY,
        },
        translation: { x: 0, y: 0 },
        velocity: { x: 0, y: 0 },
      })

      runOnJS(log.debug)('VideoAnalysisScreen.rootPan', 'Touch down', {
        scrollY: scrollValue,
        feedbackOffset: feedbackContentOffsetY.value,
        touchLocation: {
          x: event.allTouches[0]?.x ?? 0,
          y: touchY,
        },
        isInVideoArea,
        currentVideoHeight,
        staticVideoNormalHeight: VIDEO_HEIGHTS.normal,
      })
    })
    .onBegin((event) => {
      'worklet'
      // Reset tracking values and store initial touch info
      gestureDirection.value = 'unknown'
      gestureVelocity.value = 0
      gestureStartTime.value = Date.now()
      initialTouchY.value = event.y
      isFastSwipeVideoModeChange.value = false

      // Check if touch started in video area or if feedback panel is at top
      const touchY = event.y
      const scrollValue = scrollY.value
      const currentVideoHeight = calculateVideoHeight(scrollValue)
      const isInVideoArea = touchY < currentVideoHeight
      const isAtTop = feedbackContentOffsetY.value <= 0

      // Store initial touch area for consistent decision making
      initialIsInVideoArea.value = isInVideoArea

      // Initial activation logic:
      // - Video area touches: Always activate immediately
      // - Feedback area touches: Only activate if at top (will refine based on direction later)
      gestureIsActive.value = isInVideoArea || isAtTop

      if (!gestureIsActive.value) {
        runOnJS(log.debug)(
          'VideoAnalysisScreen.rootPan',
          'Gesture begin - IGNORED (not in video area and not at feedback top)',
          {
            feedbackOffset: feedbackContentOffsetY.value,
            touchY,
            isInVideoArea,
            isAtTop,
            currentVideoHeight,
            staticVideoNormalHeight: VIDEO_HEIGHTS.normal,
            scrollValue,
          }
        )
      } else if (isInVideoArea) {
        // Video area touches: Immediately commit to gesture control
        runOnJS(setFeedbackScrollEnabled)(false)
        runOnJS(log.debug)(
          'VideoAnalysisScreen.rootPan',
          'Gesture begin - ACTIVE (video area, ScrollView disabled)',
          {
            feedbackOffset: feedbackContentOffsetY.value,
            scrollY: scrollValue,
            touchY,
            isInVideoArea,
            isAtTop,
            currentVideoHeight,
          }
        )
      } else {
        // Feedback area touches: Wait for direction and velocity before committing
        runOnJS(log.debug)(
          'VideoAnalysisScreen.rootPan',
          'Gesture begin - TENTATIVE (feedback area, waiting for direction/velocity)',
          {
            feedbackOffset: feedbackContentOffsetY.value,
            scrollY: scrollValue,
            touchY,
            isInVideoArea,
            isAtTop,
            currentVideoHeight,
          }
        )
      }
    })
    .onStart((event) => {
      'worklet'
      if (!gestureIsActive.value) {
        runOnJS(log.debug)(
          'VideoAnalysisScreen.rootPan',
          'Gesture start - SKIPPED (not active)',
          {}
        )
        return
      }

      // Track gesture start for AI analysis
      runOnJS(gestureDetector.trackGestureEvent)({
        gestureType: 'rootPan',
        phase: 'start',
        location: { x: event.x, y: event.y },
        translation: { x: event.translationX, y: event.translationY },
        velocity: { x: event.velocityX, y: event.velocityY },
      })

      isPullingToReveal.value = false
      runOnJS(log.debug)('VideoAnalysisScreen.rootPan', 'Gesture start - ACTIVE', {
        scrollY: scrollY.value,
        gestureActive: gestureIsActive.value,
      })
    })
    .onChange((e) => {
      'worklet'
      if (!gestureIsActive.value) return

      const isPrimarilyVertical = Math.abs(e.changeY) > Math.abs(e.changeX)
      if (!isPrimarilyVertical) return

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
            runOnJS(setFeedbackScrollEnabled)(false)
            runOnJS(setBlockFeedbackScrollCompletely)(true)
            runOnJS(log.debug)(
              'VideoAnalysisScreen.rootPan',
              'Fast swipe detected - video mode change',
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
              }
            )
          } else {
            // Slow swipe UP → Hand off to ScrollView for feedback scrolling
            gestureIsActive.value = false
            runOnJS(setFeedbackScrollEnabled)(true)
            runOnJS(log.debug)(
              'VideoAnalysisScreen.rootPan',
              'Slow swipe - handed off to ScrollView',
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
              }
            )
            return
          }
        } else {
          // All other cases: Commit to gesture control
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
          })
        }
      }

      // changeY < 0 when dragging up → increase scroll (collapse video)
      // changeY > 0 when dragging down → decrease scroll (expand video)
      const next = clampWorklet(scrollY.value - e.changeY, -PULL_EXPAND, MODE_SCROLL_POSITIONS.min)
      scrollY.value = next
      // Detect pull-to-reveal gesture when overscrolling beyond top
      isPullingToReveal.value = next < -PULL_THRESHOLD
      scrollTo(scrollRef, 0, next, false)

      // Track gesture change for AI analysis
      runOnJS(gestureDetector.trackGestureEvent)({
        gestureType: 'rootPan',
        phase: 'change',
        location: { x: e.x, y: e.y },
        translation: { x: e.translationX, y: e.translationY },
        velocity: { x: e.velocityX, y: e.velocityY },
      })

      if (Math.abs(e.changeY) > 10) {
        runOnJS(log.debug)('VideoAnalysisScreen.rootPan', 'Gesture onChange - moving video', {
          changeY: Math.round(e.changeY * 100) / 100,
          newScrollY: Math.round(next * 100) / 100,
          direction: gestureDirection.value,
          gestureActive: gestureIsActive.value,
        })
      }
    })
    .onEnd((event) => {
      'worklet'
      if (!gestureIsActive.value) {
        runOnJS(log.debug)('VideoAnalysisScreen.rootPan', 'Gesture end - SKIPPED (not active)', {})
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

      const targetMode = scrollToMode(scrollY.value)
      const targetScrollPos = modeToScroll(targetMode)
      scrollY.value = withTiming(targetScrollPos, {
        duration: SNAP_DURATION_MS,
        easing: SNAP_EASING,
      })
      scrollTo(scrollRef, 0, targetScrollPos, true)
      runOnJS(log.debug)(
        'VideoAnalysisScreen.rootPan',
        'Gesture end - snapping to mode (ScrollView re-enabled)',
        {
          targetMode,
          targetScrollPos,
          fromScrollY: Math.round(scrollY.value * 100) / 100,
        }
      )
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

      gestureIsActive.value = false
      gestureDirection.value = 'unknown'
      gestureVelocity.value = 0
      gestureStartTime.value = 0
      initialTouchY.value = 0
      initialIsInVideoArea.value = false
      isFastSwipeVideoModeChange.value = false
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
