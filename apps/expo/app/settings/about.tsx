import { log } from '@my/logging'
import { GlassBackground, StateDisplay } from '@my/ui'
import React, { Suspense } from 'react'
import { Linking } from 'react-native'

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
 * About Route - Expo Native App
 *
 * Displays app information, version, and legal links.
 * Navigates to legal document screens when list items are pressed.
 *
 * Route: /settings/about
 * Auth: Protected (requires authentication)
 *
 * Performance: Uses React.lazy() to defer code loading until route is accessed
 */
export default function AboutRoute() {
  const handlePrivacyPress = async (): Promise<void> => {
    try {
      log.info('AboutRoute', 'Opening Privacy Policy')
      // P1: Replace with actual Privacy Policy URL
      await Linking.openURL('https://sololevel.ai/privacy')
    } catch (error) {
      log.error('AboutRoute', 'Error opening Privacy Policy', { error })
    }
  }

  const handleTermsPress = async (): Promise<void> => {
    try {
      log.info('AboutRoute', 'Opening Terms of Service')
      // P1: Replace with actual Terms URL
      await Linking.openURL('https://sololevel.ai/terms')
    } catch (error) {
      log.error('AboutRoute', 'Error opening Terms of Service', { error })
    }
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
