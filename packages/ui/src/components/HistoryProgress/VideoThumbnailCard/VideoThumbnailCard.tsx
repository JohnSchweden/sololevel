import { Play } from '@tamagui/lucide-icons'
import React from 'react'
import { Image, Spinner, Stack, YStack } from 'tamagui'
import { GlassButton } from '../../GlassButton'

// Stable style objects to prevent unnecessary re-renders
const THUMBNAIL_PRESS_STYLE = { scale: 0.97, opacity: 0.9 } as const
const THUMBNAIL_HOVER_STYLE = { opacity: 0.95 } as const

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
 *   onPress={() => log.info('Pressed')}
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
  // CRITICAL FIX: Use refs instead of useState to prevent cascade re-renders
  // useState hooks were triggering parent re-renders on every image load event
  // 10 cards × 2 useState hooks × image loads = 20+ state updates per render cycle
  // Use refs + forceUpdate to re-render only when final state is known
  const isLocalFile = thumbnailUri?.startsWith('file://') ?? false
  const isLoadingRef = React.useRef(!isLocalFile)
  const hasErrorRef = React.useRef(false)
  const [, forceRender] = React.useReducer((x) => x + 1, 0)

  // Memoize image source to prevent unnecessary re-renders
  const imageSource = React.useMemo(
    () => (thumbnailUri ? { uri: thumbnailUri } : undefined),
    [thumbnailUri]
  )

  // Reset loading state when thumbnail URI changes
  // Update refs only, no setState - prevents cascade
  React.useEffect(() => {
    const isLocal = thumbnailUri?.startsWith('file://') ?? false
    isLoadingRef.current = !isLocal
    hasErrorRef.current = false
    forceRender()
  }, [thumbnailUri])

  return (
    <YStack
      onPress={onPress}
      animation="quick"
      pressStyle={THUMBNAIL_PRESS_STYLE}
      hoverStyle={THUMBNAIL_HOVER_STYLE}
      cursor="pointer"
      width={width}
      height={height}
      borderRadius="$4"
      overflow="hidden"
      backgroundColor="$color2"
      borderWidth={1}
      // Subtle light border to match glass card in side-sheet
      borderColor="rgba(255,255,255,0.35)"
      elevation={0}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || 'Video thumbnail'}
      testID={testID}
    >
      {/* Thumbnail Image or Placeholder */}
      {thumbnailUri && !hasErrorRef.current && imageSource ? (
        <Image
          source={imageSource}
          width={width}
          height={height}
          onLoad={() => {
            isLoadingRef.current = false
            forceRender()
          }}
          onError={() => {
            isLoadingRef.current = false
            hasErrorRef.current = true
            forceRender()
          }}
          testID={`${testID}-image`}
        />
      ) : (
        <Stack
          width={width}
          height={height}
          backgroundColor="$color4"
          justifyContent="center"
          alignItems="center"
          testID={`${testID}-placeholder`}
        >
          {/* <Play
            size={30}
            color="$color"
          /> */}
        </Stack>
      )}

      {/* Loading State */}
      {isLoadingRef.current && thumbnailUri && !hasErrorRef.current && (
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
          {/* @ts-ignore - Tamagui Spinner has overly strict color typing (type augmentation works in app, needed for web) */}
          <Spinner
            size="large"
            color="$color1"
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
        elevation={2}
        testID={`${testID}-play-overlay`}
      >
        <GlassButton
          minWidth={34}
          minHeight={34}
          onPress={onPress}
          testID={`${testID}-play-button`}
          accessibilityLabel="Play video"
          accessibilityHint="Tap to play this video"
        >
          <Play
            size={14}
            color="$color"
            fill="currentColor"
          />
        </GlassButton>
      </YStack>
    </YStack>
  )
}
