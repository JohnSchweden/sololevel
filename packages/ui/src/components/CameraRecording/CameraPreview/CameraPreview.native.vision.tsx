import { VideoStorageService } from '@app/features/CameraRecording/services/videoStorageService'
import { log } from '@my/logging'
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import {
  Camera,
  useCameraDevice,
  useCameraFormat,
  // POST-MVP: useFrameProcessor removed (pose detection feature)
  // useFrameProcessor,
} from 'react-native-vision-camera'
import { SizableText, YStack } from 'tamagui'
import { CameraBackground } from '../CameraBackground/CameraBackground'
import type { CameraPreviewContainerProps, CameraPreviewRef } from '../types'

/**
 * VisionCamera Preview Component - Enhanced Performance
 * Replaces expo-camera with react-native-vision-camera v4+
 * Implements native threading with worklets for optimal performance
 */
export const VisionCameraPreview = forwardRef<CameraPreviewRef, CameraPreviewContainerProps>(
  (
    {
      isRecording,
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
    const cameraRef = useRef<Camera>(null)
    const [cameraError, setCameraError] = useState<string | null>(null)
    //const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait')
    const [isInitialized, setIsInitialized] = useState(false)
    const [isCameraReady, setIsCameraReady] = useState(false)
    const [currentZoomLevel, setCurrentZoomLevel] = useState<number>(zoomLevel)
    const isMounted = useRef(false)
    const readyTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const [sessionId, setSessionId] = useState<string>(Date.now().toString()) // Track camera session for reset

    const device = useCameraDevice(cameraType === 'front' ? 'front' : 'back')

    const formatFilters = useMemo(
      () => [
        {
          videoResolution: { width: 1280, height: 720 },
        },
        {
          fps: 30, // Use 30 fps for better duration precision
        },
        {
          videoAspectRatio: 16 / 9,
        },
      ],
      []
    )

    const format = useCameraFormat(device, formatFilters)

    const targetFps = useMemo(() => {
      if (!format) {
        return 30 // Default to 30 fps for better duration precision
      }

      if (30 < format.minFps) {
        return format.minFps
      }

      if (30 > format.maxFps) {
        return format.maxFps
      }

      return 30 // Use 30 fps for better duration precision
    }, [format])

    useEffect(() => {
      if (!device || !format) {
        return
      }

      log.info('VisionCamera', 'Selected recording format', {
        deviceId: device.id,
        videoDimensions: `${format.videoWidth}x${format.videoHeight}`,
        fpsRange: [format.minFps, format.maxFps],
        targetFps,
      })
    }, [device, format, targetFps])

    // Track component mount state to prevent operations when unmounted
    useEffect(() => {
      isMounted.current = true
      return () => {
        isMounted.current = false
        // Clear any pending timeouts
        if (readyTimeoutRef.current) {
          clearTimeout(readyTimeoutRef.current)
        }
      }
    }, [])

    // Reset camera session when transitioning to idle state (not recording)
    useEffect(() => {
      if (!isRecording) {
        log.info('VisionCamera', 'Recording finished, resetting camera session')
        // Generate new session ID to force camera reinitialization
        setSessionId(Date.now().toString())
        // Reset camera ready state to force reinitialization
        setIsCameraReady(false)
        setIsInitialized(false)
      }
    }, [isRecording])

    // Cleanup camera session on unmount
    useEffect(() => {
      return () => {
        isMounted.current = false

        // Clear any pending timeouts
        if (readyTimeoutRef.current) {
          clearTimeout(readyTimeoutRef.current)
          readyTimeoutRef.current = null
        }

        // Stop recording if active to release resources
        if (cameraRef.current) {
          try {
            // Attempt to stop recording if it's active (non-blocking cleanup)
            cameraRef.current.stopRecording().catch(() => {
              // Ignore errors during cleanup - component is unmounting
            })
          } catch {
            // Ignore errors during cleanup
          }
        }

        log.info('VisionCamera', 'Cleaning up camera session on unmount')
        // Reset states to prevent memory leaks
        setIsCameraReady(false)
        setIsInitialized(false)
        setCameraError(null)
      }
    }, [])

    // POST-MVP: Frame processor for pose detection integration
    // See: docs/migration/pose-detection-packages-restoration-checklist.md
    // Note: react-native-worklets-core removed - frame processor disabled
    // const frameProcessor = useFrameProcessor((_frame) => {
    //   'worklet'
    //   // Future: This will be used for pose detection
    //   // Access frame properties: _frame.width, _frame.height, _frame.timestamp, _frame.pixelBuffer
    // }, [])

    // Helper function to check if camera is ready
    const checkCameraReady = (): boolean => {
      if (!isMounted.current) {
        log.warn('VisionCamera', 'Component not mounted, skipping camera operations')
        return false
      }
      if (!cameraRef.current) {
        log.warn('VisionCamera', 'Camera ref is null')
        return false
      }
      if (!device) {
        log.warn('VisionCamera', 'No camera device available')
        return false
      }
      if (!isInitialized) {
        log.warn('VisionCamera', 'Camera not initialized yet')
        return false
      }
      if (!isCameraReady) {
        log.warn('VisionCamera', 'Camera not ready for operations')
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

          const createRecordingOptions = (codec: 'h264' | 'h265') => ({
            videoCodec: codec,
            // Use fileType: 'mp4' to switch from Immediate (memory buffer) to delayed (disk write) mode
            // This prevents "data volume too high" warnings and reduces memory usage
            fileType: 'mp4' as const,
            // Limit video bitrate to reduce data volume and prevent buffer overflow
            // 4 Mbps is sufficient for 720p@30fps and prevents excessive memory allocation
            videoBitRate: 4_000_000, // 4 Mbps
            onRecordingFinished: async (video: { path: string; duration?: number }) => {
              log.info('VisionCamera', 'Recording finished', {
                codec,
                path: video.path,
                duration: video.duration,
                hasPath: !!video.path,
                pathStartsWithFile: video.path?.startsWith('file://'),
                pathLength: video.path?.length,
              })

              // Validate video path before saving
              if (!video.path || !video.path.startsWith('file://')) {
                log.error('VisionCamera', 'Invalid video path received', {
                  codec,
                  path: video.path,
                  duration: video.duration,
                  expectedFormat: 'file://...',
                })
                onError?.('Invalid video path')
                return
              }

              // Check if mounted before proceeding with async operations
              if (!isMounted.current) {
                log.warn(
                  'VisionCamera',
                  'Component unmounted during recording finish, aborting save'
                )
                return
              }

              // Save video to local storage using expo-file-system
              const filename = `recording_${Date.now()}.mp4`
              try {
                const savedVideo = await VideoStorageService.saveVideo(video.path, filename, {
                  format: 'mp4',
                  duration: video.duration ? video.duration / 1000 : undefined, // Convert ms to seconds
                })

                if (!isMounted.current) return

                log.info('VisionCamera', 'Video saved to local storage', {
                  codec,
                  originalPath: video.path,
                  localUri: savedVideo.localUri,
                  filename: savedVideo.filename,
                  size: savedVideo.size,
                  metadata: savedVideo.metadata,
                })

                // Notify parent component about the saved video
                onVideoRecorded?.(savedVideo.localUri)

                // Video saved successfully - parent component will handle navigation to player
              } catch (saveError) {
                if (!isMounted.current) return

                log.error('VisionCamera', 'Failed to save video to local storage', {
                  codec,
                  videoPath: video.path,
                  filename,
                  error: saveError instanceof Error ? saveError.message : saveError,
                  errorStack: saveError instanceof Error ? saveError.stack : undefined,
                })
                onError?.('Failed to save video')
              }
            },
            onRecordingError: (error: Error) => {
              if (!isMounted.current) return
              log.error('VisionCamera', 'Recording error', {
                codec,
                message: error.message,
              })
              onError?.(error.message)
            },
          })

          const startRecordingWithCodec = (codec: 'h264' | 'h265') => {
            cameraRef.current!.startRecording(createRecordingOptions(codec))

            log.info('VisionCamera', 'Recording started', {
              codec,
              targetFps,
              format: format
                ? {
                    width: format.videoWidth,
                    height: format.videoHeight,
                    minFps: format.minFps,
                    maxFps: format.maxFps,
                  }
                : undefined,
            })
          }

          try {
            startRecordingWithCodec('h265')
          } catch (error) {
            log.warn(
              'VisionCamera',
              'Failed to start recording with codec h265, attempting fallback',
              {
                message: error instanceof Error ? error.message : error,
              }
            )

            try {
              startRecordingWithCodec('h264')
            } catch (fallbackError) {
              log.error('VisionCamera', 'Failed to start recording with fallback codec h264', {
                error:
                  fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
              })
              throw fallbackError
            }
          }
        },

        stopRecording: async (): Promise<void> => {
          if (!checkCameraReady()) {
            throw new Error('Camera not ready for stopping recording')
          }

          try {
            await cameraRef.current!.stopRecording()
            log.info('VisionCamera', 'Recording stopped')
          } catch (error) {
            log.error('VisionCamera', 'Failed to stop recording', {
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
            await cameraRef.current!.pauseRecording()
            log.info('VisionCamera', 'Recording paused')
          } catch (error) {
            log.error('VisionCamera', 'Failed to pause recording', {
              error: error instanceof Error ? error.message : String(error),
            })
            throw error
          }
        },

        resumeRecording: async (): Promise<void> => {
          if (!checkCameraReady()) {
            throw new Error('Camera not ready for resuming recording')
          }

          try {
            await cameraRef.current!.resumeRecording()
            log.info('VisionCamera', 'Recording resumed')
          } catch (error) {
            log.error('VisionCamera', 'Failed to resume recording', {
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
            const photo = await cameraRef.current!.takePhoto({
              enableAutoRedEyeReduction: true,
            })
            log.info('VisionCamera', 'Picture taken', { path: photo.path })
            return photo.path
          } catch (error) {
            log.error('VisionCamera', 'Failed to take picture', {
              error: error instanceof Error ? error.message : String(error),
            })
            throw error
          }
        },

        getCamera: (): Camera | null => {
          return cameraRef.current
        },

        toggleFacing: async (): Promise<void> => {
          // VisionCamera handles facing via device selection
          // Parent component should update the cameraType state
          log.info('VisionCamera', 'toggleFacing called - use cameraType prop instead')
          return Promise.resolve()
        },

        setZoom: async (zoom: number): Promise<void> => {
          if (!checkCameraReady()) {
            throw new Error('Camera not ready for zoom control')
          }

          try {
            // VisionCamera zoom range is device-specific
            const minZoom = device!.minZoom
            const maxZoom = device!.maxZoom
            const clampedZoom = Math.max(minZoom, Math.min(maxZoom, zoom))

            // Update internal zoom state to apply to Camera component
            setCurrentZoomLevel(clampedZoom)

            // Notify parent component of zoom change
            onZoomChange?.(clampedZoom)

            if (__DEV__) {
              log.info('VisionCamera', 'Zoom value updated', {
                zoom: clampedZoom,
                range: `${minZoom}-${maxZoom}`,
                currentZoomLevel: currentZoomLevel,
                willUpdateTo: clampedZoom,
              })
            }
          } catch (error) {
            log.error('VisionCamera', 'Failed to update zoom', {
              error: error instanceof Error ? error.message : String(error),
            })
            throw error
          }
        },

        getZoom: async (): Promise<number> => {
          return currentZoomLevel
        },
      }),
      [device, currentZoomLevel, onZoomChange, onError, isInitialized, isCameraReady, sessionId]
    )

    // Handle camera initialization
    const handleCameraInitialized = () => {
      log.info('VisionCamera', 'Camera initialized')
      setIsInitialized(true)
      setCameraError(null)
      // Wait a short moment to ensure native view is fully ready
      readyTimeoutRef.current = setTimeout(() => {
        if (isMounted.current) {
          setIsCameraReady(true)
          log.info('VisionCamera', 'Camera fully ready for operations')
          onCameraReady?.()
        }
      }, 100)
    }

    // Handle camera errors
    const handleCameraError = (error: any) => {
      const errorMessage = error?.message || 'VisionCamera failed to initialize'
      log.error('VisionCamera', 'Camera error', {
        error: error instanceof Error ? error.message : String(error),
      })

      setCameraError(errorMessage)
      setIsInitialized(false)
      setIsCameraReady(false)
      onError?.(errorMessage)
    }

    // Handle device orientation changes
    // Removed orientation tracking - only used in commented-out debug overlay

    // Handle permission changes
    useEffect(() => {
      if (!permissionGranted) {
        const errorMessage = 'Camera permission is required to use this feature'
        setCameraError(errorMessage)
        setIsInitialized(false)
        setIsCameraReady(false)
        onError?.(errorMessage)
      } else {
        setCameraError(null)
      }
    }, [permissionGranted, onError])

    // On iOS Simulator with camera error, still mark camera as "ready" so controls work
    useEffect(() => {
      if (__DEV__ && (cameraError || !device) && permissionGranted) {
        // Simulate camera ready in dev builds on simulator so controls can be tested
        log.info(
          'VisionCamera',
          'iOS Simulator: Camera unavailable but marking as ready for testing'
        )
        onCameraReady?.()
      }
    }, [cameraError, device, permissionGranted, onCameraReady])

    // Sync internal zoom state with prop
    useEffect(() => {
      setCurrentZoomLevel(zoomLevel)
    }, [zoomLevel])

    // Don't render camera if permission not granted
    if (!permissionGranted) {
      return (
        <YStack
          flex={1}
          position="relative"
          testID="black-screen"
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

    // Show error state if camera failed or no device
    if (cameraError || !device) {
      return (
        <YStack
          flex={1}
          backgroundColor="$background"
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
                {cameraError || 'No camera device available'}
              </SizableText>
            </YStack>
            {children}
          </YStack>
        </YStack>
      )
    }

    return (
      <YStack
        flex={1}
        position="relative"
      >
        <Camera
          key={sessionId} // Force remount when session changes to reset camera state
          ref={cameraRef}
          style={{
            flex: 1,
            width: '100%',
            height: '100%',
          }}
          device={device}
          isActive={isInitialized && isCameraReady}
          format={format}
          fps={targetFps}
          video={true}
          audio={true}
          zoom={currentZoomLevel}
          // POST-MVP: frameProcessor disabled (pose detection feature removed)
          // frameProcessor={frameProcessor}
          onInitialized={handleCameraInitialized}
          onError={handleCameraError}
        />

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

        {/* Camera info overlay */}
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
            {device.name} • {orientation.toUpperCase()}
          </SizableText>
        </YStack> */}

        {/* Children overlay (controls, etc.) */}
        {children}
      </YStack>
    )
  }
)

VisionCameraPreview.displayName = 'VisionCameraPreview'
