import type { ViewStyle } from 'react-native'
import {
  type AnimatedStyle,
  Extrapolation,
  type SharedValue,
  interpolate,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
} from 'react-native-reanimated'

/**
 * Discrete display modes returned by the visibility hook.
 * - `normal`: standard controls visible, persistent hidden
 * - `persistent`: collapsed controls visible, normal hidden
 * - `transition`: both hidden while an animation or overscroll is in progress
 */
export type ProgressBarDisplayMode = 'normal' | 'persistent' | 'transition'

export interface UseProgressBarVisibilityReturn {
  /** Always true - both controls always rendered (v3: absolute positioning) */
  shouldRenderNormal: boolean
  /** Always true - both controls always rendered (v3: absolute positioning) */
  shouldRenderPersistent: boolean
  /** Shared display mode value updated on UI thread - access via modeShared.value in worklets or React code */
  modeShared: SharedValue<ProgressBarDisplayMode>
  /** Shared visibility (0-1) for the normal progress bar, driven entirely on the UI thread */
  normalVisibility: SharedValue<number>
  /** Shared visibility (0-1) for the persistent progress bar, driven entirely on the UI thread */
  persistentVisibility: SharedValue<number>
  /** Animated style for normal progress bar opacity (combines collapse visibility with overlay opacity) */
  normalVisibilityAnimatedStyle: AnimatedStyle<ViewStyle>
  /** Animated style for persistent progress bar opacity (based on collapse visibility only, independent of overlay opacity) */
  persistentVisibilityAnimatedStyle: AnimatedStyle<ViewStyle>
  /** Test-only helper for environments without full Reanimated runtime */
  __applyProgressForTests?: (progress: number, overscroll?: number) => void
}

/** Collapse progress ≤ this threshold = max mode (normal bar visible). */
const NORMAL_MODE_THRESHOLD = 0.1
/** Collapse progress ≥ this threshold = min mode (persistent bar visible). */
const PERSISTENT_MODE_THRESHOLD = 0.4
/** Overscroll threshold (px) - negative = pulling past top edge. */
const OVERSCROLL_TRANSITION_THRESHOLD = -4

const sanitizeProgress = (value: number): number => {
  'worklet'
  if (!Number.isFinite(value)) {
    return 0
  }

  return value
}

/**
 * Resolves the display mode based on collapse progress and optional overscroll distance.
 * Overscroll takes priority: pulling past the threshold forces a transition state so both bars hide.
 */
const resolveDisplayMode = (progress: number, overscroll?: number): ProgressBarDisplayMode => {
  'worklet'
  const normalized = sanitizeProgress(progress)

  if (typeof overscroll === 'number' && overscroll < OVERSCROLL_TRANSITION_THRESHOLD) {
    return 'transition'
  }

  if (normalized < -NORMAL_MODE_THRESHOLD) {
    return 'transition'
  }

  if (normalized >= PERSISTENT_MODE_THRESHOLD) {
    return 'persistent'
  }

  if (normalized <= NORMAL_MODE_THRESHOLD) {
    return 'normal'
  }

  return 'transition'
}

const visibilityForMode = (mode: ProgressBarDisplayMode) => {
  'worklet'
  return {
    normal: mode === 'normal' ? 1 : 0,
    persistent: mode === 'persistent' ? 1 : 0,
  }
}

/**
 * Derives progress bar visibility using collapse progress and optional overscroll.
 *
 * Both bars are always rendered with absolute positioning. Visibility is controlled
 * entirely on the UI thread via animated opacity - no React state updates during transitions.
 *
 * @param collapseProgressShared - Collapse progress (0 = max, 1 = min)
 * @param overscrollShared - Optional overscroll distance (negative = pulling past top)
 * @param overlayOpacity - Controls overlay opacity (only affects normal bar)
 */
export function useProgressBarVisibility(
  collapseProgressShared: SharedValue<number>,
  overscrollShared?: SharedValue<number>,
  overlayOpacity?: SharedValue<number>
): UseProgressBarVisibilityReturn {
  const initialOverscroll = overscrollShared?.value ?? 0
  const initialMode = resolveDisplayMode(collapseProgressShared.value, initialOverscroll)
  const initialVisibility = visibilityForMode(initialMode)

  const normalVisibility = useSharedValue(initialVisibility.normal)
  const persistentVisibility = useSharedValue(initialVisibility.persistent)
  const modeShared = useSharedValue<ProgressBarDisplayMode>(initialMode)

  // UI-thread only mode tracking for pointer events (visual opacity uses interpolation)
  useDerivedValue(() => {
    'worklet'
    const nextMode = resolveDisplayMode(collapseProgressShared.value, overscrollShared?.value ?? 0)
    const { normal, persistent } = visibilityForMode(nextMode)

    if (modeShared.value !== nextMode) {
      modeShared.value = nextMode
    }
    if (normalVisibility.value !== normal) {
      normalVisibility.value = normal
    }
    if (persistentVisibility.value !== persistent) {
      persistentVisibility.value = persistent
    }
  }, [collapseProgressShared, modeShared, normalVisibility, overscrollShared, persistentVisibility])

  // Normal bar: visible in max mode, fades out as collapse progresses
  const normalVisibilityAnimatedStyle = useAnimatedStyle(() => {
    const collapseOpacity = interpolate(
      collapseProgressShared.value,
      [0, 0.1],
      [1, 0],
      Extrapolation.CLAMP
    )
    return { opacity: collapseOpacity * (overlayOpacity?.value ?? 1) }
  }, [collapseProgressShared, overlayOpacity])

  // Persistent bar: fades in during collapse, independent of overlay opacity
  const persistentVisibilityAnimatedStyle = useAnimatedStyle(() => {
    const collapseOpacity = interpolate(
      collapseProgressShared.value,
      [0.4, 0.5],
      [0, 1],
      Extrapolation.CLAMP
    )
    return { opacity: collapseOpacity }
  }, [collapseProgressShared])

  return {
    shouldRenderNormal: true,
    shouldRenderPersistent: true,
    modeShared,
    normalVisibility,
    persistentVisibility,
    normalVisibilityAnimatedStyle,
    persistentVisibilityAnimatedStyle,
    __applyProgressForTests: (progress: number, overscroll = 0) => {
      const nextMode = resolveDisplayMode(progress, overscroll)
      const { normal, persistent } = visibilityForMode(nextMode)
      modeShared.value = nextMode
      normalVisibility.value = normal
      persistentVisibility.value = persistent
    },
  }
}
