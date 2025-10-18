import { CoachScreen } from '@app/features/Coach'
import { log } from '@my/logging'
import { useRouter } from 'expo-router'
import { AuthGate } from '../../components/AuthGate'

/**
 * Coach Tab - AI coaching chat interface
 *
 * Route: /(tabs)/coach
 * Auth: Protected (requires authentication)
 */
export default function CoachTab() {
  const router = useRouter()

  const handleNavigateToSettings = (): void => {
    log.info('CoachTab', 'Navigating to personalisation settings')
    router.push('/settings/personalisation' as any)
  }

  const handleNavigateToHistory = (): void => {
    log.info('CoachTab', 'Navigating to history-progress')
    router.push('/history-progress')
  }

  return (
    <AuthGate>
      <CoachScreen
        onNavigateToSettings={handleNavigateToSettings}
        onNavigateToHistory={handleNavigateToHistory}
      />
    </AuthGate>
  )
}
