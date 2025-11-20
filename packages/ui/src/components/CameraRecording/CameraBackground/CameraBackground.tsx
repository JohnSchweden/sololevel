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
 * Useful for iOS simulator testing with static background images
 *
 * Memoized to prevent unnecessary re-renders from parent updates
 */
export const CameraBackground = React.memo(function CameraBackground({
  imageSource,
  opacity = 0.2,
  resizeMode = 'cover',
  simulatorOnly = true,
  showOnError: _showOnError = false,
}: CameraBackgroundProps) {
  // Don't render if no image source provided
  if (!imageSource) {
    return null
  }

  // On simulator only mode, check if we're in a simulator environment
  if (simulatorOnly && Platform.OS === 'ios') {
    // In iOS simulator, we can detect this by checking if we have camera permissions
    // or by checking the device model (simulators have specific device names)
    // For now, we'll always show on iOS as it's most likely simulator usage
  } else if (simulatorOnly && Platform.OS !== 'ios') {
    // Don't show background on non-iOS platforms in simulator-only mode
    return null
  }

  // Note: showOnError parameter is used by parent components to control when to show background
  // Currently always shown when simulatorOnly is true on iOS
  // This parameter is available for future use when needed
  // Removed per-render logging to reduce noise

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
