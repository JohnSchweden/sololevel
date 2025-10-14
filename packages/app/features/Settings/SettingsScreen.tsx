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
import { useHeaderHeight } from '@react-navigation/elements'
import { useNavigation, useRouter } from 'expo-router'
import { useLayoutEffect } from 'react'
import { YStack } from 'tamagui'
import type { NavAppHeaderOptions } from '../../components/navigation'
import { useAuthStore } from '../../stores/auth'

export interface SettingsScreenProps {
  /**
   * Optional callback for navigation (for testing/dependency injection)
   */
  onNavigate?: (route: string) => void

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
  onNavigate,
  onFooterLink,
  onLogout,
  testID = 'settings-screen',
}: SettingsScreenProps = {}): React.ReactElement {
  // Hooks: Auth state and header height
  const { user, loading: isLoadingUser } = useAuthStore()
  const headerHeight = useHeaderHeight()
  const navigation = useNavigation()
  const router = useRouter()

  // Configure AppHeader: Back button on left, no right action
  useLayoutEffect(() => {
    navigation.setOptions({
      appHeaderProps: {
        title: 'Settings',
        mode: 'default',
        leftAction: 'back',
        rightAction: 'none', // No profile icon on settings screen
        onBackPress: () => router.back(),
      },
    } as NavAppHeaderOptions)
  }, [navigation, router])

  // Navigation items for settings categories
  const navigationItems: SettingsNavItem[] = [
    { id: 'account', label: 'Account', route: '/settings/account' },
    { id: 'personalisation', label: 'Personalisation', route: '/settings/personalisation' },
    { id: 'feedback', label: 'Give feedback', route: '/settings/feedback' },
    { id: 'data-controls', label: 'Data controls', route: '/settings/data-controls' },
    { id: 'security', label: 'Security', route: '/settings/security' },
    { id: 'about', label: 'About', route: '/settings/about' },
  ]

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
      <YStack
        flex={1}
        position="relative"
        paddingTop={headerHeight}
        paddingHorizontal="$4"
        marginVertical="$4"
        paddingBottom={140}
        overflow="hidden"
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
    </GlassBackground>
  )
}
