import { log } from '@my/logging'
import { GlassBackground, StateDisplay } from '@my/ui'
import React, { Suspense } from 'react'

// Lazy load SecurityScreen to reduce initial bundle size
// This defers loading SecurityScreen code until route is accessed
const LazySecurityScreen = React.lazy(() =>
  import('@my/app/features/Security').then((module) => ({
    default: module.SecurityScreen,
  }))
)

/**
 * Loading fallback for lazy-loaded Security screen
 */
function SecurityLoadingFallback() {
  return (
    <GlassBackground
      backgroundColor="$color3"
      testID="security-loading-fallback"
    >
      <StateDisplay
        type="loading"
        title="Loading..."
        testID="security-loading-state"
      />
    </GlassBackground>
  )
}

/**
 * Security Settings Route - Mobile App
 *
 * Security settings screen for authentication and session management.
 *
 * Route: /settings/security
 * Auth: Protected (requires authentication)
 *
 * Performance: Uses React.lazy() to defer code loading until route is accessed
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
    <Suspense fallback={<SecurityLoadingFallback />}>
      <LazySecurityScreen
        onActiveSessionsPress={handleActiveSessions}
        onLoginHistoryPress={handleLoginHistory}
      />
    </Suspense>
  )
}
