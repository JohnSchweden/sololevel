import type { IconProps } from '@tamagui/helpers-icon'
import { ChevronRight } from '@tamagui/lucide-icons'
import type { ComponentType, ReactElement } from 'react'
import { Button, Text, XStack, YStack, type YStackProps } from 'tamagui'

export interface SettingsNavigationItemProps {
  /**
   * Icon component from lucide-icons
   */
  icon: ComponentType<IconProps>

  /**
   * Color for the icon
   */
  iconColor: string

  /**
   * Background color for icon container
   */
  iconBackgroundColor: YStackProps['backgroundColor']

  /**
   * Border color for icon container
   */
  iconBorderColor: YStackProps['borderColor']

  /**
   * Primary label text
   */
  title: string

  /**
   * Secondary descriptive text
   */
  subtitle: string

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
 * SettingsNavigationItem Component
 *
 * Rich navigation list item with icon, title, subtitle, and chevron.
 * Features colored icon container with border, two-line text layout,
 * and mobile-first touch interactions.
 *
 * @example
 * ```tsx
 * <SettingsNavigationItem
 *   icon={Smartphone}
 *   iconColor="#C4B5FD"
 *   iconBackgroundColor="rgba(168, 85, 247, 0.2)"
 *   iconBorderColor="rgba(192, 132, 252, 0.3)"
 *   title="Active Sessions"
 *   subtitle="Manage logged in devices"
 *   onPress={() => router.push('/security/sessions')}
 * />
 * ```
 */
export function SettingsNavigationItem({
  icon: Icon,
  iconColor,
  iconBackgroundColor,
  iconBorderColor,
  title,
  subtitle,
  onPress,
  disabled = false,
  testID = 'settings-navigation-item',
}: SettingsNavigationItemProps): ReactElement {
  return (
    <Button
      unstyled
      backgroundColor="transparent"
      borderRadius="$3"
      padding="$4"
      minHeight={56}
      disabled={disabled}
      onPress={onPress}
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
      accessibilityLabel={`${title}, ${subtitle}`}
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
            backgroundColor={iconBackgroundColor}
            borderRadius="$3"
            borderWidth={1}
            borderColor={iconBorderColor}
            justifyContent="center"
            alignItems="center"
            testID={`${testID}-icon-container`}
          >
            <Icon
              size={20}
              color={iconColor as any}
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
              testID={`${testID}-title`}
            >
              {title}
            </Text>
            <Text
              color="$textSecondary"
              fontSize="$3"
              testID={`${testID}-subtitle`}
            >
              {subtitle}
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
  )
}
