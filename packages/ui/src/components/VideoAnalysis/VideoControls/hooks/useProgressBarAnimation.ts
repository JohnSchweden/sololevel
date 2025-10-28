import type { ViewStyle } from 'react-native'
import {
  type AnimatedStyleProp,
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
} from 'react-native-reanimated'

/**
 * Hook managing interpolation-based animation styles for progress bars.
 *
 * Provides animated opacity styles for both normal and persistent progress bars
 * based on the video mode collapse progress (0 = max, 0.5 = normal, 1 = min).
 *
 * ## Animation Behavior:
 *
 * **Persistent Progress Bar:**
 * - **Max mode (collapseProgress = 0):** Hidden (opacity = 0)
 * - **Transition (0 → 0.48):** Fades in with cubic easing
 * - **Normal/Min modes (≥ 0.48):** Visible (opacity = 1)
 * - **Easing:** `Easing.inOut(Easing.cubic)` for smooth transitions
 *
 * **Normal Progress Bar:**
 * - **Max mode (collapseProgress = 0):** Visible (opacity = 1)
 * - **Transition (0 → 0.027):** Ultra-fast fade-out with linear interpolation
 * - **Normal/Min modes (≥ 0.027):** Hidden (opacity = 0)
 * - **Easing:** None (linear interpolation)
 *
 * ## Interpolation Formulas:
 *
 * ```typescript
 * // Persistent bar (with cubic easing)
 * const easedProgress = Easing.inOut(Easing.cubic)(collapseProgress)
 * opacity = interpolate(easedProgress, [0, 0.48], [0, 1], Extrapolation.CLAMP)
 *
 * // Normal bar (linear, ultra-fast fade)
 * opacity = interpolate(collapseProgress, [0, 0.027], [1, 0], Extrapolation.CLAMP)
 * ```
 *
 * ## Usage Example:
 *
 * ```tsx
 * const VideoControls = ({ collapseProgress = 0, ... }) => {
 *   const animation = useProgressBarAnimation(collapseProgress)
 *
 *   return (
 *     <>
 *       <Animated.View style={animation.normalBarAnimatedStyle}>
 *         {/* Normal progress bar (visible in max mode) *\/}
 *       </Animated.View>
 *
 *       <Animated.View style={animation.persistentBarAnimatedStyle}>
 *         {/* Persistent progress bar (visible in normal/min modes) *\/}
 *       </Animated.View>
 *     </>
 *   )
 * }
 * ```
 *
 * @param collapseProgress - Collapse progress value (0 = max mode, 0.5 = normal, 1 = min)
 * @returns Animated style objects for persistent and normal progress bars
 *
 * @see {@link https://docs.swmansion.com/react-native-reanimated/docs/core/useAnimatedStyle | useAnimatedStyle}
 * @see {@link https://docs.swmansion.com/react-native-reanimated/docs/utilities/interpolate | interpolate}
 */
export interface UseProgressBarAnimationReturn {
  /** Animated opacity style for persistent progress bar (visible in normal/min modes) */
  persistentBarAnimatedStyle: AnimatedStyleProp<ViewStyle>
  /** Animated opacity style for normal progress bar (visible in max mode) */
  normalBarAnimatedStyle: AnimatedStyleProp<ViewStyle>
}

/**
 * Custom hook that provides animated styles for video progress bars.
 *
 * @param collapseProgress - Video mode collapse progress (0 = max, 0.5 = normal, 1 = min)
 * @returns Object containing animated styles for both progress bars
 */
export function useProgressBarAnimation(collapseProgress: number): UseProgressBarAnimationReturn {
  // Persistent progress bar animation:
  // - Hidden in max mode (collapseProgress = 0)
  // - Visible in normal/min modes (collapseProgress ≥ 0.48)
  // - Applies cubic easing for smooth transitions
  const persistentBarAnimatedStyle = useAnimatedStyle(() => {
    'worklet'
    // Apply cubic easing for smooth transitions
    const easeFunction = Easing.inOut(Easing.cubic)
    const easedProgress = easeFunction(collapseProgress)

    // Fade out when transitioning TO max mode (collapseProgress < 0.48)
    // This provides early fade-out before the mode actually changes
    return {
      opacity: interpolate(easedProgress, [0, 0.48], [0, 1], Extrapolation.CLAMP),
    }
  })

  // Normal progress bar animation:
  // - Visible in max mode (collapseProgress = 0)
  // - Hidden in normal/min modes (collapseProgress ≥ 0.027)
  // - Uses linear interpolation (no easing) for ultra-fast fade-out
  const normalBarAnimatedStyle = useAnimatedStyle(() => {
    'worklet'
    // Fade out ultra-early when transitioning AWAY from max mode (collapseProgress > 0.027)
    // Normal bar should be visible in max mode, hidden in normal/min modes
    return {
      opacity: interpolate(collapseProgress, [0, 0.027], [1, 0], Extrapolation.CLAMP),
    }
  })

  return {
    persistentBarAnimatedStyle,
    normalBarAnimatedStyle,
  }
}
