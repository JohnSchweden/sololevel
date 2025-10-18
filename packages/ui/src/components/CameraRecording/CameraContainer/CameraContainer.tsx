import type { ReactNode } from 'react'
import { YStack } from 'tamagui'
import type { GetProps } from 'tamagui'

export interface CameraContainerProps {
  children?: ReactNode
  bottomNavigation?: ReactNode
  backgroundColor?: GetProps<typeof YStack>['backgroundColor']
  testID?: string
}

/**
 * Responsive Camera Container Layout
 * Mobile-first YStack root container with safe area handling
 * Implements responsive breakpoints and 44px touch targets
 */
export function CameraContainer({ children, testID }: CameraContainerProps) {
  return (
    <YStack
      flex={1}
      backgroundColor="$background"
      position="relative"
      testID={testID}
    >
      {/* Camera Preview Area - Full flex container */}
      <YStack
        position="absolute"
        top={0}
        left={0}
        right={0}
        bottom={0}
        overflow="hidden"
      >
        {children}
      </YStack>
    </YStack>
  )
}

export interface CameraPreviewAreaProps {
  children?: ReactNode
  isRecording?: boolean
}

/**
 * Camera Preview Area with Absolute Positioning Support
 * Provides relative positioning for overlays and controls
 */
export function CameraPreviewArea({
  children,
  isRecording: _isRecording = false,
}: CameraPreviewAreaProps) {
  return (
    <YStack
      flex={1}
      position="relative"
      backgroundColor="transparent" // TEMPORARY: Remove background to test
      // REMOVED: justifyContent="center" and alignItems="center" - these were compressing the camera
      // Add subtle border when recording for visual feedback
      // REMOVED: Red border when recording - no longer needed
    >
      {children}
    </YStack>
  )
}

export interface CameraControlsOverlayProps {
  children?: ReactNode
  position?: 'bottom' | 'center' | 'top'
}

/**
 * Camera Controls Overlay
 * Absolute positioned container for camera controls
 * Mobile-first touch target positioning
 */
export function CameraControlsOverlay({
  children,
  position = 'bottom',
}: CameraControlsOverlayProps) {
  const getPositionProps = () => {
    switch (position) {
      case 'top':
        return {
          position: 'absolute' as const,
          top: 16,
          left: 16,
          right: 16,
        }
      case 'center':
        return {
          position: 'absolute' as const,
          top: 0,
          left: 16,
          right: 16,
          bottom: 0,
          justifyContent: 'center' as const,
        }
      default:
        return {
          position: 'absolute' as const,
          bottom: 80,
          left: 0,
          right: 0,
        }
    }
  }

  return (
    <YStack
      {...getPositionProps()}
      alignItems="center"
      justifyContent="center"
      zIndex={15} // Above camera but below header/nav
    >
      {children}
    </YStack>
  )
}
