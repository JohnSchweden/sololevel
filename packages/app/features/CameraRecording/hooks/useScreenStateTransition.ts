import { log } from '@ui/utils/logger'
import { useCallback, useRef, useState } from 'react'
import { RecordingState } from '../types'

export type ScreenState = 'camera' | 'videoPlayer'

export interface VideoData {
  videoUri: string
  duration: number
}

export interface ScreenStateTransitionConfig {
  onNavigateToVideoPlayer?: (videoData: VideoData) => void
  onNavigateToCamera?: () => void
  onVideoRecorded?: (videoUri: string) => void
}

export interface ScreenStateTransitionResult {
  // State
  screenState: ScreenState
  videoData: VideoData | null
  isVideoPlayerMode: boolean
  isCameraMode: boolean

  // Actions
  handleRecordingStateChange: (state: RecordingState, duration: number) => void
  handleVideoRecorded: (videoUri: string) => void
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
  const { onNavigateToVideoPlayer, onNavigateToCamera, onVideoRecorded } = config

  const [screenState, setScreenState] = useState<ScreenState>('camera')
  const [videoData, setVideoData] = useState<VideoData | null>(null)
  const [savedVideoUri, setSavedVideoUri] = useState<string | null>(null)
  const savedVideoUriRef = useRef<string | null>(null)

  // Handle when a video has been recorded and saved
  const handleVideoRecorded = useCallback(
    (videoUri: string) => {
      log.info('useScreenStateTransition', 'Video recorded and saved', { videoUri })
      setSavedVideoUri(videoUri)
      savedVideoUriRef.current = videoUri
      onVideoRecorded?.(videoUri)
    },
    [onVideoRecorded]
  )

  // Handle recording state changes
  const handleRecordingStateChange = useCallback(
    (state: RecordingState, duration: number) => {
      log.info('useScreenStateTransition', 'Recording state changed', {
        state,
        duration,
        currentScreenState: screenState,
        savedVideoUri,
      })

      // Only transition to video player when recording stops
      if (state === RecordingState.STOPPED) {
        log.info('useScreenStateTransition', 'Recording STOPPED - will wait for video to be saved')

        // Wait a bit for the video to be saved and onVideoRecorded to be called
        // This ensures savedVideoUri is available before transitioning
        setTimeout(() => {
          const currentSavedUri = savedVideoUriRef.current
          log.info('useScreenStateTransition', 'Delayed transition to video player', {
            savedVideoUri: currentSavedUri,
            hasSavedUri: !!currentSavedUri,
          })

          // Use the real saved video URI if available, otherwise generate a fallback
          const videoUri = currentSavedUri || `file://recording_${Date.now()}.mp4`
          const newVideoData: VideoData = {
            videoUri,
            duration: Math.max(0, duration), // Ensure non-negative duration
          }

          setVideoData(newVideoData)
          setScreenState('videoPlayer')

          log.info('useScreenStateTransition', 'State set to videoPlayer', {
            videoUri,
            duration: newVideoData.duration,
            usedSavedUri: !!currentSavedUri,
          })

          // Notify parent component about the transition
          onNavigateToVideoPlayer?.(newVideoData)
          log.info('useScreenStateTransition', 'onNavigateToVideoPlayer called', {
            videoUri,
            duration: newVideoData.duration,
          })

          // Reset saved URI for next recording
          setSavedVideoUri(null)
          savedVideoUriRef.current = null
        }, 100) // Small delay to allow video saving to complete
      }
    },
    [savedVideoUri, onNavigateToVideoPlayer, screenState]
  )

  // Handle restart recording (return to camera)
  const handleRestartRecording = useCallback(() => {
    log.info('useScreenStateTransition: Restarting recording - returning to camera')

    setScreenState('camera')
    setVideoData(null)
    setSavedVideoUri(null)
    savedVideoUriRef.current = null

    onNavigateToCamera?.()
  }, [onNavigateToCamera])

  // Handle continue to analysis (return to camera for now)
  const handleContinueToAnalysis = useCallback(() => {
    log.info('useScreenStateTransition: Continuing to analysis - returning to camera')

    setScreenState('camera')
    setVideoData(null)
    setSavedVideoUri(null)
    savedVideoUriRef.current = null

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
    handleVideoRecorded,
    handleRestartRecording,
    handleContinueToAnalysis,
  }
}
