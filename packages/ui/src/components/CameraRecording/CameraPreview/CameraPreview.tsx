import { log } from '@my/logging'
import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import { SizableText, YStack } from 'tamagui'
import type { CameraPreviewContainerProps, CameraPreviewRef } from '../types'

/**
 * Web stub implementation of Camera Preview Component
 * Shows a placeholder UI since camera access is not available in web browsers
 */
export const CameraPreview = forwardRef<CameraPreviewRef, CameraPreviewContainerProps>(
  ({ isRecording, cameraType, onCameraReady, children, permissionGranted = false }, ref) => {
    // Fix hydration mismatch by initializing with null and setting client state after mount
    const [cameraReady, setCameraReady] = useState<boolean | null>(null)
    const [isClient, setIsClient] = useState(false)

    // Ensure client-side hydration consistency
    useEffect(() => {
      setIsClient(true)
      setCameraReady(false)
    }, [])

    // Expose camera control methods via ref
    useImperativeHandle(
      ref,
      () => ({
        startRecording: async (): Promise<void> => {
          log.warn('CameraRecording', 'Recording not supported in web browser')
          throw new Error('Camera recording is not available in web browsers')
        },
        stopRecording: async (): Promise<void> => {
          log.warn('CameraRecording', 'Recording not supported in web browser')
          throw new Error('Camera recording is not available in web browsers')
        },
        pauseRecording: async (): Promise<void> => {
          log.warn('CameraRecording', 'Pause recording not supported in web browser')
          throw new Error('Pause recording is not available in web browsers')
        },
        resumeRecording: async (): Promise<void> => {
          log.warn('CameraRecording', 'Resume recording not supported in web browser')
          throw new Error('Resume recording is not available in web browsers')
        },
        takePicture: async (): Promise<string | null> => {
          log.warn('CameraRecording', 'Taking pictures not supported in web browser')
          throw new Error('Taking pictures is not available in web browsers')
        },
        getCamera: (): null => {
          return null
        },
        toggleFacing: async (): Promise<void> => {
          log.warn('CameraRecording', 'Camera facing toggle not supported in web browser')
          throw new Error('Camera facing toggle is not available in web browsers')
        },
        setZoom: async (_zoom: number): Promise<void> => {
          log.warn('CameraRecording', 'Zoom control not supported in web browser')
          throw new Error('Zoom control is not available in web browsers')
        },
        getZoom: async (): Promise<number> => {
          log.warn('CameraRecording', 'Zoom control not supported in web browser')
          throw new Error('Zoom control is not available in web browsers')
        },
        pausePreview: (): void => {
          // No-op on web - no camera preview buffers to release
          log.debug('CameraPreview', 'pausePreview called (web - no-op)')
        },
        resumePreview: (): void => {
          // No-op on web
          log.debug('CameraPreview', 'resumePreview called (web - no-op)')
        },
      }),
      []
    )

    // Simulate camera initialization on web - only after client hydration
    useEffect(() => {
      if (isClient && permissionGranted && cameraReady === false) {
        const timer = setTimeout(() => {
          setCameraReady(true)
          onCameraReady?.()
          if (__DEV__) {
            log.info('CameraPreview', 'Web camera placeholder initialized')
          }
        }, 1000)

        return () => clearTimeout(timer)
      }
      return () => {} // Cleanup function for when conditions not met
    }, [isClient, permissionGranted, onCameraReady, cameraReady])

    // Show loading state during hydration to prevent mismatch
    if (!isClient || cameraReady === null) {
      return (
        <YStack
          flex={1}
          backgroundColor="$color1"
          alignItems="center"
          justifyContent="center"
          padding="$4"
        >
          <SizableText
            size="$4"
            color="$color10"
          >
            Loading...
          </SizableText>
        </YStack>
      )
    }

    // Show error state for web
    if (!permissionGranted) {
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
              🌐
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
                Camera Not Available
              </SizableText>
              <SizableText
                size="$3"
                color="$color11"
                textAlign="center"
              >
                Camera access is not available in web browsers. Please use the mobile app for camera
                recording.
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
        backgroundColor="$color2"
        alignItems="center"
        justifyContent="center"
      >
        {/* Web camera placeholder */}
        <YStack
          alignItems="center"
          gap="$4"
          padding="$4"
        >
          <SizableText
            size="$8"
            opacity={0.6}
          >
            📹
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
              Camera Preview
            </SizableText>
            <SizableText
              size="$3"
              color="$color11"
              textAlign="center"
            >
              {cameraReady === true ? 'Camera ready (web placeholder)' : 'Initializing...'}
            </SizableText>
            <SizableText
              size="$2"
              color="$color9"
              textAlign="center"
            >
              {cameraType === 'front' ? 'Front Camera' : 'Back Camera'}
            </SizableText>
          </YStack>
        </YStack>

        {/* Recording indicator overlay */}
        {isRecording && cameraReady === true && (
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

        {/* Children overlay (controls, etc.) */}
        {children}
      </YStack>
    )
  }
)

CameraPreview.displayName = 'CameraPreview'
