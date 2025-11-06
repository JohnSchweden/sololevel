import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export interface UseStaggeredAnimationOptions {
  /** Number of items to animate */
  itemCount: number
  /** Delay between each item animation in milliseconds */
  staggerDelay?: number
  /** Whether to start the animation immediately */
  autoStart?: boolean
  /** Dependencies that should trigger animation restart */
  dependencies?: React.DependencyList
}

export interface UseStaggeredAnimationReturn {
  /** Array of boolean values indicating which items are visible */
  visibleItems: boolean[]
  /** Manually trigger the animation */
  startAnimation: () => () => void
  /** Reset all items to invisible state */
  resetAnimation: () => void
  /** Check if animation is currently running */
  isAnimating: boolean
}

/**
 * Hook for creating staggered animations where items appear one after another
 * with a configurable delay between each item.
 *
 * @example
 * ```tsx
 * const { visibleItems, startAnimation } = useStaggeredAnimation({
 *   itemCount: 4,
 *   staggerDelay: 50,
 *   dependencies: [isLoading, isError]
 * })
 *
 * return (
 *   <YStack>
 *     {items.map((item, index) => (
 *       <YStack
 *         key={index}
 *         opacity={visibleItems[index] ? 1 : 0}
 *         animation="quick"
 *       >
 *         {item}
 *       </YStack>
 *     ))}
 *   </YStack>
 * )
 * ```
 */
export function useStaggeredAnimation({
  itemCount,
  staggerDelay = 50,
  autoStart = true,
  dependencies = [],
}: UseStaggeredAnimationOptions): UseStaggeredAnimationReturn {
  // Use function initializer to create stable initial state
  // React only calls this on mount, so we get a stable reference
  const [visibleItems, setVisibleItems] = useState<boolean[]>(() => {
    return new Array(itemCount).fill(false)
  })
  const [isAnimating, setIsAnimating] = useState(false)

  const startAnimation = useCallback((): (() => void) => {
    setIsAnimating(true)
    const timers: ReturnType<typeof setTimeout>[] = []

    // Use itemCount instead of visibleItems.length to avoid dependency on state
    // Batch updates using React 18 automatic batching - all updates in same event loop tick are batched
    for (let index = 0; index < itemCount; index++) {
      timers.push(
        setTimeout(() => {
          // Use functional update to ensure we're updating from latest state
          setVisibleItems((prev) => {
            // Only update if value actually changed to prevent unnecessary re-renders
            if (prev[index] === true) {
              return prev // No change, return same reference
            }
            const updated = [...prev]
            updated[index] = true
            return updated
          })

          // Mark animation as complete when last item is shown
          if (index === itemCount - 1) {
            setIsAnimating(false)
          }
        }, index * staggerDelay)
      )
    }

    return () => timers.forEach(clearTimeout)
  }, [itemCount, staggerDelay])

  const resetAnimation = useCallback((): void => {
    // Only reset if values actually changed - prevents unnecessary re-renders
    setVisibleItems((prev) => {
      // Check if all items are already false
      if (prev.every((item) => item === false)) {
        return prev // No change, return same reference
      }
      // Values need to change - create new array
      return new Array(itemCount).fill(false)
    })
    setIsAnimating(false)
  }, [itemCount])

  // Memoize dependencies array to prevent unnecessary effect runs
  // Use JSON.stringify to deep compare array contents (for primitive arrays)
  const dependenciesKey = useMemo(
    () => JSON.stringify(dependencies),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    dependencies
  )
  const prevDependenciesKeyRef = useRef<string | null>(null)

  // Auto-start animation when dependencies change
  useEffect(() => {
    // Skip if dependencies haven't actually changed (but allow first run)
    if (
      prevDependenciesKeyRef.current !== null &&
      prevDependenciesKeyRef.current === dependenciesKey
    ) {
      return undefined
    }
    prevDependenciesKeyRef.current = dependenciesKey

    if (autoStart) {
      resetAnimation()
      const cleanup = startAnimation()
      return cleanup
    }
    return undefined
  }, [dependenciesKey, autoStart, resetAnimation, startAnimation])

  // Stabilize visibleItems array reference - only create new reference when values actually change
  // This prevents why-did-you-render from flagging re-renders when array values are identical
  const visibleItemsSignature = useMemo(() => JSON.stringify(visibleItems), [visibleItems])
  const prevVisibleItemsRef = useRef<boolean[]>(visibleItems)
  const prevSignatureRef = useRef<string>(visibleItemsSignature)
  const stableVisibleItems = useMemo(() => {
    // Only create new reference if values actually changed
    if (visibleItemsSignature === prevSignatureRef.current) {
      return prevVisibleItemsRef.current // Return cached reference
    }
    // Values changed - update cache and return new reference
    prevSignatureRef.current = visibleItemsSignature
    prevVisibleItemsRef.current = visibleItems
    return visibleItems
  }, [visibleItems, visibleItemsSignature])

  // Memoize return value to prevent new object reference on every render
  return useMemo(
    () => ({
      visibleItems: stableVisibleItems,
      startAnimation,
      resetAnimation,
      isAnimating,
    }),
    [stableVisibleItems, startAnimation, resetAnimation, isAnimating]
  )
}
