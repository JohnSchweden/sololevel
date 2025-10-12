import type { GetProps } from '@tamagui/core'
import { Text, YStack, styled } from 'tamagui'
import { CoachingSessionItem } from '../CoachingSessionItem'

/**
 * Session item data structure
 */
export interface SessionItem {
  /**
   * Unique session identifier
   */
  id: number

  /**
   * Session date label (e.g., "Today", "Monday, Jul 28")
   */
  date: string

  /**
   * Session title
   */
  title: string
}

/**
 * CoachingSessionsSection Props
 */
export interface CoachingSessionsSectionProps {
  /**
   * Array of coaching sessions to display
   */
  sessions: SessionItem[]

  /**
   * Press handler for session items
   * @param sessionId - The ID of the pressed session
   */
  onSessionPress: (sessionId: number) => void

  /**
   * Test ID for testing
   */
  testID?: string
}

/**
 * Section container
 */
const SectionContainer = styled(YStack, {
  name: 'CoachingSessionsSectionContainer',
  gap: '$3',
  width: '100%',
})

/**
 * Section header text
 */
const SectionHeader = styled(Text, {
  name: 'CoachingSessionsSectionHeader',
  fontSize: '$6',
  fontWeight: '500',
  color: '$gray10',
  marginBottom: '$3',
  lineHeight: '$2',
})

/**
 * Sessions list container
 */
const SessionsList = styled(YStack, {
  name: 'SessionsList',
  gap: '$2',
  width: '100%',
})

/**
 * CoachingSessionsSection Component
 *
 * Displays a vertical list of coaching session items with section header.
 * Used in History & Progress Tracking screen below Videos section.
 *
 * Design:
 * - Section header: "Coaching sessions" title
 * - Vertical list: CoachingSessionItem components with 8px gap
 * - Full-width layout
 * - Empty state: Renders header only, no sessions
 *
 * @example
 * ```tsx
 * <CoachingSessionsSection
 *   sessions={[
 *     { id: 1, date: 'Today', title: 'Muscle Soreness and Growth' },
 *     { id: 2, date: 'Monday, Jul 28', title: 'Supplement recommendations' },
 *   ]}
 *   onSessionPress={(id) => console.log('Session pressed:', id)}
 * />
 * ```
 */
export function CoachingSessionsSection({
  sessions,
  onSessionPress,
  testID = 'coaching-sessions-section',
}: CoachingSessionsSectionProps): React.ReactElement {
  return (
    <SectionContainer data-testid={testID}>
      <SectionHeader data-testid={`${testID}-header`}>Coaching sessions</SectionHeader>

      <SessionsList data-testid={`${testID}-list`}>
        {sessions.map((session) => (
          <CoachingSessionItem
            key={session.id}
            date={session.date}
            title={session.title}
            onPress={() => onSessionPress(session.id)}
            testID={`${testID}-item-${session.id}`}
          />
        ))}
      </SessionsList>
    </SectionContainer>
  )
}

/**
 * Extract props type for external use
 */
export type CoachingSessionsSectionPropsExtracted = GetProps<typeof SectionContainer>
