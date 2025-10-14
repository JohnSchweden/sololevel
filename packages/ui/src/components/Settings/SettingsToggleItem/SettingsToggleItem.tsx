import type { IconProps } from '@tamagui/helpers-icon'
import type { FunctionComponent } from 'react'
import { Switch, Text, XStack, type XStackProps, YStack } from 'tamagui'

export interface SettingsToggleItemProps extends Omit<XStackProps, 'children'> {
  /**
   * Icon component from lucide-react-native or @tamagui/lucide-icons
   */
  icon: FunctionComponent<IconProps>

  /**
   * Icon color token or hex color
   * @example '$blue10' or '#93C5FD'
   */
  iconColor: string | any

  /**
   * Icon container background color token or rgba color
   * @example '$blue2' or 'rgba(59, 130, 246, 0.2)'
   */
  iconBackground: string | any

  /**
   * Icon container border color token or rgba color (optional)
   * @example '$blue4' or 'rgba(96, 165, 250, 0.3)'
   */
  iconBorder?: string | any

  /**
   * Primary title text
   */
  title: string

  /**
   * Secondary description text
   */
  description: string

  /**
   * Current toggle value
   */
  value: boolean

  /**
   * Callback when toggle value changes
   */
  onValueChange: (value: boolean) => void

  /**
   * Disabled state
   * @default false
   */
  disabled?: boolean

  /**
   * Test ID for testing
   * @default 'settings-toggle-item'
   */
  testID?: string
}

/**
 * SettingsToggleItem Component
 *
 * Settings list item with icon, text labels, and toggle switch.
 * Mobile-first with 44px touch target and accessible by default.
 *
 * @example
 * ```tsx
 * <SettingsToggleItem
 *   icon={Shield}
 *   iconColor="$blue10"
 *   iconBackground="$blue2"
 *   iconBorder="$blue4"
 *   title="App Lock"
 *   description="Require authentication to open app"
 *   value={isLocked}
 *   onValueChange={setIsLocked}
 * />
 * ```
 */
export function SettingsToggleItem({
  icon: Icon,
  iconColor,
  iconBackground,
  iconBorder,
  title,
  description,
  value,
  onValueChange,
  disabled = false,
  testID = 'settings-toggle-item',
  ...props
}: SettingsToggleItemProps): React.ReactElement {
  return (
    <XStack
      alignItems="center"
      justifyContent="space-between"
      padding="$4"
      gap="$4"
      minHeight={44}
      testID={testID}
      {...props}
    >
      {/* Left: Icon + Text */}
      <XStack
        alignItems="center"
        gap="$4"
        flex={1}
      >
        {/* Icon Container */}
        <YStack
          width={40}
          height={40}
          backgroundColor={iconBackground}
          borderRadius="$3"
          borderWidth={iconBorder ? 1 : 0}
          borderColor={iconBorder}
          justifyContent="center"
          alignItems="center"
        >
          <Icon
            size={20}
            color={iconColor}
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
            {title}
          </Text>
          <Text
            color="$textSecondary"
            fontSize="$3"
          >
            {description}
          </Text>
        </YStack>
      </XStack>

      {/* Right: Switch */}
      <Switch
        size="$4"
        checked={value}
        onCheckedChange={onValueChange}
        disabled={disabled}
        accessibilityLabel={title}
        accessibilityHint={description}
        backgroundColor={value ? '$green9' : '$gray6'}
        borderColor={value ? '$green10' : '$gray7'}
        borderWidth={1}
      >
        {/* @ts-ignore - Switch.Thumb may not be available in test environment */}
        {Switch.Thumb && (
          <Switch.Thumb
            animation="quick"
            backgroundColor="$white1"
          />
        )}
      </Switch>
    </XStack>
  )
}
