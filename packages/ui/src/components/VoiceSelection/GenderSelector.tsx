import type { CoachGender } from '@my/api'
import { Label, RadioGroup, Text, XStack, YStack } from 'tamagui'

export interface GenderSelectorProps {
  /**
   * Current selected gender value
   */
  value: CoachGender

  /**
   * Callback when gender value changes
   */
  onValueChange: (value: CoachGender) => void

  /**
   * Test ID for testing
   * @default 'gender-selector'
   */
  testID?: string
}

/**
 * GenderSelector Component
 *
 * Two-card radio group for selecting coach gender (Male/Female).
 * Mobile-first with 44px touch targets and glass morphism styling.
 *
 * @example
 * ```tsx
 * <GenderSelector
 *   value="female"
 *   onValueChange={(value) => console.log(value)}
 * />
 * ```
 */
export function GenderSelector({
  value,
  onValueChange,
  testID = 'gender-selector',
}: GenderSelectorProps): React.ReactElement {
  const handleChange = (newValue: string) => {
    if (newValue === 'male' || newValue === 'female') {
      onValueChange(newValue as CoachGender)
    }
  }

  const renderOption = (optionValue: CoachGender, labelText: string, id: string) => {
    const isSelected = value === optionValue

    return (
      <XStack
        key={optionValue}
        alignItems="center"
        justifyContent="center"
        minHeight={44}
        flex={1}
        paddingHorizontal="$4"
        paddingVertical="$3"
        backgroundColor={isSelected ? '$color8' : '$color2'}
        borderWidth={1}
        borderColor={isSelected ? '$color8' : '$color6'}
        borderRadius="$4"
        gap="$2"
        testID={id}
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
          fontSize="$5"
          fontWeight={isSelected ? '600' : '400'}
        >
          {labelText}
        </Label>
      </XStack>
    )
  }

  return (
    <YStack
      gap="$3"
      width="100%"
      testID={testID}
    >
      {/* Title */}
      <Text
        color="$color12"
        fontSize="$6"
        fontWeight="600"
        textAlign="center"
      >
        Select Coach Gender
      </Text>

      {/* Radio Options */}
      <RadioGroup
        value={value}
        onValueChange={handleChange}
        width="100%"
      >
        <XStack
          gap="$3"
          width="100%"
        >
          {renderOption('female', 'Female', 'gender-female')}
          {renderOption('male', 'Male', 'gender-male')}
        </XStack>
      </RadioGroup>
    </YStack>
  )
}
