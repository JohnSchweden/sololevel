import React from 'react'
import { FlatList, type ViewToken } from 'react-native'
import { Button, Spinner, Text, View, XStack, YStack } from 'tamagui'

import { VideoThumbnailCard } from '../VideoThumbnailCard'

// Stable style objects to prevent unnecessary re-renders
const BUTTON_PRESS_STYLE = { opacity: 0.7 } as const
const RETRY_BUTTON_PRESS_STYLE = { opacity: 0.7, scale: 0.95 } as const

export interface VideosSectionProps {
  /**
   * Array of videos to display
   */
  videos: Array<{
    id: number
    videoId: number
    title: string
    createdAt: string
    thumbnailUri?: string
  }>

  /**
   * Handler for video thumbnail press
   */
  onVideoPress: (analysisId: number) => void

  /**
   * Handler for "See all" button press
   */
  onSeeAllPress: () => void

  /**
   * Loading state
   */
  isLoading?: boolean

  /**
   * Error state
   */
  error?: Error | null

  /**
   * Retry handler for error state
   */
  onRetry?: () => void

  /**
   * Callback when visible items change during scrolling (for prefetching).
   * Called with 150ms debounce during active scroll to enable real-time prefetching
   * without excessive parent re-renders. Also called on scroll end for final updates.
   */
  onVisibleItemsChange?: (items: VideosSectionProps['videos']) => void

  /**
   * Test ID for testing
   */
  testID?: string
}

/**
 * Videos section component with header and horizontal thumbnail gallery
 *
 * Displays section header with "Videos" title and "See all" link button.
 * Shows horizontal scrollable row of video thumbnails with lazy loading.
 * Includes empty, loading, and error states.
 *
 * Performance Optimizations:
 * - Uses FlatList for virtualization (only renders visible items + buffer)
 * - Implements getItemLayout for O(1) scroll performance
 * - Uses onViewableItemsChanged for optimized visibility tracking
 * - Memoized renderItem and keyExtractor to prevent re-renders
 * - Small windowSize (5) for memory efficiency with horizontal lists
 *
 * Note: Caller should limit the videos array size (typically 10 or fewer).
 *
 * @example
 * ```tsx
 * <VideosSection
 *   videos={videos.slice(0, 10)}
 *   onVideoPress={(id) => router.push({ pathname: '/video-analysis', params: { analysisJobId: id } })}
 *   onSeeAllPress={() => router.push('/videos')}
 *   onVisibleItemsChange={(visibleItems) => {
 *     // Handle visible items changes for prefetching
 *   }}
 * />
 * ```
 */
export function VideosSection({
  videos,
  onVideoPress,
  onSeeAllPress,
  isLoading = false,
  error = null,
  onRetry,
  onVisibleItemsChange,
  testID = 'videos-section',
}: VideosSectionProps): React.ReactElement {
  // Thumbnail dimensions (matches VideoThumbnailCard default)
  const THUMBNAIL_WIDTH = 100
  const THUMBNAIL_GAP = 8 // $2 = 8px
  const ITEM_WIDTH = THUMBNAIL_WIDTH + THUMBNAIL_GAP

  // Viewability config for FlatList
  const viewabilityConfig = React.useRef({
    itemVisiblePercentThreshold: 50, // Item considered visible if 50% shown
    minimumViewTime: 100, // Minimum time to be considered viewable (debouncing)
  }).current

  // Keep latest callback in ref to ensure stable onViewableItemsChanged can access it
  const onVisibleItemsChangeRef = React.useRef(onVisibleItemsChange)
  React.useEffect(() => {
    onVisibleItemsChangeRef.current = onVisibleItemsChange
  }, [onVisibleItemsChange])

  // Handle viewable items changed - MUST be a stable reference for FlatList
  const onViewableItemsChanged = React.useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const callback = onVisibleItemsChangeRef.current
      if (!callback) return

      const visibleItems = viewableItems
        .map((token) => token.item as VideosSectionProps['videos'][0])
        .filter(Boolean)

      if (visibleItems.length > 0) {
        callback(visibleItems)
      }
    }
  ).current

  // Render item callback - memoized to prevent re-renders
  const renderItem = React.useCallback(
    ({ item }: { item: VideosSectionProps['videos'][0] }) => (
      <VideoThumbnailCard
        thumbnailUri={item.thumbnailUri}
        onPress={() => onVideoPress(item.id)}
        accessibilityLabel={`Video thumbnail, ${item.title}, recorded on ${new Date(
          item.createdAt
        ).toLocaleDateString()}`}
        testID={`${testID}-thumbnail-${item.id}`}
      />
    ),
    [onVideoPress, testID]
  )

  // Key extractor - memoized
  const keyExtractor = React.useCallback(
    (item: VideosSectionProps['videos'][0]) => String(item.id),
    []
  )

  // Item separator (gap equivalent)
  const ItemSeparator = React.useCallback(() => <View width={THUMBNAIL_GAP} />, [])

  // Get item layout for optimization (O(1) scroll performance)
  const getItemLayout = React.useCallback(
    (_: any, index: number) => ({
      length: ITEM_WIDTH,
      offset: ITEM_WIDTH * index,
      index,
    }),
    []
  )

  // REMOVED: Initial visible items notification
  // Let FlatList's onViewableItemsChanged be the ONLY source of truth
  // This prevents race condition where parent prefetches ALL items before FlatList reports actual visible items

  return (
    <YStack
      gap="$1"
      marginBottom="$8"
      testID={testID}
    >
      {/* Section Header */}
      <XStack
        justifyContent="space-between"
        alignItems="center"
        marginBottom="$2"
        paddingHorizontal="$8"
        paddingLeft="$10"
        testID={`${testID}-header`}
      >
        <Text
          fontSize="$4"
          fontWeight="500"
          color="$color11"
          //letterSpacing={0.5}
        >
          Videos
        </Text>
        <Button
          chromeless
          size="$3"
          onPress={onSeeAllPress}
          animation="quick"
          pressStyle={BUTTON_PRESS_STYLE}
          accessibilityRole="button"
          accessibilityLabel="See all videos"
          testID={`${testID}-see-all-button`}
        >
          <Text
            fontSize="$4"
            fontWeight="500"
            color="$color11"
            borderBottomWidth={1}
            borderBottomColor="$color11"
            paddingTop="$1"
          >
            See all
          </Text>
        </Button>
      </XStack>

      {/* Loading State */}
      {isLoading && (
        <YStack
          height={180}
          justifyContent="center"
          alignItems="center"
          testID={`${testID}-loading`}
        >
          {/* @ts-ignore - Tamagui Spinner has overly strict color typing (type augmentation works in app, needed for web) */}
          <Spinner
            size="small"
            color="$color11"
          />
          <Text
            fontSize="$4"
            color="$color11"
            marginTop="$3"
          >
            Loading videos...
          </Text>
        </YStack>
      )}

      {/* Error State */}
      {!isLoading && error && (
        <YStack
          height={180}
          justifyContent="center"
          alignItems="center"
          gap="$3"
          backgroundColor="$color2"
          borderRadius="$4"
          padding="$4"
          testID={`${testID}-error`}
        >
          <Text
            fontSize="$5"
            color="$color11"
            textAlign="center"
          >
            Failed to load videos
          </Text>
          <Text
            fontSize="$3"
            color="$color11"
            textAlign="center"
          >
            {error.message}
          </Text>
          {onRetry && (
            <Button
              size="$3"
              onPress={onRetry}
              backgroundColor="$color5"
              color="$color12"
              animation="quick"
              pressStyle={RETRY_BUTTON_PRESS_STYLE}
              testID={`${testID}-retry-button`}
            >
              Retry
            </Button>
          )}
        </YStack>
      )}

      {/* Empty State */}
      {!isLoading && !error && videos.length === 0 && (
        <YStack
          height={180}
          justifyContent="center"
          alignItems="center"
          gap="$3"
          backgroundColor="$color2"
          borderRadius="$4"
          padding="$4"
          testID={`${testID}-empty`}
        >
          <Text
            fontSize="$5"
            color="$color11"
            textAlign="center"
          >
            No videos yet
          </Text>
          <Text
            fontSize="$3"
            color="$color11"
            textAlign="center"
          >
            Record your first video to see it here
          </Text>
        </YStack>
      )}

      {/* Videos Row - Horizontal FlatList with Lazy Loading */}
      {!isLoading && !error && videos.length > 0 && (
        <FlatList
          horizontal
          data={videos}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          ItemSeparatorComponent={ItemSeparator}
          contentContainerStyle={{
            paddingLeft: 60, // $10 = 40px
            paddingRight: 16, // $4 = 16px
          }}
          showsHorizontalScrollIndicator={false}
          // Virtualization & Performance Props
          // Actual device testing shows 4 thumbnails visible on most screens
          // Use 5 (4 visible + 1 buffer) for smooth initial render
          initialNumToRender={5}
          maxToRenderPerBatch={3} // Slightly larger batch for smoother scroll
          windowSize={5} // Keep 5 items in memory for smooth scrolling
          getItemLayout={getItemLayout} // O(1) scroll performance
          // Viewability for Prefetching
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          // Remove clipping to ensure shadows/elevations are visible if any
          removeClippedSubviews={false} // Horizontal lists on Android sometimes have issues with this true
          testID={`${testID}-flatlist`}
        />
      )}
    </YStack>
  )
}

// Enable why-did-you-render tracking for performance debugging
if (__DEV__) {
  ;(VideosSection as any).whyDidYouRender = true
}
