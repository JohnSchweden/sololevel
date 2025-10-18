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
  const { user, loading: isLoadingUser } = useAuthStore()
  const insets = useSafeArea()
  const APP_HEADER_HEIGHT = 44 // Fixed height from AppHeader component

  // Handlers
  const handleNavigate = (route: string): void => {
    if (onNavigate) {
      onNavigate(route)
    } else {
      log.info('SettingsScreen', 'Navigate to', { route })
    }
  }

  const handleFooterLink = (link: FooterLinkType): void => {
    if (onFooterLink) {
      onFooterLink(link)
    } else {
      log.info('SettingsScreen', 'Open link', { link })
    }
  }

  const handleLogout = (): void => {
    if (onLogout) {
      // Route handler will show confirmation dialog and handle signOut
      onLogout()
    } else {
      log.info('SettingsScreen', 'Logout requested (no handler)')
    }
  }

  // Profile data from authenticated user
  // Uses user_metadata for name and avatar (populated during sign-up)
  const profileUser = user
    ? {
        id: user.id,
        name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
        avatar_url: user.user_metadata?.avatar_url || null,
      }
    : null

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
