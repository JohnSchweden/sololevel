import { useCameraPermissions } from '@app/features/CameraRecording/hooks/useCameraPermissions'
import { CameraMode, CameraRatio, CameraView } from 'expo-camera'
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Dimensions } from 'react-native'
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
    const [cameraReady, setCameraReady] = useState(false)
    const [cameraError, setCameraError] = useState<string | null>(null)
    const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait')

    // Expose camera control methods via ref
    useImperativeHandle(
      ref,
      () => ({
        startRecording: async (): Promise<void> => {
          if (!cameraRef.current) {
            throw new Error('Camera not available')
          }

          if (!cameraReady) {
            throw new Error("Camera is not ready yet. Wait for 'onCameraReady' callback")
          }

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
          // Note: Expo Camera doesn't have pauseRecording method
          log.warn('CameraRecording', 'pauseRecording not supported by Expo Camera')
          throw new Error('Pause recording not supported')
        },
        resumeRecording: async (): Promise<void> => {
          // Note: Expo Camera doesn't have resumeRecording method
          log.warn('CameraRecording', 'resumeRecording not supported by Expo Camera')
          throw new Error('Resume recording not supported')
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
            // Clamp zoom value between 0 and 1 (Expo Camera expects 0-1 range)
            const clampedZoom = Math.max(0, Math.min(1, zoom))
            console.log('CameraPreview setZoom called:', { requestedZoom: zoom, clampedZoom })
            // Note: Expo Camera zoom is set via props, not methods
            // The zoom prop will be updated through parent component
            onZoomChange?.(clampedZoom)
            log.info('CameraPreview', 'Zoom value updated', { zoom: clampedZoom })
          } catch (error) {
            log.error('CameraPreview', 'Failed to update zoom', error)
            throw error
          }
        },
        getZoom: async (): Promise<number> => {
          // Return current zoom level from props
          return zoomLevel
        },
      }),
      [cameraReady]
    )

    // Camera permissions check with enhanced UX
    const {
      permission,
      isLoading: permissionLoading,
      error: permissionError,
      canRequestAgain,
      requestPermissionWithRationale,
      redirectToSettings,
      clearError,
      retryRequest,
    } = useCameraPermissions({
      showRationale: true,
      enableSettingsRedirect: true,
      onPermissionChange: (perm) => {
        log.info('CameraPreview', 'Permission status changed', {
          granted: perm?.granted,
          status: perm?.status,
          canAskAgain: perm?.canAskAgain,
        })
      },
      onError: (error: string) => {
        log.error('CameraPreview', 'Permission error', error)
      },
    })

    // Handle camera ready callback
    const handleCameraReady = () => {
      log.info('CameraPreview', 'Camera is ready')
      setCameraReady(true)
      setCameraError(null)
      onCameraReady?.()
    }

    // Handle camera mount error
    const handleMountError = (error: any) => {
      const errorMessage = error?.message || 'Camera failed to initialize'
      log.error('CameraPreview', 'Camera mount error', error)

      setCameraError(errorMessage)
      setCameraReady(false)
      onError?.(errorMessage)
    }

    // Handle camera permission changes
    useEffect(() => {
      if (permission && !permission.granted && permissionGranted !== false) {
        log.warn('CameraPreview', 'Camera permission not granted', {
          status: permission.status,
          canAskAgain: permission.canAskAgain,
        })

        // Don't set camera error if permission is still undetermined (user hasn't been asked yet)
        if (permission.status === 'denied') {
          const errorMessage = 'Camera permission is required to use this feature'
          setCameraError(errorMessage)
          onError?.(errorMessage)
        }
      } else if (permission?.granted) {
        // Clear any previous camera errors when permission is granted
        setCameraError(null)
      }
    }, [permission, permissionGranted, onError])

    // Handle device orientation changes
    useEffect(() => {
      const updateOrientation = ({ window }: { window: { width: number; height: number } }) => {
        const { width, height } = window
        const newOrientation = width > height ? 'landscape' : 'portrait'
        setOrientation(newOrientation)
        log.info('CameraPreview', `Orientation changed to ${newOrientation}`, { width, height })
      }

      const subscription = Dimensions.addEventListener('change', updateOrientation)

      // Initial orientation check
      updateOrientation({ window: Dimensions.get('window') })

      return () => subscription?.remove()
    }, [])

    // Handle camera type changes more gracefully
    useEffect(() => {
      // Don't reset camera ready state when switching cameras
      // Only reset error state to ensure smooth camera switching
      setCameraError(null)
      log.info('CameraPreview', 'Camera type changed', { newType: cameraType })
    }, [cameraType])

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
      zoom: zoomLevel, // Add zoom support
      onCameraReady: () => {
        console.log('Camera ready with zoom level:', zoomLevel)
        handleCameraReady()
      },
      onMountError: handleMountError,
      // Enable audio for recording
      mode: (isRecording ? 'video' : 'picture') as CameraMode,
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
    if (!permissionGranted || !permission?.granted) {
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
              🔒
            </SizableText>
            <YStack
              alignItems="center"
              gap="$2"
            >
              <SizableText
                size="$5"
                fontWeight="600"
                color="$color10"
                textAlign="center"
              >
                Camera Access Required
              </SizableText>
              <SizableText
                size="$3"
                color="$color11"
                textAlign="center"
              >
                {permission?.status === 'denied'
                  ? 'Camera access was denied. Grant permission to start recording.'
                  : 'Grant camera permission to start recording and capture your form.'}
              </SizableText>

              {/* Show permission error if any */}
              {permissionError && (
                <YStack
                  backgroundColor="$red2"
                  padding="$2"
                  borderRadius="$2"
                  alignItems="center"
                >
                  <SizableText
                    size="$2"
                    color="$red10"
                    textAlign="center"
                  >
                    {permissionError}
                  </SizableText>
                </YStack>
              )}

              {/* Action buttons */}
              <YStack
                gap="$2"
                alignItems="center"
              >
                {canRequestAgain && (
                  <YStack
                    backgroundColor="$blue9"
                    paddingHorizontal="$4"
                    paddingVertical="$2"
                    borderRadius="$4"
                    onPress={async () => {
                      clearError()
                      await requestPermissionWithRationale()
                    }}
                    disabled={permissionLoading}
                    opacity={permissionLoading ? 0.6 : 1}
                    pressStyle={{ scale: 0.95 }}
                  >
                    <SizableText
                      size="$3"
                      color="white"
                      fontWeight="600"
                      textAlign="center"
                    >
                      {permissionLoading ? 'Requesting...' : 'Grant Permission'}
                    </SizableText>
                  </YStack>
                )}

                {permission?.status === 'denied' && !permission.canAskAgain && (
                  <YStack
                    backgroundColor="$gray8"
                    paddingHorizontal="$4"
                    paddingVertical="$2"
                    borderRadius="$4"
                    onPress={redirectToSettings}
                    pressStyle={{ scale: 0.95 }}
                  >
                    <SizableText
                      size="$3"
                      color="white"
                      fontWeight="600"
                      textAlign="center"
                    >
                      Open Settings
                    </SizableText>
                  </YStack>
                )}

                {/* Retry button for failed requests */}
                {permissionError && canRequestAgain && (
                  <YStack
                    backgroundColor="$orange9"
                    paddingHorizontal="$4"
                    paddingVertical="$2"
                    borderRadius="$4"
                    onPress={async () => {
                      await retryRequest()
                    }}
                    pressStyle={{ scale: 0.95 }}
                  >
                    <SizableText
                      size="$2"
                      color="white"
                      textAlign="center"
                    >
                      Try Again
                    </SizableText>
                  </YStack>
                )}
              </YStack>
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
        <CameraView {...cameraProps} />

        {/* Recording indicator overlay */}
        {isRecording && cameraReady && (
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

        {/* Orientation indicator overlay */}
        {cameraReady && (
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
        )}

        {/* Camera not ready overlay */}
        {!cameraReady && !cameraError && (
          <YStack
            position="absolute"
            top={0}
            left={0}
            right={0}
            bottom={0}
            backgroundColor="$color1"
            alignItems="center"
            justifyContent="center"
          >
            <YStack
              alignItems="center"
              gap="$2"
            >
              <SizableText
                size="$8"
                opacity={0.6}
              >
                📹
              </SizableText>
              <SizableText
                size="$4"
                color="$color10"
                textAlign="center"
              >
                Initializing camera...
              </SizableText>
            </YStack>
          </YStack>
        )}

        {/* Children overlay (controls, etc.) */}
        {children}
      </YStack>
    )
  }
)

CameraPreview.displayName = 'CameraPreview'
