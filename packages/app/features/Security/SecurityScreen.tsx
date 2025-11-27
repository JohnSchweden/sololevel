import { useStableSafeArea } from '@app/provider/safe-area/use-safe-area'
import { AuthenticationSection, GlassBackground, SessionManagementSection } from '@my/ui'
import { useState } from 'react'
import { View } from 'react-native'
import { ScrollView, YStack } from 'tamagui'

// Module-level constants for stable identity
const NOOP = (): void => {}
const CONTAINER_STYLE = { flex: 1 as const }

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
  // Use stable safe area hook that properly memoizes insets
  const insets = useStableSafeArea()
  const APP_HEADER_HEIGHT = 44 // Fixed height from AppHeader component

  // Local state for security settings (P1: Move to Zustand store)
  const [appLock, setAppLock] = useState(false)
  const [biometricLogin, setBiometricLogin] = useState(true)

  return (
    <GlassBackground
      backgroundColor="$color3"
      testID={testID}
    >
      <View style={CONTAINER_STYLE}>
        <ScrollView flex={1}>
          <YStack
            paddingTop={insets.top + APP_HEADER_HEIGHT + 20}
            paddingHorizontal="$4"
            gap="$0"
            paddingBottom={insets.bottom + 24}
          >
            <AuthenticationSection
              appLock={appLock}
              onAppLockChange={setAppLock}
              biometricLogin={biometricLogin}
              onBiometricLoginChange={setBiometricLogin}
            />

            <SessionManagementSection
              onActiveSessionsPress={onActiveSessionsPress || NOOP}
              onLoginHistoryPress={onLoginHistoryPress || NOOP}
            />
          </YStack>
        </ScrollView>
      </View>
    </GlassBackground>
  )
}
