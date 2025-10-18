import { HistoryProgressScreen } from '@app/features/HistoryProgress/HistoryProgressScreen'
import { log } from '@my/logging'
import { useRouter } from 'expo-router'

/**
 * History & Progress Tracking Route (Web)
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

  return (
    <HistoryProgressScreen
      onNavigateToVideoAnalysis={handleNavigateToVideoAnalysis}
      onNavigateToVideos={handleNavigateToVideos}
    />
  )
}
