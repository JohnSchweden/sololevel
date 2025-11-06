import { useSafeArea } from '@app/provider/safe-area/use-safe-area'
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
import { SafeAreaView } from 'react-native-safe-area-context'
import { YStack } from 'tamagui'
import { useAuthStore } from '../../stores/auth'

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
  // Hooks: Auth state and header height
  // Use separate selectors to prevent infinite loops (object selectors create new references)
  const user = useAuthStore((state) => state.user)
  const isLoadingUser = useAuthStore((state) => state.loading)
  const insets = useSafeArea()
  const APP_HEADER_HEIGHT = 44 // Fixed height from AppHeader component

  // Handlers - memoized to prevent child re-renders
  const handleNavigate = useCallback(
    (route: string): void => {
      if (onNavigate) {
        onNavigate(route)
      } else {
        log.info('SettingsScreen', 'Navigate to', { route })
      }
    },
    [onNavigate]
  )

  const handleFooterLink = useCallback(
    (link: FooterLinkType): void => {
      if (onFooterLink) {
        onFooterLink(link)
      } else {
        log.info('SettingsScreen', 'Open link', { link })
      }
    },
    [onFooterLink]
  )

  const handleLogout = useCallback((): void => {
    if (onLogout) {
      // Route handler will show confirmation dialog and handle signOut
      onLogout()
    } else {
      log.info('SettingsScreen', 'Logout requested (no handler)')
    }
  }, [onLogout])

  // Profile data from authenticated user
  // Uses user_metadata for name and avatar (populated during sign-up)
  // Memoized to prevent ProfileSection re-renders when user object reference is stable
  const profileUser = useMemo(
    () =>
      user
        ? {
            id: user.id,
            name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
            avatar_url: user.user_metadata?.avatar_url || null,
          }
        : null,
    [user]
  )

  return (
    <GlassBackground
      backgroundColor="$color3"
      testID={testID}
    >
      <SafeAreaView
        edges={['bottom']}
        style={{ flex: 1 }}
      >
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
              isLoading={isLoadingUser}
            />

            {/* Navigation List */}
            <SettingsNavigationList
              items={navigationItems}
              onNavigate={handleNavigate}
            />
          </YStack>
        </YStack>

        {/* Bottom section positioned relative to SafeAreaView, not container */}
        <YStack
          gap="$6"
          position="absolute"
          bottom={insets.bottom + 0} // paddingBottom="$6" = 24px + safe area bottom
          left="$0"
          right="$0"
        >
          {/* Log Out Button */}
          <LogOutButton
            onPress={handleLogout}
            isLoading={false} // P1: Track logout loading state
          />

          {/* Footer Links */}
          <SettingsFooter onLinkPress={handleFooterLink} />
        </YStack>
      </SafeAreaView>
    </GlassBackground>
  )
}
