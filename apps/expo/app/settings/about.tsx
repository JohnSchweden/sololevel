import { AboutScreen } from '@my/app/features/About'
import { log } from '@my/logging'
import { Linking } from 'react-native'

/**
 * About Route - Expo Native App
 *
 * Displays app information, version, and legal links.
 * Navigates to legal document screens when list items are pressed.
 *
 * Route: /settings/about
 * Auth: Protected (requires authentication)
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
    <AboutScreen
      onPrivacyPress={handlePrivacyPress}
      onTermsPress={handleTermsPress}
      onLicensesPress={handleLicensesPress}
    />
  )
}
