import { useCallback, useState } from 'react'
import {
  type SharedValue,
  runOnJS,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'

/**
 * Discrete display modes returned by the visibility hook.
 * - `normal`: standard controls visible, persistent hidden
 * - `persistent`: collapsed controls visible, normal hidden
 * - `transition`: both hidden while an animation or overscroll is in progress
 */
export type ProgressBarDisplayMode = 'normal' | 'persistent' | 'transition'

export interface UseProgressBarVisibilityReturn {
  /** Snapshot of whether the normal (max-mode) controls should be rendered on the React tree */
  shouldRenderNormal: boolean
  /** Snapshot of whether the persistent (collapsed) controls should be rendered on the React tree */
  shouldRenderPersistent: boolean
  /** Derived display mode snapshot for consumers that need to branch logic */
  mode: ProgressBarDisplayMode
  /** Shared visibility (0-1) for the normal progress bar, driven entirely on the UI thread */
  normalVisibility: SharedValue<number>
  /** Shared visibility (0-1) for the persistent progress bar, driven entirely on the UI thread */
  persistentVisibility: SharedValue<number>
  /** Test-only helper for environments without full Reanimated runtime */
  __applyProgressForTests?: (progress: number, overscroll?: number) => void
}

/** Collapse progress ≤ this threshold is considered max mode (normal bar visible). */
const NORMAL_MODE_THRESHOLD = 0.03
/** Collapse progress ≥ this threshold is considered min mode (persistent bar visible). */
const PERSISTENT_MODE_THRESHOLD = 0.45
// Overscroll threshold (in px) before we consider the user to be actively pulling beyond the top edge.
// Negative values correspond to the sheet being dragged past the top edge.
const OVERSCROLL_TRANSITION_THRESHOLD = -4
/** Timing configuration for normal bar fade transitions. */
const NORMAL_FADE = { duration: 120 }
/** Timing configuration for persistent bar fade transitions. */
const PERSISTENT_FADE = { duration: 580 }

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

/** Payload emitted when the mode or visibility changes. */
interface ModeChangePayload {
  source: 'worklet' | 'test'
  progress: number
  overscroll: number
  previousMode: ProgressBarDisplayMode
  nextMode: ProgressBarDisplayMode
  normalVisible: boolean
  persistentVisible: boolean
}

/**
 * Derives progress bar visibility for the video controls overlay using collapse progress and optional
 * overscroll distance. Collapse progress drives the standard max ⇄ normal ⇄ min transitions. When an
 * overscroll shared value is provided, any pull beyond the top threshold (negative distance) forces
 * a transition state so both progress bars fade out immediately during pull-to-expand gestures.
 */
export function useProgressBarVisibility(
  collapseProgressShared: SharedValue<number>,
  overscrollShared?: SharedValue<number>
): UseProgressBarVisibilityReturn {
  const initialOverscroll = overscrollShared?.value ?? 0
  const initialMode = resolveDisplayMode(collapseProgressShared.value, initialOverscroll)
  const initialVisibility = visibilityForMode(initialMode)

  const normalVisibility = useSharedValue(initialVisibility.normal)
  const persistentVisibility = useSharedValue(initialVisibility.persistent)
  const modeShared = useSharedValue<ProgressBarDisplayMode>(initialMode)

  const [modeSnapshot, setModeSnapshot] = useState<ProgressBarDisplayMode>(initialMode)

  const emitModeChange = useCallback(
    ({
      source: _source,
      progress: _progress,
      overscroll: _overscroll,
      previousMode: _previousMode,
      nextMode,
      normalVisible: _normalVisible,
      persistentVisible: _persistentVisible,
    }: ModeChangePayload) => {
      // log.debug('VideoControls', 'ProgressBar mode updated', {
      //   source,
      //   progress,
      //   overscroll,
      //   previousMode,
      //   nextMode,
      //   normalVisible,
      //   persistentVisible,
      // })

      setModeSnapshot((prev) => (prev === nextMode ? prev : nextMode))
    },
    []
  )

  const updateSnapshotFromJS = useCallback(
    (progress: number, source: ModeChangePayload['source'], overscroll = 0) => {
      const nextMode = resolveDisplayMode(progress, overscroll)
      const { normal, persistent } = visibilityForMode(nextMode)
      const previousMode = modeShared.value
      const hasModeChanged = previousMode !== nextMode
      const normalChanged = normalVisibility.value !== normal
      const persistentChanged = persistentVisibility.value !== persistent

      if (hasModeChanged) {
        modeShared.value = nextMode
      }

      if (normalChanged) {
        normalVisibility.value = withTiming(normal, NORMAL_FADE)
      }

      if (persistentChanged) {
        persistentVisibility.value = withTiming(persistent, PERSISTENT_FADE)
      }

      if (hasModeChanged || normalChanged || persistentChanged) {
        emitModeChange({
          source,
          progress,
          overscroll,
          previousMode,
          nextMode,
          normalVisible: normal === 1,
          persistentVisible: persistent === 1,
        })
      }
    },
    [emitModeChange, modeShared, normalVisibility, persistentVisibility]
  )

  useDerivedValue(() => {
    'worklet'
    const progress = collapseProgressShared.value
    const overscroll = overscrollShared?.value ?? 0
    const nextMode = resolveDisplayMode(progress, overscroll)
    const { normal, persistent } = visibilityForMode(nextMode)
    const previousMode = modeShared.value
    const hasModeChanged = previousMode !== nextMode
    const normalChanged = normalVisibility.value !== normal
    const persistentChanged = persistentVisibility.value !== persistent

    if (hasModeChanged) {
      modeShared.value = nextMode
    }

    if (normalChanged) {
      normalVisibility.value = withTiming(normal, NORMAL_FADE)
    }

    if (persistentChanged) {
      persistentVisibility.value = withTiming(persistent, PERSISTENT_FADE)
    }

    if (hasModeChanged || normalChanged || persistentChanged) {
      runOnJS(emitModeChange)({
        source: 'worklet',
        progress,
        overscroll,
        previousMode,
        nextMode,
        normalVisible: normal === 1,
        persistentVisible: persistent === 1,
      })
    }
  }, [
    collapseProgressShared,
    emitModeChange,
    modeShared,
    normalVisibility,
    overscrollShared,
    persistentVisibility,
  ])

  const result: UseProgressBarVisibilityReturn = {
    shouldRenderNormal: modeSnapshot === 'normal',
    shouldRenderPersistent: modeSnapshot === 'persistent',
    mode: modeSnapshot,
    normalVisibility,
    persistentVisibility,
  }

  result.__applyProgressForTests = (progress: number, overscroll = 0) => {
    updateSnapshotFromJS(progress, 'test', overscroll)
  }

  return result
}
