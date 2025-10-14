import { SettingsScreen } from '@my/app/features/Settings'
import { useConfirmDialog } from '@my/app/hooks/useConfirmDialog'
import { useAuthStore } from '@my/app/stores/auth'
import { log } from '@my/logging'
import { ConfirmDialog, type FooterLinkType } from '@my/ui'
import { useRouter } from 'expo-router'
import { Linking } from 'react-native'
import { AuthGate } from '../components/AuthGate'

/**
 * Settings Route - Mobile App
 *
 * Main settings screen with navigation to sub-pages and external links.
 *
 * Route: /settings
 * Auth: Protected (requires authentication)
 */
export default function SettingsRoute() {
  const router = useRouter()
  const { signOut } = useAuthStore()

  // Logout confirmation dialog
  const logoutDialog = useConfirmDialog(async () => {
    await signOut()
    // Navigate to camera screen (index) instead of login
    // If test auth is disabled, AuthGate will redirect to sign-in
    // If test auth is enabled, auto-sign-in will happen and user stays on camera
    router.replace('/')
  })

  const handleNavigate = (route: string): void => {
    router.push(route as any)
  }

  const handleFooterLink = async (link: FooterLinkType): Promise<void> => {
    const urls: Record<FooterLinkType, string> = {
      privacy: 'https://sololevel.ai/privacy',
      terms: 'https://sololevel.ai/terms',
      faq: 'https://sololevel.ai/faq',
    }

    try {
      log.info('SettingsRoute', 'Opening URL', { link, url: urls[link] })
      await Linking.openURL(urls[link])
    } catch (error) {
      log.error('SettingsRoute', 'Error opening URL', { link, url: urls[link], error })
    }
  }

  return (
    <AuthGate>
      <SettingsScreen
        onNavigate={handleNavigate}
        onFooterLink={handleFooterLink}
        onLogout={logoutDialog.show}
      />

      <ConfirmDialog
        visible={logoutDialog.isVisible}
        title="Log out"
        message="Are you sure you want to log out?"
        confirmLabel="Log out"
        cancelLabel="Cancel"
        isProcessing={logoutDialog.isProcessing}
        onConfirm={logoutDialog.confirm}
        onCancel={logoutDialog.hide}
      />
    </AuthGate>
  )
}
