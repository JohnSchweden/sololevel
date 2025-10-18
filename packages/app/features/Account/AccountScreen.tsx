import { useSafeArea } from '@app/provider/safe-area/use-safe-area'
import {
  GlassBackground,
  ProfileSection,
  SettingsNavigationItem,
  SettingsSectionHeader,
  SettingsToggleItem,
} from '@my/ui'
import { Lock, Mail, Shield, Trash2, User as UserIcon } from '@tamagui/lucide-icons'
import type { ReactElement } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ScrollView, YStack } from 'tamagui'
import { useAuthStore } from '../../stores/auth'

export interface AccountScreenProps {
  /**
   * User data (optional - uses auth store if not provided)
   */
  user?: { id: string; name?: string; avatar_url?: string | null } | null

  /**
   * User email address (optional - uses auth store if not provided)
   */
  email?: string

  /**
   * Loading state (optional - uses auth store if not provided)
   */
  isLoading?: boolean

  /**
   * Two-factor authentication enabled state (optional - defaults to false)
   */
  is2FAEnabled?: boolean

  /**
   * Callback when Edit Profile is pressed
   */
  onEditProfile?: () => void

  /**
   * Callback when Change Password is pressed
   */
  onChangePassword?: () => void

  /**
   * Callback when Email Preferences is pressed
   */
  onEmailPreferences?: () => void

  /**
   * Callback when Delete Account is pressed
   */
  onDeleteAccount?: () => void

  /**
   * Callback when 2FA toggle changes
   */
  onToggle2FA?: (enabled: boolean) => void

  /**
   * Test ID for testing
   */
  testID?: string
}

/**
 * AccountScreen Component
 *
 * Display user account settings with profile, security, notifications, and danger zone sections.
 * Mobile-first design with callback props for navigation (no direct routing).
 *
 * @example
 * ```tsx
 * <AccountScreen
 *   user={{ id: '123', name: 'User Name', avatar_url: null }}
 *   email="user@example.com"
 *   isLoading={false}
 *   is2FAEnabled={false}
 *   onEditProfile={() => router.push('/profile/edit')}
 *   onToggle2FA={(enabled) => handleToggle2FA(enabled)}
 * />
 * ```
 */
export function AccountScreen({
  user: userProp,
  email: emailProp,
  isLoading: isLoadingProp,
  is2FAEnabled: is2FAEnabledProp,
  onEditProfile,
  onChangePassword,
  onEmailPreferences,
  onDeleteAccount,
  onToggle2FA,
  testID = 'account-screen',
}: AccountScreenProps): ReactElement {
  const insets = useSafeArea()
  const APP_HEADER_HEIGHT = 44 // Fixed height from AppHeader component

  // Get auth state from store (fallback if props not provided)
  const { user: authUser, loading: authLoading } = useAuthStore()

  // Use props if provided, otherwise fall back to auth store
  const isLoading = isLoadingProp ?? authLoading
  const email = emailProp ?? authUser?.email
  const is2FAEnabled =
    is2FAEnabledProp ?? (authUser?.app_metadata?.['2fa_enabled'] as boolean) ?? false

  // Transform user data for ProfileSection (prefer prop, fallback to auth store)
  const user =
    userProp ??
    (authUser
      ? {
          id: authUser.id,
          name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User',
          avatar_url: authUser.user_metadata?.avatar_url || null,
        }
      : null)

  return (
    <GlassBackground
      backgroundColor="$color3"
      testID={testID}
    >
      <SafeAreaView
        edges={['bottom']}
        style={{ flex: 1 }}
      >
        <ScrollView flex={1}>
          <YStack
            paddingTop={insets.top + APP_HEADER_HEIGHT}
            paddingHorizontal="$4"
            gap="$6"
            paddingBottom="$6"
          >
            <YStack marginBottom="$4">
              <ProfileSection
                user={user}
                email={email}
                isLoading={isLoading}
              />
            </YStack>

            {/* Profile & Security Section */}
            {!isLoading && (
              <YStack marginBottom="$4">
                <SettingsSectionHeader
                  title="Profile & Security"
                  icon={UserIcon}
                />

                <YStack gap="$4">
                  {/* Edit Profile */}
                  <SettingsNavigationItem
                    icon={UserIcon}
                    iconColor="$blue10"
                    iconBackgroundColor="$blue2"
                    iconBorderColor="$blue4"
                    title="Edit Profile"
                    subtitle="Update your personal information"
                    onPress={() => onEditProfile?.()}
                  />

                  {/* Change Password */}
                  <SettingsNavigationItem
                    icon={Lock}
                    iconColor="$green10"
                    iconBackgroundColor="$green2"
                    iconBorderColor="$green4"
                    title="Change Password"
                    subtitle="Update your account password"
                    onPress={() => onChangePassword?.()}
                  />

                  {/* Two-Factor Authentication Toggle */}
                  <SettingsToggleItem
                    icon={Shield}
                    iconColor="$purple10"
                    iconBackground="$purple2"
                    iconBorder="$purple4"
                    title="Two-Factor Authentication"
                    description="Add extra security to your account"
                    value={is2FAEnabled}
                    onValueChange={(enabled) => onToggle2FA?.(enabled)}
                  />
                </YStack>
              </YStack>
            )}

            {/* Notifications Section */}
            {!isLoading && (
              <YStack marginBottom="$4">
                <SettingsSectionHeader
                  title="Notifications"
                  icon={Mail}
                />

                <SettingsNavigationItem
                  icon={Mail}
                  iconColor="$orange10"
                  iconBackgroundColor="$orange2"
                  iconBorderColor="$orange4"
                  title="Email Preferences"
                  subtitle="Manage your email notifications"
                  onPress={() => onEmailPreferences?.()}
                />
              </YStack>
            )}

            {/* Danger Zone Section */}
            {!isLoading && (
              <YStack marginBottom="$4">
                <SettingsSectionHeader
                  title="Danger Zone"
                  icon={Trash2}
                />

                <SettingsNavigationItem
                  icon={Trash2}
                  iconColor="$red10"
                  iconBackgroundColor="$red2"
                  iconBorderColor="$red4"
                  title="Delete Account"
                  subtitle="Permanently delete your account"
                  onPress={() => onDeleteAccount?.()}
                />
              </YStack>
            )}
          </YStack>
        </ScrollView>
      </SafeAreaView>
    </GlassBackground>
  )
}
