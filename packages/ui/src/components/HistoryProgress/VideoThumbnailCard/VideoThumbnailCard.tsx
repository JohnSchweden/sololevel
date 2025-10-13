import { Play } from '@tamagui/lucide-icons'
import React, { useState } from 'react'
import { Circle, Image, Spinner, Stack, YStack } from 'tamagui'

export interface VideoThumbnailCardProps {
  /**
   * Thumbnail image URI
   */
  thumbnailUri?: string

  /**
   * Handler for thumbnail press
   */
  onPress: () => void

  /**
   * Card width (default: 180px)
   */
  width?: number

  /**
   * Card height (default: 280px - 9:14 aspect ratio)
   */
  height?: number

  /**
   * Accessibility label for screen readers
   */
  accessibilityLabel?: string

  /**
   * Test ID for testing
   */
  testID?: string
}

/**
 * Video thumbnail card with play icon overlay
 *
 * Displays video thumbnail image with centered play button overlay.
 * Shows placeholder when no thumbnail available.
 * Includes loading and error states.
 *
 * @example
 * ```tsx
 * <VideoThumbnailCard
 *   thumbnailUri="https://example.com/thumb.jpg"
 *   onPress={() => console.log('Pressed')}
 *   accessibilityLabel="Video thumbnail, Golf Swing Analysis, recorded on Oct 11"
 * />
 * ```
 */
export function VideoThumbnailCard({
  thumbnailUri,
  onPress,
  width = 100,
  height = 180,
  accessibilityLabel,
  testID = 'video-thumbnail-card',
}: VideoThumbnailCardProps): React.ReactElement {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  return (
    <YStack
      onPress={onPress}
      pressStyle={{ scale: 0.97, opacity: 0.9 }}
      hoverStyle={{ opacity: 0.95 }}
      cursor="pointer"
      width={width}
      height={height}
      borderRadius="$4"
      overflow="hidden"
      backgroundColor="$gray2"
      borderWidth={1}
      // Subtle light border to match glass card in side-sheet
      borderColor="rgba(255,255,255,0.35)"
      elevation={4}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || 'Video thumbnail'}
      testID={testID}
    >
      {/* Thumbnail Image or Placeholder */}
      {thumbnailUri && !hasError ? (
        <Image
          source={{ uri: thumbnailUri }}
          width={width}
          height={height}
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false)
            setHasError(true)
          }}
          testID={`${testID}-image`}
        />
      ) : (
        <Stack
          width={width}
          height={height}
          backgroundColor="$gray4"
          justifyContent="center"
          alignItems="center"
          testID={`${testID}-placeholder`}
        >
          <Play
            size={30}
            color="$color4"
          />
        </Stack>
      )}

      {/* Loading State */}
      {isLoading && thumbnailUri && !hasError && (
        <YStack
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          justifyContent="center"
          alignItems="center"
          backgroundColor="rgba(0, 0, 0, 0.3)"
          testID={`${testID}-loading`}
        >
          <Spinner
            size="large"
            color="$gray1"
          />
        </YStack>
      )}

      {/* Play Icon Overlay */}
      <YStack
        position="absolute"
        top={0}
        left={0}
        right={0}
        bottom={0}
        justifyContent="center"
        alignItems="center"
        pointerEvents="none"
        testID={`${testID}-play-overlay`}
      >
        <Circle
          size={30}
          backgroundColor="rgba(255, 255, 255, 0.92)"
          justifyContent="center"
          alignItems="center"
          borderWidth={1}
          borderColor="rgba(255, 255, 255, 0.5)"
          elevation={2}
        >
          <Play
            size={18}
            color="$gray12"
            fill="currentColor"
          />
        </Circle>
      </YStack>
    </YStack>
  )
}
