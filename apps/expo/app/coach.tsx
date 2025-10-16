import { CoachScreen } from '@my/app/features/Coach'
import { log } from '@my/logging'
import { useRouter } from 'expo-router'
import { AuthGate } from '../components/AuthGate'

/**
 * Coach Route - Mobile App
 *
 * AI coaching chat interface with message history and suggestions.
 *
 * Route: /coach
 * Auth: Protected (requires authentication)
 */
export default function CoachRoute() {
  const router = useRouter()

  const handleNavigateToSettings = (): void => {
    log.info('CoachRoute', 'Navigating to personalisation settings')
    router.push('/settings/personalisation' as any)
  }

  return (
    <AuthGate>
      <CoachScreen onNavigateToSettings={handleNavigateToSettings} />
    </AuthGate>
  )
}
