import { PersonalisationScreen } from '@my/app/features/Personalisation'
import { log } from '@my/logging'
import { useRouter } from 'expo-router'
import { AuthGate } from '../../components/AuthGate'

/**
 * Personalisation Settings Route (Web)
 *
 * Renders the PersonalisationScreen with authentication protection.
 * Navigation handlers are defined here for logging and testability.
 *
 * Route: /settings/personalisation
 * Auth: Protected (requires authentication)
 */
export default function PersonalisationRoute() {
  const router = useRouter()

  const handleBack = (): void => {
    log.info('PersonalisationRoute', 'Navigate back from Personalisation')
    router.back()
  }

  return (
    <AuthGate>
      <PersonalisationScreen onBack={handleBack} />
    </AuthGate>
  )
}
