import type { GetProps } from '@tamagui/core'
import { Text, YStack, styled } from 'tamagui'

/**
 * CoachingSessionItem Props
 */
export interface CoachingSessionItemProps {
  /**
   * Session date label (e.g., "Today", "Monday, Jul 28")
   */
  date: string

  /**
   * Session title
   */
  title: string

  /**
   * Press handler
   */
  onPress: () => void

  /**
   * Test ID for testing
   */
  testID?: string
}

/**
 * Pressable container for session item
 */
const SessionItemContainer = styled(YStack, {
  name: 'SessionItemContainer',
  gap: '$2',
  padding: '$4',
  borderRadius: '$3',
  backgroundColor: 'transparent',
  cursor: 'pointer',
  accessibilityRole: 'button',

  pressStyle: {
    backgroundColor: '$gray3',
    opacity: 0.7,
  },

  hoverStyle: {
    backgroundColor: '$gray2',
  },

  variants: {
    // Add variant support if needed in future
  } as const,
})

/**
 * Date label text
 */
const DateLabel = styled(Text, {
  name: 'DateLabel',
  fontSize: '$3',
  fontWeight: '400',
  color: '$gray10',
  lineHeight: '$1',
})

/**
 * Session title text
 */
const SessionTitle = styled(Text, {
  name: 'SessionTitle',
  fontSize: '$5',
  fontWeight: '400',
  color: '$gray12',
  lineHeight: '$2',
})

/**
 * CoachingSessionItem Component
 *
 * Displays a single coaching session list item with date and title.
 * Used in CoachingSessionsSection for vertical list of sessions.
 *
 * Design:
 * - Date label: Small, secondary text
 * - Session title: Larger, primary text
 * - Press animation: Background color change + opacity
 * - Touch target: Full-width pressable area
 *
 * @example
 * ```tsx
 * <CoachingSessionItem
 *   date="Today"
 *   title="Muscle Soreness and Growth in Weightlifting"
 *   onPress={() => console.log('Session pressed')}
 * />
 * ```
 */
export function CoachingSessionItem({
  date,
  title,
  onPress,
  testID = 'coaching-session-item',
}: CoachingSessionItemProps): React.ReactElement {
  const accessibilityLabel = `${date}, ${title}, coaching session`

  return (
    <SessionItemContainer
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      data-testid={testID}
    >
      <DateLabel data-testid={`${testID}-date`}>{date}</DateLabel>
      <SessionTitle data-testid={`${testID}-title`}>{title}</SessionTitle>
    </SessionItemContainer>
  )
}

/**
 * Extract props type for external use
 */
export type CoachingSessionItemPropsExtracted = GetProps<typeof SessionItemContainer>
