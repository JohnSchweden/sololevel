import { GlassBackground, StateDisplay } from '@my/ui'
import React, { Suspense } from 'react'

// Lazy load Insights screen to reduce initial bundle size
// This defers loading InsightsScreen code until tab is accessed
const LazyInsightsScreen = React.lazy(() =>
  import('@app/features/Insights').then((module) => ({
    default: module.InsightsScreen,
  }))
)

/**
 * Loading fallback for lazy-loaded Insights screen
 */
function InsightsLoadingFallback() {
  return (
    <GlassBackground
      backgroundColor="$color3"
      testID="insights-loading-fallback"
    >
      <StateDisplay
        type="loading"
        title="This too shall pass..."
        testID="insights-loading-state"
      />
    </GlassBackground>
  )
}

/**
 * Insights Tab - Performance insights and progress tracking
 *
 * Route: /(tabs)/insights
 * Auth: Protected (requires authentication)
 *
 * Navigation configured in _layout.tsx via Tabs.Screen options
 *
 * Performance: Uses React.lazy() to defer code loading until tab is accessed
 */
export default function InsightsTab() {
  return (
    <Suspense fallback={<InsightsLoadingFallback />}>
      <LazyInsightsScreen />
    </Suspense>
  )
}
