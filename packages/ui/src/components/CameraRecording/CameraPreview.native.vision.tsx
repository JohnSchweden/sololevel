import { VideoStorageService } from '@app/features/CameraRecording/services/videoStorageService'
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Dimensions, View } from 'react-native'
import { Camera, useCameraDevice, useFrameProcessor } from 'react-native-vision-camera'
import { SizableText, YStack } from 'tamagui'
import { log } from '../../utils/logger'
import type { CameraPreviewContainerProps, CameraPreviewRef } from './types'

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
    },
    ref
  ) => {
    const cameraRef = useRef<Camera>(null)
    const [cameraError, setCameraError] = useState<string | null>(null)
    const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait')
    const [_isInitialized, _setIsInitialized] = useState(false)
    const [currentZoomLevel, setCurrentZoomLevel] = useState<number>(zoomLevel)

    // Get camera device based on type
    const device = useCameraDevice(cameraType === 'front' ? 'front' : 'back')

    // Frame processor for future pose detection integration
    const frameProcessor = useFrameProcessor((frame) => {
      'worklet'

      // Future: This will be used for pose detection
      // For now, just log frame info periodically
      const shouldLog = Math.random() < 0.001 // Log ~0.1% of frames
      if (shouldLog) {
        // Note: runOnJS is not available in this version, using console.log for now
        console.log('VisionCamera', 'Frame processed', {
          width: frame.width,
          height: frame.height,
          timestamp: frame.timestamp,
        })
      }
    }, [])

    // Expose camera control methods via ref
    useImperativeHandle(
      ref,
      () => ({
        startRecording: async (): Promise<void> => {
          if (!cameraRef.current || !device) {
            throw new Error('Camera not available')
          }

          try {
            cameraRef.current.startRecording({
              onRecordingFinished: async (video) => {
                log.info('VisionCamera', 'Recording finished', {
                  path: video.path,
                  duration: video.duration,
                  hasPath: !!video.path,
                  pathStartsWithFile: video.path?.startsWith('file://'),
                  pathLength: video.path?.length,
                })

                // Validate video path before saving
                if (!video.path || !video.path.startsWith('file://')) {
                  log.error('VisionCamera', 'Invalid video path received', {
                    path: video.path,
                    duration: video.duration,
                    expectedFormat: 'file://...',
                  })
                  onError?.('Invalid video path')
                  return
                }

                // Save video to local storage using expo-file-system
                const filename = `recording_${Date.now()}.mp4`
                try {
                  const savedVideo = await VideoStorageService.saveVideo(video.path, filename, {
                    format: 'mp4',
                    duration: video.duration ? video.duration / 1000 : undefined, // Convert ms to seconds
                  })

                  log.info('VisionCamera', 'Video saved to local storage', {
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
                  log.error('VisionCamera', 'Failed to save video to local storage', {
                    videoPath: video.path,
                    filename,
                    error: saveError instanceof Error ? saveError.message : saveError,
                    errorStack: saveError instanceof Error ? saveError.stack : undefined,
                  })
                  onError?.('Failed to save video')
                }
              },
              onRecordingError: (error) => {
                log.error('VisionCamera', 'Recording error', error)
                onError?.(error.message)
              },
            })

            log.info('VisionCamera', 'Recording started')
          } catch (error) {
            log.error('VisionCamera', 'Failed to start recording', error)
            throw error
          }
        },

        stopRecording: async (): Promise<void> => {
          if (!cameraRef.current) {
            throw new Error('Camera not available')
          }

          try {
            await cameraRef.current.stopRecording()
            log.info('VisionCamera', 'Recording stopped')
          } catch (error) {
            log.error('VisionCamera', 'Failed to stop recording', error)
            throw error
          }
        },

        pauseRecording: async (): Promise<void> => {
          if (!cameraRef.current) {
            throw new Error('Camera not available')
          }

          try {
            await cameraRef.current.pauseRecording()
            log.info('VisionCamera', 'Recording paused')
          } catch (error) {
            log.error('VisionCamera', 'Failed to pause recording', error)
            throw error
          }
        },

        resumeRecording: async (): Promise<void> => {
          if (!cameraRef.current) {
            throw new Error('Camera not available')
          }

          try {
            await cameraRef.current.resumeRecording()
            log.info('VisionCamera', 'Recording resumed')
          } catch (error) {
            log.error('VisionCamera', 'Failed to resume recording', error)
            throw error
          }
        },

        takePicture: async (): Promise<string | null> => {
          if (!cameraRef.current) {
            throw new Error('Camera not available')
          }

          try {
            const photo = await cameraRef.current.takePhoto({
              enableAutoRedEyeReduction: true,
            })
            log.info('VisionCamera', 'Picture taken', { path: photo.path })
            return photo.path
          } catch (error) {
            log.error('VisionCamera', 'Failed to take picture', error)
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
          if (!cameraRef.current || !device) {
            throw new Error('Camera not available')
          }

          try {
            // VisionCamera zoom range is device-specific
            const minZoom = device.minZoom
            const maxZoom = device.maxZoom
            const clampedZoom = Math.max(minZoom, Math.min(maxZoom, zoom))

            // Update internal zoom state to apply to Camera component
            setCurrentZoomLevel(clampedZoom)

            // Notify parent component of zoom change
            onZoomChange?.(clampedZoom)

            log.info('VisionCamera', 'Zoom value updated', {
              zoom: clampedZoom,
              range: `${minZoom}-${maxZoom}`,
              currentZoomLevel: currentZoomLevel,
              willUpdateTo: clampedZoom,
            })
          } catch (error) {
            log.error('VisionCamera', 'Failed to update zoom', error)
            throw error
          }
        },

        getZoom: async (): Promise<number> => {
          return currentZoomLevel
        },
      }),
      [device, currentZoomLevel, onZoomChange, onError]
    )

    // Handle camera initialization
    const handleCameraInitialized = () => {
      log.info('VisionCamera', 'Camera initialized')
      _setIsInitialized(true)
      setCameraError(null)
      onCameraReady?.()
    }

    // Handle camera errors
    const handleCameraError = (error: any) => {
      const errorMessage = error?.message || 'VisionCamera failed to initialize'
      log.error('VisionCamera', 'Camera error', error)

      setCameraError(errorMessage)
      _setIsInitialized(false)
      onError?.(errorMessage)
    }

    // Handle device orientation changes
    useEffect(() => {
      const updateOrientation = ({ window }: { window: { width: number; height: number } }) => {
        const { width, height } = window
        const newOrientation = width > height ? 'landscape' : 'portrait'
        setOrientation(newOrientation)
      }

      const subscription = Dimensions.addEventListener('change', updateOrientation)
      updateOrientation({ window: Dimensions.get('window') })

      return () => subscription?.remove()
    }, [])

    // Handle permission changes
    useEffect(() => {
      if (!permissionGranted) {
        const errorMessage = 'Camera permission is required to use this feature'
        setCameraError(errorMessage)
        _setIsInitialized(false)
        onError?.(errorMessage)
      } else {
        setCameraError(null)
      }
    }, [permissionGranted, onError])

    // Sync internal zoom state with prop
    useEffect(() => {
      setCurrentZoomLevel(zoomLevel)
    }, [zoomLevel])

    // Don't render camera if permission not granted
    if (!permissionGranted) {
      return (
        <View
          style={{ flex: 1, backgroundColor: 'black' }}
          testID="black-screen"
        />
      )
    }

    // Show error state if camera failed or no device
    if (cameraError || !device) {
      return (
        <YStack
          flex={1}
          backgroundColor="$color1"
          alignItems="center"
          justifyContent="center"
          padding="$4"
        >
          <YStack
            alignItems="center"
            gap="$3"
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
          ref={cameraRef}
          style={{
            flex: 1,
            width: '100%',
            height: '100%',
          }}
          device={device}
          isActive={true}
          video={true}
          audio={true}
          zoom={currentZoomLevel}
          frameProcessor={frameProcessor}
          onInitialized={handleCameraInitialized}
          onError={handleCameraError}
        />

        {/* Recording indicator overlay */}
        {isRecording && (
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
        )}

        {/* Camera info overlay */}
        <YStack
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
        </YStack>

        {/* Children overlay (controls, etc.) */}
        {children}
      </YStack>
    )
  }
)

VisionCameraPreview.displayName = 'VisionCameraPreview'
