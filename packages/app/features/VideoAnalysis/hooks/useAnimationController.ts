import { Dimensions } from 'react-native'
import type { ViewStyle } from 'react-native'
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedRef,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  type AnimatedRef,
  type AnimatedStyle,
  type DerivedValue,
  type SharedValue,
} from 'react-native-reanimated'

// Animation constants - Mode-based system
const { height: SCREEN_H } = Dimensions.get('window')

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

// Initial state - opens at normal size (60%)
const INITIAL_SCROLL_Y = MODE_SCROLL_POSITIONS.normal

/**
 * Animation controller for VideoAnalysisScreen
 *
 * Manages mode-based video height transitions and animated styles using Reanimated
 * derived values and animated styles. All calculations run on the UI thread.
 *
 * **Core Responsibility:** Provide interpolated animations based on scroll position
 * (which is driven by useGestureController).
 *
 * ## Data Flow & Coordination
 *
 * ```
 * useGestureController          useAnimationController
 * ════════════════════════════════════════════════════════════════
 *
 * scrollY (shared value)  ──┐
 *                            ├─→ Drives all derived values
 * feedbackContentOffsetY  ──┘   and animated styles
 *
 * (user gesture)
 *     ↓
 * Modifies scrollY.value
 *     ↓
 * Triggers useDerivedValue
 * recomputation on UI thread
 *     ↓
 * Recalculates:
 * - headerHeight
 * - collapseProgress
 * - Animated styles
 *     ↓
 * UI reflects changes
 * (no JS bridge round-trip)
 * ```
 *
 * ## Animation Calculation Pipeline
 *
 * ```
 * Input: scrollY (from gesture)
 *    ↓
 * ┌──────────────────────────────────────────────────────────────┐
 * │ 1. Calculate headerHeight via interpolation                  │
 * │                                                              │
 * │ Three phases based on scrollY position:                      │
 * │                                                              │
 * │ Phase 1: Pull-to-Reveal (scrollY < 0)                       │
 * │ ┌────────────────────────────────────────────────┐          │
 * │ │ scrollY: -170 ─→ -200 (user overscrolls up)    │          │
 * │ │ expansion = interpolate(pullDistance,          │          │
 * │ │              [0, 200], [0, 280])               │          │
 * │ │ headerHeight = 852 + expansion                 │          │
 * │ │ Result: 852 ─→ 920px+ (visual pull feedback)   │          │
 * │ └────────────────────────────────────────────────┘          │
 * │                                                              │
 * │ Phase 2: Max → Normal (0 ≤ scrollY ≤ 237)                  │
 * │ ┌────────────────────────────────────────────────┐          │
 * │ │ scrollY: 0 ─→ 237                              │          │
 * │ │ progress = scrollY / 237                       │          │
 * │ │ headerHeight = interpolate(scrollY,            │          │
 * │ │              [0, 237], [852, 511],             │          │
 * │ │              Extrapolation.CLAMP)              │          │
 * │ │ Result: 852 ─→ 511px (smooth collapse)        │          │
 * │ └────────────────────────────────────────────────┘          │
 * │                                                              │
 * │ Phase 3: Normal → Min (237 < scrollY ≤ 401)                │
 * │ ┌────────────────────────────────────────────────┐          │
 * │ │ scrollY: 237 ─→ 401                            │          │
 * │ │ progress = (scrollY - 237) / 164               │          │
 * │ │ headerHeight = interpolate(scrollY,            │          │
 * │ │              [237, 401], [511, 281],           │          │
 * │ │              Extrapolation.CLAMP)              │          │
 * │ │ Result: 511 ─→ 281px (further collapse)       │          │
 * │ └────────────────────────────────────────────────┘          │
 * │                                                              │
 * └──────────────────────────────────────────────────────────────┘
 *    ↓ (useDerivedValue)
 * ┌──────────────────────────────────────────────────────────────┐
 * │ 2. Calculate collapseProgress (0 → 1 mapping)               │
 * │                                                              │
 * │ Progress represents animation completion:                    │
 * │ - 0.0 = Max mode (full screen video)                        │
 * │ - 0.5 = Normal mode (60% video, 40% feedback)               │
 * │ - 1.0 = Min mode (33% video, 67% feedback)                  │
 * │                                                              │
 * │ Used for controlling secondary animations:                   │
 * │ - Header fade/opacity                                       │
 * │ - Text size adjustments                                     │
 * │ - Button positioning                                        │
 * │                                                              │
 * │ Calculation:                                                │
 * │ if (headerHeight ≥ 511)                                     │
 * │   progress = interpolate(headerHeight, [852, 511], [0, 0.5])│
 * │ else                                                         │
 * │   progress = interpolate(headerHeight, [511, 281], [0.5, 1])│
 * │                                                              │
 * └──────────────────────────────────────────────────────────────┘
 *    ↓ (useDerivedValue)
 * ┌──────────────────────────────────────────────────────────────┐
 * │ 3. Create animated styles (useAnimatedStyle)                │
 * │                                                              │
 * │ A) headerStyle                                              │
 * │    ├─ height: headerHeight.value                            │
 * │    └─ Directly controls video container height              │
 * │                                                              │
 * │ B) feedbackSectionStyle                                     │
 * │    ├─ height: SCREEN_H - headerHeight.value                │
 * │    └─ Dynamically fills remaining space                     │
 * │                                                              │
 * │ C) pullIndicatorStyle                                       │
 * │    ├─ opacity: interpolate(scrollY, [-170, -200], [0, 1])  │
 * │    ├─ transform.translateY: based on pull distance          │
 * │    └─ Subtle visual feedback when overscrolling             │
 * │                                                              │
 * └──────────────────────────────────────────────────────────────┘
 *    ↓
 * Output: Animated UI
 * - Video resizes smoothly
 * - Feedback panel repositions
 * - Pull indicator fades in/out
 * - All on UI thread (60fps capable)
 * ```
 *
 * ## Pixel Value Reference
 *
 * Device: iPhone with ~852px screen height
 * - **Max Mode** (scroll=0): 852px video (100% of screen)
 * - **Normal Mode** (scroll≈237): 511px video (60% of screen)
 * - **Min Mode** (scroll≈401): 281px video (33% of screen)
 * - **Pull-to-Reveal** (scroll < 0): >852px (expandable)
 *
 * ## Integration with useGestureController
 *
 * **Gesture → Animation Flow:**
 * 1. User performs pan gesture
 * 2. useGestureController updates scrollY.value
 * 3. Reanimated detects change on UI thread
 * 4. useDerivedValue recomputes automatically
 * 5. useAnimatedStyle generates new animated styles
 * 6. UI updates reflect new heights and positions
 *
 * **No coupling:** useAnimationController doesn't know about gestures—
 * it only reacts to changes in scrollY. This separation enables:
 * - Reusability (gesture-independent animations)
 * - Testability (mock scrollY for animation testing)
 * - Flexibility (alternative input sources)
 *
 * ## Performance Notes
 *
 * - **useDerivedValue:** Recomputes only when scrollY changes (efficient)
 * - **useAnimatedStyle:** Runs on UI thread; minimal JS bridge traffic
 * - **interpolate:** Optimized Reanimated function (native performance)
 * - **Extrapolation.CLAMP:** Prevents out-of-range values
 *
 * ## Testing Strategy
 *
 * Unit tests validate interpolation at key points:
 * - scrollY = 0 → headerHeight = max
 * - scrollY = MODE_SCROLL_POSITIONS.normal → headerHeight transitions
 * - scrollY < 0 → pull-to-reveal expansion
 * - collapseProgress: 0 → 0.5 → 1 across full range
 *
 * Behavior testing (integration):
 * - Gesture → animation chain
 * - Smooth transitions between modes
 * - Visual feedback on physical device
 *
 * @returns Animation controller interface with shared values, derived values, and animated styles
 */
export interface UseAnimationControllerReturn {
  /** Shared value tracking video scroll position (0 = max, positive = collapsed) */
  scrollY: SharedValue<number>
  /** Derived value for current header/video height based on scroll position */
  headerHeight: DerivedValue<number>
  /** Derived value for collapse progress (0 → 0.5 → 1 for max → normal → min) */
  collapseProgress: DerivedValue<number>
  /** Animated style for header/video container */
  headerStyle: AnimatedStyle<ViewStyle>
  /** Animated style for feedback section (fills remaining space) */
  feedbackSectionStyle: AnimatedStyle<ViewStyle>
  /** Animated style for pull-to-reveal indicator */
  pullIndicatorStyle: AnimatedStyle<ViewStyle>
  /** Animated ref to the main scroll container */
  scrollRef: AnimatedRef<Animated.ScrollView>
  /** Shared value tracking feedback panel scroll position */
  feedbackContentOffsetY: SharedValue<number>
}

export function useAnimationController(): UseAnimationControllerReturn {
  // Scroll state - tracks video collapse/expand position
  const scrollY = useSharedValue(INITIAL_SCROLL_Y)
  const scrollRef = useAnimatedRef<Animated.ScrollView>()

  // Feedback panel scroll tracking
  const feedbackContentOffsetY = useSharedValue(0)

  // Header height: Mode-based transitions with smooth interpolation
  const headerHeight = useDerivedValue(() => {
    const scrollValue = scrollY.value

    // Enhanced pull-to-reveal: expand beyond max when pulling down
    if (scrollValue < 0) {
      const pullDistance = Math.abs(scrollValue)
      const easedPull = interpolate(
        pullDistance,
        [0, PULL_EXPAND],
        [0, PULL_EXPAND * 1.4], // Subtle expansion for lazy feel
        Extrapolation.CLAMP
      )
      return VIDEO_HEIGHTS.max + easedPull
    }

    // Mode-based transitions with smooth interpolation
    if (scrollValue <= MODE_SCROLL_POSITIONS.normal) {
      // Phase 1: Max → Normal
      const result = interpolate(
        scrollValue,
        [MODE_SCROLL_POSITIONS.max, MODE_SCROLL_POSITIONS.normal],
        [VIDEO_HEIGHTS.max, VIDEO_HEIGHTS.normal],
        Extrapolation.CLAMP
      )
      return result
    }
    // Phase 2: Normal → Min
    return interpolate(
      scrollValue,
      [MODE_SCROLL_POSITIONS.normal, MODE_SCROLL_POSITIONS.min],
      [VIDEO_HEIGHTS.normal, VIDEO_HEIGHTS.min],
      Extrapolation.CLAMP
    )
  })

  // Collapse progress: 0 → max, 0.5 → normal, 1 → min
  const collapseProgress = useDerivedValue(() => {
    const headerHeightValue = headerHeight.value
    const scrollValue = scrollY.value

    // Use two separate interpolations for smooth transitions
    let progress: number
    if (headerHeightValue >= VIDEO_HEIGHTS.normal) {
      // Phase 1: Max (852) → Normal (511) maps to 0 → 0.5
      progress = interpolate(
        headerHeightValue,
        [VIDEO_HEIGHTS.max, VIDEO_HEIGHTS.normal],
        [0, 0.5],
        Extrapolation.CLAMP
      )
    } else {
      // Phase 2: Normal (511) → Min (281) maps to 0.5 → 1
      progress = interpolate(
        headerHeightValue,
        [VIDEO_HEIGHTS.normal, VIDEO_HEIGHTS.min],
        [0.5, 1],
        Extrapolation.CLAMP
      )
    }

    console.log('AnimationController Debug:', {
      scrollY: scrollValue,
      headerHeight: headerHeightValue,
      collapseProgress: progress,
      timestamp: new Date().toISOString(),
    })

    return progress
  })

  const headerStyle = useAnimatedStyle(() => ({
    height: headerHeight.value,
  }))

  // Pull-to-reveal indicator style
  const pullIndicatorStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value,
      [-PULL_THRESHOLD, -PULL_EXPAND],
      [0, 1],
      Extrapolation.CLAMP
    ),
    transform: [
      {
        translateY: interpolate(scrollY.value, [-PULL_EXPAND, 0], [0, 50], Extrapolation.CLAMP), // Much more gradual movement
      },
    ],
  }))

  // Feedback section height: dynamically adjusts to fill remaining space below video
  const feedbackSectionStyle = useAnimatedStyle(() => ({
    height: SCREEN_H - headerHeight.value,
  }))

  return {
    scrollY,
    headerHeight,
    collapseProgress,
    headerStyle,
    feedbackSectionStyle,
    pullIndicatorStyle,
    scrollRef,
    feedbackContentOffsetY,
  }
}
