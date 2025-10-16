import { AuthenticationSection, GlassBackground, SessionManagementSection } from '@my/ui'
import { useHeaderHeight } from '@react-navigation/elements'
import { useState } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ScrollView, YStack } from 'tamagui'

export interface SecurityScreenProps {
  /**
   * Optional callback for Active Sessions navigation (for testing/dependency injection)
   */
  onActiveSessionsPress?: () => void

  /**
   * Optional callback for Login History navigation (for testing/dependency injection)
   */
  onLoginHistoryPress?: () => void

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
  onActiveSessionsPress,
  onLoginHistoryPress,
  testID = 'security-screen',
}: SecurityScreenProps = {}): React.ReactElement {
  const headerHeight = useHeaderHeight()

  // Local state for security settings (P1: Move to Zustand store)
  const [appLock, setAppLock] = useState(false)
  const [biometricLogin, setBiometricLogin] = useState(true)

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
            paddingTop={headerHeight + 30}
            paddingHorizontal="$4"
            gap="$6"
            paddingBottom="$6"
          >
            <AuthenticationSection
              appLock={appLock}
              onAppLockChange={setAppLock}
              biometricLogin={biometricLogin}
              onBiometricLoginChange={setBiometricLogin}
            />

            <SessionManagementSection
              onActiveSessionsPress={onActiveSessionsPress || (() => {})}
              onLoginHistoryPress={onLoginHistoryPress || (() => {})}
            />
          </YStack>
        </ScrollView>
      </SafeAreaView>
    </GlassBackground>
  )
}
