import React from 'react'
import { Button, ScrollView, Spinner, Text, XStack, YStack } from 'tamagui'
import { VideoThumbnailCard } from '../VideoThumbnailCard'

// Stable style objects to prevent unnecessary re-renders
const BUTTON_PRESS_STYLE = { opacity: 0.7 } as const
const RETRY_BUTTON_PRESS_STYLE = { opacity: 0.7, scale: 0.95 } as const
const SCROLL_CONTENT_STYLE = { paddingRight: 0 } as const

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
 * Shows horizontal scrollable row of video thumbnails.
 * Includes empty, loading, and error states.
 *
 * Scroll Behavior:
 * - Tracks visible items during scroll with 150ms debounced updates
 * - Calls onVisibleItemsChange during active scrolling for prefetching
 * - Optimized to prevent excessive parent re-renders while enabling real-time prefetch
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
  // CRITICAL FIX: Track scroll position in ref instead of state
  // setState during scroll was triggering parent re-renders every 100ms
  // Use ref to track indices, notify parent during scroll (debounced) AND on scroll end
  const initialVisible = Math.min(3, videos.length)
  const visibleIndicesRef = React.useRef<number[]>(
    Array.from({ length: initialVisible }, (_, i) => i)
  )
  const debounceTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasInitializedRef = React.useRef(false)

  // Notify parent of visible items on mount only
  // Scroll events handled separately with debouncing for prefetch performance
  React.useEffect(() => {
    // On mount, immediately notify with initial visible items
    if (!hasInitializedRef.current && visibleIndicesRef.current.length > 0) {
      hasInitializedRef.current = true
      const visibleItems = visibleIndicesRef.current.map((idx) => videos[idx]).filter(Boolean)
      onVisibleItemsChange?.(visibleItems)
    }
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, []) // Only run on mount, not on scroll

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
            size="large"
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

      {/* Videos Row - Horizontal Scroll */}
      {!isLoading && !error && videos.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={SCROLL_CONTENT_STYLE}
          onScroll={(event) => {
            // Update ref tracking visible items during scroll (no setState)
            // Calculate visible item indices based on scroll position
            const contentOffsetX = event.nativeEvent.contentOffset.x
            const itemWidth = 150 // Approximate thumbnail width + gap
            const startIdx = Math.floor(contentOffsetX / itemWidth)
            const visibleCount = 3 // Approximate visible items
            const indices = Array.from({ length: visibleCount }, (_, i) => startIdx + i).filter(
              (idx) => idx >= 0 && idx < videos.length
            )
            // Store in ref - no setState during scroll
            visibleIndicesRef.current = indices

            // Debounced update for prefetch during active scroll (150ms delay)
            // Enables real-time prefetching without excessive parent re-renders
            if (debounceTimerRef.current) {
              clearTimeout(debounceTimerRef.current)
            }
            debounceTimerRef.current = setTimeout(() => {
              if (visibleIndicesRef.current.length > 0) {
                const visibleItems = visibleIndicesRef.current
                  .map((idx) => videos[idx])
                  .filter(Boolean)
                onVisibleItemsChange?.(visibleItems)
              }
            }, 150) // 150ms debounce - frequent enough for prefetch, not too chatty
          }}
          onScrollEndDrag={() => {
            // Final update after scroll ends (clears any pending debounced updates)
            // Ensures parent has latest visible items for final positioning
            if (debounceTimerRef.current) {
              clearTimeout(debounceTimerRef.current)
            }
            if (visibleIndicesRef.current.length > 0) {
              const visibleItems = visibleIndicesRef.current
                .map((idx) => videos[idx])
                .filter(Boolean)
              onVisibleItemsChange?.(visibleItems)
            }
          }}
          scrollEventThrottle={100}
          testID={`${testID}-scroll`}
        >
          <XStack
            gap="$2"
            paddingLeft="$10"
            paddingRight="$4"
          >
            {videos.map((video) => (
              <VideoThumbnailCard
                key={video.id}
                thumbnailUri={video.thumbnailUri}
                onPress={() => onVideoPress(video.id)}
                accessibilityLabel={`Video thumbnail, ${video.title}, recorded on ${new Date(
                  video.createdAt
                ).toLocaleDateString()}`}
                testID={`${testID}-thumbnail-${video.id}`}
              />
            ))}
          </XStack>
        </ScrollView>
      )}
    </YStack>
  )
}

// Enable why-did-you-render tracking for performance debugging
if (__DEV__) {
  ;(VideosSection as any).whyDidYouRender = true
}
