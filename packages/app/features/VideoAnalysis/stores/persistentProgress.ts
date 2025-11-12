import type { PersistentProgressBarProps } from '@ui/components/VideoAnalysis'
import { runOnUI } from 'react-native-reanimated'
import type { SharedValue } from 'react-native-reanimated'
import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

/**
 * Persistent Progress Store
 *
 * Manages state for the persistent progress bar that lives outside the VideoControls
 * component tree. This prevents cascading re-renders when progress bar props change.
 *
 * ## Problem This Solves
 *
 * Previously, VideoControls passed progress bar props via callback to VideoAnalysisScreen:
 * 1. VideoControls creates new props object
 * 2. Calls `onPersistentProgressBarPropsChange(newProps)`
 * 3. VideoAnalysisScreen re-renders with new prop
 * 4. VideoControls receives new callback reference
 * 5. useEffect cleanup runs → calls callback(null)
 * 6. Cycle repeats → 78 renders in 1.5 seconds
 *
 * With Zustand store:
 * 1. VideoControls writes directly to store
 * 2. VideoAnalysisLayout reads from store (outside main component tree)
 * 3. No parent re-renders → stable reference
 *
 * ## Reference Stability Strategy
 *
 * The store maintains reference stability by comparing PRIMITIVE values only:
 * - currentTime, duration, isScrubbing, controlsVisible, progressBarWidth
 *
 * When primitives are unchanged but gestures change (Reanimated recreation),
 * the store returns the SAME object reference. This prevents unnecessary re-renders
 * in components using React.memo.
 *
 * ## Usage
 *
 * **Write (VideoControls):**
 * ```typescript
 * const setProps = usePersistentProgressStore((state) => state.setProps)
 * setProps(newProps) // Only updates if primitives changed
 * ```
 *
 * **Read (VideoAnalysisLayout):**
 * ```typescript
 * const props = usePersistentProgressStore((state) => state.props)
 * // Stable reference when primitives unchanged
 * ```
 *
 * @see VideoControls.tsx - writes to store
 * @see VideoAnalysisLayout.tsx - reads from store
 */

export interface PersistentProgressState {
  props: PersistentProgressBarProps | null
}

export interface PersistentProgressActions {
  setProps: (props: PersistentProgressBarProps | null) => void
  updateTime: (currentTime: number, duration?: number) => void
  setStaticProps: (
    props:
      | Omit<PersistentProgressBarProps, 'currentTime' | 'duration'>
      | (Partial<Pick<PersistentProgressBarProps, 'currentTime' | 'duration'>> &
          Omit<PersistentProgressBarProps, 'currentTime' | 'duration'>)
      | null
  ) => void
  reset: () => void
}

export type PersistentProgressStore = PersistentProgressState & PersistentProgressActions

type SetProgressSharedFn = (shared: SharedValue<number>, value: number) => void

const setProgressSharedOnUI: SetProgressSharedFn =
  typeof runOnUI === 'function'
    ? (runOnUI((shared: SharedValue<number>, value: number) => {
        'worklet'
        shared.value = value
      }) as SetProgressSharedFn)
    : (shared: SharedValue<number>, value: number) => {
        shared.value = value
      }

/**
 * Compare primitive values to determine if props object should be recreated.
 *
 * Ignores object references (animatedStyle, gestures) since they change frequently
 * but don't affect rendering logic. Only primitives trigger new object creation.
 *
 * @param prev - Previous props (may be null)
 * @param next - Next props (may be null)
 * @returns true if primitives are equal, false otherwise
 */
function primitivesEqual(
  prev: PersistentProgressBarProps | null,
  next: PersistentProgressBarProps | null
): boolean {
  // Handle null cases
  if (prev === null && next === null) return true
  if (prev === null || next === null) return false

  // Compare primitives only
  return (
    prev.currentTime === next.currentTime &&
    prev.duration === next.duration &&
    prev.isScrubbing === next.isScrubbing &&
    prev.controlsVisible === next.controlsVisible &&
    prev.shouldRenderPersistent === next.shouldRenderPersistent &&
    prev.pointerEvents === next.pointerEvents
  )
}

function syncProgressShared(
  props: PersistentProgressBarProps | null,
  currentTime: number,
  duration: number
) {
  if (!props?.progressShared) {
    return
  }

  const clampedDuration = Number.isFinite(duration) && duration > 0 ? duration : 0
  const percent =
    clampedDuration > 0 ? Math.max(0, Math.min(100, (currentTime / clampedDuration) * 100)) : 0

  setProgressSharedOnUI(props.progressShared, percent)
}

export const usePersistentProgressStore = create<PersistentProgressStore>()(
  subscribeWithSelector((set, get) => ({
    // State
    props: null,

    // Actions
    setProps: (newProps) => {
      const currentProps = get().props

      // Handle null case
      if (newProps === null) {
        if (currentProps !== null) {
          set({ props: null })
        }
        return
      }

      // Handle first update (null → value)
      if (currentProps === null) {
        set({ props: newProps })
        syncProgressShared(newProps, newProps.currentTime, newProps.duration)
        return
      }

      // Compare primitives - if unchanged, keep existing reference
      if (primitivesEqual(currentProps, newProps)) {
        // Primitives unchanged - DON'T update state, keep existing reference
        // Even if gesture IDs changed (Reanimated recreation), we maintain stability
        // This prevents cascading re-renders in React.memo components
        return
      }

      // Primitives changed - update with new reference
      set({ props: newProps })
      syncProgressShared(newProps, newProps.currentTime, newProps.duration)
    },

    updateTime: (nextCurrentTime, nextDuration) => {
      const currentProps = get().props
      if (!currentProps) {
        return
      }

      const resolvedDuration =
        typeof nextDuration === 'number' && Number.isFinite(nextDuration)
          ? nextDuration
          : currentProps.duration

      if (
        currentProps.currentTime === nextCurrentTime &&
        currentProps.duration === resolvedDuration
      ) {
        return
      }

      const updatedProps: PersistentProgressBarProps = {
        ...currentProps,
        currentTime: nextCurrentTime,
        duration: resolvedDuration,
      }

      set({ props: updatedProps })
      syncProgressShared(updatedProps, nextCurrentTime, resolvedDuration)
    },

    setStaticProps: (staticProps) => {
      if (staticProps === null) {
        set({ props: null })
        return
      }

      const currentProps = get().props
      const currentTime =
        (staticProps as Partial<PersistentProgressBarProps>).currentTime ??
        currentProps?.currentTime ??
        0
      const currentDuration =
        (staticProps as Partial<PersistentProgressBarProps>).duration ?? currentProps?.duration ?? 0

      const merged: PersistentProgressBarProps = {
        currentTime,
        duration: currentDuration,
        isScrubbing: staticProps.isScrubbing,
        controlsVisible: staticProps.controlsVisible,
        shouldRenderPersistent: staticProps.shouldRenderPersistent,
        pointerEvents: staticProps.pointerEvents,
        visibility: staticProps.visibility,
        animatedStyle: staticProps.animatedStyle,
        combinedGesture: staticProps.combinedGesture,
        mainGesture: staticProps.mainGesture,
        onLayout: staticProps.onLayout,
        onFallbackPress: staticProps.onFallbackPress,
        progressShared: staticProps.progressShared,
        progressBarWidthShared: staticProps.progressBarWidthShared,
      }

      const prev = get().props
      if (prev) {
        const staticUnchanged =
          prev.currentTime === merged.currentTime &&
          prev.duration === merged.duration &&
          prev.isScrubbing === merged.isScrubbing &&
          prev.controlsVisible === merged.controlsVisible &&
          prev.shouldRenderPersistent === merged.shouldRenderPersistent &&
          prev.pointerEvents === merged.pointerEvents &&
          prev.visibility === merged.visibility &&
          prev.animatedStyle === merged.animatedStyle &&
          prev.combinedGesture === merged.combinedGesture &&
          prev.mainGesture === merged.mainGesture &&
          prev.onLayout === merged.onLayout &&
          prev.onFallbackPress === merged.onFallbackPress &&
          prev.progressShared === merged.progressShared &&
          prev.progressBarWidthShared === merged.progressBarWidthShared

        if (staticUnchanged) {
          return
        }
      }

      set({ props: merged })
      syncProgressShared(merged, currentTime, currentDuration)
    },

    reset: () => {
      set({ props: null })
    },
  }))
)
