import { SettingsScreen } from '@my/app/features/Settings'
import { useConfirmDialog } from '@my/app/hooks/useConfirmDialog'
import { useAuthStore } from '@my/app/stores/auth'
import { ConfirmDialog, type FooterLinkType, type SettingsNavItem } from '@my/ui'
import { useRouter } from 'expo-router'
import { AuthGate } from '../components/AuthGate'

// Navigation items configuration for settings
const NAVIGATION_ITEMS: SettingsNavItem[] = [
  { id: 'account', label: 'Account', route: '/settings/account' },
  { id: 'personalisation', label: 'Personalisation', route: '/settings/personalisation' },
  { id: 'give-feedback', label: 'Give feedback', route: '/settings/give-feedback' },
  { id: 'data-controls', label: 'Data controls', route: '/settings/data-controls' },
  { id: 'security', label: 'Security', route: '/settings/security' },
  { id: 'about', label: 'About', route: '/settings/about' },
]

/**
 * Settings Route - Web App
 *
 * Main settings screen with navigation to sub-pages and external links.
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

  const handleFooterLink = (link: FooterLinkType): void => {
    const urls: Record<FooterLinkType, string> = {
      privacy: 'https://sololevel.ai/privacy',
      terms: 'https://sololevel.ai/terms',
      faq: 'https://sololevel.ai/faq',
    }

    console.log('Opening URL:', urls[link])
    // Open in new tab for web
    window.open(urls[link], '_blank', 'noopener,noreferrer')
  }

  return (
    <AuthGate>
      <SettingsScreen
        navigationItems={NAVIGATION_ITEMS}
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
