import { useAuth } from '@app/hooks/useAuth'
import { GlassBackground, StateDisplay } from '@my/ui'
import { useNavigation, useRouter } from 'expo-router'
import React, { Suspense, useLayoutEffect } from 'react'

// Lazy load AccountScreen to reduce initial bundle size
// This defers loading AccountScreen code until route is accessed
const LazyAccountScreen = React.lazy(() =>
  import('@app/features/Account').then((module) => ({
    default: module.AccountScreen,
  }))
)

/**
 * Loading fallback for lazy-loaded Account screen
 */
function AccountLoadingFallback() {
  return (
    <GlassBackground
      backgroundColor="$color3"
      testID="account-loading-fallback"
    >
      <StateDisplay
        type="loading"
        title="Loading..."
        testID="account-loading-state"
      />
    </GlassBackground>
  )
}

/**
 * Account Settings Route (Native)
 *
 * Handles navigation for Account screen with platform-specific routing.
 * Protected route - requires authentication via AuthGate in main layout.
 *
 * Performance: Uses React.lazy() to defer code loading until route is accessed
 */
export default function AccountSettingsRoute() {
  const router = useRouter()
  const navigation = useNavigation()

  // Get real auth data
  const { user, loading } = useAuth()
  const email = user?.email
  const is2FAEnabled = user?.app_metadata?.['2fa_enabled'] ?? false

  // Configure AppHeader via navigation options
  useLayoutEffect(() => {
    navigation.setOptions({
      appHeaderProps: {
        title: 'Account',
        leftAction: 'back',
        rightAction: 'none',
        onBackPress: () => router.back(),
      },
    })
  }, [navigation, router])

  // Navigation handlers (platform-specific)
  const handleEditProfile = () => {
    // TODO: Implement edit profile navigation
    // router.push('/settings/account/edit-profile')
    console.log('[Account] Edit Profile pressed')
  }

  const handleChangePassword = () => {
    // TODO: Implement change password navigation
    // router.push('/settings/account/change-password')
    console.log('[Account] Change Password pressed')
  }

  const handleEmailPreferences = () => {
    // TODO: Implement email preferences navigation
    // router.push('/settings/account/email-preferences')
    console.log('[Account] Email Preferences pressed')
  }

  const handleDeleteAccount = () => {
    // TODO: Implement delete account flow with confirmation dialog
    console.log('[Account] Delete Account pressed')
  }

  const handleToggle2FA = (enabled: boolean) => {
    // TODO: Implement 2FA toggle logic
    console.log('[Account] 2FA toggled:', enabled)
  }

  return (
    <Suspense fallback={<AccountLoadingFallback />}>
      <LazyAccountScreen
        user={user}
        email={email}
        isLoading={loading}
        is2FAEnabled={is2FAEnabled}
        onEditProfile={handleEditProfile}
        onChangePassword={handleChangePassword}
        onEmailPreferences={handleEmailPreferences}
        onDeleteAccount={handleDeleteAccount}
        onToggle2FA={handleToggle2FA}
      />
    </Suspense>
  )
}
