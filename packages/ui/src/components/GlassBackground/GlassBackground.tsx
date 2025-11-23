import { LinearGradient } from '@tamagui/linear-gradient'
import React, { type ComponentProps } from 'react'
import { Image, YStack, type YStackProps } from 'tamagui'

export interface GlassBackgroundProps extends Omit<YStackProps, 'children'> {
  /**
   * Children to render inside the glass background
   */
  children: React.ReactNode

  /**
   * Background image source
   * @default undefined - uses code-generated gradient
   */
  source?: ComponentProps<typeof Image>['source']

  /**
   * Resize mode for the background image (only used if source is provided)
   * @default 'stretch'
   */
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center'

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
  resizeMode = 'stretch',
  testID = 'glass-background',
  ...stackProps
}: GlassBackgroundProps): React.ReactElement {
  // If source is provided, use Image (legacy/custom behavior)
  if (source) {
    return (
      <YStack
        flex={1}
        position="relative"
        overflow="hidden"
        testID={testID}
        {...stackProps}
      >
        {/* <Image
          source={source}
          resizeMode={resizeMode}
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          width="100%"
          height="100%"
          testID={`${testID}-image`}
        /> */}
        {children}
      </YStack>
    )
  }

  // Default: Code-generated gradient matching glass-gradient-square.png
  return (
    <YStack
      flex={1}
      position="relative"
      overflow="hidden"
      borderWidth={0}
      borderColor="rgba(255, 255, 255, 0.35)"
      borderTopColor="rgba(255, 255, 255, 0.35)"
      borderBottomColor="rgba(255, 255, 255, 0.15)"
      borderLeftColor="rgba(255, 255, 255, 0.25)"
      borderRightColor="rgba(255, 255, 255, 0.25)"
      // Strong shadow for depth
      shadowColor="#000"
      shadowOffset={{ width: 0, height: 8 }}
      shadowOpacity={0.35}
      shadowRadius={20}
      testID={testID}
      {...stackProps}
    >
      <LinearGradient
        // Stronger top-to-bottom fade (22% -> 1%) to match the asset's contrast
        colors={['rgba(255, 255, 255, 0.22)', 'rgba(4, 4, 4, 0.24)']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        position="absolute"
        top={0}
        left={0}
        right={0}
        bottom={0}
        width="100%"
        height="100%"
        testID={`${testID}-gradient`}
      />

      {/* Inner Glow: Left (Dark) -> Right (Light) */}
      <LinearGradient
        colors={[
          'rgba(0, 0, 0, 0.1)', // Softer dark shadow left
          'transparent',
          'transparent',
          'rgba(255, 255, 255, 0.035)', // Softer light shadow right
        ]}
        locations={[0, 0.1, 0.9, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        position="absolute"
        top={0}
        left={0}
        right={0}
        bottom={0}
        pointerEvents="none"
      />

      {/* Inner Glow: Top (Dark) -> Bottom (Light) */}
      <LinearGradient
        colors={[
          'rgba(0, 0, 0, 0.1)', // Softer dark shadow top
          'transparent',
          'transparent',
          'rgba(255, 255, 255, 0.025)', // Softer light shadow bottom
        ]}
        locations={[0, 0.08, 0.92, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        position="absolute"
        top={0}
        left={0}
        right={0}
        bottom={0}
        pointerEvents="none"
      />
      {children}
    </YStack>
  )
})
