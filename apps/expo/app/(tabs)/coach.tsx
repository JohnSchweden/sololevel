import { GlassBackground, StateDisplay } from '@my/ui'
import React, { Suspense } from 'react'

// Lazy load Coach screen to reduce initial bundle size
// This defers loading CoachScreen code until tab is accessed
const LazyCoachScreen = React.lazy(() =>
  import('@app/features/Coach').then((module) => ({
    default: module.CoachScreen,
  }))
)

/**
 * Loading fallback for lazy-loaded Coach screen
 */
function CoachLoadingFallback() {
  return (
    <GlassBackground
      backgroundColor="$color3"
      testID="coach-loading-fallback"
    >
      <StateDisplay
        type="loading"
        title="This too shall pass..."
        testID="coach-loading-state"
      />
    </GlassBackground>
  )
}

/**
 * Coach Tab - AI coaching chat interface
 *
 * Route: /(tabs)/coach
 * Auth: Protected (requires authentication)
 *
 * Navigation configured in _layout.tsx via Tabs.Screen options
 *
 * Performance: Uses React.lazy() to defer code loading until tab is accessed
 */
export default function CoachTab() {
  return (
    <Suspense fallback={<CoachLoadingFallback />}>
      <LazyCoachScreen />
    </Suspense>
  )
}
