// import { LinearGradient } from '@tamagui/linear-gradient'
import { OptimizedImage as Image } from '@my/ui'
import React, { type ComponentProps } from 'react'
import { type ImageStyle, Platform } from 'react-native'
import { YStack, type YStackProps } from 'tamagui'

// Default glass gradient image
const defaultGlassGradient = require('../../../../../apps/expo/assets/glass-gradient-square.png')

// Module-level constants for absolute fill style to prevent object creation on each render
// iOS: Uses top/left/right/bottom (works with expo-image)
// Android: Uses width/height (required for React Native Image compatibility)
const ABSOLUTE_FILL_STYLE_IOS: ImageStyle = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
}

const ABSOLUTE_FILL_STYLE_ANDROID: ImageStyle = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
}

export interface GlassBackgroundProps extends Omit<YStackProps, 'children'> {
  /**
   * Children to render inside the glass background
   */
  children: React.ReactNode

  /**
   * Background image source
   * @default glass-gradient-square.png from expo assets
   */
  source?: ComponentProps<typeof Image>['source']

  /**
   * Content fit mode for the background image (only used if source is provided)
   * @default 'fill'
   */
  contentFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down'

  /**
   * Test ID for testing
   */
  testID?: string
}

/**
 * Glass Background Component
 *
 * Provides a glassmorphic background effect using a LinearGradient or Image.
 * Wraps content in a YStack with configurable styling.
 *
 * @example
 * ```tsx
 * <GlassBackground>
 *   <YStack padding="$4">
 *     <Text>Content with glass effect</Text>
 *   </YStack>
 * </GlassBackground>
 * ```
 */
// Memoize to prevent re-renders during navigation animations
export const GlassBackground = React.memo(function GlassBackground({
  children,
  source,
  contentFit = 'fill',
  testID = 'glass-background',
  ...stackProps
}: GlassBackgroundProps): React.ReactElement {
  // Use provided source or default glass gradient
  const imageSource = source || defaultGlassGradient

  return (
    <YStack
      flex={1}
      position="relative"
      overflow="hidden"
      borderWidth={0}
      borderColor="#636363"
      testID={testID}
      {...stackProps}
    >
      <Image
        source={imageSource}
        contentFit={contentFit}
        style={Platform.OS === 'android' ? ABSOLUTE_FILL_STYLE_ANDROID : ABSOLUTE_FILL_STYLE_IOS}
        // Performance optimizations
        cachePolicy="memory-disk" // Use both memory and disk cache
        transition={200} // Smooth fade-in transition
        priority="normal" // Background images don't need high priority
        testID={`${testID}-image`}
      />
      {children}
    </YStack>
  )
})
