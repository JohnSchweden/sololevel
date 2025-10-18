import { SecurityScreen } from '@my/app/features/Security'
import { log } from '@my/logging'

/**
 * Security Settings Route - Mobile App
 *
 * Security settings screen for authentication and session management.
 *
 * Route: /settings/security
 * Auth: Protected (requires authentication)
 */
export default function SecurityRoute() {
  const handleActiveSessions = (): void => {
    log.info('SecurityRoute', 'Navigate to Active Sessions')
    // P1: Implement navigation to active sessions screen
    // const router = useRouter()
    // router.push('/settings/security/active-sessions')
  }

  const handleLoginHistory = (): void => {
    log.info('SecurityRoute', 'Navigate to Login History')
    // P1: Implement navigation to login history screen
    // const router = useRouter()
    // router.push('/settings/security/login-history')
  }

  return (
    <SecurityScreen
      onActiveSessionsPress={handleActiveSessions}
      onLoginHistoryPress={handleLoginHistory}
    />
  )
}
