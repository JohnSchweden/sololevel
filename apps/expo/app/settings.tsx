import { SettingsScreen } from '@my/app/features/Settings'
import { useConfirmDialog } from '@my/app/hooks/useConfirmDialog'
import { useRenderDiagnostics } from '@my/app/hooks/useRenderDiagnostics'
import { useAuthStore } from '@my/app/stores/auth'
import { log } from '@my/logging'
import { ConfirmDialog, type FooterLinkType, type SettingsNavItem } from '@my/ui'
import { useRouter } from 'expo-router'
import { useCallback, useRef } from 'react'
import { Linking } from 'react-native'

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
 * Settings Route - Mobile App
 *
 * Main settings screen with navigation to sub-pages and external links.
 *
 * Route: /settings
 * Auth: Protected (requires authentication)
 */
export default function SettingsRoute() {
  const router = useRouter()
  // Use selective subscription to prevent re-renders on unrelated store changes
  const signOut = useAuthStore((state) => state.signOut)

  // Stabilize router reference to prevent callback recreation
  const routerRef = useRef(router)
  routerRef.current = router

  // Logout confirmation dialog
  // Memoize onConfirm callback with stable refs to prevent useConfirmDialog from recreating handlers
  const onLogoutConfirm = useCallback(async () => {
    await signOut()
    // Navigate to camera screen (index) instead of login
    // If test auth is disabled, AuthGate (in main layout) will redirect to sign-in
    // If test auth is enabled, auto-sign-in will happen and user stays on camera
    routerRef.current.replace('/')
  }, [signOut]) // Remove router from deps, use ref instead
  const logoutDialog = useConfirmDialog(onLogoutConfirm)

  // Extract stable show handler - logoutDialog.show is stable but accessing via
  // logoutDialog object causes re-renders when dialog state changes
  // Use ref to capture stable function reference
  const showLogoutDialogRef = useRef(logoutDialog.show)
  showLogoutDialogRef.current = logoutDialog.show
  const handleLogout = useCallback(() => {
    showLogoutDialogRef.current()
  }, [])

  // Memoize handlers to prevent SettingsScreen re-renders
  // Use router ref to avoid dependency on potentially changing router object
  const handleNavigate = useCallback(
    (route: string): void => {
      routerRef.current.push(route as any)
    },
    [] // No deps - router ref is stable
  )

  const handleFooterLink = useCallback(async (link: FooterLinkType): Promise<void> => {
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
  }, [])

  // Track what's changing in SettingsRoute (exclude logoutDialog - it changes on dialog state but doesn't affect SettingsScreen props)
  useRenderDiagnostics(
    'SettingsRoute',
    { handleNavigate, handleFooterLink, handleLogout, signOut },
    {
      logToConsole: __DEV__,
      logOnlyChanges: true,
    }
  )

  return (
    <>
      <SettingsScreen
        navigationItems={NAVIGATION_ITEMS}
        onNavigate={handleNavigate}
        onFooterLink={handleFooterLink}
        onLogout={handleLogout}
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
    </>
  )
}
