import type { IconProps } from '@tamagui/helpers-icon'
import type React from 'react'
import { Button, Text, XStack, YStack } from 'tamagui'

export interface SuggestionChipProps {
  icon?: React.ComponentType<IconProps>
  text: string
  category?: string
  onPress?: () => void
  disabled?: boolean
  testID?: string
}

/**
 * SuggestionChip component for chat suggestions
 *
 * Interactive chip button with icon, text, and optional category label.
 * Provides visual feedback on hover/press.
 *
 * @example
 * ```tsx
 * <SuggestionChip
 *   icon={Sparkles}
 *   text="Analyze my deadlift form"
 *   category="Form Analysis"
 *   onPress={() => console.log('Suggestion clicked')}
 * />
 * ```
 */
export const SuggestionChip = ({
  icon: Icon,
  text,
  category,
  onPress,
  disabled = false,
  testID = 'suggestion-chip',
}: SuggestionChipProps): React.JSX.Element => {
  return (
    <Button
      onPress={onPress}
      disabled={disabled}
      padding="$3"
      paddingHorizontal="$4"
      backgroundColor="rgba(255,255,255,0.05)"
      borderWidth={0}
      borderColor="rgba(255,255,255,0.2)"
      borderRadius="$5"
      animation="quick"
      hoverStyle={{
        backgroundColor: 'rgba(255,255,255,0.2)',
        scale: 1.05,
      }}
      pressStyle={{
        backgroundColor: 'rgba(255,255,255,0.05)',
        scale: 0.95,
      }}
      disabledStyle={{
        opacity: 0.5,
      }}
      testID={testID}
      accessibilityLabel={`Suggestion: ${text}${category ? `, ${category}` : ''}`}
      accessibilityRole="button"
      unstyled
      minHeight={44}
      minWidth={44}
    >
      <XStack
        gap="$2"
        alignItems="center"
      >
        {Icon && (
          <Icon
            size={16}
            color="rgba(255,255,255,0.8)"
          />
        )}
        <YStack
          alignItems="flex-start"
          paddingLeft="$2"
          marginLeft="$1"
        >
          <Text
            fontSize="$3"
            color="$color"
          >
            {text}
          </Text>
          {category && (
            <Text
              fontSize="$2"
              color="rgba(255,255,255,0.5)"
            >
              {category}
            </Text>
          )}
        </YStack>
      </XStack>
    </Button>
  )
}
