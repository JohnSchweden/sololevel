import { Fingerprint, Shield } from '@tamagui/lucide-icons'
import { YStack } from 'tamagui'
import { SettingsSectionHeader } from '../../Settings/SettingsSectionHeader'
import { SettingsToggleItem } from '../../Settings/SettingsToggleItem'

export interface AuthenticationSectionProps {
  /**
   * App Lock toggle value
   */
  appLock: boolean

  /**
   * Callback when App Lock toggle changes
   */
  onAppLockChange: (value: boolean) => void

  /**
   * Biometric Login toggle value
   */
  biometricLogin: boolean

  /**
   * Callback when Biometric Login toggle changes
   */
  onBiometricLoginChange: (value: boolean) => void

  /**
   * Test ID for testing
   * @default 'authentication-section'
   */
  testID?: string
}

/**
 * AuthenticationSection Component
 *
 * Security settings section for authentication options including
 * App Lock and Biometric Login toggles.
 *
 * @example
 * ```tsx
 * <AuthenticationSection
 *   appLock={appLock}
 *   onAppLockChange={setAppLock}
 *   biometricLogin={biometricLogin}
 *   onBiometricLoginChange={setBiometricLogin}
 * />
 * ```
 */
export function AuthenticationSection({
  appLock,
  onAppLockChange,
  biometricLogin,
  onBiometricLoginChange,
  testID = 'authentication-section',
}: AuthenticationSectionProps): React.ReactElement {
  return (
    <YStack testID={testID}>
      <SettingsSectionHeader
        icon={Shield}
        title="Authentication"
      />

      <YStack
        gap="$6"
        marginBottom="$8"
      >
        <SettingsToggleItem
          icon={Shield}
          iconColor="#93C5FD"
          iconBackground="rgba(59, 130, 246, 0.2)"
          iconBorder="rgba(96, 165, 250, 0.3)"
          title="App Lock"
          description="Require authentication to open app"
          value={appLock}
          onValueChange={onAppLockChange}
        />

        <SettingsToggleItem
          icon={Fingerprint}
          iconColor="#86EFAC"
          iconBackground="rgba(34, 197, 94, 0.2)"
          iconBorder="rgba(74, 222, 128, 0.3)"
          title="Biometric Login"
          description="Use fingerprint or face recognition"
          value={biometricLogin}
          onValueChange={onBiometricLoginChange}
        />
      </YStack>
    </YStack>
  )
}
