import { useEffect, useRef, useState } from 'react'

export interface UseLazySectionVisibilityOptions {
  /**
   * Number of sections to track
   */
  sectionCount: number

  /**
   * Whether to render first section immediately
   * @default true
   */
  renderFirstImmediately?: boolean

  /**
   * Delay before rendering subsequent sections (in ms)
   * @default 100
   */
  renderDelay?: number
}

export interface UseLazySectionVisibilityReturn {
  /**
   * Array of booleans indicating which sections should render
   */
  visibleSections: boolean[]
}

/**
 * Hook to control lazy loading of sections in ScrollView
 *
 * Renders first section immediately, then renders subsequent sections
 * after a delay to spread out mount work and prevent frame drops.
 *
 * @example
 * ```tsx
 * const { visibleSections } = useLazySectionVisibility({
 *   sectionCount: 4,
 *   renderFirstImmediately: true,
 *   renderDelay: 100
 * })
 *
 * return (
 *   <>
 *     {visibleSections[0] && <Section1 />}
 *     {visibleSections[1] && <Section2 />}
 *   </>
 * )
 * ```
 */
export function useLazySectionVisibility({
  sectionCount,
  renderFirstImmediately = true,
  renderDelay = 100,
}: UseLazySectionVisibilityOptions): UseLazySectionVisibilityReturn {
  const [visibleSections, setVisibleSections] = useState<boolean[]>(() => {
    // Initialize with first section visible if renderFirstImmediately is true
    const initial = new Array(sectionCount).fill(false)
    if (renderFirstImmediately && sectionCount > 0) {
      initial[0] = true
    }
    return initial
  })

  const hasStartedRef = useRef(false)
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    // Don't start if already started or if no sections to render
    if (hasStartedRef.current || sectionCount === 0) {
      return
    }

    hasStartedRef.current = true

    // Render sections sequentially with delay
    // If renderFirstImmediately is true, start from index 1 (section 0 already visible)
    // Delay calculation: (i - startIndex + 1) * renderDelay ensures first deferred section
    // renders after renderDelay, not immediately
    const startIndex = renderFirstImmediately ? 1 : 0
    for (let i = startIndex; i < sectionCount; i++) {
      const delay = (i - startIndex + 1) * renderDelay
      const timer = setTimeout(() => {
        setVisibleSections((prev) => {
          // Only update if not already visible
          if (prev[i]) {
            return prev
          }
          const updated = [...prev]
          updated[i] = true
          return updated
        })
      }, delay)

      timersRef.current.push(timer)
    }

    return () => {
      timersRef.current.forEach(clearTimeout)
      timersRef.current = []
    }
  }, [sectionCount, renderFirstImmediately, renderDelay])

  return { visibleSections }
}
