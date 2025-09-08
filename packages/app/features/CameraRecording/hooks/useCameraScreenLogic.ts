import { log } from '@my/ui/src/utils/logger'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CameraRecordingScreenProps, RecordingState } from '../types'
import { useRecordingStateMachine } from './useRecordingStateMachine'

export const useCameraScreenLogic = ({
  onNavigateBack,
  cameraRef,
}: CameraRecordingScreenProps & {
  cameraRef?: any
}) => {
  const [cameraType, setCameraType] = useState<'front' | 'back'>('back')
  const [zoomLevel, setZoomLevel] = useState<1 | 2 | 3>(1)
  const [showNavigationDialog, setShowNavigationDialog] = useState(false)
  const [showSideSheet, setShowSideSheet] = useState(false)

  const handleResetZoom = useCallback(() => {
    setZoomLevel(1)
  }, [])
  const [activeTab, setActiveTab] = useState<'coach' | 'record' | 'insights'>('record')
  const [cameraReady, setCameraReady] = useState(false)

  // Stabilize camera controls to prevent dependency array size changes
  const cameraControls = useMemo(() => {
    // Always return an object to maintain consistent dependency array sizes
    if (cameraRef?.current && cameraReady) {
      return {
        startRecording: cameraRef.current.startRecording,
        stopRecording: cameraRef.current.stopRecording,
        pauseRecording: cameraRef.current.pauseRecording,
        resumeRecording: cameraRef.current.resumeRecording,
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
  }, [cameraRef, cameraReady])

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
    onStateChange: useCallback((_state: RecordingState, _durationMs: number) => {
      // State change handled implicitly through reactive updates
    }, []),
    onError: useCallback((error: string) => {
      log.error('useRecordingStateMachine', error)
      // TODO: Handle recording errors with user feedback
    }, []),
    onResetZoom: handleResetZoom,
  })

  const handleCameraSwap = useCallback(async () => {
    if (recordingState === RecordingState.RECORDING) {
      return // Disable camera swap while recording
    }

    try {
      // Simply update the camera type state - the CameraPreview component will handle the change
      // via its 'facing' prop rather than trying to use toggleFacing which is unreliable
      setCameraType((prev) => (prev === 'front' ? 'back' : 'front'))
      log.info('handleCameraSwap', 'Camera facing changed', {
        newType: cameraType === 'front' ? 'back' : 'front',
      })
    } catch (error) {
      log.error('handleCameraSwap', 'Failed to change camera facing', error)
    }
  }, [recordingState, cameraType])

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
  }, [canRecord, cameraReady, startRecording])

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
    if (!canStop) return
    try {
      await stopRecording()
    } catch (error) {
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

  const handleVideoSelected = useCallback((file: File, metadata: any) => {
    log.info('handleVideoSelected', 'Video selected for upload', {
      fileName: file.name,
      fileSize: file.size,
      duration: metadata?.duration,
    })

    // TODO: Implement actual upload logic using VideoUploadService
  }, [])

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

  const handleTabChange = useCallback((tab: 'coach' | 'record' | 'insights') => {
    setActiveTab(tab)
    onNavigateBackRef.current?.() // Navigate back when switching tabs
  }, [])

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
  }
}
