import type { IconProps } from '@tamagui/helpers-icon'
import type { ComponentType } from 'react'
import { Label, RadioGroup, Text, XStack, YStack, type YStackProps } from 'tamagui'

export type ThemeValue = 'light' | 'dark' | 'auto'

/**
 * Radio option with value and label
 */
export interface RadioOption {
  value: string
  label: string
  /**
   * Optional description text shown below label (when present, layout switches to vertical)
   */
  description?: string
}

/**
 * Default theme options for backward compatibility
 */
const DEFAULT_THEME_OPTIONS: RadioOption[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'auto', label: 'Auto' },
]

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
   * Radio options to display
   * @default DEFAULT_THEME_OPTIONS (Light/Dark/Auto)
   */
  options?: RadioOption[]

  /**
   * Current value (must match one of the option values)
   */
  value: string

  /**
   * Callback when value changes
   */
  onValueChange: (value: string) => void

  /**
   * Test ID for testing
   * @default 'settings-radio-group'
   */
  testID?: string
}

/**
 * SettingsRadioGroup Component
 *
 * Generic radio group for settings with customizable options.
 * Follows mobile-first design with 44px touch targets and glass morphism styling.
 *
 * @example
 * ```tsx
 * // Theme selection (uses default options)
 * <SettingsRadioGroup
 *   icon={Palette}
 *   iconColor="$blue10"
 *   title="Appearance"
 *   description="Choose your preferred theme"
 *   value="light"
 *   onValueChange={(value) => console.log(value)}
 * />
 *
 * // Custom options
 * <SettingsRadioGroup
 *   icon={User}
 *   iconColor="$blue10"
 *   title="Voice Gender"
 *   description="Male or female coach voice"
 *   value="female"
 *   onValueChange={(value) => console.log(value)}
 *   options={[
 *     { value: 'female', label: 'Female' },
 *     { value: 'male', label: 'Male' },
 *   ]}
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
  options = DEFAULT_THEME_OPTIONS,
  value,
  onValueChange,
  testID = 'settings-radio-group',
  ...props
}: SettingsRadioGroupProps): React.ReactElement {
  const handleChange = (newValue: string) => {
    // Only call onValueChange if the value is valid
    const isValidOption = options.some((opt) => opt.value === newValue)
    if (isValidOption) {
      onValueChange(newValue)
    }
  }

  const renderOption = (option: RadioOption) => {
    const isSelected = value === option.value
    const id = `${testID}-${option.value}`
    const hasDescription = Boolean(option.description)

    return (
      <Label
        key={option.value}
        htmlFor={id}
        asChild
      >
        <XStack
          alignItems="center"
          justifyContent={hasDescription ? 'flex-start' : 'center'}
          minHeight={44}
          flex={hasDescription ? undefined : 1}
          width={hasDescription ? '100%' : undefined}
          paddingHorizontal="$4"
          paddingVertical={hasDescription ? '$3' : '$2'}
          backgroundColor={isSelected ? '$color8' : '$color2'}
          //borderWidth={1}
          borderColor={isSelected ? '$color8' : '$color6'}
          borderRadius="$4"
          gap="$3"
          cursor="pointer"
          pressStyle={{ opacity: 0.8 }}
          hoverStyle={{ opacity: 0.9 }}
          testID={id}
        >
          <RadioGroup.Item
            value={option.value}
            id={id}
            size="$4"
          >
            <RadioGroup.Indicator />
          </RadioGroup.Item>

          {hasDescription ? (
            <YStack
              flex={1}
              //paddingTop="$2"
              paddingBottom="$1.5"
              gap="$0"
              pointerEvents="none"
            >
              <Text
                color={isSelected ? '$color12' : '$color11'}
                fontSize="$5"
                fontWeight={isSelected ? '600' : '400'}
                lineHeight="$1"
              >
                {option.label}
              </Text>
              <Text
                color={isSelected ? '$color11' : '$color10'}
                fontSize="$3"
                lineHeight="$1"
                marginTop="$-0.5"
              >
                {option.description}
              </Text>
            </YStack>
          ) : (
            <Text
              color={isSelected ? '$color12' : '$color11'}
              fontSize="$4"
              fontWeight={isSelected ? '600' : '400'}
              pointerEvents="none"
            >
              {option.label}
            </Text>
          )}
        </XStack>
      </Label>
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
        {options.some((opt) => opt.description) ? (
          <YStack
            gap="$0"
            width="100%"
          >
            {options.map((option) => renderOption(option))}
          </YStack>
        ) : (
          <XStack
            gap="$2"
            flexWrap="wrap"
            width="100%"
          >
            {options.map((option) => renderOption(option))}
          </XStack>
        )}
      </RadioGroup>
    </YStack>
  )
}
