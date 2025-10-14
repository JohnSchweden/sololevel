import { log } from '@my/logging'
import type { Meta, StoryObj } from '@storybook/react'
import { CoachingSessionsSection } from './CoachingSessionsSection'

const meta = {
  title: 'HistoryProgress/CoachingSessionsSection',
  component: CoachingSessionsSection,
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    sessions: {
      description: 'Array of coaching sessions',
    },
    onSessionPress: {
      action: 'session-pressed',
      description: 'Session press handler',
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof CoachingSessionsSection>

export default meta
type Story = StoryObj<typeof meta>

const mockSessions = [
  { id: 1, date: 'Today', title: 'Muscle Soreness and Growth in Weightlifting' },
  { id: 2, date: 'Monday, Jul 28', title: 'Personalised supplement recommendations' },
  { id: 3, date: 'Monday, Jul 28', title: 'Personalised supplement recommendations' },
  { id: 4, date: 'Sunday, Jul 27', title: 'Pre-workout nutrition guidelines' },
]

/**
 * Default coaching sessions section with 4 sessions
 */
export const Default: Story = {
  args: {
    sessions: mockSessions,
    onSessionPress: (id) => log.debug('CoachingSessionsSection', 'Session pressed', { id }),
  },
}

/**
 * Section with single session
 */
export const SingleSession: Story = {
  args: {
    sessions: [mockSessions[0]],
    onSessionPress: (id) => log.debug('CoachingSessionsSection', 'Session pressed', { id }),
  },
}

/**
 * Section with many sessions (8+)
 */
export const ManySessions: Story = {
  args: {
    sessions: [
      ...mockSessions,
      { id: 5, date: 'Saturday, Jul 26', title: 'Recovery techniques for endurance athletes' },
      { id: 6, date: 'Friday, Jul 25', title: 'Hydration strategies during training' },
      { id: 7, date: 'Thursday, Jul 24', title: 'Mental preparation for competitions' },
      { id: 8, date: 'Wednesday, Jul 23', title: 'Injury prevention and mobility work' },
    ],
    onSessionPress: (id) => log.debug('CoachingSessionsSection', 'Session pressed', { id }),
  },
}

/**
 * Empty section (no sessions)
 */
export const Empty: Story = {
  args: {
    sessions: [],
    onSessionPress: (id) => log.debug('CoachingSessionsSection', 'Session pressed', { id }),
  },
}

/**
 * Section with long titles
 */
export const LongTitles: Story = {
  args: {
    sessions: [
      {
        id: 1,
        date: 'Today',
        title: 'Understanding Progressive Overload and Recovery Strategies for Advanced Athletes',
      },
      {
        id: 2,
        date: 'Yesterday',
        title:
          'Comprehensive Guide to Macronutrient Timing and Meal Planning for Optimal Performance',
      },
      {
        id: 3,
        date: 'Monday, Jul 28',
        title: 'Advanced Training Techniques: Periodization, Volume, and Intensity Management',
      },
    ],
    onSessionPress: (id) => log.debug('CoachingSessionsSection', 'Session pressed', { id }),
  },
}
