import { HistoryProgressScreen } from '@app/features/HistoryProgress/HistoryProgressScreen'
import { useRouter } from 'expo-router'
import { AuthGate } from '../components/AuthGate'

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
 * - AuthGate wrapper protects route from unauthenticated access
 */
export default function HistoryProgressRoute() {
  const router = useRouter()

  return (
    <AuthGate>
      <HistoryProgressScreen
        onNavigateToVideoAnalysis={(analysisId) => {
          // Type assertion for dynamic route
          router.push(`/video-analysis/${analysisId}` as any)
        }}
        onNavigateToVideos={() => {
          // P0: Console log placeholder
          console.log('Navigate to /videos screen (P1 feature)')
          // P1: router.push('/videos')
        }}
        onBack={() => {
          router.back()
        }}
      />
    </AuthGate>
  )
}
