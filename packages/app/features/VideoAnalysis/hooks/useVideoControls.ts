import { useCallback, useEffect, useMemo, useState } from 'react'

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
  const [manualVisible, setManualVisible] = useState(false)

  const forcedVisible = useMemo(
    () => isProcessing || !isPlaying || videoEnded,
    [isProcessing, isPlaying, videoEnded]
  )

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

  const showReplayButton = videoEnded

  return {
    showControls,
    showReplayButton,
    setControlsVisible,
  }
}
