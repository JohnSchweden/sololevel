import { log } from '@my/logging'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { startUploadAndAnalysis } from '../../../services/videoUploadAndAnalysis'
import { CameraRecordingScreenProps, RecordingState } from '../types'
import { useRecordingStateMachine } from './useRecordingStateMachine'

export const useCameraScreenLogic = ({
  onVideoProcessed,
  cameraRef,
}: CameraRecordingScreenProps & {
  cameraRef?: any
}) => {
  const queryClient = useQueryClient()
  const [cameraType, setCameraType] = useState<'front' | 'back'>('back')
  const [zoomLevel, setZoomLevel] = useState<1 | 2 | 3>(1)
  const [showNavigationDialog, setShowNavigationDialog] = useState(false)

  // Camera swap visual feedback state
  const [isCameraSwapping, setIsCameraSwapping] = useState(false)
  const [isMounted, setIsMounted] = useState(true)
  const CAMERA_SWAP_TRANSITION_DURATION = 300 // 300ms for smooth transition

  // Track component mount state
  useEffect(() => {
    setIsMounted(true)
    return () => {
      setIsMounted(false)
    }
  }, [])

  const handleResetZoom = useCallback(() => {
    setZoomLevel(1)
  }, [])

  const [cameraReady, setCameraReady] = useState(false)

  // Handle recording state changes - simplified since we don't need screen transitions
  const handleRecordingStateChange = useCallback((state: RecordingState, duration: number) => {
    log.info('useCameraScreenLogic', 'Recording state changed', {
      state,
      duration,
    })
  }, [])

  // Stabilize camera controls to prevent dependency array size changes
  const cameraControls = useMemo(() => {
    // Always return an object to maintain consistent dependency array sizes
    if (cameraRef?.current && cameraReady) {
      return {
        startRecording: async () => {
          // Additional safety check before calling camera method
          if (!isMounted) {
            log.warn('useCameraScreenLogic', 'Component not mounted, cannot start recording')
            throw new Error('Component not mounted')
          }
          if (!cameraRef?.current) {
            log.warn('useCameraScreenLogic', 'Camera ref is null, cannot start recording')
            throw new Error('Camera not available')
          }
          return cameraRef.current.startRecording()
        },
        stopRecording: async () => {
          if (!isMounted) {
            log.warn('useCameraScreenLogic', 'Component not mounted, cannot stop recording')
            throw new Error('Component not mounted')
          }
          if (!cameraRef?.current) {
            log.warn('useCameraScreenLogic', 'Camera ref is null, cannot stop recording')
            throw new Error('Camera not available')
          }
          return cameraRef.current.stopRecording()
        },
        pauseRecording: async () => {
          if (!isMounted) {
            log.warn('useCameraScreenLogic', 'Component not mounted, cannot pause recording')
            throw new Error('Component not mounted')
          }
          if (!cameraRef?.current) {
            log.warn('useCameraScreenLogic', 'Camera ref is null, cannot pause recording')
            throw new Error('Camera not available')
          }
          return cameraRef.current.pauseRecording()
        },
        resumeRecording: async () => {
          if (!isMounted) {
            log.warn('useCameraScreenLogic', 'Component not mounted, cannot resume recording')
            throw new Error('Component not mounted')
          }
          if (!cameraRef?.current) {
            log.warn('useCameraScreenLogic', 'Camera ref is null, cannot resume recording')
            throw new Error('Camera not available')
          }
          return cameraRef.current.resumeRecording()
        },
        isReady: true,
      }
    }
    // Return a stable object structure even when not ready
    return {
      startRecording: async () => {
        throw new Error('Camera not ready')
      },
      stopRecording: async () => {
        throw new Error('Camera not ready')
      },
      pauseRecording: async () => {
        throw new Error('Camera not ready')
      },
      resumeRecording: async () => {
        throw new Error('Camera not ready')
      },
      isReady: false,
    }
  }, [cameraRef, cameraReady, isMounted])

  // Log when camera controls become available
  useEffect(() => {
    if (cameraControls) {
      log.info('useCameraScreenLogic', 'Camera controls are now available for recording')
    }
  }, [cameraControls])

  const {
    recordingState,
    duration,
    formattedDuration,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    resetRecording,
    canRecord,
    canPause,
    canResume,
    canStop,
  } = useRecordingStateMachine({
    maxDurationMs: 60000, // 60 seconds
    cameraControls,
    onMaxDurationReached: useCallback(() => {
      // TODO: Show user notification about max duration
    }, []),
    onStateChange: handleRecordingStateChange,
    onError: useCallback((error: string) => {
      log.error('useRecordingStateMachine', error)
      // TODO: Handle recording errors with user feedback
    }, []),
    onResetZoom: handleResetZoom,
  })

  // Use ref for duration to prevent handleVideoRecorded callback recreation during recording
  // The callback only needs to read current duration when called, not recreate when it changes
  const durationRef = useRef(duration)
  durationRef.current = duration // Update ref synchronously on every render

  // Handle video recording completion - notify parent, process in background
  const handleVideoRecorded = useCallback(
    async (videoUri: string) => {
      log.info('useCameraScreenLogic', 'Video recorded and saved', { videoUri })

      // 1) Notify parent component (route file will handle navigation)
      onVideoProcessed?.(videoUri)

      // 2) Start the upload and analysis pipeline in background
      // Use ref to read current duration without creating dependency
      void startUploadAndAnalysis({
        sourceUri: videoUri,
        durationSeconds: durationRef.current,
        originalFilename: 'recorded_video.mp4',
        onRecordingIdAvailable: (recordingId) => {
          log.info('useCameraScreenLogic', 'Recording ID available - invalidating history cache', {
            recordingId,
          })
          // Invalidate history cache so new video appears immediately when user navigates to History
          queryClient.invalidateQueries({ queryKey: ['history', 'completed'] })
        },
      })
    },
    [onVideoProcessed, queryClient]
  )

  const handleCameraSwap = useCallback(async () => {
    if (recordingState === RecordingState.RECORDING) {
      return // Disable camera swap while recording
    }

    if (isCameraSwapping) {
      return // Prevent multiple simultaneous swaps
    }

    try {
      // Start visual feedback
      setIsCameraSwapping(true)

      // Update the camera type state - the CameraPreview component will handle the change
      // via its 'facing' prop rather than trying to use toggleFacing which is unreliable
      const newCameraType = cameraType === 'front' ? 'back' : 'front'
      setCameraType(newCameraType)

      log.info('handleCameraSwap', 'Camera facing changed', {
        newType: newCameraType,
      })

      // Provide visual feedback duration for smooth transition
      setTimeout(() => {
        setIsCameraSwapping(false)
      }, CAMERA_SWAP_TRANSITION_DURATION)
    } catch (error) {
      log.error('useCameraScreenLogic', 'Failed to change camera facing', {
        error: error instanceof Error ? error.message : String(error),
      })
      // Ensure we reset the swapping state on error
      setIsCameraSwapping(false)
    }
  }, [recordingState, cameraType, isCameraSwapping, CAMERA_SWAP_TRANSITION_DURATION])

  const handleZoomChange = useCallback(
    async (level: 1 | 2 | 3) => {
      log.info('handleZoomChange', 'Zoom level change requested', {
        level,
        cameraRef: !!cameraRef?.current,
      })
      setZoomLevel(level)

      // Apply zoom to camera if ref is available
      if (cameraRef?.current) {
        try {
          await cameraRef.current.setZoom(level)
          log.info('handleZoomChange', 'Zoom applied to camera', { level })
        } catch (error) {
          log.error('useCameraScreenLogic', 'Failed to apply zoom to camera', {
            error: error instanceof Error ? error.message : String(error),
          })
        }
      }
    },
    [cameraRef]
  )

  const handleStartRecording = useCallback(async () => {
    if (!isMounted) {
      log.warn('handleStartRecording', 'Component not mounted, cannot start recording')
      return
    }
    if (!canRecord) return
    if (!cameraReady) {
      log.warn('handleStartRecording', 'Camera not ready yet, cannot start recording')
      return
    }
    try {
      await startRecording()
    } catch (error) {
      log.warn('handleStartRecording', `Recording not supported on this platform: ${error}`)
    }
  }, [isMounted, canRecord, cameraReady, startRecording])

  const handlePauseRecording = useCallback(async () => {
    if (!canPause) return
    try {
      await pauseRecording()
    } catch (error) {
      log.warn('handlePauseRecording', `Pause recording not supported on this platform: ${error}`)
    }
  }, [canPause, pauseRecording])

  const handleResumeRecording = useCallback(async () => {
    if (!canResume) return
    try {
      await resumeRecording()
    } catch (error) {
      log.warn('handleResumeRecording', `Resume recording not supported on this platform: ${error}`)
    }
  }, [canResume, resumeRecording])

  const handleStopRecording = useCallback(async () => {
    log.info('useCameraScreenLogic', 'handleStopRecording called', { canStop })
    if (!canStop) {
      log.warn('useCameraScreenLogic', 'Cannot stop recording - not allowed', { canStop })
      return
    }
    try {
      log.info('useCameraScreenLogic', 'Calling stopRecording()')
      await stopRecording()
      log.info('useCameraScreenLogic', 'stopRecording() completed successfully')
    } catch (error) {
      log.error('useCameraScreenLogic', 'Error stopping recording', {
        error: error instanceof Error ? error.message : String(error),
      })
      log.warn('handleStopRecording', `Stop recording not supported on this platform: ${error}`)
    }
  }, [canStop, stopRecording])

  const handleBackPress = useCallback(async () => {
    if (!canStop) return
    try {
      await stopRecording()
      // After stopping, reset to idle state
      resetRecording()
      log.info('handleBackPress', 'Recording stopped and reset to idle state')
    } catch (error) {
      log.warn('handleBackPress', `Stop recording and reset failed: ${error}`)
    }
  }, [canStop, stopRecording, resetRecording])

  const handleUploadVideo = useCallback(() => {
    // Legacy callback for backward compatibility
    log.info('handleUploadVideo', 'Upload video clicked')
  }, [])

  const handleVideoSelected = useCallback(
    (file: File, metadata: any) => {
      log.info('handleVideoSelected', 'Video selected for upload', {
        fileName: file.name,
        fileSize: file.size,
        duration: metadata?.duration,
      })

      // 1) Notify parent component (route file will handle navigation)
      onVideoProcessed?.(metadata?.localUri)

      // 2) Start the upload and analysis pipeline in background
      void startUploadAndAnalysis({
        file,
        originalFilename:
          metadata?.originalFilename ||
          file.name ||
          `selected_video.${metadata?.format === 'mov' ? 'mov' : 'mp4'}`,
        durationSeconds: metadata?.duration,
        format: metadata?.format === 'mov' ? 'mov' : 'mp4',
        onRecordingIdAvailable: (recordingId) => {
          log.info('handleVideoSelected', 'Recording ID available - invalidating history cache', {
            recordingId,
          })
          // Invalidate history cache so new video appears immediately when user navigates to History
          queryClient.invalidateQueries({ queryKey: ['history', 'completed'] })
        },
      })
    },
    [onVideoProcessed, queryClient]
  )

  const handleSettingsOpen = useCallback(() => {
    // TODO: Implement camera settings modal
    log.info('handleSettingsOpen', 'Settings clicked')
  }, [])

  const confirmNavigation = useCallback(() => {
    setShowNavigationDialog(false)
    try {
      stopRecording()
      resetRecording()
    } catch (error) {
      log.warn('confirmNavigation', `Error stopping recording on navigation: ${error}`)
    }
  }, [stopRecording, resetRecording])

  const cancelNavigation = useCallback(() => {
    setShowNavigationDialog(false)
  }, [])

  const handleCameraReady = useCallback(() => {
    setCameraReady(true)
    log.info('useCameraScreenLogic', 'Camera is ready for recording')
  }, [])

  // Memoize main return object WITHOUT duration/formattedDuration to keep it stable
  // This ensures parent component (CameraRecordingScreen) only re-renders on actual state changes,
  // not on every duration tick (~4-6 times per second)
  const stableLogic = useMemo(() => {
    const isRecording = recordingState === RecordingState.RECORDING

    return {
      // Camera state (excluding duration - passed separately)
      cameraType,
      zoomLevel,
      showNavigationDialog,
      recordingState,
      isRecording,
      cameraReady,
      canStop,

      // Camera swap visual feedback
      isCameraSwapping,
      cameraSwapTransitionDuration: CAMERA_SWAP_TRANSITION_DURATION,

      // Camera actions
      handleCameraSwap,
      handleZoomChange,
      handleResetZoom,
      handleStartRecording,
      handlePauseRecording,
      handleResumeRecording,
      handleStopRecording,
      handleBackPress,
      handleUploadVideo,
      handleVideoSelected,
      handleSettingsOpen,
      confirmNavigation,
      cancelNavigation,
      handleCameraReady,
      setShowNavigationDialog,

      // Recording actions
      handleVideoRecorded,
      resetRecording,
    }
  }, [
    // Primitive state values (EXCLUDING duration/formattedDuration)
    cameraType,
    zoomLevel,
    showNavigationDialog,
    recordingState,
    cameraReady,
    canStop,
    isCameraSwapping,
    // Callbacks (already stable via useCallback)
    handleCameraSwap,
    handleZoomChange,
    handleResetZoom,
    handleStartRecording,
    handlePauseRecording,
    handleResumeRecording,
    handleStopRecording,
    handleBackPress,
    handleUploadVideo,
    handleVideoSelected,
    handleSettingsOpen,
    confirmNavigation,
    cancelNavigation,
    handleCameraReady,
    setShowNavigationDialog,
    handleVideoRecorded,
    resetRecording,
  ])

  // Memoize final return object - only recreate when stableLogic changes OR formattedDuration changes
  // formattedDuration only changes once per second (when seconds value changes), not every ~150ms like duration
  // This prevents parent component from re-rendering on every duration tick
  // Compute durationData inside this memo to ensure duration is always current, even when formattedDuration unchanged
  return useMemo(() => {
    // Compute durationData inside memo to ensure duration is always current
    // formattedDuration changes once per second, so this memo recreates at that frequency
    // duration value is always current because we read it directly from the closure
    const durationData = {
      duration,
      formattedDuration,
      // Derive headerTitle here since it depends on formattedDuration
      headerTitle:
        recordingState === RecordingState.RECORDING || recordingState === RecordingState.PAUSED
          ? formattedDuration
          : 'Solo:Level',
    }

    return {
      ...stableLogic,
      ...durationData,
    }
  }, [
    stableLogic,
    // Use formattedDuration instead of duration - only changes once per second
    // This prevents object recreation every ~150ms when duration number changes
    // duration value may be slightly stale (by up to ~150ms), but formattedDuration is always current
    // This is acceptable since formattedDuration is what's displayed, and exact duration is only used
    // in callbacks which already use refs to read current value
    formattedDuration,
    recordingState, // For headerTitle calculation
  ])
}
