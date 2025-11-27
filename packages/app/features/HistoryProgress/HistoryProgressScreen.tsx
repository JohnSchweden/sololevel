import { useStableSafeArea } from '@app/provider/safe-area/use-safe-area'
import { log } from '@my/logging'
import { GlassBackground } from '@my/ui'
import { CoachingSessionsSection, VideosSection } from '@my/ui/src/components/HistoryProgress'
import type { SessionItem } from '@my/ui/src/components/HistoryProgress'
import React from 'react'
import { Platform } from 'react-native'
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

// Mock coaching sessions data - defined outside component to prevent re-allocation
// Frozen to prevent mutations and signal immutability
const MOCK_COACHING_SESSIONS: readonly SessionItem[] = Object.freeze([
  { id: 1, date: 'Today', title: 'Muscle Soreness and Growth in Weightlifting' },
  { id: 2, date: 'Monday, Jul 28', title: 'Personalised supplement recommendations' },
  { id: 3, date: 'Sunday, Jul 27', title: 'Posture correction techniques' },
  { id: 4, date: 'Saturday, Jul 26', title: 'Injury prevention strategies' },
  { id: 5, date: 'Friday, Jul 25', title: 'Nutrition timing for optimal performance' },
  { id: 6, date: 'Thursday, Jul 24', title: 'Recovery techniques for athletes' },
])

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
// Memoize to prevent re-renders during navigation animations
export const HistoryProgressScreen = React.memo(function HistoryProgressScreen({
  onNavigateToVideoAnalysis,
  onNavigateToVideos,
  onNavigateToCoachingSession,
  testID = 'history-progress-screen',
}: HistoryProgressScreenProps): React.ReactElement {
  // Use stable safe area hook to prevent layout jumps during navigation
  const insets = useStableSafeArea()
  const APP_HEADER_HEIGHT = 44 // Fixed height from AppHeader component

  // Log screen mount
  React.useEffect(() => {
    log.debug('HistoryProgressScreen', 'Screen mounted')
    // Note: No cleanup needed here - this screen doesn't subscribe to analyses directly.
    // Subscriptions are managed by child components (e.g., VideoAnalysisScreen) which
    // handle their own cleanup via useEffect cleanup functions.
    // Global cleanup (reset/unsubscribeAll) is too aggressive and can break child screens
    // that rely on these subscriptions.
  }, [])

  // Data fetching with TanStack Query + Zustand cache
  // CRITICAL: Use isPending (not isLoading) to handle disabled query state
  // When enabled:false (during hydration), isPending=true but isLoading=false
  // This prevents showing "empty state" during the ~265ms hydration window
  const { data: videos = [], isPending, isLoading, error, refetch } = useHistoryQuery()

  // Memoize displayed videos array to prevent creating new array reference every render
  // This is critical for preventing unnecessary VideosSection re-renders
  const displayedVideos = React.useMemo(() => videos.slice(0, 10), [videos])

  // Extract video IDs for prefetch hooks (used by both thumbnail and analysis prefetch)
  const videoIds = React.useMemo(() => displayedVideos.map((v) => v.id), [displayedVideos])

  // Track visible videos for smart prefetch (next N items based on scroll position)
  // CRITICAL FIX: Use ref instead of useState to prevent parent re-renders on scroll
  // setState was triggering cascade re-renders every 150ms during scroll
  const visibleVideoItemsRef = React.useRef<typeof videos>([])

  // Memoize visible items callback to prevent recreation on every render
  // CRITICAL FIX: Update prefetch ref directly in callback (no polling needed)
  const handleVisibleItemsChange = React.useCallback((items: typeof videos) => {
    // Store for scroll position tracking
    visibleVideoItemsRef.current = items

    // Update prefetch ref if content actually changed (content-based comparison)
    const newIds = items.map((v) => v.id).join(',')
    if (newIds !== prevVisibleIdsRef.current) {
      prevVisibleIdsRef.current = newIds
      setVisibleItemsForPrefetch(items)
    }
  }, [])

  // Prepare videos for thumbnail/video file prefetch
  // Use displayedVideos directly - stable reference prevents cascade re-renders
  const videosToPrefetch = React.useMemo(() => displayedVideos, [displayedVideos])
  const hasMoreVideos = videos.length > 10

  // Memoize initial visible items slice to prevent creating new array reference
  // CRITICAL FIX: Use 4 items (not 3) to match actual viewport on most devices
  // The 4th thumbnail was delayed ~900ms because it was treated as "next to prefetch"
  // instead of "already visible", waiting for FlatList's onViewableItemsChanged
  const initialVisibleItems = React.useMemo(
    () => displayedVideos.slice(0, Math.min(4, displayedVideos.length)),
    [displayedVideos]
  )

  // CRITICAL FIX: Removed 500ms polling interval that was causing cascade re-renders
  // Use pure ref-based callback pattern instead - no setState, no intervals, zero overhead
  const prevVisibleIdsRef = React.useRef<string>(initialVisibleItems.map((v) => v.id).join(','))
  // Use state to trigger updates only when visible items actually change
  // This prevents cascade re-renders from scroll events while ensuring hooks update
  const [visibleItemsForPrefetch, setVisibleItemsForPrefetch] =
    React.useState<typeof videos>(initialVisibleItems)

  // Memoize prefetch config to prevent unnecessary recalculations
  const prefetchConfig = React.useMemo(
    () => ({
      lookAhead: hasMoreVideos ? 3 : videosToPrefetch.length, // Prefetch all if ≤10, next 3 if >10
      concurrency: 2,
      enabled: true, // Always enabled - thumbnails need to be prefetched
    }),
    [hasMoreVideos, videosToPrefetch.length]
  )

  // PRIORITY 1: Prefetch thumbnails FIRST - these are what users see immediately
  // Strategy: Prefetch next N items beyond visible items for smooth scrolling
  // Note: Prefetch state logging is now handled inside usePrefetchNextVideos hook
  // to prevent triggering unnecessary re-renders in parent component
  // visibleItemsForPrefetch is memoized above - stable reference prevents cascade
  usePrefetchNextVideos(videosToPrefetch, visibleItemsForPrefetch, prefetchConfig)

  // PRIORITY 2: Prefetch analysis data SECOND - only needed when user taps a video
  // Strategy: Immediate prefetch for top 3, deferred for remaining 7
  const lastVisibleAnalysisIndex = React.useMemo(() => {
    if (visibleItemsForPrefetch.length === 0) {
      return null
    }

    const lastItem = visibleItemsForPrefetch[visibleItemsForPrefetch.length - 1]
    const index = displayedVideos.findIndex((video) => video.id === lastItem.id)
    return index >= 0 ? index : null
  }, [displayedVideos, visibleItemsForPrefetch])

  usePrefetchVideoAnalysis(videoIds, {
    lastVisibleIndex: lastVisibleAnalysisIndex,
  })

  // TanStack Query handles refetch-on-focus automatically via refetchOnFocus: true
  // It respects staleTime (5min), so fresh data won't trigger unnecessary refetches
  // No manual useFocusEffect needed - the library manages focus refetching

  // Log data state changes - CRITICAL FIX: Use ref to track previous state
  // Prevents logging same state repeatedly, reducing effect execution
  const prevDataStateRef = React.useRef({ hasError: false, isEmpty: false, videoCount: 0 })
  React.useEffect(() => {
    // Use isPending to distinguish "waiting for data" from "truly empty"
    // isPending=true when enabled:false (during hydration) OR when no data yet
    // This prevents logging "empty state" during the ~265ms hydration window
    const currentState = {
      hasError: !!error,
      isEmpty: !isPending && videos.length === 0,
      videoCount: videos.length,
    }

    // Only log if state actually changed
    if (
      currentState.hasError !== prevDataStateRef.current.hasError ||
      currentState.isEmpty !== prevDataStateRef.current.isEmpty ||
      currentState.videoCount !== prevDataStateRef.current.videoCount
    ) {
      if (error) {
        log.error('HistoryProgressScreen', 'Failed to load video history', {
          error: error instanceof Error ? error.message : String(error),
        })
      } else if (!isPending && videos.length === 0) {
        log.debug('HistoryProgressScreen', 'No videos available (empty state)')
      } else if (!isPending && videos.length > 0) {
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
      prevDataStateRef.current = currentState
    }
  }, [videos, isLoading, error])

  // Pull-to-refresh state (temporarily disabled)
  // const [refreshing, setRefreshing] = React.useState(false)

  // const handleRefresh = React.useCallback(async () => {
  //   const startTime = Date.now()
  //   log.debug('HistoryProgressScreen', 'Pull-to-refresh initiated')

  //   setRefreshing(true)
  //   try {
  //     await refetch()
  //     const duration = Date.now() - startTime
  //     log.info('HistoryProgressScreen', 'Pull-to-refresh completed', { duration })
  //   } catch (error) {
  //     const duration = Date.now() - startTime
  //     log.error('HistoryProgressScreen', 'Pull-to-refresh failed', {
  //       error: error instanceof Error ? error.message : String(error),
  //       duration,
  //     })
  //   } finally {
  //     setRefreshing(false)
  //   }
  // }, [refetch])

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
  // CRITICAL FIX: Define outside component to prevent allocation on every render
  // Even with useMemo, inline array literal defeats memoization

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
        {...(Platform.OS === 'ios' ? { elevation: 8 } : {})}
        backgroundColor="transparent"
        testID={`${testID}-glass-container`}
      >
        <YStack
          flex={1}
          backgroundColor="transparent"
        >
          {/* Videos Section - Full Width */}
          {/* CRITICAL: Pass isPending (not just isLoading) to handle disabled query state
              isPending=true when enabled:false (during hydration) OR status=pending
              This prevents showing "No videos yet" during ~265ms hydration window */}
          <VideosSection
            videos={displayedVideos}
            onVideoPress={handleVideoPress}
            onSeeAllPress={handleSeeAllPress}
            isLoading={isPending || isLoading}
            error={error}
            onRetry={refetch}
            onVisibleItemsChange={handleVisibleItemsChange}
            testID={`${testID}-videos-section`}
          />

          {/* Coaching Sessions Section - With ScrollView */}
          <CoachingSessionsSection
            sessions={MOCK_COACHING_SESSIONS as SessionItem[]}
            onSessionPress={handleSessionPress}
            testID={`${testID}-coaching-sessions-section`}
          />
        </YStack>
      </YStack>
    </GlassBackground>
  )
})

// Enable why-did-you-render tracking for performance debugging
if (__DEV__) {
  HistoryProgressScreen.whyDidYouRender = true
}
