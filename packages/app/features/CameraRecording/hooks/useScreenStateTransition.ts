import { log } from '@my/logging'
import { useCallback, useEffect, useRef, useState } from 'react'
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
  const transitionFrameRef = useRef<number | null>(null)
  const [pendingTransition, setPendingTransition] = useState<{
    duration: number
    requestId: number
  } | null>(null)

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

        const safeDuration = Math.max(0, duration)
        setPendingTransition({
          duration: safeDuration,
          requestId: Date.now(),
        })
      }
    },
    [savedVideoUri, onNavigateToVideoPlayer, screenState]
  )

  // Handle restart recording (return to camera)
  const handleRestartRecording = useCallback(() => {
    log.info('useScreenStateTransition', 'Restarting recording - returning to camera')

    if (transitionFrameRef.current !== null) {
      cancelAnimationFrame(transitionFrameRef.current)
      transitionFrameRef.current = null
    }
    setPendingTransition(null)

    setScreenState('camera')
    setVideoData(null)
    setSavedVideoUri(null)
    savedVideoUriRef.current = null

    onNavigateToCamera?.()
  }, [onNavigateToCamera])

  // Handle continue to analysis (return to camera for now)
  const handleContinueToAnalysis = useCallback(() => {
    log.info('useScreenStateTransition', 'Continuing to analysis - returning to camera')

    if (transitionFrameRef.current !== null) {
      cancelAnimationFrame(transitionFrameRef.current)
      transitionFrameRef.current = null
    }
    setPendingTransition(null)

    setScreenState('camera')
    setVideoData(null)
    setSavedVideoUri(null)
    savedVideoUriRef.current = null

    onNavigateToCamera?.()
  }, [onNavigateToCamera])

  // Computed state
  const isVideoPlayerMode = screenState === 'videoPlayer'
  const isCameraMode = screenState === 'camera'

  useEffect(() => {
    if (!pendingTransition) {
      return undefined
    }

    if (transitionFrameRef.current !== null) {
      cancelAnimationFrame(transitionFrameRef.current)
      transitionFrameRef.current = null
    }

    log.info('useScreenStateTransition', 'Scheduling video player transition via rAF', {
      duration: pendingTransition.duration,
      requestId: pendingTransition.requestId,
    })

    transitionFrameRef.current = requestAnimationFrame(() => {
      const currentSavedUri = savedVideoUriRef.current
      log.info('useScreenStateTransition', 'Executing video player transition', {
        savedVideoUri: currentSavedUri,
        hasSavedUri: !!currentSavedUri,
      })

      const videoUri = currentSavedUri || `file://recording_${Date.now()}.mp4`
      const newVideoData: VideoData = {
        videoUri,
        duration: pendingTransition.duration,
      }

      setVideoData(newVideoData)
      setScreenState('videoPlayer')

      log.info('useScreenStateTransition', 'State set to videoPlayer', {
        videoUri,
        duration: newVideoData.duration,
        usedSavedUri: !!currentSavedUri,
      })

      onNavigateToVideoPlayer?.(newVideoData)
      log.info('useScreenStateTransition', 'onNavigateToVideoPlayer called', {
        videoUri,
        duration: newVideoData.duration,
      })

      setSavedVideoUri(null)
      savedVideoUriRef.current = null
      transitionFrameRef.current = null
      setPendingTransition(null)
    })

    return () => {
      if (transitionFrameRef.current !== null) {
        cancelAnimationFrame(transitionFrameRef.current)
        transitionFrameRef.current = null
      }
    }
  }, [pendingTransition, onNavigateToVideoPlayer])

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
