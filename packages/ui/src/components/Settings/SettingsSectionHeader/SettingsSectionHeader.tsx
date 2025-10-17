import type { IconProps } from '@tamagui/helpers-icon'
import type { FunctionComponent } from 'react'
import { Text, XStack, type XStackProps } from 'tamagui'

export interface SettingsSectionHeaderProps extends Omit<XStackProps, 'children'> {
  /**
   * Section title text
   */
  title: string

  /**
   * Icon component from lucide-react-native or @tamagui/lucide-icons
   */
  icon: FunctionComponent<IconProps>

  /**
   * Test ID for testing
   * @default 'settings-section-header'
   */
  testID?: string
}

/**
 * SettingsSectionHeader Component
 *
 * Section header for settings screens with icon and title.
 * Includes bottom border for visual separation.
 *
 * @example
 * ```tsx
 * <SettingsSectionHeader
 *   title="Authentication"
 *   icon={Shield}
 * />
 * ```
 */
export function SettingsSectionHeader({
  title,
  icon: Icon,
  testID = 'settings-section-header',
  ...props
}: SettingsSectionHeaderProps): React.ReactElement {
  return (
    <XStack
      alignItems="center"
      gap="$2"
      paddingBottom="$2"
      marginBottom="$6"
      borderBottomWidth={1}
      borderColor="$borderColor"
      testID={testID}
      {...props}
    >
      <Icon
        size={16}
        color="$color11"
      />
      <Text
        color="$color11"
        fontSize="$4"
      >
        {title}
      </Text>
    </XStack>
  )
}
