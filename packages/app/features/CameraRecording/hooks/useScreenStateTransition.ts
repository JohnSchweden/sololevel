import { log } from '@my/ui/src/utils/logger'
import { useCallback, useState } from 'react'
import { RecordingState } from '../types'

export type ScreenState = 'camera' | 'videoPlayer'

export interface VideoData {
  videoUri: string
  duration: number
}

export interface ScreenStateTransitionConfig {
  onNavigateToVideoPlayer?: (videoData: VideoData) => void
  onNavigateToCamera?: () => void
}

export interface ScreenStateTransitionResult {
  // State
  screenState: ScreenState
  videoData: VideoData | null
  isVideoPlayerMode: boolean
  isCameraMode: boolean

  // Actions
  handleRecordingStateChange: (state: RecordingState, duration: number) => void
  handleRestartRecording: () => void
  handleContinueToAnalysis: () => void
}

/**
 * Hook to manage screen state transitions between camera recording and video player
 * Implements US-RU-13: Video playback with live processing
 *
 * When recording stops (RecordingState.STOPPED), automatically transitions to video player mode
 * Provides callbacks for navigation and video data management
 */
export function useScreenStateTransition(
  config: ScreenStateTransitionConfig
): ScreenStateTransitionResult {
  const { onNavigateToVideoPlayer, onNavigateToCamera } = config

  const [screenState, setScreenState] = useState<ScreenState>('camera')
  const [videoData, setVideoData] = useState<VideoData | null>(null)

  // Generate unique video URI for each recording
  const generateVideoUri = useCallback(() => {
    const timestamp = Date.now()
    return `file://recording_${timestamp}.mp4`
  }, [])

  // Handle recording state changes
  const handleRecordingStateChange = useCallback(
    (state: RecordingState, duration: number) => {
      log.info('useScreenStateTransition', 'Recording state changed', {
        state,
        duration,
        currentScreenState: screenState,
      })

      // Only transition to video player when recording stops
      if (state === RecordingState.STOPPED) {
        log.info('useScreenStateTransition', 'Recording STOPPED - transitioning to video player')
        const videoUri = generateVideoUri()
        const newVideoData: VideoData = {
          videoUri,
          duration: Math.max(0, duration), // Ensure non-negative duration
        }

        setVideoData(newVideoData)
        setScreenState('videoPlayer')

        log.info('useScreenStateTransition', 'State set to videoPlayer', {
          videoUri,
          duration: newVideoData.duration,
        })

        // Notify parent component about the transition
        onNavigateToVideoPlayer?.(newVideoData)
        log.info('useScreenStateTransition', 'onNavigateToVideoPlayer called', {
          videoUri,
          duration: newVideoData.duration,
        })
      }
    },
    [generateVideoUri, onNavigateToVideoPlayer]
  )

  // Handle restart recording (return to camera)
  const handleRestartRecording = useCallback(() => {
    log.info('useScreenStateTransition: Restarting recording - returning to camera')

    setScreenState('camera')
    setVideoData(null)

    onNavigateToCamera?.()
  }, [onNavigateToCamera])

  // Handle continue to analysis (return to camera for now)
  const handleContinueToAnalysis = useCallback(() => {
    log.info('useScreenStateTransition: Continuing to analysis - returning to camera')

    setScreenState('camera')
    setVideoData(null)

    onNavigateToCamera?.()
  }, [onNavigateToCamera])

  // Computed state
  const isVideoPlayerMode = screenState === 'videoPlayer'
  const isCameraMode = screenState === 'camera'

  return {
    // State
    screenState,
    videoData,
    isVideoPlayerMode,
    isCameraMode,

    // Actions
    handleRecordingStateChange,
    handleRestartRecording,
    handleContinueToAnalysis,
  }
}
