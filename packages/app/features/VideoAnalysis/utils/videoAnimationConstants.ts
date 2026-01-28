import { Dimensions, Platform, StatusBar } from 'react-native'
import { Easing } from 'react-native-reanimated'

/**
 * Animation constants for video analysis gesture and layout system
 * Centralizes screen dimensions, video heights, scroll positions, and timing values
 * Used across useGestureController, useAnimationController, and VideoAnalysisLayout
 */

// ──────────────────────────────────────────────────────────────
// Screen Dimensions
// ──────────────────────────────────────────────────────────────

const { height: SCREEN_H_BASE } = Dimensions.get('window')

/**
 * Platform-specific screen height calculation
 *
 * Android: Subtract status bar height since window dimensions include it but layout starts below
 *          Bottom safe area (gesture nav) is handled in FeedbackPanel scroll padding
 * iOS: Use full window height (layout automatically accounts for status bar)
 */
export const SCREEN_H =
  Platform.OS === 'android' && StatusBar.currentHeight
    ? SCREEN_H_BASE - StatusBar.currentHeight
    : SCREEN_H_BASE

// ──────────────────────────────────────────────────────────────
// Video Heights per Mode
// ──────────────────────────────────────────────────────────────

/**
 * Discrete video heights for each mode
 * - max: Full screen video (100% of screen height)
 * - normal: Default viewing mode (60% of screen height)
 * - min: Collapsed dock (33% of screen height)
 */
export const VIDEO_HEIGHTS = {
  max: SCREEN_H,
  normal: Math.round(SCREEN_H * 0.6),
  min: Math.round(SCREEN_H * 0.33),
} as const

// ──────────────────────────────────────────────────────────────
// Mode Transition Scroll Positions
// ──────────────────────────────────────────────────────────────

/**
 * Scroll positions corresponding to each video mode
 * Used for snap detection and animation targeting
 * - max: 0 (no scroll, full screen video)
 * - normal: Video.max - Video.normal (40% of screen)
 * - min: Video.max - Video.min (67% of screen)
 */
export const MODE_SCROLL_POSITIONS = {
  max: 0,
  normal: VIDEO_HEIGHTS.max - VIDEO_HEIGHTS.normal,
  min: VIDEO_HEIGHTS.max - VIDEO_HEIGHTS.min,
} as const

/**
 * Initial scroll position when screen loads
 * Opens at normal size (60% video, 40% feedback)
 */
export const INITIAL_SCROLL_Y = MODE_SCROLL_POSITIONS.normal

// ──────────────────────────────────────────────────────────────
// Pull-to-Reveal Thresholds
// ──────────────────────────────────────────────────────────────

/**
 * Maximum pull distance for reveal effect
 * Caps the expansion amount when user overscrolls upward
 */
export const PULL_EXPAND = 200

/**
 * Minimum pull distance to trigger reveal visual indicator
 * When scrollY < -PULL_THRESHOLD, UI shows pull-to-reveal feedback
 */
export const PULL_THRESHOLD = 170

// ──────────────────────────────────────────────────────────────
// Snap Animation Timing
// ──────────────────────────────────────────────────────────────

/**
 * Duration for snap animation when gesture ends (milliseconds)
 * Controls how long it takes to animate to the nearest mode
 */
export const SNAP_DURATION_MS = 600

/**
 * Easing function for snap animations
 * Cubic bezier with slight bounce: (0.15, 0, 0.15, 1)
 * Creates natural deceleration with subtle spring effect
 */
export const SNAP_EASING = Easing.bezier(0.15, 0.0, 0.15, 1)

// ──────────────────────────────────────────────────────────────
// Swipe Detection Thresholds
// ──────────────────────────────────────────────────────────────

/**
 * Velocity threshold for "fast swipe" (pixels per millisecond)
 * Used in gesture controller to detect quick mode changes
 * 0.3 px/ms ≈ 300 px/s
 */
export const FAST_SWIPE_THRESHOLD = 0.3

/**
 * Distance threshold for "long swipe" (pixels)
 * Used to detect extended swipe gestures even if velocity is slow
 */
export const LONG_SWIPE_THRESHOLD = 80

/**
 * Left edge threshold for back navigation detection (pixels)
 * Touches starting within this distance from left edge can be back gestures
 */
export const LEFT_EDGE_THRESHOLD = 20

// ──────────────────────────────────────────────────────────────
// Gesture Detection Thresholds
// ──────────────────────────────────────────────────────────────

/**
 * Minimum movement to detect direction (pixels)
 * Used to distinguish intentional swipes from accidental touches
 */
export const DIRECTION_DETECT_THRESHOLD = 8
