import { useCurrentUser } from '@app/hooks/useUser'
import { useStableSafeArea } from '@app/provider/safe-area/use-safe-area'
import {
  GlassBackground,
  ProfileSection,
  SettingsNavigationItem,
  SettingsSectionHeader,
  SettingsToggleItem,
} from '@my/ui'
import { Lock, Mail, Shield, Trash2, User as UserIcon } from '@tamagui/lucide-icons'
import type { ReactElement } from 'react'
import { useMemo } from 'react'
import { View, type ViewStyle } from 'react-native'
import { ScrollView, YStack } from 'tamagui'
import { useAuthStore } from '../../stores/auth'

// Static styles - defined outside component to avoid recreation on each render
const containerStyle: ViewStyle = { flex: 1 }
const APP_HEADER_HEIGHT = 44 // Fixed height from AppHeader component

export interface AccountScreenProps {
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
 *   is2FAEnabled={false}
 *   onEditProfile={() => router.push('/profile/edit')}
 *   onToggle2FA={(enabled) => handleToggle2FA(enabled)}
 * />
 * ```
 */
export function AccountScreen({
  is2FAEnabled: is2FAEnabledProp,
  onEditProfile,
  onChangePassword,
  onEmailPreferences,
  onDeleteAccount,
  onToggle2FA,
  testID = 'account-screen',
}: AccountScreenProps): ReactElement {
  // Use stable safe area hook that properly memoizes insets
  const insets = useStableSafeArea()

  // Use separate selectors to prevent infinite loops (object selectors create new references)
  const authUser = useAuthStore((state) => state.user)
  const isLoadingUser = useAuthStore((state) => state.loading)
  const { data: profile, isLoading: isLoadingProfile } = useCurrentUser()

  // Combined loading state: show skeleton until BOTH auth AND profile are ready
  const isLoading = isLoadingUser || isLoadingProfile
  const email = authUser?.email
  const is2FAEnabled =
    is2FAEnabledProp ?? (authUser?.app_metadata?.['2fa_enabled'] as boolean) ?? false

  // Profile data with fallback chain: profile → user_metadata → email prefix → 'User'
  const profileUser = useMemo(
    () =>
      authUser
        ? {
            id: authUser.id,
            name:
              profile?.username ||
              profile?.full_name ||
              authUser.user_metadata?.full_name ||
              authUser.email?.split('@')[0] ||
              'User',
            avatar_url: profile?.avatar_url || authUser.user_metadata?.avatar_url || null,
          }
        : null,
    [authUser, profile]
  )

  return (
    <GlassBackground
      backgroundColor="$color3"
      testID={testID}
    >
      <View style={containerStyle}>
        <ScrollView flex={1}>
          <YStack
            paddingTop={insets.top + APP_HEADER_HEIGHT}
            paddingHorizontal="$4"
            gap="$6"
            paddingBottom={insets.bottom + 24}
          >
            <YStack marginBottom="$4">
              <ProfileSection
                user={profileUser}
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
      </View>
    </GlassBackground>
  )
}
