import { log } from '@my/logging'
import { GlassBackground, StateDisplay } from '@my/ui'
import React, { Suspense } from 'react'

// Lazy load DataControlsScreen to reduce initial bundle size
// This defers loading DataControlsScreen code until route is accessed
const LazyDataControlsScreen = React.lazy(() =>
  import('@my/app/features/DataControls').then((module) => ({
    default: module.DataControlsScreen,
  }))
)

/**
 * Loading fallback for lazy-loaded Data Controls screen
 */
function DataControlsLoadingFallback() {
  return (
    <GlassBackground
      backgroundColor="$color3"
      testID="data-controls-loading-fallback"
    >
      <StateDisplay
        type="loading"
        title="Loading..."
        testID="data-controls-loading-state"
      />
    </GlassBackground>
  )
}

/**
 * Data Controls Settings Route - Mobile App
 *
 * Data controls settings screen for managing data sharing, export, and deletion.
 *
 * Route: /settings/data-controls
 * Auth: Protected (requires authentication)
 *
 * Performance: Uses React.lazy() to defer code loading until route is accessed
 */
export default function DataControlsRoute() {
  const handleDataExport = (): void => {
    log.info('DataControlsRoute', 'Navigate to Data Export')
    // P1: Implement data export flow
    // const router = useRouter()
    // router.push('/settings/data-controls/export')
  }

  const handleClearAllData = (): void => {
    log.info('DataControlsRoute', 'Clear All Data requested')
    // P1: Show confirmation dialog then trigger deletion
    // showConfirmationDialog({ ... })
  }

  return (
    <Suspense fallback={<DataControlsLoadingFallback />}>
      <LazyDataControlsScreen
        onDataExport={handleDataExport}
        onClearAllData={handleClearAllData}
      />
    </Suspense>
  )
}
