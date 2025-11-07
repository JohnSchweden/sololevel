import type { PersistentProgressBarProps } from '@ui/components/VideoAnalysis'
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
  reset: () => void
}

export type PersistentProgressStore = PersistentProgressState & PersistentProgressActions

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
    prev.progressBarWidth === next.progressBarWidth &&
    prev.shouldRenderPersistent === next.shouldRenderPersistent
  )
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
    },

    reset: () => {
      set({ props: null })
    },
  }))
)
