import type { CoachMode } from '@my/api'
import { RadioGroup, Text, YStack } from 'tamagui'
import { ModeCard } from './ModeCard'

export interface ModeSelectorOption {
  value: CoachMode
  label: string
  description: string
  isHumoristic?: boolean
}

export interface ModeSelectorProps {
  /**
   * Current selected mode value
   */
  value: CoachMode

  /**
   * Available mode options
   */
  options: readonly ModeSelectorOption[]

  /**
   * Callback when mode value changes
   */
  onValueChange: (value: CoachMode) => void

  /**
   * Test ID for testing
   * @default 'mode-selector'
   */
  testID?: string
}

/**
 * ModeSelector Component
 *
 * Vertical stack of mode cards for selecting feedback mode.
 * Mobile-first with 44px touch targets and glass morphism styling.
 *
 * @example
 * ```tsx
 * <ModeSelector
 *   value="roast"
 *   options={MODE_OPTIONS}
 *   onValueChange={(value) => console.log(value)}
 * />
 * ```
 */
export function ModeSelector({
  value,
  options,
  onValueChange,
  testID = 'mode-selector',
}: ModeSelectorProps): React.ReactElement {
  const handleChange = (newValue: string) => {
    if (newValue === 'roast' || newValue === 'zen' || newValue === 'lovebomb') {
      onValueChange(newValue as CoachMode)
    }
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
        Select Feedback Mode
      </Text>

      {/* Radio Options */}
      <RadioGroup
        value={value}
        onValueChange={handleChange}
        width="100%"
      >
        <YStack
          gap="$2"
          width="100%"
        >
          {options.map((option) => (
            <ModeCard
              key={option.value}
              id={`mode-${option.value}`}
              value={option.value}
              label={option.label}
              description={option.description}
              isSelected={value === option.value}
              isHumoristic={option.isHumoristic}
              testID={`mode-card-${option.value}`}
            />
          ))}
        </YStack>
      </RadioGroup>
    </YStack>
  )
}
