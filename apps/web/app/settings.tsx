import { useConfirmDialog } from '@my/app/hooks/useConfirmDialog'
import { useAuthStore } from '@my/app/stores/auth'
import {
  ConfirmDialog,
  type FooterLinkType,
  GlassBackground,
  type SettingsNavItem,
  StateDisplay,
} from '@my/ui'
import { useRouter } from 'expo-router'
import React, { Suspense, useCallback, useRef } from 'react'

// Lazy load SettingsScreen to reduce initial bundle size
// This defers loading SettingsScreen code until route is accessed
const LazySettingsScreen = React.lazy(() =>
  import('@my/app/features/Settings').then((module) => ({
    default: module.SettingsScreen,
  }))
)

/**
 * Loading fallback for lazy-loaded Settings screen
 */
function SettingsLoadingFallback() {
  return (
    <GlassBackground
      backgroundColor="$color3"
      testID="settings-loading-fallback"
    >
      <StateDisplay
        type="loading"
        title="Loading..."
        testID="settings-loading-state"
      />
    </GlassBackground>
  )
}

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
 *
 * Performance: Uses React.lazy() to defer code loading until route is accessed
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

  const handleFooterLink = useCallback((link: FooterLinkType): void => {
    const urls: Record<FooterLinkType, string> = {
      privacy: 'https://sololevel.ai/privacy',
      terms: 'https://sololevel.ai/terms',
      faq: 'https://sololevel.ai/faq',
    }

    console.log('Opening URL:', urls[link])
    // Open in new tab for web
    window.open(urls[link], '_blank', 'noopener,noreferrer')
  }, [])

  return (
    <>
      <Suspense fallback={<SettingsLoadingFallback />}>
        <LazySettingsScreen
          navigationItems={NAVIGATION_ITEMS}
          onNavigate={handleNavigate}
          onFooterLink={handleFooterLink}
          onLogout={handleLogout}
        />
      </Suspense>

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
