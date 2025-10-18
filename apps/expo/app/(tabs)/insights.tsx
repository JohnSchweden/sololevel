import { InsightsScreen } from '@app/features/Insights'
import { useRouter } from 'expo-router'
import { AuthGate } from '../../components/AuthGate'

/**
 * Insights Tab - Performance insights and progress tracking
 *
 * Route: /(tabs)/insights
 * Auth: Protected (requires authentication)
 */
export default function InsightsTab() {
  const router = useRouter()

  return (
    <AuthGate>
      <InsightsScreen onNavigateToHistory={() => router.push('/history-progress')} />
    </AuthGate>
  )
}
