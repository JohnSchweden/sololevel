import { AboutScreen } from '@my/app/features/About'
import { log } from '@my/logging'

/**
 * About Route - Web App
 *
 * Displays app information, version, and legal links.
 * Opens external links in new tabs for legal documents.
 *
 * Route: /settings/about
 * Auth: Protected (requires authentication)
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
    <AboutScreen
      onPrivacyPress={handlePrivacyPress}
      onTermsPress={handleTermsPress}
      onLicensesPress={handleLicensesPress}
    />
  )
}
