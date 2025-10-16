import { AccountScreen } from '@app/features/Account'
import { useAuth } from '@app/hooks/useAuth'
import { useRouter } from 'expo-router'
import { AuthGate } from '../../components/AuthGate'

/**
 * Account Settings Route (Web)
 *
 * Handles navigation for Account screen with web-specific routing.
 * Protected route - requires authentication via AuthGate.
 */
export default function AccountSettingsRoute() {
  const router = useRouter()

  // Get real auth data
  const { user, loading } = useAuth()
  const email = user?.email
  const is2FAEnabled = user?.app_metadata?.['2fa_enabled'] ?? false

  // Navigation handlers (web-specific)
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
    <AuthGate>
      <AccountScreen
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
    </AuthGate>
  )
}
