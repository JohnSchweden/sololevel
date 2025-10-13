import type { ComponentProps } from 'react'
import { Image, YStack, type YStackProps } from 'tamagui'

export interface GlassBackgroundProps extends Omit<YStackProps, 'children'> {
  /**
   * Children to render inside the glass background
   */
  children: React.ReactNode

  /**
   * Background image source
   * @default glass-gradient.png from expo assets
   */
  source?: ComponentProps<typeof Image>['source']

  /**
   * Resize mode for the background image
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
 * Provides a glassmorphic background effect using an image gradient.
 * Wraps content in an ImageBackground with configurable styling.
 *
 * @example
 * ```tsx
 * <GlassBackground>
 *   <YStack padding="$4">
 *     <Text>Content with glass effect</Text>
 *   </YStack>
 * </GlassBackground>
 * ```
 *
 * @example With custom source
 * ```tsx
 * <GlassBackground
 *   source={customGradient}
 *   resizeMode="cover"
 *   backgroundColor="$color3"
 * >
 *   <Content />
 * </GlassBackground>
 * ```
 */
export function GlassBackground({
  children,
  source,
  resizeMode = 'stretch',
  testID = 'glass-background',
  ...stackProps
}: GlassBackgroundProps): React.ReactElement {
  // Default to glass gradient from expo assets if no source provided
  const defaultSource = require('../../../../../apps/expo/assets/glass-gradient.png')
  const imageSource = source || defaultSource

  return (
    <YStack
      flex={1}
      position="relative"
      overflow="hidden"
      testID={testID}
      {...stackProps}
    >
      <Image
        source={imageSource}
        resizeMode={resizeMode}
        position="absolute"
        top={0}
        left={0}
        right={0}
        bottom={0}
        width="100%"
        height="100%"
        testID={`${testID}-image`}
      />
      {children}
    </YStack>
  )
}
