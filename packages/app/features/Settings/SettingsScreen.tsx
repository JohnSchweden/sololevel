import { useCurrentUser } from '@app/hooks/useUser'
import { useStableSafeArea } from '@app/provider/safe-area/use-safe-area'
import { log } from '@my/logging'
import {
  type FooterLinkType,
  GlassBackground,
  LogOutButton,
  ProfileSection,
  SettingsFooter,
  type SettingsNavItem,
  SettingsNavigationList,
} from '@my/ui'
import { useCallback, useMemo } from 'react'
import { type ViewStyle } from 'react-native'
import { View } from 'react-native'
import { YStack } from 'tamagui'
import { useAuthStore } from '../../stores/auth'

// Static styles - defined outside component to avoid recreation on each render
const containerStyle: ViewStyle = { flex: 1 }
const APP_HEADER_HEIGHT = 44

export interface SettingsScreenProps {
  /**
   * Navigation items for settings categories (required)
   */
  navigationItems: SettingsNavItem[]

  /**
   * Callback for navigation (required)
   */
  onNavigate: (route: string) => void

  /**
   * Optional callback for footer links (for testing/dependency injection)
   */
  onFooterLink?: (link: FooterLinkType) => void

  /**
   * Optional callback for logout (for testing/dependency injection)
   */
  onLogout?: () => void

  /**
   * Test ID for testing
   */
  testID?: string
}

/**
 * SettingsScreen Component
 *
 * Main settings orchestrator screen following the wireframe design.
 * Displays:
 * - Profile section (avatar + name)
 * - Navigation list (6 settings categories)
 * - Log out button
 * - Footer links (Privacy, Terms, FAQ)
 *
 * Mobile-first responsive design with GlassBackground.
 *
 * @example
 * ```tsx
 * <SettingsScreen />
 * ```
 */
export function SettingsScreen({
  navigationItems,
  onNavigate,
  onFooterLink,
  onLogout,
  testID = 'settings-screen',
}: SettingsScreenProps): React.ReactElement {
  // Use separate selectors to prevent infinite loops (object selectors create new references)
  const user = useAuthStore((state) => state.user)
  const isLoadingUser = useAuthStore((state) => state.loading)
  const { data: profile, isLoading: isLoadingProfile } = useCurrentUser()
  const insets = useStableSafeArea()

  // Combined loading state: show skeleton until BOTH auth AND profile are ready
  // Prevents layout shift when profile fetch is delayed after auth completes
  const isLoading = isLoadingUser || isLoadingProfile

  const bottomSectionStyle = useMemo(
    () => ({ position: 'absolute' as const, bottom: insets.bottom, left: 0, right: 0 }),
    [insets.bottom]
  )

  // Handlers - memoized to prevent child re-renders
  const handleNavigate = useCallback(
    (route: string): void => {
      onNavigate(route)
    },
    [onNavigate]
  )

  const handleFooterLink = useCallback(
    (link: FooterLinkType): void => {
      if (onFooterLink) onFooterLink(link)
      else log.info('SettingsScreen', 'Open link', { link })
    },
    [onFooterLink]
  )

  const handleLogout = useCallback((): void => {
    if (onLogout) onLogout()
    else log.info('SettingsScreen', 'Logout requested (no handler)')
  }, [onLogout])

  // Profile data with fallback chain: profile → user_metadata → email prefix → 'User'
  const profileUser = useMemo(
    () =>
      user
        ? {
            id: user.id,
            name:
              profile?.username ||
              profile?.full_name ||
              user.user_metadata?.full_name ||
              user.email?.split('@')[0] ||
              'User',
            avatar_url: profile?.avatar_url || user.user_metadata?.avatar_url || null,
          }
        : null,
    [user, profile]
  )

  return (
    <GlassBackground
      backgroundColor="$color3"
      testID={testID}
    >
      <View style={containerStyle}>
        <YStack
          flex={1}
          paddingTop={insets.top + APP_HEADER_HEIGHT}
          paddingHorizontal="$4"
          gap="$6"
          paddingBottom="$6"
        >
          <YStack
            gap="$6"
            flex={1}
          >
            {/* Profile Section */}
            <ProfileSection
              user={profileUser}
              isLoading={isLoading}
            />

            {/* Navigation List */}
            <SettingsNavigationList
              items={navigationItems}
              onNavigate={handleNavigate}
            />
          </YStack>
        </YStack>

        {/* Bottom section positioned relative to container */}
        <YStack
          gap="$4"
          paddingHorizontal="$4"
          marginHorizontal="$4"
          style={bottomSectionStyle}
        >
          {/* Log Out Button */}
          <LogOutButton
            onPress={handleLogout}
            isLoading={false} // P1: Track logout loading state
          />

          {/* Footer Links */}
          <SettingsFooter onLinkPress={handleFooterLink} />
        </YStack>
      </View>
    </GlassBackground>
  )
}
