import type { IconProps } from '@tamagui/helpers-icon'
import type { ComponentType } from 'react'
import { Label, RadioGroup, Text, XStack, YStack, type YStackProps } from 'tamagui'

export type ThemeValue = 'light' | 'dark' | 'auto'

export interface SettingsRadioGroupProps extends Omit<YStackProps, 'children'> {
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
   * @deprecated No longer used - icons no longer have background
   */
  iconBackground?: YStackProps['backgroundColor']

  /**
   * Border color for icon container (optional)
   * @deprecated No longer used - icons no longer have background
   */
  iconBorder?: YStackProps['borderColor']

  /**
   * Primary title text
   */
  title: string

  /**
   * Secondary description text
   */
  description: string

  /**
   * Current theme value
   */
  value: ThemeValue

  /**
   * Callback when theme value changes
   */
  onValueChange: (value: ThemeValue) => void

  /**
   * Test ID for testing
   * @default 'settings-radio-group'
   */
  testID?: string
}

/**
 * SettingsRadioGroup Component
 *
 * Radio group for theme selection with Light/Dark/Auto options.
 * Follows mobile-first design with 44px touch targets and glass morphism styling.
 *
 * @example
 * ```tsx
 * <SettingsRadioGroup
 *   icon={Palette}
 *   iconColor="$blue10"
 *   iconBackground="$blue2"
 *   iconBorder="$blue4"
 *   title="Appearance"
 *   description="Choose your preferred theme"
 *   value="light"
 *   onValueChange={(value) => console.log(value)}
 * />
 * ```
 */
export function SettingsRadioGroup({
  icon: Icon,
  iconColor,
  iconBackground: _iconBackground,
  iconBorder: _iconBorder,
  title,
  description,
  value,
  onValueChange,
  testID = 'settings-radio-group',
  ...props
}: SettingsRadioGroupProps): React.ReactElement {
  const handleChange = (newValue: string) => {
    if (newValue === 'light' || newValue === 'dark' || newValue === 'auto') {
      onValueChange(newValue as ThemeValue)
    }
  }

  const renderOption = (optionValue: ThemeValue, labelText: string, id: string) => {
    const isSelected = value === optionValue

    return (
      <XStack
        key={optionValue}
        alignItems="center"
        justifyContent="center"
        minHeight={44}
        flex={1}
        paddingHorizontal="$4"
        paddingVertical="$2"
        backgroundColor={isSelected ? '$color8' : '$color2'}
        borderWidth={1}
        borderColor={isSelected ? '$color8' : '$color6'}
        borderRadius="$4"
        // pressStyle={{ scale: 0.98 }}
        // hoverStyle={{ backgroundColor: '$color7' }}
        gap="$2"
      >
        <RadioGroup.Item
          value={optionValue}
          id={id}
          size="$4"
        >
          <RadioGroup.Indicator />
        </RadioGroup.Item>

        <Label
          htmlFor={id}
          color={isSelected ? '$color12' : '$color11'}
          fontSize="$4"
          fontWeight={isSelected ? '600' : '400'}
        >
          {labelText}
        </Label>
      </XStack>
    )
  }

  return (
    <YStack
      alignItems="center"
      justifyContent="space-between"
      padding="$4"
      gap="$4"
      minHeight={44}
      testID={testID}
      {...props}
    >
      {/* Top: Icon + Text */}
      <XStack
        alignItems="center"
        gap="$4"
        width="100%"
      >
        {/* Icon */}
        <Icon
          size={28}
          color={iconColor as any}
        />

        {/* Text Labels */}
        <YStack
          gap="$1"
          flex={1}
        >
          <Text
            color="$color12"
            fontSize="$5"
            fontWeight="400"
          >
            {title}
          </Text>
          <Text
            color="$color11"
            fontSize="$3"
          >
            {description}
          </Text>
        </YStack>
      </XStack>

      {/* Bottom: Radio Options */}
      <RadioGroup
        value={value}
        onValueChange={handleChange}
        width="100%"
      >
        <XStack
          gap="$2"
          flexWrap="wrap"
          width="100%"
        >
          {renderOption('light', 'Light', 'theme-light')}
          {renderOption('dark', 'Dark', 'theme-dark')}
          {renderOption('auto', 'Auto', 'theme-auto')}
        </XStack>
      </RadioGroup>
    </YStack>
  )
}
