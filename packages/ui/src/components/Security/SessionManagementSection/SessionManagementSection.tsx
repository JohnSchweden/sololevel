import { Clock, Smartphone } from '@tamagui/lucide-icons'
import { YStack } from 'tamagui'
import { SettingsNavigationItem } from '../../Settings/SettingsNavigationItem'
import { SettingsSectionHeader } from '../../Settings/SettingsSectionHeader'

export interface SessionManagementSectionProps {
  /**
   * Callback when Active Sessions is pressed
   */
  onActiveSessionsPress: () => void

  /**
   * Callback when Login History is pressed
   */
  onLoginHistoryPress: () => void

  /**
   * Test ID for testing
   * @default 'session-management-section'
   */
  testID?: string
}

/**
 * SessionManagementSection Component
 *
 * Security settings section for session management with navigation
 * to Active Sessions and Login History screens.
 *
 * @example
 * ```tsx
 * <SessionManagementSection
 *   onActiveSessionsPress={() => router.push('/settings/security/active-sessions')}
 *   onLoginHistoryPress={() => router.push('/settings/security/login-history')}
 * />
 * ```
 */
export function SessionManagementSection({
  onActiveSessionsPress,
  onLoginHistoryPress,
  testID = 'session-management-section',
}: SessionManagementSectionProps): React.ReactElement {
  return (
    <YStack testID={testID}>
      <SettingsSectionHeader
        icon={Smartphone}
        title="Session Management"
      />

      <YStack
        gap="$4"
        marginBottom="$8"
      >
        <SettingsNavigationItem
          icon={Smartphone}
          iconColor="#C4B5FD"
          title="Active Sessions"
          subtitle="Manage logged in devices"
          onPress={onActiveSessionsPress}
          testID="active-sessions-item"
        />

        <SettingsNavigationItem
          icon={Clock}
          iconColor="#FDB87F"
          title="Login History"
          subtitle="View recent login attempts"
          onPress={onLoginHistoryPress}
          testID="login-history-item"
        />
      </YStack>
    </YStack>
  )
}
