import { log } from '@my/logging'
import { GlassBackground, StateDisplay } from '@my/ui'
import React, { Suspense } from 'react'

// Lazy load AboutScreen to reduce initial bundle size
// This defers loading AboutScreen code until route is accessed
const LazyAboutScreen = React.lazy(() =>
  import('@my/app/features/About').then((module) => ({
    default: module.AboutScreen,
  }))
)

/**
 * Loading fallback for lazy-loaded About screen
 */
function AboutLoadingFallback() {
  return (
    <GlassBackground
      backgroundColor="$color3"
      testID="about-loading-fallback"
    >
      <StateDisplay
        type="loading"
        title="Loading..."
        testID="about-loading-state"
      />
    </GlassBackground>
  )
}

/**
 * About Route - Web App
 *
 * Displays app information, version, and legal links.
 * Opens external links in new tabs for legal documents.
 *
 * Route: /settings/about
 * Auth: Protected (requires authentication)
 *
 * Performance: Uses React.lazy() to defer code loading until route is accessed
 */
export default function AboutRoute() {
  const handlePrivacyPress = (): void => {
    log.info('AboutRoute', 'Opening Privacy Policy')
    // P1: Replace with actual Privacy Policy URL
    window.open('https://sololevel.ai/privacy', '_blank', 'noopener,noreferrer')
  }

  const handleTermsPress = (): void => {
    log.info('AboutRoute', 'Opening Terms of Service')
    // P1: Replace with actual Terms URL
    window.open('https://sololevel.ai/terms', '_blank', 'noopener,noreferrer')
  }

  const handleLicensesPress = (): void => {
    log.info('AboutRoute', 'Navigate to Licenses')
    // P1: Implement navigation to Licenses screen
    // router.push('/settings/licenses')
  }

  return (
    <Suspense fallback={<AboutLoadingFallback />}>
      <LazyAboutScreen
        onPrivacyPress={handlePrivacyPress}
        onTermsPress={handleTermsPress}
        onLicensesPress={handleLicensesPress}
      />
    </Suspense>
  )
}
