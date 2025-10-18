import { useEffect, useState } from 'react'

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
  const [visibleItems, setVisibleItems] = useState<boolean[]>(new Array(itemCount).fill(false))
  const [isAnimating, setIsAnimating] = useState(false)

  const startAnimation = (): (() => void) => {
    setIsAnimating(true)
    const timers: ReturnType<typeof setTimeout>[] = []

    visibleItems.forEach((_, index) => {
      timers.push(
        setTimeout(() => {
          setVisibleItems((prev) => {
            const updated = [...prev]
            updated[index] = true
            return updated
          })

          // Mark animation as complete when last item is shown
          if (index === visibleItems.length - 1) {
            setIsAnimating(false)
          }
        }, index * staggerDelay)
      )
    })

    return () => timers.forEach(clearTimeout)
  }

  const resetAnimation = (): void => {
    setVisibleItems(new Array(itemCount).fill(false))
    setIsAnimating(false)
  }

  // Auto-start animation when dependencies change
  useEffect(() => {
    if (autoStart) {
      resetAnimation()
      const cleanup = startAnimation()
      return cleanup
    }
    return undefined
  }, dependencies)

  return {
    visibleItems,
    startAnimation,
    resetAnimation,
    isAnimating,
  }
}
