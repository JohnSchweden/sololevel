import { ChevronRight, Clock, Smartphone } from '@tamagui/lucide-icons'
import { Button, Text, XStack, YStack } from 'tamagui'
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
        {/* Active Sessions Navigation Item */}
        <Button
          unstyled
          backgroundColor="transparent"
          borderRadius="$3"
          padding="$4"
          minHeight={56}
          onPress={onActiveSessionsPress}
          pressStyle={{
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            scale: 0.98,
          }}
          hoverStyle={{
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
          }}
        >
          <XStack
            alignItems="center"
            justifyContent="space-between"
            width="100%"
          >
            <XStack
              alignItems="center"
              gap="$4"
              flex={1}
            >
              {/* Icon Container */}
              <YStack
                width={40}
                height={40}
                backgroundColor="rgba(168, 85, 247, 0.2)"
                borderRadius="$3"
                borderWidth={1}
                borderColor="rgba(192, 132, 252, 0.3)"
                justifyContent="center"
                alignItems="center"
              >
                <Smartphone
                  size={20}
                  color="#C4B5FD"
                />
              </YStack>

              {/* Text Labels */}
              <YStack
                gap="$1"
                flex={1}
              >
                <Text
                  color="$text"
                  fontSize="$5"
                  fontWeight="400"
                >
                  Active Sessions
                </Text>
                <Text
                  color="$textSecondary"
                  fontSize="$3"
                >
                  Manage logged in devices
                </Text>
              </YStack>
            </XStack>

            {/* Chevron */}
            <ChevronRight
              size={20}
              color="$color11"
            />
          </XStack>
        </Button>

        {/* Login History Navigation Item */}
        <Button
          unstyled
          backgroundColor="transparent"
          borderRadius="$3"
          padding="$4"
          minHeight={56}
          onPress={onLoginHistoryPress}
          pressStyle={{
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            scale: 0.98,
          }}
          hoverStyle={{
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
          }}
        >
          <XStack
            alignItems="center"
            justifyContent="space-between"
            width="100%"
          >
            <XStack
              alignItems="center"
              gap="$4"
              flex={1}
            >
              {/* Icon Container */}
              <YStack
                width={40}
                height={40}
                backgroundColor="rgba(249, 115, 22, 0.2)"
                borderRadius="$3"
                borderWidth={1}
                borderColor="rgba(251, 146, 60, 0.3)"
                justifyContent="center"
                alignItems="center"
              >
                <Clock
                  size={20}
                  color="#FDB87F"
                />
              </YStack>

              {/* Text Labels */}
              <YStack
                gap="$1"
                flex={1}
              >
                <Text
                  color="$text"
                  fontSize="$5"
                  fontWeight="400"
                >
                  Login History
                </Text>
                <Text
                  color="$textSecondary"
                  fontSize="$3"
                >
                  View recent login attempts
                </Text>
              </YStack>
            </XStack>

            {/* Chevron */}
            <ChevronRight
              size={20}
              color="$color11"
            />
          </XStack>
        </Button>
      </YStack>
    </YStack>
  )
}
