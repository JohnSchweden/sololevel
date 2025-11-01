import React from 'react'
import { Button, ScrollView, Spinner, Text, XStack, YStack } from 'tamagui'
import { VideoThumbnailCard } from '../VideoThumbnailCard'

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
 * Note: Caller should limit the videos array size (typically 10 or fewer).
 *
 * @example
 * ```tsx
 * <VideosSection
 *   videos={videos.slice(0, 10)}
 *   onVideoPress={(id) => router.push({ pathname: '/video-analysis', params: { analysisJobId: id } })}
 *   onSeeAllPress={() => router.push('/videos')}
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
  testID = 'videos-section',
}: VideosSectionProps): React.ReactElement {
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
          pressStyle={{ opacity: 0.7 }}
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
          height={280}
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
          height={280}
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
              pressStyle={{ opacity: 0.7, scale: 0.95 }}
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
          height={280}
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
          contentContainerStyle={{ paddingRight: 0 }}
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
