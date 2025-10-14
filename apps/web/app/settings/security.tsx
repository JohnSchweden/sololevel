import { SecurityScreen } from '@my/app/features/Security'
import { AuthGate } from '../../components/AuthGate'

/**
 * Security Settings Route - Web App
 *
 * Security settings screen for authentication and session management.
 *
 * Route: /settings/security
 * Auth: Protected (requires authentication)
 */
export default function SecurityRoute() {
  return (
    <AuthGate>
      <SecurityScreen />
    </AuthGate>
  )
}
