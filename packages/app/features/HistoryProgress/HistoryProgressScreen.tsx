import { log } from '@my/logging'
import { GlassBackground } from '@my/ui'
import { CoachingSessionsSection, VideosSection } from '@my/ui/src/components/HistoryProgress'
import type { SessionItem } from '@my/ui/src/components/HistoryProgress'
import { useHeaderHeight } from '@react-navigation/elements'
import { useFocusEffect } from 'expo-router'
import React from 'react'
import { YStack } from 'tamagui'
import { useHistoryQuery } from './hooks/useHistoryQuery'

export interface HistoryProgressScreenProps {
  /**
   * Handler for navigating to video analysis screen (required)
   */
  onNavigateToVideoAnalysis: (analysisId: number) => void

  /**
   * Handler for navigating to full videos screen (required)
   */
  onNavigateToVideos: () => void

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
 *   onNavigateToVideoAnalysis={(id) => router.push({ pathname: '/video-analysis', params: { analysisJobId: id } })}
 *   onNavigateToVideos={() => router.push('/videos')}
 * />
 * ```
 */
export function HistoryProgressScreen({
  onNavigateToVideoAnalysis,
  onNavigateToVideos,
  testID = 'history-progress-screen',
}: HistoryProgressScreenProps): React.ReactElement {
  const headerHeight = useHeaderHeight()

  // Log screen mount
  React.useEffect(() => {
    log.debug('HistoryProgressScreen', 'Screen mounted')
    return () => {
      log.debug('HistoryProgressScreen', 'Screen unmounted')
    }
  }, [])

  // Data fetching with TanStack Query + Zustand cache
  const { data: videos = [], isLoading, error, refetch } = useHistoryQuery()

  // Refetch data when screen comes into focus (e.g., after recording a video)
  useFocusEffect(
    React.useCallback(() => {
      log.debug('HistoryProgressScreen', 'Screen focused - refetching history')
      refetch()
    }, [refetch])
  )

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
        videoSample: videos.slice(0, 3).map((v) => ({
          id: v.id,
          title: v.title,
          hasThumbnail: !!v.thumbnailUri,
          thumbnailPreview: v.thumbnailUri ? v.thumbnailUri.substring(0, 60) + '...' : 'none',
        })),
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
      onNavigateToVideoAnalysis(analysisId)
    },
    [onNavigateToVideoAnalysis]
  )

  const handleSeeAllPress = React.useCallback(() => {
    log.debug('HistoryProgressScreen', '"See all" button pressed')
    onNavigateToVideos()
  }, [onNavigateToVideos])

  // Mock coaching sessions data (P0)
  const mockCoachingSessions: SessionItem[] = React.useMemo(
    () => [
      { id: 1, date: 'Today', title: 'Muscle Soreness and Growth in Weightlifting' },
      { id: 2, date: 'Monday, Jul 28', title: 'Personalised supplement recommendations' },
      { id: 3, date: 'Sunday, Jul 27', title: 'Posture correction techniques' },
      { id: 4, date: 'Saturday, Jul 26', title: 'Injury prevention strategies' },
      { id: 5, date: 'Friday, Jul 25', title: 'Nutrition timing for optimal performance' },
      { id: 6, date: 'Thursday, Jul 24', title: 'Recovery techniques for athletes' },
    ],
    []
  )

  const handleSessionPress = React.useCallback((sessionId: number) => {
    log.debug('HistoryProgressScreen', 'Coaching session pressed (P0 placeholder)', { sessionId })
    // P0: Log placeholder
    log.info('HistoryProgressScreen', 'Navigate to coaching session', { sessionId })
    // P1: router.push(`/coaching-sessions/${sessionId}`)
  }, [])

  return (
    <GlassBackground
      backgroundColor="$color3"
      testID={testID}
    >
      {/* AppHeader rendered automatically by _layout.tsx */}
      <YStack
        flex={1}
        paddingTop={headerHeight}
        marginVertical="$4"
        borderRadius="$10"
        overflow="hidden"
        elevation={8}
        testID={`${testID}-glass-container`}
      >
        <YStack flex={1}>
          {/* Videos Section - Full Width */}
          <VideosSection
            videos={videos.slice(0, 10)}
            onVideoPress={handleVideoPress}
            onSeeAllPress={handleSeeAllPress}
            isLoading={isLoading}
            error={error}
            onRetry={refetch}
            testID={`${testID}-videos-section`}
          />

          {/* Coaching Sessions Section - With ScrollView */}
          <CoachingSessionsSection
            sessions={mockCoachingSessions}
            onSessionPress={handleSessionPress}
            refreshing={refreshing}
            onRefresh={handleRefresh}
            testID={`${testID}-coaching-sessions-section`}
          />
        </YStack>
      </YStack>
    </GlassBackground>
  )
}
