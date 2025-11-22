import React from 'react'
import { Image, Platform } from 'react-native'
import { YStack } from 'tamagui'

export interface CameraBackgroundProps {
  /** Background image source - can be a local asset or remote URL */
  imageSource?: string | number
  /** Opacity of the background image (0-1) */
  opacity?: number
  /** How the image should be resized to fit the container */
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center'
  /** Whether to show the background only on simulator */
  simulatorOnly?: boolean
  /** Whether to show background even when camera is in error state */
  showOnError?: boolean
}

/**
 * Camera Background Component
 * Provides background image overlay for camera recording
 * Only visible when camera is unavailable (showOnError=true) and on simulator
 *
 * Memoized to prevent unnecessary re-renders from parent updates
 */
export const CameraBackground = React.memo(function CameraBackground({
  imageSource,
  opacity = 0.2,
  resizeMode = 'cover',
  simulatorOnly = true,
  showOnError = false,
}: CameraBackgroundProps) {
  // Don't render if no image source provided
  if (!imageSource) {
    return null
  }

  // Only show background when showOnError is true (camera unavailable state)
  if (!showOnError) {
    return null
  }

  // On simulator only mode, only show in development (simulator) on iOS
  if (simulatorOnly && (Platform.OS !== 'ios' || !__DEV__)) {
    return null
  }

  return (
    <YStack
      position="absolute"
      top={0}
      left={0}
      right={0}
      bottom={0}
      zIndex={1} // Below camera but above any other overlays
    >
      <Image
        source={typeof imageSource === 'string' ? { uri: imageSource } : imageSource}
        style={{
          width: '100%',
          height: '100%',
          opacity,
        }}
        resizeMode={resizeMode}
      />
    </YStack>
  )
})
