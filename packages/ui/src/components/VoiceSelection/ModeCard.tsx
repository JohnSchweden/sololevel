import { memo } from 'react'
import { Label, RadioGroup, Text, XStack, YStack } from 'tamagui'

export interface ModeCardProps {
  /**
   * Unique identifier for this mode option
   */
  id: string

  /**
   * Mode value
   */
  value: string

  /**
   * Display label
   */
  label: string

  /**
   * Description text
   */
  description: string

  /**
   * Whether this card is currently selected
   */
  isSelected: boolean

  /**
   * Whether to show the humoristic badge
   * @default false
   */
  isHumoristic?: boolean

  /**
   * Test ID for testing
   */
  testID?: string
}

/**
 * ModeCard Component
 *
 * Single card for mode selection with title, description, and optional badge.
 * Mobile-first with 44px touch targets and glass morphism styling.
 *
 * @example
 * ```tsx
 * <ModeCard
 *   id="mode-roast"
 *   value="roast"
 *   label="Roast:Me ⭐"
 *   description="Brutal honesty with a side of humor"
 *   isSelected={true}
 *   isHumoristic={true}
 * />
 * ```
 */
export const ModeCard = memo(function ModeCard({
  id,
  value,
  label,
  description,
  isSelected,
  isHumoristic = false,
  testID,
}: ModeCardProps): React.ReactElement {
  return (
    <XStack
      alignItems="center"
      justifyContent="space-between"
      minHeight={44}
      width="100%"
      paddingHorizontal="$4"
      paddingVertical="$3"
      backgroundColor={isSelected ? '$color8' : '$color2'}
      borderWidth={1}
      borderColor={isSelected ? '$color8' : '$color6'}
      borderRadius="$4"
      gap="$3"
      testID={testID}
    >
      {/* Radio Button */}
      <RadioGroup.Item
        value={value}
        id={id}
        size="$4"
      >
        <RadioGroup.Indicator />
      </RadioGroup.Item>

      {/* Content */}
      <YStack
        flex={1}
        gap="$1"
      >
        <XStack
          alignItems="center"
          gap="$2"
        >
          <Label
            htmlFor={id}
            color={isSelected ? '$color12' : '$color11'}
            fontSize="$5"
            fontWeight={isSelected ? '600' : '400'}
          >
            {label}
          </Label>
          {isHumoristic && (
            <Text
              color="$color10"
              fontSize="$2"
              fontWeight="600"
              backgroundColor="$color4"
              paddingHorizontal="$2"
              paddingVertical="$1"
              borderRadius="$2"
            >
              HUMORISTIC
            </Text>
          )}
        </XStack>
        <Text
          color={isSelected ? '$color11' : '$color10'}
          fontSize="$3"
        >
          {description}
        </Text>
      </YStack>
    </XStack>
  )
})
