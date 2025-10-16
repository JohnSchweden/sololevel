import { PersonalisationScreen } from '@my/app/features/Personalisation'
import { AuthGate } from '../../components/AuthGate'

/**
 * Personalisation Settings Route (Expo/Native)
 *
 * Renders the PersonalisationScreen with authentication protection.
 *
 * Route: /settings/personalisation
 * Auth: Protected (requires authentication)
 */
export default function PersonalisationRoute() {
  return (
    <AuthGate>
      <PersonalisationScreen />
    </AuthGate>
  )
}
