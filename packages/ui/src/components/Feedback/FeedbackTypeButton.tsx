import type { ColorTokens } from '@tamagui/core'
import { styled } from '@tamagui/core'
import type React from 'react'
import { Text, YStack } from 'tamagui'

export interface FeedbackTypeButtonProps {
  id: string
  label: string
  icon: string
  color: 'red' | 'blue' | 'orange' | 'purple'
  selected: boolean
  onPress: (id: string) => void
}

const colorMap: Record<
  'red' | 'blue' | 'orange' | 'purple',
  { background: ColorTokens; border: ColorTokens }
> = {
  red: { background: '$red4', border: '$red8' },
  blue: { background: '$blue4', border: '$blue8' },
  orange: { background: '$yellow4', border: '$yellow8' },
  purple: { background: '$green4', border: '$green8' },
}

const ButtonContainer = styled(YStack, {
  flex: 1,
  minHeight: 88,
  minWidth: 44,
  padding: '$4',
  borderRadius: '$3',
  borderWidth: 1,
  alignItems: 'center',
  justifyContent: 'center',
  gap: '$2',
  backgroundColor: 'transparent',
  borderColor: '$borderColor',
  cursor: 'pointer',

  pressStyle: {
    opacity: 0.8,
    scale: 0.95,
  },

  hoverStyle: {
    opacity: 0.9,
  },

  variants: {
    selected: {
      true: {},
    },
  } as const,
})

export const FeedbackTypeButton = ({
  id,
  label,
  icon,
  color,
  selected,
  onPress,
}: FeedbackTypeButtonProps): React.JSX.Element => {
  const accessibilityLabel = `${label}, ${selected ? 'selected' : 'not selected'}`

  return (
    <ButtonContainer
      selected={selected}
      backgroundColor={selected ? colorMap[color].background : 'transparent'}
      borderColor={selected ? colorMap[color].border : '$borderColor'}
      onPress={() => onPress(id)}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
    >
      <Text
        fontSize="$8"
        lineHeight="$8"
      >
        {icon}
      </Text>
      <Text
        fontSize="$4"
        color="$color"
        textAlign="center"
      >
        {label}
      </Text>
    </ButtonContainer>
  )
}
