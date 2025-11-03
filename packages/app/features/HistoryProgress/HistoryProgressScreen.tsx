import { useSafeArea } from '@app/provider/safe-area/use-safe-area'
import { log } from '@my/logging'
import { GlassBackground } from '@my/ui'
import { CoachingSessionsSection, VideosSection } from '@my/ui/src/components/HistoryProgress'
import type { SessionItem } from '@my/ui/src/components/HistoryProgress'
import React from 'react'
import { YStack } from 'tamagui'
import { useHistoryQuery } from './hooks/useHistoryQuery'
import { usePrefetchNextVideos } from './hooks/usePrefetchNextVideos'
import { usePrefetchVideoAnalysis } from './hooks/usePrefetchVideoAnalysis'

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
   * Handler for navigating to coaching session (required)
   */
  onNavigateToCoachingSession: (sessionId: number) => void

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
  onNavigateToCoachingSession,
  testID = 'history-progress-screen',
}: HistoryProgressScreenProps): React.ReactElement {
  const insets = useSafeArea()
  const APP_HEADER_HEIGHT = 44 // Fixed height from AppHeader component

  // Log screen mount
  React.useEffect(() => {
    log.debug('HistoryProgressScreen', 'Screen mounted')
    return () => {
      log.debug('HistoryProgressScreen', 'Screen unmounted')
    }
  }, [])

  // Data fetching with TanStack Query + Zustand cache
  const { data: videos = [], isLoading, error, refetch } = useHistoryQuery()

  // Prefetch video analysis data for all visible videos (10 shown in gallery)
  // Strategy: Immediate prefetch for top 3, deferred for remaining 7
  const videoIds = React.useMemo(() => videos.slice(0, 10).map((v) => v.id), [videos])
  usePrefetchVideoAnalysis(videoIds)

  // Track visible videos for smart prefetch (next N items based on scroll position)
  const [visibleVideoItems, setVisibleVideoItems] = React.useState<typeof videos>([])

  // Memoize visible items callback to prevent recreation on every render
  const handleVisibleItemsChange = React.useCallback((items: typeof videos) => {
    setVisibleVideoItems(items)
  }, [])

  // Smart prefetch: prefetch video/thumbnail files to disk
  // Note: usePrefetchVideoAnalysis above only prefetches analysis data (not thumbnails)
  // This hook handles thumbnail/video file downloads to disk
  const videosToPrefetch = React.useMemo(() => videos.slice(0, 10), [videos])
  const hasMoreVideos = videos.length > 10

  // Determine visible items for prefetch: use actual visible items if available,
  // otherwise use first few videos as initial visible (VideosSection initializes with first 3)
  const visibleItemsForPrefetch = React.useMemo(() => {
    if (visibleVideoItems.length > 0) {
      return visibleVideoItems
    }
    // On mount before VideosSection reports visible items, assume first 3 are visible
    // This ensures prefetch starts immediately rather than waiting for scroll
    return videos.slice(0, Math.min(3, videos.length))
  }, [visibleVideoItems, videos])

  // Memoize prefetch config to prevent unnecessary recalculations
  const prefetchConfig = React.useMemo(
    () => ({
      lookAhead: hasMoreVideos ? 3 : videosToPrefetch.length, // Prefetch all if ≤10, next 3 if >10
      concurrency: 2,
      enabled: true, // Always enabled - thumbnails need to be prefetched
    }),
    [hasMoreVideos, videosToPrefetch.length]
  )

  // Prefetch videos based on visible items
  // Strategy: Prefetch next N items beyond visible items for smooth scrolling
  const { prefetching, prefetched, failed } = usePrefetchNextVideos(
    videosToPrefetch,
    visibleItemsForPrefetch,
    prefetchConfig
  )

  // Log prefetch state changes only when values actually change
  React.useEffect(() => {
    log.debug('HistoryProgressScreen', 'Prefetch state', {
      prefetching: prefetching.length,
      prefetched: prefetched.length,
      failed: failed.length,
    })
  }, [prefetching.length, prefetched.length, failed.length])

  // TanStack Query handles refetch-on-focus automatically via refetchOnFocus: true
  // It respects staleTime (5min), so fresh data won't trigger unnecessary refetches
  // No manual useFocusEffect needed - the library manages focus refetching

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

  const handleSessionPress = React.useCallback(
    (sessionId: number) => {
      log.info('HistoryProgressScreen', 'Coaching session pressed', { sessionId })
      onNavigateToCoachingSession(sessionId)
    },
    [onNavigateToCoachingSession]
  )

  return (
    <GlassBackground
      backgroundColor="$color3"
      testID={testID}
    >
      {/* AppHeader rendered automatically by _layout.tsx */}
      <YStack
        flex={1}
        paddingTop={insets.top + APP_HEADER_HEIGHT}
        marginTop="$4"
        //marginBottom="$4"
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
            onVisibleItemsChange={handleVisibleItemsChange}
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
