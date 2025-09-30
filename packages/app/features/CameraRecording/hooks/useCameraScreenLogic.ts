import { log } from '@my/logging'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { startUploadAndAnalysis } from '../../../services/videoUploadAndAnalysis'
import { CameraRecordingScreenProps, RecordingState } from '../types'
import { useRecordingStateMachine } from './useRecordingStateMachine'
import { useTabPersistence } from './useTabPersistence'

export const useCameraScreenLogic = ({
  onNavigateBack,
  onNavigateToVideoAnalysis,
  onTabChange,
  cameraRef,
}: CameraRecordingScreenProps & {
  cameraRef?: any
}) => {
  const [cameraType, setCameraType] = useState<'front' | 'back'>('back')
  const [zoomLevel, setZoomLevel] = useState<1 | 2 | 3>(1)
  const [showNavigationDialog, setShowNavigationDialog] = useState(false)
  const [showSideSheet, setShowSideSheet] = useState(false)

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
  // Tab persistence across app sessions
  const { activeTab, setActiveTab, isLoading: isTabLoading } = useTabPersistence()
  const [cameraReady, setCameraReady] = useState(false)

  // Handle recording state changes - simplified since we don't need screen transitions
  const handleRecordingStateChange = useCallback((state: RecordingState, duration: number) => {
    log.info('useCameraScreenLogic', 'Recording state changed', { state, duration })
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

  // Handle video recording completion - navigate immediately, process in background
  const handleVideoRecorded = useCallback(
    async (videoUri: string) => {
      log.info('useCameraScreenLogic', 'Video recorded and saved', { videoUri })

      // 1) Navigate immediately to analysis screen so user sees processing state right away
      onNavigateToVideoAnalysis?.(videoUri)

      // 2) Start the upload and analysis pipeline in background
      void startUploadAndAnalysis({
        sourceUri: videoUri,
        durationSeconds: duration,
        originalFilename: 'recorded_video.mp4',
      })
    },
    [onNavigateToVideoAnalysis]
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
      log.error('handleCameraSwap', 'Failed to change camera facing', error)
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
          log.error('handleZoomChange', 'Failed to apply zoom to camera', error)
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
      log.error('useCameraScreenLogic', 'Error stopping recording', error)
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

      // 1) Navigate immediately to analysis screen so user sees processing state right away
      onNavigateToVideoAnalysis?.(metadata?.localUri)

      // 2) Start the upload and analysis pipeline in background
      void startUploadAndAnalysis({
        file,
        originalFilename:
          metadata?.originalFilename ||
          file.name ||
          `selected_video.${metadata?.format === 'mov' ? 'mov' : 'mp4'}`,
        durationSeconds: metadata?.duration,
        format: metadata?.format === 'mov' ? 'mov' : 'mp4',
      })
    },
    [onNavigateToVideoAnalysis]
  )

  const handleSettingsOpen = useCallback(() => {
    // TODO: Implement camera settings modal
    log.info('handleSettingsOpen', 'Settings clicked')
  }, [])

  // Stabilize optional navigation callback to avoid changing dependency array sizes
  const onNavigateBackRef = useRef<typeof onNavigateBack>(onNavigateBack)
  // Always update ref on every render to avoid conditional useEffect
  onNavigateBackRef.current = onNavigateBack

  const handleNavigateBack = useCallback(() => {
    if (recordingState === RecordingState.RECORDING || recordingState === RecordingState.PAUSED) {
      setShowNavigationDialog(true)
      return
    }
    onNavigateBackRef.current?.()
  }, [recordingState])

  const confirmNavigation = useCallback(() => {
    setShowNavigationDialog(false)
    try {
      stopRecording()
      resetRecording()
    } catch (error) {
      log.warn('confirmNavigation', `Error stopping recording on navigation: ${error}`)
    }
    onNavigateBackRef.current?.()
  }, [stopRecording, resetRecording])

  const cancelNavigation = useCallback(() => {
    setShowNavigationDialog(false)
  }, [])

  const handleTabChange = useCallback(
    (tab: 'coach' | 'record' | 'insights') => {
      setActiveTab(tab)
      onTabChange?.(tab) // Call the tab change callback
    },
    [onTabChange]
  )

  const handleCameraReady = useCallback(() => {
    setCameraReady(true)
    log.info('useCameraScreenLogic', 'Camera is ready for recording')
  }, [])

  const headerTitle =
    recordingState === RecordingState.RECORDING || recordingState === RecordingState.PAUSED
      ? formattedDuration
      : 'Solo:Level'

  const isRecording = recordingState === RecordingState.RECORDING

  return {
    // Camera state
    cameraType,
    zoomLevel,
    showNavigationDialog,
    showSideSheet,
    activeTab,
    recordingState,
    duration,
    formattedDuration,
    isRecording,
    headerTitle,
    cameraReady,
    canStop,

    // Tab persistence state
    isTabLoading,

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
    handleNavigateBack,
    confirmNavigation,
    cancelNavigation,
    handleTabChange,
    handleCameraReady,
    setShowSideSheet,
    setShowNavigationDialog,

    // Recording actions
    handleVideoRecorded,
    resetRecording,
  }
}
