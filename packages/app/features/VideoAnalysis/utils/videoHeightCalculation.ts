import { Extrapolation, interpolate, useAnimatedStyle } from 'react-native-reanimated'
import type { SharedValue } from 'react-native-reanimated'
import { MODE_SCROLL_POSITIONS, PULL_EXPAND, VIDEO_HEIGHTS } from './videoAnimationConstants'

/**
 * Video height calculation utilities for gesture and animation system
 * Provides worklet-compatible and Reanimated-compatible versions of height calculations
 * Used across gesture controller, animation controller, and layout components
 */

/**
 * Calculates the current video header height from scroll position
 * Handles three interpolation phases for smooth transitions
 *
 * Phases:
 * 1. Pull-to-reveal (scrollY < 0): Video expands beyond max with easing (1.4x multiplier)
 * 2. Max → Normal (0 ≤ scrollY ≤ ~237px): Linear interpolation from max to normal
 * 3. Normal → Min (scrollY > ~237px): Linear interpolation from normal to min
 *
 * @param scrollValue - Current scroll position (0 = max, >0 = collapsed)
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
export const calculateVideoHeight = (scrollValue: number): number => {
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
 * Creates an animated style for header height positioning using Reanimated interpolation
 * Used in animated components to track header height based on scroll position
 *
 * @param scrollY - Shared value tracking scroll position
 * @returns Animated style with top position = calculated header height
 *
 * Usage in animated components:
 * ```typescript
 * const headerPositionStyle = useAnimatedStyle(() => ({
 *   top: getHeaderHeightAnimatedStyle(animation.scrollY).top,
 * }))
 * ```
 */
export const getHeaderHeightAnimatedStyle = (scrollY: SharedValue<number>) => {
  return useAnimatedStyle(() => {
    const scrollValue = scrollY.value
    let headerHeight: number

    if (scrollValue < 0) {
      // Pull-to-reveal: expand beyond max
      const pullDistance = Math.abs(scrollValue)
      const easedPull = interpolate(pullDistance, [0, 200], [0, 200 * 1.4], Extrapolation.CLAMP)
      headerHeight = VIDEO_HEIGHTS.max + easedPull
    } else if (scrollValue <= MODE_SCROLL_POSITIONS.normal) {
      // Phase 1: Max → Normal
      headerHeight = interpolate(
        scrollValue,
        [MODE_SCROLL_POSITIONS.max, MODE_SCROLL_POSITIONS.normal],
        [VIDEO_HEIGHTS.max, VIDEO_HEIGHTS.normal],
        Extrapolation.CLAMP
      )
    } else {
      // Phase 2: Normal → Min
      headerHeight = interpolate(
        scrollValue,
        [MODE_SCROLL_POSITIONS.normal, MODE_SCROLL_POSITIONS.min],
        [VIDEO_HEIGHTS.normal, VIDEO_HEIGHTS.min],
        Extrapolation.CLAMP
      )
    }

    return {
      top: headerHeight,
    }
  })
}
