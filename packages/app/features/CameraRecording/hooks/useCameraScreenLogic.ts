import { log } from '@my/logging'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { startUploadAndAnalysis } from '../../../services/videoUploadAndAnalysis'
import { MAX_RECORDING_DURATION_MS } from '../config/recordingConfig'
import type { HeaderState } from '../types'
import { CameraRecordingScreenProps, RecordingState } from '../types'
import { useRecordingStateMachine } from './useRecordingStateMachine'

export const useCameraScreenLogic = ({
  onVideoProcessed,
  cameraRef,
  onHeaderStateChange,
}: CameraRecordingScreenProps & {
  cameraRef?: any
  /** Direct callback for immediate header updates (bypasses React state) */
  onHeaderStateChange?: (state: HeaderState) => void
}) => {
  const [cameraType, setCameraType] = useState<'front' | 'back'>('back')
  const [zoomLevel, setZoomLevel] = useState<1 | 2 | 3>(1)
  const [showNavigationDialog, setShowNavigationDialog] = useState(false)

  // Track if we're discarding recording (to prevent processing)
  const isDiscardingRef = useRef(false)

  // Camera swap visual feedback state
  const [isCameraSwapping, setIsCameraSwapping] = useState(false)
  const [isMounted, setIsMounted] = useState(true)
  const isMountedRef = useRef(true)
  const swapTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const CAMERA_SWAP_TRANSITION_DURATION = 300 // 300ms for smooth transition

  // Track component mount state
  useEffect(() => {
    setIsMounted(true)
    isMountedRef.current = true
    return () => {
      setIsMounted(false)
      isMountedRef.current = false
      if (swapTimeoutRef.current) {
        clearTimeout(swapTimeoutRef.current)
      }
    }
  }, [])

  const handleResetZoom = useCallback(() => {
    setZoomLevel(1)
  }, [])

  const [cameraReady, setCameraReady] = useState(false)

  // Handle recording state changes - call onHeaderStateChange DIRECTLY to bypass React state delay
  // This is the key performance fix: React batches state updates during async operations,
  // causing ~500ms delay. By calling the header callback directly, UI updates instantly.
  const handleRecordingStateChange = useCallback(
    (state: RecordingState, durationMs: number) => {
      const isInRecordingState =
        state === RecordingState.RECORDING || state === RecordingState.PAUSED

      log.info('useCameraScreenLogic', 'Recording state changed', {
        state,
        durationMs,
        durationSeconds: (durationMs / 1000).toFixed(2),
      })

      // PERF FIX: Call onHeaderStateChange DIRECTLY from state machine callback
      // This bypasses React's state batching and updates UI immediately
      if (onHeaderStateChange) {
        const minutes = Math.floor(durationMs / 60000)
        const seconds = Math.floor((durationMs % 60000) / 1000)
        const formattedDuration = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`

        onHeaderStateChange({
          time: formattedDuration,
          mode: state,
          isRecording: isInRecordingState,
        })
      }
    },
    [onHeaderStateChange]
  )

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

  // Log when camera controls become available (only once when isReady transitions to true)
  const hasLoggedCameraReadyRef = useRef(false)
  useEffect(() => {
    if (cameraControls.isReady && !hasLoggedCameraReadyRef.current) {
      hasLoggedCameraReadyRef.current = true
      log.info('useCameraScreenLogic', 'Camera controls are now available for recording')
    } else if (!cameraControls.isReady) {
      // Reset flag when camera becomes unavailable
      hasLoggedCameraReadyRef.current = false
    }
  }, [cameraControls.isReady])

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
    maxDurationMs: MAX_RECORDING_DURATION_MS,
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

  // Wrap resetRecording to ensure discard flag is reset when starting fresh
  // Note: When discarding, the flag is reset in handleVideoRecorded after checking
  const resetRecordingWithFlagReset = useCallback(() => {
    // Only reset flag if we're not currently discarding
    // If discarding, the flag will be reset in handleVideoRecorded after it checks
    if (!isDiscardingRef.current) {
      isDiscardingRef.current = false
    }
    resetRecording()
  }, [resetRecording])

  // Get discard flag getter for camera component
  const getIsDiscarding = useCallback(() => {
    return isDiscardingRef.current
  }, [])

  // Handle video recording completion - notify parent, process in background
  const handleVideoRecorded = useCallback(
    async (videoUri: string | null) => {
      log.info('useCameraScreenLogic', 'Video recorded and saved', {
        videoUri,
        isDiscarding: isDiscardingRef.current,
      })

      // If user is discarding (navigating back), don't process the video
      if (isDiscardingRef.current) {
        log.info('useCameraScreenLogic', 'Discarding recording - skipping video processing', {
          videoUri,
        })
        isDiscardingRef.current = false // Reset flag
        return
      }

      // If videoUri is null, it means filesystem save was skipped (discarding)
      // In that case, we've already returned above, but this is a safety check
      if (!videoUri) {
        log.warn('useCameraScreenLogic', 'Video URI is null, skipping processing')
        return
      }

      // 1) Notify parent component (route file will handle navigation)
      onVideoProcessed?.(videoUri)

      // 2) Start the upload and analysis pipeline in background
      // Use ref to read current duration without creating dependency
      // Convert milliseconds to seconds (duration from state machine is in ms)
      void startUploadAndAnalysis({
        sourceUri: videoUri,
        durationSeconds: durationRef.current / 1000,
        originalFilename: 'recorded_video.mp4',
      })
    },
    [onVideoProcessed]
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
      swapTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          setIsCameraSwapping(false)
        }
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
    // Reset discard flag when starting a new recording
    isDiscardingRef.current = false
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
    // Discard recording immediately without showing dialog
    if (recordingState === RecordingState.RECORDING || recordingState === RecordingState.PAUSED) {
      // Set discard flag to prevent video processing
      isDiscardingRef.current = true
      log.info('handleBackPress', 'Discarding recording on back press', {
        isDiscarding: isDiscardingRef.current,
      })
      try {
        // TIMING FIX: Start camera reset FIRST, then update UI state in parallel
        // This syncs the camera reset animation (~780ms) with UI state changes
        // Instead of: UI updates → then camera resets (jarring)
        // Now: camera starts resetting → UI updates during reset (smooth)
        cameraRef?.current?.resetCamera?.()

        await stopRecording()
        // After stopping, reset to idle state
        resetRecording()
        log.info('handleBackPress', 'Recording discarded and reset to idle state')
      } catch (error) {
        log.warn('handleBackPress', `Error stopping recording on back press: ${error}`)
        // Reset flag on error
        isDiscardingRef.current = false
      }
    }
    // COMMENTED OUT: Show navigation dialog
    // if (recordingState === RecordingState.RECORDING || recordingState === RecordingState.PAUSED) {
    //   setShowNavigationDialog(true)
    // }
  }, [recordingState, stopRecording, resetRecording, cameraRef])

  const handleUploadVideo = useCallback(() => {
    // Legacy callback for backward compatibility
    log.info('handleUploadVideo', 'Upload video clicked')
  }, [])

  const handleVideoSelected = useCallback(
    (file: File | undefined, metadata: any) => {
      log.info('handleVideoSelected', 'Video selected for upload', {
        fileName: file?.name ?? metadata?.originalFilename,
        fileSize: file?.size ?? metadata?.size,
        duration: metadata?.duration,
        localUri: metadata?.localUri?.substring(0, 60),
        hasFile: !!file,
      })

      // 1) Notify parent component (route file will handle navigation)
      onVideoProcessed?.(metadata?.localUri)

      // 2) Start the upload and analysis pipeline in background
      // Native: file is undefined, uses localUri for compression (avoids 28MB memory spike)
      // Web: file is provided
      void startUploadAndAnalysis({
        file,
        originalFilename:
          metadata?.originalFilename ||
          file?.name ||
          `selected_video.${metadata?.format === 'mov' ? 'mov' : 'mp4'}`,
        durationSeconds: metadata?.duration,
        format: metadata?.format === 'mov' ? 'mov' : 'mp4',
        localUri: metadata?.localUri, // Used for compression on native, thumbnail on both
      })
    },
    [onVideoProcessed]
  )

  const handleSettingsOpen = useCallback(() => {
    // TODO: Implement camera settings modal
    log.info('handleSettingsOpen', 'Settings clicked')
  }, [])

  const confirmNavigation = useCallback(async () => {
    setShowNavigationDialog(false)
    // Set discard flag to prevent video processing
    // This flag will be checked in handleVideoRecorded and reset there
    // IMPORTANT: Set flag BEFORE stopping to ensure it's checked when callback fires
    isDiscardingRef.current = true
    log.info('confirmNavigation', 'Setting discard flag and stopping recording', {
      isDiscarding: isDiscardingRef.current,
    })
    try {
      // Stop recording - this will trigger onRecordingFinished callback asynchronously
      await stopRecording()
      log.info('confirmNavigation', 'Recording stopped, waiting for handleVideoRecorded callback')
      // After stopping, reset to idle state
      // Note: Don't reset the discard flag here - let handleVideoRecorded reset it
      // after checking it, since the camera callback is async
      // Use setTimeout to defer reset until after any pending callbacks
      setTimeout(() => {
        // Double-check flag is still set (should be, unless handleVideoRecorded already processed it)
        if (isDiscardingRef.current) {
          log.warn(
            'confirmNavigation',
            'Discard flag still set after timeout - resetting state anyway'
          )
        }
        resetRecording()
        log.info('confirmNavigation', 'Recording state reset to idle after discard')
      }, 100) // Small delay to allow async callback to fire
    } catch (error) {
      log.warn('confirmNavigation', `Error stopping recording on navigation: ${error}`)
      // Reset flag on error
      isDiscardingRef.current = false
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
      resetRecording: resetRecordingWithFlagReset,
      getIsDiscarding,
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
    resetRecordingWithFlagReset,
    getIsDiscarding,
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
