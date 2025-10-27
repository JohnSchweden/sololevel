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
 * Manages mode-based video height transitions and animated styles:
 * - Header height interpolation (max → normal → min modes)
 * - Pull-to-reveal expansion (negative scroll)
 * - Collapse progress calculation (0 = max, 0.5 = normal, 1 = min)
 * - Animated styles for header, feedback section, and pull indicator
 *
 * @returns Animation controller interface with scroll state and animated styles
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
