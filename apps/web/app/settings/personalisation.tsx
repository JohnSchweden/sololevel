import { GlassBackground, StateDisplay } from '@my/ui'
import React, { Suspense } from 'react'

// Lazy load PersonalisationScreen to reduce initial bundle size
// This defers loading PersonalisationScreen code until route is accessed
const LazyPersonalisationScreen = React.lazy(() =>
  import('@my/app/features/Personalisation').then((module) => ({
    default: module.PersonalisationScreen,
  }))
)

/**
 * Loading fallback for lazy-loaded Personalisation screen
 */
function PersonalisationLoadingFallback() {
  return (
    <GlassBackground
      backgroundColor="$color3"
      testID="personalisation-loading-fallback"
    >
      <StateDisplay
        type="loading"
        title="Loading..."
        testID="personalisation-loading-state"
      />
    </GlassBackground>
  )
}

/**
 * Personalisation Settings Route (Web)
 *
 * Renders the PersonalisationScreen with authentication protection.
 *
 * Route: /settings/personalisation
 * Auth: Protected (requires authentication)
 *
 * Performance: Uses React.lazy() to defer code loading until route is accessed
 */
export default function PersonalisationRoute() {
  return (
    <Suspense fallback={<PersonalisationLoadingFallback />}>
      <LazyPersonalisationScreen />
    </Suspense>
  )
}
