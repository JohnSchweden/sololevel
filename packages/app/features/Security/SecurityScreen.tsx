import { AuthenticationSection, GlassBackground, SessionManagementSection } from '@my/ui'
import { useHeaderHeight } from '@react-navigation/elements'
import { useNavigation, useRouter } from 'expo-router'
import { useLayoutEffect, useState } from 'react'
import { YStack } from 'tamagui'
import type { NavAppHeaderOptions } from '../../components/navigation'

export interface SecurityScreenProps {
  /**
   * Test ID for testing
   */
  testID?: string
}

/**
 * SecurityScreen Component
 *
 * Security settings screen with authentication and session management options.
 * Following SettingsScreen pattern with GlassBackground and AppHeader configuration.
 *
 * @example
 * ```tsx
 * <SecurityScreen />
 * ```
 */
export function SecurityScreen({
  testID = 'security-screen',
}: SecurityScreenProps = {}): React.ReactElement {
  const navigation = useNavigation()
  const router = useRouter()
  const headerHeight = useHeaderHeight()

  // Local state for security settings (P1: Move to Zustand store)
  const [appLock, setAppLock] = useState(false)
  const [biometricLogin, setBiometricLogin] = useState(true)

  // Configure AppHeader: Back button on left, no right action
  useLayoutEffect(() => {
    navigation.setOptions({
      appHeaderProps: {
        title: 'Security',
        mode: 'default',
        leftAction: 'back',
        rightAction: 'none',
        onBackPress: () => router.back(),
      },
    } as NavAppHeaderOptions)
  }, [navigation, router])

  // Handlers for navigation items
  const handleActiveSessions = () => {
    // P1: Navigate to /settings/security/active-sessions
    // router.push('/settings/security/active-sessions')
  }

  const handleLoginHistory = () => {
    // P1: Navigate to /settings/security/login-history
    // router.push('/settings/security/login-history')
  }

  return (
    <GlassBackground
      backgroundColor="$color3"
      testID={testID}
    >
      <YStack
        flex={1}
        position="relative"
        paddingTop={headerHeight + 30}
        paddingHorizontal="$4"
        marginVertical="$4"
      >
        <AuthenticationSection
          appLock={appLock}
          onAppLockChange={setAppLock}
          biometricLogin={biometricLogin}
          onBiometricLoginChange={setBiometricLogin}
        />

        <SessionManagementSection
          onActiveSessionsPress={handleActiveSessions}
          onLoginHistoryPress={handleLoginHistory}
        />
      </YStack>
    </GlassBackground>
  )
}
