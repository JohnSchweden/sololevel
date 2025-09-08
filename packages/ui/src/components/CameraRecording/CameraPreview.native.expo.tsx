import { CameraMode, CameraRatio, CameraView } from 'expo-camera'
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Dimensions, View } from 'react-native'
import { SizableText, YStack } from 'tamagui'
import { log } from '../../utils/logger'
import type { CameraPreviewContainerProps, CameraPreviewRef } from './types'

/**
 * Camera Preview Component using Expo Camera
 * Handles platform differences between native and web
 * Implements camera lifecycle management and error handling
 */
export const CameraPreview = forwardRef<CameraPreviewRef, CameraPreviewContainerProps>(
  (
    {
      isRecording,
      cameraType,
      zoomLevel = 0,
      onZoomChange,
      onCameraReady,
      onError,
      children,
      permissionGranted = false,
    },
    ref
  ) => {
    const cameraRef = useRef<CameraView>(null)
    // Remove redundant cameraReady state - rely on parent component's state
    const [cameraError, setCameraError] = useState<string | null>(null)
    const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait')
    const [currentZoomLevel, setCurrentZoomLevel] = useState<number>(zoomLevel)

    // Expose camera control methods via ref
    useImperativeHandle(
      ref,
      () => ({
        startRecording: async (): Promise<void> => {
          if (!cameraRef.current) {
            throw new Error('Camera not available')
          }

          // Remove internal cameraReady check - rely on parent component's check
          // The parent already ensures camera is ready before calling this method

          try {
            await cameraRef.current.recordAsync()
            log.info('CameraRecording', 'Recording started')
          } catch (error) {
            log.error('CameraRecording', 'Failed to start recording', error)
            throw error
          }
        },
        stopRecording: async (): Promise<void> => {
          if (!cameraRef.current) {
            throw new Error('Camera not available')
          }

          try {
            await cameraRef.current.stopRecording()
            log.info('CameraRecording', 'Recording stopped')
          } catch (error) {
            log.error('CameraRecording', 'Failed to stop recording', error)
            throw error
          }
        },
        pauseRecording: async (): Promise<void> => {
          if (!cameraRef.current) {
            throw new Error('Camera not available')
          }

          try {
            await cameraRef.current.toggleRecordingAsync()
            log.info('CameraRecording', 'Recording toggled (paused/resumed)')
          } catch (error) {
            log.error('CameraRecording', 'Failed to toggle recording', error)
            throw error
          }
        },
        resumeRecording: async (): Promise<void> => {
          // toggleRecordingAsync handles both pause and resume
          if (!cameraRef.current) {
            throw new Error('Camera not available')
          }

          try {
            await cameraRef.current.toggleRecordingAsync()
            log.info('CameraRecording', 'Recording toggled (resumed)')
          } catch (error) {
            log.error('CameraRecording', 'Failed to toggle recording', error)
            throw error
          }
        },
        takePicture: async (): Promise<string | null> => {
          if (!cameraRef.current) {
            throw new Error('Camera not available')
          }

          try {
            const photo = await cameraRef.current.takePictureAsync()
            log.info('CameraRecording', 'Picture taken', { uri: photo.uri })
            return photo.uri
          } catch (error) {
            log.error('CameraRecording', 'Failed to take picture', error)
            throw error
          }
        },
        getCamera: (): CameraView | null => {
          return cameraRef.current
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
          if (!cameraRef.current) {
            throw new Error('Camera not available')
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

            log.info('CameraPreview', 'Zoom value updated', {
              discreteZoom: zoom,
              expoZoom: expoZoomValue,
              range: '0-1',
            })
          } catch (error) {
            log.error('CameraPreview', 'Failed to update zoom', error)
            throw error
          }
        },
        getZoom: async (): Promise<number> => {
          // Return current zoom level from internal state
          return currentZoomLevel
        },
      }),
      [currentZoomLevel, onZoomChange] // Include currentZoomLevel in dependencies
    )

    // Permission handling is now centralized in the parent component

    // Sync internal zoom state with prop
    useEffect(() => {
      setCurrentZoomLevel(zoomLevel)
    }, [zoomLevel])

    // Handle camera ready callback - simplified to just notify parent
    const handleCameraReady = () => {
      log.info('CameraPreview', 'Camera is ready')
      // Remove state management - just notify parent
      onCameraReady?.()
    }

    // Handle camera mount error
    const handleMountError = (error: any) => {
      const errorMessage = error?.message || 'Camera failed to initialize'
      log.error('CameraPreview', 'Camera mount error', error)

      setCameraError(errorMessage)
      // Remove setCameraReady(false) - no longer managing this state
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
            log.info('CameraPreview', `Orientation changed to ${newOrientation}`, {
              width,
              height,
              componentId: Math.random().toString(36).substr(2, 9),
            })
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
          log.info('CameraPreview', 'Camera type changed', {
            newType: cameraType,
            componentId: Math.random().toString(36).substr(2, 9),
          })
        } else {
          setHasLoggedInitialCameraType(true)
        }
      }
    }, [cameraType, prevCameraType, hasLoggedInitialCameraType])

    // Camera props with orientation handling
    const cameraProps = {
      ref: cameraRef,
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
      return <View style={{ flex: 1, backgroundColor: 'black' }} />
    }

    return (
      <YStack
        flex={1}
        position="relative"
      >
        <CameraView {...cameraProps} />

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

        {/* Orientation indicator overlay - always show when camera is mounted */}
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
            {orientation === 'landscape' ? '📱 LANDSCAPE' : '📱 PORTRAIT'}
          </SizableText>
        </YStack>

        {/* Children overlay (controls, etc.) */}
        {children}
      </YStack>
    )
  }
)

CameraPreview.displayName = 'CameraPreview'
