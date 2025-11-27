import { GlassBackground, StateDisplay } from '@my/ui'
import { useRouter } from 'expo-router'
import React, { Suspense } from 'react'

// Lazy load GiveFeedbackScreen to reduce initial bundle size
// This defers loading GiveFeedbackScreen code until route is accessed
const LazyGiveFeedbackScreen = React.lazy(() =>
  import('@my/app/features/GiveFeedback').then((module) => ({
    default: module.GiveFeedbackScreen,
  }))
)

/**
 * Loading fallback for lazy-loaded Give Feedback screen
 */
function GiveFeedbackLoadingFallback() {
  return (
    <GlassBackground
      backgroundColor="$color3"
      testID="give-feedback-loading-fallback"
    >
      <StateDisplay
        type="loading"
        title="Loading..."
        testID="give-feedback-loading-state"
      />
    </GlassBackground>
  )
}

/**
 * Give Feedback Route (Native)
 *
 * Screen for users to submit feedback about the app.
 *
 * Performance: Uses React.lazy() to defer code loading until route is accessed
 */
export default function GiveFeedbackRoute() {
  const router = useRouter()

  const handleSuccess = (): void => {
    // TODO: Show success toast
    router.back()
  }

  return (
    <Suspense fallback={<GiveFeedbackLoadingFallback />}>
      <LazyGiveFeedbackScreen onSuccess={handleSuccess} />
    </Suspense>
  )
}
