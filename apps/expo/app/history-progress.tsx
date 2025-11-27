import { log } from '@my/logging'
import { GlassBackground, StateDisplay } from '@my/ui'
import { useRouter } from 'expo-router'
import React, { Suspense } from 'react'

// Lazy load HistoryProgressScreen to reduce initial bundle size
// History screen loads video data and thumbnails - defer loading until route is accessed
const LazyHistoryProgressScreen = React.lazy(() =>
  import('@app/features/HistoryProgress/HistoryProgressScreen').then((module) => ({
    default: module.HistoryProgressScreen,
  }))
)

/**
 * History & Progress Tracking Route (Native)
 *
 * Full-screen navigation destination for viewing video analysis history.
 *
 * Route: /history-progress
 * Auth: Protected (requires authentication)
 *
 * Architecture:
 * - Route file injects navigation dependencies via props
 * - Screen component orchestrates hooks and UI components
 * - No business logic in route file
 * - Protected by AuthGate in main app layout
 */
export default function HistoryProgressRoute() {
  const router = useRouter()

  const handleNavigateToVideoAnalysis = (analysisId: number): void => {
    log.info('HistoryProgressRoute', 'Navigate to video analysis', { analysisId })
    router.push({
      pathname: '/video-analysis',
      params: { analysisJobId: analysisId.toString() },
    } as any)
  }

  const handleNavigateToVideos = (): void => {
    log.info('HistoryProgressRoute', 'Navigate to videos screen (P1 feature)')
    // P1: router.push('/videos')
  }

  const handleNavigateToCoachingSession = (sessionId: number): void => {
    log.info('HistoryProgressRoute', 'Navigate to coaching session', { sessionId })
    router.push({
      pathname: '/coaching-session',
      params: { sessionId: sessionId.toString() },
    })
  }

  return (
    <Suspense fallback={<HistoryLoadingFallback />}>
      <LazyHistoryProgressScreen
        onNavigateToVideoAnalysis={handleNavigateToVideoAnalysis}
        onNavigateToVideos={handleNavigateToVideos}
        onNavigateToCoachingSession={handleNavigateToCoachingSession}
      />
    </Suspense>
  )
}

/**
 * Loading fallback for lazy-loaded History screen
 */
function HistoryLoadingFallback() {
  return (
    <GlassBackground
      backgroundColor="$color3"
      testID="history-loading-fallback"
    >
      <StateDisplay
        type="loading"
        title="This too shall pass..."
        testID="history-loading-state"
      />
    </GlassBackground>
  )
}
