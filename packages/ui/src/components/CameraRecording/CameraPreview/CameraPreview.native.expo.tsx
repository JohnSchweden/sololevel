import { VideoStorageService } from '@app/features/CameraRecording/services/videoStorageService'
import { log } from '@my/logging'
import { CameraMode, CameraRatio, CameraView } from 'expo-camera'
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Dimensions } from 'react-native'
import { SizableText, YStack } from 'tamagui'
import { CameraBackground } from '../CameraBackground/CameraBackground'
import type { CameraPreviewContainerProps, CameraPreviewRef } from '../types'

/**
 * Camera Preview Component using Expo Camera
 * Handles platform differences between native and web
 * Implements camera lifecycle management and error handling
 */
export const CameraPreview = forwardRef<CameraPreviewRef, CameraPreviewContainerProps>(
  (
    {
      isRecording: _isRecording,
      recordingState: _recordingState,
      cameraType,
      zoomLevel = 0,
      onZoomChange,
      onCameraReady,
      onError,
      onVideoRecorded,
      children,
      permissionGranted = false,
      backgroundImage,
      backgroundOpacity = 0.2,
    },
    ref
  ) => {
    const cameraRef = useRef<CameraView>(null)
    // Remove redundant cameraReady state - rely on parent component's state
    const [cameraError, setCameraError] = useState<string | null>(null)
    const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait')
    const [currentZoomLevel, setCurrentZoomLevel] = useState<number>(zoomLevel)
    const [isCameraReady, setIsCameraReady] = useState(false)
    const [isMounted, setIsMounted] = useState(false)

    // Track component mount state to prevent operations when unmounted
    useEffect(() => {
      setIsMounted(true)
      return () => {
        setIsMounted(false)
      }
    }, [])

    // Helper function to check if camera is ready
    const checkCameraReady = (): boolean => {
      if (!isMounted) {
        log.warn('ExpoCamera', 'Component not mounted, skipping camera operations')
        return false
      }
      if (!cameraRef.current) {
        log.warn('ExpoCamera', 'Camera ref is null')
        return false
      }
      if (!isCameraReady) {
        log.warn('ExpoCamera', 'Camera not ready for operations')
        return false
      }
      return true
    }

    // Expose camera control methods via ref
    useImperativeHandle(
      ref,
      () => ({
        startRecording: async (): Promise<void> => {
          if (!checkCameraReady()) {
            throw new Error('Camera not ready for recording')
          }

          // Remove internal cameraReady check - rely on parent component's check
          // The parent already ensures camera is ready before calling this method

          try {
            if (!cameraRef.current) {
              throw new Error('Camera ref is null after ready check')
            }
            const video = await cameraRef.current.recordAsync({
              codec: 'avc1',
              maxDuration: 60, // Maximum 60 seconds to prevent frame rate rounding issues
            })
            if (!video?.uri) {
              throw new Error('Recording failed: no video data received')
            }
            log.info('ExpoCamera', 'Recording finished', {
              uri: video.uri,
              hasUri: !!video.uri,
              uriStartsWithFile: video.uri?.startsWith('file://'),
              uriLength: video.uri?.length,
            })

            // Validate video URI before saving
            if (!video.uri || !video.uri.startsWith('file://')) {
              log.error('ExpoCamera', 'Invalid video URI received', {
                uri: video.uri,
                expectedFormat: 'file://...',
              })
              onError?.('Invalid video URI')
              return
            }

            // Save video to local storage using expo-file-system
            const filename = `recording_${Date.now()}.mp4`
            try {
              const savedVideo = await VideoStorageService.saveVideo(video.uri, filename, {
                format: 'mp4',
                // Note: Duration not available in expo-camera recording result
              })

              log.info('ExpoCamera', 'Video saved to local storage', {
                originalUri: video.uri,
                localUri: savedVideo.localUri,
                filename: savedVideo.filename,
                size: savedVideo.size,
                metadata: savedVideo.metadata,
              })

              // Notify parent component about the saved video
              onVideoRecorded?.(savedVideo.localUri)
            } catch (saveError) {
              log.error('ExpoCamera', 'Failed to save video to local storage', {
                videoUri: video.uri,
                filename,
                error: saveError instanceof Error ? saveError.message : saveError,
                errorStack: saveError instanceof Error ? saveError.stack : undefined,
              })
              onError?.('Failed to save video')
            }
            log.info('CameraRecording', 'Recording started')
          } catch (error) {
            log.error('CameraRecording', 'Failed to start recording', {
              error: error instanceof Error ? error.message : String(error),
            })
            throw error
          }
        },
        stopRecording: async (): Promise<void> => {
          if (!checkCameraReady()) {
            throw new Error('Camera not ready for stopping recording')
          }

          try {
            if (!cameraRef.current) {
              throw new Error('Camera ref is null after ready check')
            }
            await cameraRef.current.stopRecording()
            log.info('CameraRecording', 'Recording stopped')
          } catch (error) {
            log.error('CameraRecording', 'Failed to stop recording', {
              error: error instanceof Error ? error.message : String(error),
            })
            throw error
          }
        },
        pauseRecording: async (): Promise<void> => {
          if (!checkCameraReady()) {
            throw new Error('Camera not ready for pausing recording')
          }

          try {
            if (!cameraRef.current) {
              throw new Error('Camera ref is null after ready check')
            }
            await cameraRef.current.toggleRecordingAsync()
            log.info('CameraRecording', 'Recording toggled (paused/resumed)')
          } catch (error) {
            log.error('CameraRecording', 'Failed to toggle recording', {
              error: error instanceof Error ? error.message : String(error),
            })
            throw error
          }
        },
        resumeRecording: async (): Promise<void> => {
          // toggleRecordingAsync handles both pause and resume
          if (!checkCameraReady()) {
            throw new Error('Camera not ready for resuming recording')
          }

          try {
            if (!cameraRef.current) {
              throw new Error('Camera ref is null after ready check')
            }
            await cameraRef.current.toggleRecordingAsync()
            log.info('CameraRecording', 'Recording toggled (resumed)')
          } catch (error) {
            log.error('CameraRecording', 'Failed to toggle recording', {
              error: error instanceof Error ? error.message : String(error),
            })
            throw error
          }
        },
        takePicture: async (): Promise<string | null> => {
          if (!checkCameraReady()) {
            throw new Error('Camera not ready for taking picture')
          }

          try {
            if (!cameraRef.current) {
              throw new Error('Camera ref is null after ready check')
            }
            const photo = await cameraRef.current.takePictureAsync()
            log.info('CameraRecording', 'Picture taken', { uri: photo.uri })
            return photo.uri
          } catch (error) {
            log.error('CameraRecording', 'Failed to take picture', {
              error: error instanceof Error ? error.message : String(error),
            })
            throw error
          }
        },
        getCamera: (): CameraView | null => {
          return cameraRef.current
        },
        pausePreview: (): void => {
          if (!cameraRef.current) {
            log.warn('CameraPreview', 'pausePreview called but camera ref is null')
            return
          }

          const maybePause = (
            cameraRef.current as unknown as {
              pausePreview?: () => void
            }
          ).pausePreview

          if (typeof maybePause === 'function') {
            maybePause()
            log.info('CameraPreview', 'Preview paused')
          } else if (__DEV__) {
            log.warn('CameraPreview', 'pausePreview not supported on this platform')
          }
        },
        resumePreview: (): void => {
          if (!cameraRef.current) {
            log.warn('CameraPreview', 'resumePreview called but camera ref is null')
            return
          }

          const maybeResume = (
            cameraRef.current as unknown as {
              resumePreview?: () => void
            }
          ).resumePreview

          if (typeof maybeResume === 'function') {
            maybeResume()
            log.info('CameraPreview', 'Preview resumed')
          } else if (__DEV__) {
            log.warn('CameraPreview', 'resumePreview not supported on this platform')
          }
        },
        toggleFacing: async (): Promise<void> => {
          // This method is kept for backward compatibility
          // But we now recommend controlling camera facing via the 'facing' prop
          // which is more reliable across Expo versions
          log.info(
            'CameraRecording',
            'toggleFacing called - using prop-based switching is recommended'
          )

          // No implementation needed as camera facing is now controlled via props
          // The parent component should update the cameraType state instead
          return Promise.resolve()
        },
        setZoom: async (zoom: number): Promise<void> => {
          if (!checkCameraReady()) {
            throw new Error('Camera not ready for zoom control')
          }

          try {
            // Convert discrete zoom levels (1, 2, 3) to Expo Camera range (0-1)
            // 1x → 0.0, 2x → 0.5, 3x → 1.0
            let expoZoomValue: number
            if (zoom === 1) {
              expoZoomValue = 0.0
            } else if (zoom === 2) {
              expoZoomValue = 0.5
            } else if (zoom === 3) {
              expoZoomValue = 1.0
            } else {
              // Handle any other values by clamping to valid range
              expoZoomValue = Math.max(0, Math.min(1, (zoom - 1) / 2))
            }

            // Update internal zoom state to apply to CameraView component
            setCurrentZoomLevel(expoZoomValue)

            // Notify parent component of zoom change
            onZoomChange?.(expoZoomValue)

            if (__DEV__) {
              log.info('CameraPreview', 'Zoom value updated', {
                discreteZoom: zoom,
                expoZoom: expoZoomValue,
                range: '0-1',
              })
            }
          } catch (error) {
            log.error('CameraPreview', 'Failed to update zoom', {
              error: error instanceof Error ? error.message : String(error),
            })
            throw error
          }
        },
        getZoom: async (): Promise<number> => {
          // Return current zoom level from internal state
          return currentZoomLevel
        },
      }),
      [currentZoomLevel, onZoomChange, isCameraReady] // Include currentZoomLevel in dependencies
    )

    // Permission handling is now centralized in the parent component

    // Sync internal zoom state with prop
    useEffect(() => {
      setCurrentZoomLevel(zoomLevel)
    }, [zoomLevel])

    // Handle camera ready callback - simplified to just notify parent
    const handleCameraReady = () => {
      log.info('CameraPreview', 'Camera is ready')
      setIsCameraReady(true)
      // Wait a short moment to ensure native view is fully ready
      setTimeout(() => {
        log.info('ExpoCamera', 'Camera fully ready for operations')
        onCameraReady?.()
      }, 100)
    }

    // Handle camera mount error
    const handleMountError = (error: any) => {
      const errorMessage = error?.message || 'Camera failed to initialize'
      log.error('CameraPreview', 'Camera mount error', {
        error: error instanceof Error ? error.message : String(error),
      })

      setCameraError(errorMessage)
      setIsCameraReady(false)
      onError?.(errorMessage)
    }

    // Track previous permission state to prevent duplicate logs
    const [prevPermissionGranted, setPrevPermissionGranted] = useState<boolean | null>(null)
    const [hasLoggedPermissionWarning, setHasLoggedPermissionWarning] = useState(false)

    // Handle camera permission changes
    useEffect(() => {
      // Only process if permission state actually changed
      if (prevPermissionGranted !== permissionGranted) {
        setPrevPermissionGranted(permissionGranted)

        if (!permissionGranted) {
          // Only log warning once per component instance
          if (!hasLoggedPermissionWarning) {
            setHasLoggedPermissionWarning(true)
            log.warn('CameraPreview', 'Camera permission not granted', {
              hasError: !!cameraError,
              componentId: Math.random().toString(36).substr(2, 9),
            })
            const errorMessage = 'Camera permission is required to use this feature'
            setCameraError(errorMessage)
            setIsCameraReady(false)
            onError?.(errorMessage)
          }
        } else {
          // Clear any previous camera errors when permission is granted
          if (cameraError) {
            log.info('CameraPreview', 'Camera permission granted', { hadError: !!cameraError })
            setCameraError(null)
          }
          // Reset warning flag when permission is granted
          setHasLoggedPermissionWarning(false)
        }
      }
    }, [permissionGranted, onError, cameraError, prevPermissionGranted, hasLoggedPermissionWarning])

    // Track previous orientation to prevent duplicate logs
    const [prevOrientation, setPrevOrientation] = useState<'portrait' | 'landscape' | null>(null)
    const [hasLoggedInitialOrientation, setHasLoggedInitialOrientation] = useState(false)

    // Handle device orientation changes
    useEffect(() => {
      const updateOrientation = ({ window }: { window: { width: number; height: number } }) => {
        const { width, height } = window
        const newOrientation = width > height ? 'landscape' : 'portrait'
        // Only log if orientation actually changed and not initial load
        if (newOrientation !== prevOrientation) {
          setPrevOrientation(newOrientation)
          setOrientation(newOrientation)

          // Only log after initial orientation is set to avoid duplicate initial logs
          if (hasLoggedInitialOrientation) {
            if (__DEV__) {
              log.info('CameraPreview', `Orientation changed to ${newOrientation}`, {
                width,
                height,
                componentId: Math.random().toString(36).substr(2, 9),
              })
            }
          } else {
            setHasLoggedInitialOrientation(true)
          }
        }
      }

      const subscription = Dimensions.addEventListener('change', updateOrientation)

      // Initial orientation check
      updateOrientation({ window: Dimensions.get('window') })

      return () => subscription?.remove()
    }, [prevOrientation, hasLoggedInitialOrientation])

    // Track previous camera type to prevent duplicate logs
    const [prevCameraType, setPrevCameraType] = useState<'front' | 'back' | null>(null)
    const [hasLoggedInitialCameraType, setHasLoggedInitialCameraType] = useState(false)

    // Handle camera type changes more gracefully
    useEffect(() => {
      // Only process if camera type actually changed
      if (prevCameraType !== cameraType) {
        setPrevCameraType(cameraType)
        // Only reset error state to ensure smooth camera switching
        setCameraError(null)

        // Only log after initial camera type is set to avoid duplicate initial logs
        if (hasLoggedInitialCameraType) {
          if (__DEV__) {
            log.info('CameraPreview', 'Camera type changed', {
              newType: cameraType,
              componentId: Math.random().toString(36).substr(2, 9),
            })
          }
        } else {
          setHasLoggedInitialCameraType(true)
        }
      }
    }, [cameraType, prevCameraType, hasLoggedInitialCameraType])

    // Camera props with orientation handling
    const cameraProps = {
      ref: cameraRef,
      testID: 'expo-camera',
      style: {
        flex: 1,
        width: '100%',
        height: '100%',
        // Aspect ratio based on orientation
        aspectRatio: orientation === 'landscape' ? 16 / 9 : 9 / 16,
      } as any,
      facing: cameraType,
      zoom: currentZoomLevel, // Use internal zoom state for Expo Camera (0-1 range)
      onCameraReady: handleCameraReady,
      onMountError: handleMountError,
      // Enable audio for recording - CRITICAL: Force video mode for recording readiness
      mode: 'video' as CameraMode,
      // Orientation-aware aspect ratio
      ratio: (orientation === 'landscape' ? '16:9' : '9:16') as CameraRatio,
      // Recording optimization settings
      videoQuality: '720p' as const,
      videoBitrate: 2000000,
      permissionGranted,
    }

    // Show error state if camera failed
    if (cameraError && !permissionGranted) {
      return (
        <YStack
          flex={1}
          backgroundColor="$color1"
          alignItems="center"
          justifyContent="center"
          padding="$4"
          position="relative"
        >
          {/* Background image overlay for simulator testing - show even in error state */}
          <CameraBackground
            imageSource={backgroundImage}
            opacity={backgroundOpacity}
            simulatorOnly={true}
            showOnError={true}
          />

          <YStack
            alignItems="center"
            gap="$3"
            zIndex={10}
          >
            <SizableText
              size="$8"
              opacity={0.6}
            >
              📹
            </SizableText>
            <YStack
              alignItems="center"
              gap="$1"
            >
              <SizableText
                size="$5"
                fontWeight="600"
                color="$color10"
                textAlign="center"
              >
                Camera Unavailable
              </SizableText>
              <SizableText
                size="$3"
                color="$color11"
                textAlign="center"
              >
                {cameraError}
              </SizableText>
            </YStack>
            {children}
          </YStack>
        </YStack>
      )
    }

    // Don't render camera if permission not granted
    if (!permissionGranted) {
      // Render a blank view while waiting for permissions
      return (
        <YStack
          flex={1}
          position="relative"
          backgroundColor="black"
        >
          {/* Background image overlay for simulator testing - show even when permission denied */}
          <CameraBackground
            imageSource={backgroundImage}
            opacity={backgroundOpacity}
            simulatorOnly={true}
            showOnError={true}
          />
        </YStack>
      )
    }

    return (
      <YStack
        flex={1}
        position="relative"
      >
        <CameraView {...cameraProps} />

        {/* Recording indicator overlay */}
        {/* {isRecording && (
          <YStack
            position="absolute"
            top={16}
            right={16}
            backgroundColor="$red9"
            paddingHorizontal="$2"
            paddingVertical="$1"
            borderRadius="$2"
            alignItems="center"
          >
            <SizableText
              size="$2"
              fontWeight="600"
              color="white"
            >
              ● REC
            </SizableText>
          </YStack>
        )} */}

        {/* Orientation indicator overlay - always show when camera is mounted */}
        {/* <YStack
          position="absolute"
          top={16}
          left={16}
          backgroundColor="$color8"
          paddingHorizontal="$2"
          paddingVertical="$1"
          borderRadius="$2"
          alignItems="center"
        >
          <SizableText
            size="$1"
            fontWeight="500"
            color="$color12"
          >
            {orientation === 'landscape' ? '📱 LANDSCAPE' : '📱 PORTRAIT'}
          </SizableText>
        </YStack> */}

        {/* Children overlay (controls, etc.) */}
        {children}
      </YStack>
    )
  }
)

CameraPreview.displayName = 'CameraPreview'
