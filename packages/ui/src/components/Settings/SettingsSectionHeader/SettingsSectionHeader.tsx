import type { IconProps } from '@tamagui/helpers-icon'
import type { FunctionComponent } from 'react'
import { Text, XStack, type XStackProps, YStack } from 'tamagui'

export type SettingsSectionHeaderVariant =
  | 'line'
  | 'spacing'
  | 'pill'
  | 'accent'
  | 'icon-bg'
  | 'typography'

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

  /**
   * Visual style variant
   * - 'line': Bottom border (default)
   * - 'spacing': No line, increased spacing
   * - 'pill': Background pill container
   * - 'accent': Left accent bar
   * - 'icon-bg': Icon with background container
   * - 'typography': Emphasized text styling
   * @default 'line'
   */
  variant?: SettingsSectionHeaderVariant

  /**
   * Border width applied to the bottom divider (only for 'line' variant)
   * @default 1
   */
  borderBottomWidth?: number
}

/**
 * SettingsSectionHeader Component
 *
 * Section header for settings screens with icon and title.
 * Supports multiple visual variants for different styling approaches.
 *
 * @example
 * ```tsx
 * <SettingsSectionHeader
 *   title="Authentication"
 *   icon={Shield}
 *   variant="pill"
 * />
 * ```
 */
export function SettingsSectionHeader({
  title,
  icon: Icon,
  testID = 'settings-section-header',
  variant = 'line',
  borderBottomWidth = 0.5,
  ...props
}: SettingsSectionHeaderProps): React.ReactElement {
  const baseStyles: Partial<XStackProps> = {
    alignItems: 'center',
    gap: '$2',
    paddingBottom: '$2',
    paddingTop: '$2',
    //paddingHorizontal: '$4',
    marginBottom: '$2',
    marginHorizontal: '$4',
  }

  switch (variant) {
    case 'spacing': {
      return (
        <XStack
          {...baseStyles}
          marginBottom="$4"
          testID={testID}
          {...props}
        >
          {/* <Icon
            size={16}
            color="$color11"
          /> */}
          <Text
            color="$color11"
            fontSize="$4"
          >
            {title}
          </Text>
        </XStack>
      )
    }

    case 'pill': {
      return (
        <XStack
          {...baseStyles}
          backgroundColor="rgba(255, 255, 255, 0.05)"
          borderRadius="$10"
          paddingHorizontal="$3"
          paddingVertical="$2"
          marginBottom="$3"
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
            fontWeight="500"
          >
            {title}
          </Text>
        </XStack>
      )
    }

    case 'accent': {
      return (
        <XStack
          {...baseStyles}
          gap="$3"
          testID={testID}
          {...props}
        >
          <YStack
            width={3}
            height={16}
            backgroundColor="$color11"
            borderRadius="$1"
          />
          <Icon
            size={16}
            color="$color11"
          />
          <Text
            color="$color11"
            fontSize="$4"
            fontWeight="500"
          >
            {title}
          </Text>
        </XStack>
      )
    }

    case 'icon-bg': {
      return (
        <XStack
          {...baseStyles}
          gap="$3"
          testID={testID}
          {...props}
        >
          <XStack
            backgroundColor="rgba(255, 255, 255, 0.08)"
            borderRadius="$2"
            padding="$1.5"
            alignItems="center"
            justifyContent="center"
          >
            <Icon
              size={14}
              color="$color11"
            />
          </XStack>
          <Text
            color="$color11"
            fontSize="$4"
            fontWeight="500"
          >
            {title}
          </Text>
        </XStack>
      )
    }

    case 'typography': {
      return (
        <XStack
          {...baseStyles}
          marginBottom="$3"
          testID={testID}
          {...props}
        >
          <Icon
            size={18}
            color="$color12"
          />
          <Text
            color="$color12"
            fontSize="$5"
            fontWeight="600"
            letterSpacing={0.5}
            textTransform="uppercase"
          >
            {title}
          </Text>
        </XStack>
      )
    }

    default: {
      return (
        <XStack
          {...baseStyles}
          borderBottomWidth={borderBottomWidth}
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
  }
}
