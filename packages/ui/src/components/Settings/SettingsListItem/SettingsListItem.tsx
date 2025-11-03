import { ChevronRight } from '@tamagui/lucide-icons'
import { Button, Text, XStack } from 'tamagui'

export interface SettingsListItemProps {
  /**
   * Display label for the list item
   */
  label: string

  /**
   * Callback when item is pressed
   */
  onPress: () => void

  /**
   * Disabled state
   * @default false
   */
  disabled?: boolean

  /**
   * Test ID for testing
   */
  testID?: string
}

/**
 * SettingsListItem Component
 *
 * Single navigation list item with label and chevron indicator.
 * Mobile-first with 44px touch targets and press feedback.
 *
 * @example
 * ```tsx
 * <SettingsListItem
 *   label="Account"
 *   onPress={() => router.push('/settings/account')}
 * />
 * ```
 */
export function SettingsListItem({
  label,
  onPress,
  disabled = false,
  testID = 'settings-list-item',
}: SettingsListItemProps): React.ReactElement {
  return (
    <Button
      unstyled
      borderRadius="$4"
      paddingVertical="$3"
      paddingHorizontal="$4"
      minHeight={40}
      disabled={disabled}
      onPress={onPress}
      animation="quick"
      pressStyle={{
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        scale: 0.98,
      }}
      hoverStyle={{
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
      }}
      disabledStyle={{
        opacity: 0.5,
      }}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <XStack
        justifyContent="space-between"
        alignItems="center"
        width="100%"
      >
        <Text
          fontSize="$4"
          fontWeight="500"
          color="$color12"
          testID={`${testID}-label`}
        >
          {label}
        </Text>
        {/* Simple chevron using unicode character for better test compatibility */}
        <ChevronRight
          size={20}
          color="$color11"
          testID={`${testID}-chevron`}
        />
      </XStack>
    </Button>
  )
}
