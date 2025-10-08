import { useEffect, useRef } from 'react'

/**
 * Hook that automatically plays video when processing completes.
 * Triggers play once when isProcessing transitions from true to false.
 */
export function useAutoPlayOnReady(
  isProcessing: boolean,
  isPlaying: boolean,
  playVideo: () => void
): void {
  const prevProcessingRef = useRef(isProcessing)

  useEffect(() => {
    const wasProcessing = prevProcessingRef.current
    const isNowProcessing = isProcessing

    if (wasProcessing && !isNowProcessing) {
      if (!isPlaying) {
        playVideo()
      }
    }

    prevProcessingRef.current = isNowProcessing
  }, [isProcessing, isPlaying, playVideo])
}
