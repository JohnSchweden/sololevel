import { useEffect, useRef } from 'react'

/**
 * Hook that automatically plays video when processing completes.
 * - Analysis mode: Triggers play once when isProcessing transitions from true to false
 * - History mode: If already ready (isProcessing=false), plays immediately on first render
 */
export function useAutoPlayOnReady(
  isProcessing: boolean,
  isPlaying: boolean,
  playVideo: () => void
): void {
  const prevProcessingRef = useRef(isProcessing)
  const hasPlayedRef = useRef(false)

  useEffect(() => {
    const wasProcessing = prevProcessingRef.current
    const isNowProcessing = isProcessing

    // Transition case: Processing → Ready
    if (wasProcessing && !isNowProcessing) {
      if (!isPlaying && !hasPlayedRef.current) {
        playVideo()
        hasPlayedRef.current = true
      }
    }

    // History mode case: Already ready on first render (no transition)
    // Play immediately if processing is false from the start
    if (!wasProcessing && !isNowProcessing && !hasPlayedRef.current) {
      if (!isPlaying) {
        playVideo()
        hasPlayedRef.current = true
      }
    }

    prevProcessingRef.current = isNowProcessing
  }, [isProcessing, isPlaying, playVideo])
}
