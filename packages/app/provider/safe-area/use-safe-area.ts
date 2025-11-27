import { useMemo, useRef } from 'react'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const useSafeArea = useSafeAreaInsets

// `export { useSafeAreaInsets as useSafeArea }` breaks autoimport, so do this instead
export { useSafeArea }

// Shared global cache for stable top inset across all screens
// Prevents layout jumps when navigating from Record (status bar hidden) to other screens (status bar visible)
let globalLastValidTopInset: number | null = null

/**
 * Hook to get stable top inset that prevents layout jumps during navigation
 *
 * When navigating from Record (status bar hidden) to other screens (status bar visible),
 * useSafeArea() returns 0 initially then updates to ~47, causing content to jump down.
 *
 * This hook caches the last valid positive inset value and uses it consistently.
 * Only updates when receiving a valid positive value (ignores 0 from hidden status bar).
 *
 * @param insetsRaw - Raw insets from useSafeArea()
 * @returns Stable top inset value
 */
export function useStableTopInset(insetsRaw: ReturnType<typeof useSafeAreaInsets>): number {
  const topInsetRef = useRef<number | null>(globalLastValidTopInset)

  // Update ref and global cache if we have a valid positive inset
  // This handles initialization (0 -> 47) and rotation (47 -> 20)
  // It effectively ignores 0 (status bar hidden) to prevent layout jumps
  if (insetsRaw.top > 0 && topInsetRef.current !== insetsRaw.top) {
    topInsetRef.current = insetsRaw.top
    globalLastValidTopInset = insetsRaw.top
  }

  // Fallback for initialization if global cache is empty
  if (topInsetRef.current === null) {
    topInsetRef.current = Math.max(insetsRaw.top, 0)
  }

  return topInsetRef.current ?? 0
}

/**
 * Hook to get stable insets with memoized top inset
 *
 * Returns insets object with stable top inset to prevent layout jumps.
 * Other insets (bottom, left, right) remain reactive.
 *
 * @returns Memoized insets object with stable top inset
 */
export function useStableSafeArea(): ReturnType<typeof useSafeAreaInsets> {
  const insetsRaw = useSafeArea()
  const stableTopInset = useStableTopInset(insetsRaw)

  return useMemo(
    () => ({
      ...insetsRaw,
      top: stableTopInset,
    }),
    [insetsRaw.bottom, insetsRaw.left, insetsRaw.right, stableTopInset]
  )
}
