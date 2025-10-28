import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export interface VideoControlsState {
  showControls: boolean
  showReplayButton: boolean
  setControlsVisible: (visible: boolean) => void
}

export function useVideoControls(
  isProcessing: boolean,
  isPlaying: boolean,
  videoEnded: boolean
): VideoControlsState {
  // Controls start hidden; only shown when video paused, processing, or user taps
  const [manualVisible, setManualVisible] = useState(false)
  const hasUserInteractedRef = useRef(false)

  const forcedVisible = useMemo(() => {
    // Keep controls hidden until user has actually tapped/interacted when playing
    // (not just internal visibility changes)
    if (!hasUserInteractedRef.current) {
      return false
    }
    // After user interacts, use normal rules
    return isProcessing || !isPlaying || videoEnded
  }, [isProcessing, isPlaying, videoEnded])

  const showControls = forcedVisible || manualVisible

  const setControlsVisible = useCallback(
    (visible: boolean) => {
      setManualVisible((current) => {
        if (visible) {
          if (forcedVisible) {
            return current
          }
          return true
        }

        if (forcedVisible) {
          return current
        }

        return false
      })
    },
    [forcedVisible]
  )

  useEffect(() => {
    if (forcedVisible) {
      setManualVisible(false)
    }
  }, [forcedVisible])

  // When user manually sets controls visible (not from internal callback),
  // mark that they've interacted
  useEffect(() => {
    if (manualVisible) {
      hasUserInteractedRef.current = true
    }
  }, [manualVisible])

  const showReplayButton = videoEnded

  return {
    showControls,
    showReplayButton,
    setControlsVisible,
  }
}
