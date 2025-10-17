import type { IconProps } from '@tamagui/helpers-icon'
import { Check, ChevronDown, ChevronUp } from '@tamagui/lucide-icons'
import type { ComponentType } from 'react'
import {
  Adapt,
  Select,
  Sheet,
  Text,
  XStack,
  type XStackProps,
  YStack,
  type YStackProps,
} from 'tamagui'

export interface SettingsSelectItemOption {
  value: string
  label: string
}

export interface SettingsSelectItemProps extends Omit<XStackProps, 'children'> {
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
  iconBackground: YStackProps['backgroundColor']

  /**
   * Border color for icon container (optional)
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
   * Available options for the select dropdown
   */
  options: SettingsSelectItemOption[]

  /**
   * Current selected value
   */
  value: string

  /**
   * Callback when value changes
   */
  onValueChange: (value: string) => void

  /**
   * Placeholder text when no value is selected
   * @default 'Select...'
   */
  placeholder?: string

  /**
   * Disabled state
   * @default false
   */
  disabled?: boolean

  /**
   * Test ID for testing
   * @default 'settings-select-item'
   */
  testID?: string
}

/**
 * SettingsSelectItem Component
 *
 * Settings list item with icon, text labels, and select dropdown.
 * Mobile-first with 44px touch target and accessible by default.
 *
 * @example
 * ```tsx
 * <SettingsSelectItem
 *   icon={Globe}
 *   iconColor="$blue10"
 *   iconBackground="$blue2"
 *   iconBorder="$blue4"
 *   title="Language"
 *   description="Select your preferred language"
 *   options={[
 *     { value: 'en-US', label: 'English (US)' },
 *     { value: 'es-ES', label: 'Español' }
 *   ]}
 *   value={language}
 *   onValueChange={setLanguage}
 * />
 * ```
 */
export function SettingsSelectItem({
  icon: Icon,
  iconColor,
  iconBackground,
  iconBorder,
  title,
  description,
  options,
  value,
  onValueChange,
  placeholder = 'Select...',
  disabled = false,
  testID = 'settings-select-item',
  ...props
}: SettingsSelectItemProps): React.ReactElement {
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
            color={iconColor as any}
          />
        </YStack>

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

      {/* Right: Select Dropdown */}
      <Select
        value={value}
        onValueChange={onValueChange}
        disablePreventBodyScroll
      >
        {/* @ts-ignore - TS union type complexity limit */}
        <Select.Trigger
          minWidth={140}
          minHeight={44}
          backgroundColor="$color2"
          borderWidth={1}
          borderColor="$color6"
          borderRadius="$3"
          paddingHorizontal="$3"
          paddingVertical="$2"
          iconAfter={<ChevronDown size={16} />}
          disabled={disabled}
          testID="select-trigger"
        >
          <Select.Value placeholder={placeholder} />
        </Select.Trigger>

        <Adapt platform="touch">
          <Sheet
            modal
            dismissOnSnapToBottom
            animation="medium"
          >
            <Sheet.Frame>
              <Sheet.ScrollView>
                <Adapt.Contents />
              </Sheet.ScrollView>
            </Sheet.Frame>
            <Sheet.Overlay
              backgroundColor="$shadowColor"
              animation="lazy"
              enterStyle={{ opacity: 0 }}
              exitStyle={{ opacity: 0 }}
            />
          </Sheet>
        </Adapt>

        <Select.Content zIndex={200000}>
          <Select.ScrollUpButton
            alignItems="center"
            justifyContent="center"
            position="relative"
            width="100%"
            height="$3"
          >
            <YStack zIndex={10}>
              <ChevronUp size={20} />
            </YStack>
          </Select.ScrollUpButton>

          <Select.Viewport minWidth={200}>
            <Select.Group>
              {options.map((option, i) => (
                <Select.Item
                  key={option.value}
                  value={option.value}
                  index={i}
                >
                  <Select.ItemText>{option.label}</Select.ItemText>
                  <Select.ItemIndicator marginLeft="auto">
                    <Check size={16} />
                  </Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.Group>
          </Select.Viewport>

          <Select.ScrollDownButton
            alignItems="center"
            justifyContent="center"
            position="relative"
            width="100%"
            height="$3"
          >
            <YStack zIndex={10}>
              <ChevronDown size={20} />
            </YStack>
          </Select.ScrollDownButton>
        </Select.Content>
      </Select>
    </YStack>
  )
}
