import type { NavAppHeaderOptions } from '@app/components/navigation/NavigationAppHeader'
import { log } from '@my/logging'
import { VideosSection } from '@my/ui/src/components/HistoryProgress'
import { useNavigation, useRouter } from 'expo-router'
import React, { useLayoutEffect } from 'react'
import { RefreshControl } from 'react-native'
import { ScrollView, YStack } from 'tamagui'
import { useHistoryQuery } from './hooks/useHistoryQuery'

export interface HistoryProgressScreenProps {
  /**
   * Handler for navigating to video analysis screen
   */
  onNavigateToVideoAnalysis?: (analysisId: number) => void

  /**
   * Handler for navigating to full videos screen
   */
  onNavigateToVideos?: () => void

  /**
   * Handler for back navigation
   */
  onBack?: () => void

  /**
   * Test ID for testing
   */
  testID?: string
}

/**
 * History & Progress Tracking Screen
 *
 * Displays user's video analysis history with:
 * - Videos section: Horizontal gallery of recent analyses (top 3)
 * - Coaching sessions section: Vertical list (future P1 feature)
 *
 * Architecture:
 * - Orchestrator pattern: Composes hooks + UI components
 * - No business logic (delegated to hooks)
 * - No UI implementation (delegated to @my/ui components)
 * - AppHeader configured via navigation.setOptions()
 *
 * @example
 * ```tsx
 * <HistoryProgressScreen
 *   onNavigateToVideoAnalysis={(id) => router.push(`/video-analysis/${id}`)}
 *   onNavigateToVideos={() => router.push('/videos')}
 *   onBack={() => router.back()}
 * />
 * ```
 */
export function HistoryProgressScreen({
  onNavigateToVideoAnalysis,
  onNavigateToVideos,
  onBack,
  testID = 'history-progress-screen',
}: HistoryProgressScreenProps): React.ReactElement {
  const navigation = useNavigation()
  const router = useRouter()

  // Log screen mount
  React.useEffect(() => {
    log.debug('HistoryProgressScreen', 'Screen mounted')
    return () => {
      log.debug('HistoryProgressScreen', 'Screen unmounted')
    }
  }, [])

  // Configure AppHeader via navigation options
  useLayoutEffect(() => {
    navigation.setOptions({
      appHeaderProps: {
        title: 'History & Progress',
        mode: 'default',
        leftAction: 'back',
        rightAction: 'auto',
        onBackPress: onBack || (() => router.back()),
        onMenuPress: () => {
          // Navigate to settings/profile (P0: console.log placeholder)
          console.log('Navigate to settings')
          // P1: router.push('/settings')
        },
      },
    } as NavAppHeaderOptions)
  }, [navigation, onBack, router])

  // Data fetching with TanStack Query + Zustand cache
  const { data: videos = [], isLoading, error, refetch } = useHistoryQuery()

  // Log data state changes
  React.useEffect(() => {
    if (error) {
      log.error('HistoryProgressScreen', 'Failed to load video history', {
        error: error instanceof Error ? error.message : String(error),
      })
    } else if (!isLoading && videos.length === 0) {
      log.debug('HistoryProgressScreen', 'No videos available (empty state)')
    } else if (!isLoading && videos.length > 0) {
      log.debug('HistoryProgressScreen', 'Videos loaded successfully', {
        count: videos.length,
      })
    }
  }, [videos, isLoading, error])

  // Pull-to-refresh state
  const [refreshing, setRefreshing] = React.useState(false)

  const handleRefresh = React.useCallback(async () => {
    const startTime = Date.now()
    log.debug('HistoryProgressScreen', 'Pull-to-refresh initiated')

    setRefreshing(true)
    try {
      await refetch()
      const duration = Date.now() - startTime
      log.info('HistoryProgressScreen', 'Pull-to-refresh completed', { duration })
    } catch (error) {
      const duration = Date.now() - startTime
      log.error('HistoryProgressScreen', 'Pull-to-refresh failed', {
        error: error instanceof Error ? error.message : String(error),
        duration,
      })
    } finally {
      setRefreshing(false)
    }
  }, [refetch])

  // Navigation handlers
  const handleVideoPress = React.useCallback(
    (analysisId: number) => {
      log.info('HistoryProgressScreen', 'Video thumbnail pressed', { analysisId })

      if (onNavigateToVideoAnalysis) {
        onNavigateToVideoAnalysis(analysisId)
      } else {
        // Type assertion for dynamic route
        router.push(`/video-analysis/${analysisId}` as any)
      }
    },
    [onNavigateToVideoAnalysis, router]
  )

  const handleSeeAllPress = React.useCallback(() => {
    log.debug('HistoryProgressScreen', '"See all" button pressed (P0 placeholder)')

    if (onNavigateToVideos) {
      onNavigateToVideos()
    } else {
      // P0: Console log placeholder
      console.log('Navigate to /videos screen (P1 feature)')
      // P1: router.push('/videos')
    }
  }, [onNavigateToVideos])

  return (
    <YStack
      flex={1}
      backgroundColor="$background"
      testID={testID}
    >
      {/* AppHeader rendered automatically by _layout.tsx */}

      <ScrollView
        flex={1}
        paddingHorizontal="$4"
        paddingTop="$4"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="$gray10"
          />
        }
        testID={`${testID}-scroll`}
      >
        {/* Videos Section */}
        <VideosSection
          videos={videos.slice(0, 3)}
          onVideoPress={handleVideoPress}
          onSeeAllPress={handleSeeAllPress}
          isLoading={isLoading}
          error={error}
          onRetry={refetch}
          testID={`${testID}-videos-section`}
        />

        {/* Coaching Sessions Section - P1 Feature */}
        {/* TODO: Implement CoachingSessionsSection in Task 27b */}
        {/* <CoachingSessionsSection ... /> */}
      </ScrollView>
    </YStack>
  )
}
