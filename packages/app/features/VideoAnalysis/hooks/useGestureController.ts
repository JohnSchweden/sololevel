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

// Worklet clamp for UI thread
const clampWorklet = (v: number, min: number, max: number) => {
  'worklet'
  return Math.max(min, Math.min(v, max))
}

// Worklet: Convert scroll position to nearest mode
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

// Worklet: Get scroll position for a given mode
const modeToScroll = (mode: VideoMode): number => {
  'worklet'
  return MODE_SCROLL_POSITIONS[mode]
}

// Worklet: Calculate current video height from scroll position
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
 * Manages touch delegation between video pan gestures and feedback ScrollView:
 * - Video area touches → immediate gesture control
 * - Feedback area touches → direction + velocity-based delegation
 * - Fast swipes → video mode changes
 * - Slow swipes → feedback scrolling
 * - Pull-to-reveal → expand video beyond max height
 *
 * @param scrollY - Shared value tracking video scroll position (0 = max, positive = collapsed)
 * @param feedbackContentOffsetY - Shared value tracking feedback panel scroll position
 * @param scrollRef - Animated ref to the main scroll container
 * @returns Gesture controller interface with pan gesture and scroll state
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
