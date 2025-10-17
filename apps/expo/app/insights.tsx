import { InsightsScreen } from '@app/features/Insights'
import { useRouter } from 'expo-router'
import { AuthGate } from '../components/AuthGate'

/**
 * Insights Route - Mobile App
 *
 * Performance insights, achievements, and progress tracking screen.
 *
 * Route: /insights
 * Auth: Protected (requires authentication)
 *
 * **Navigation Pattern (Battle-Tested):**
 * - Route provides callback implementations
 * - Screen receives callbacks as props (framework-agnostic)
 * - Uses AuthGate wrapper for route protection
 */
export default function InsightsRoute() {
  const router = useRouter()

  const handleBack = (): void => {
    router.back()
  }

  return (
    <AuthGate>
      <InsightsScreen onBack={handleBack} />
    </AuthGate>
  )
}
