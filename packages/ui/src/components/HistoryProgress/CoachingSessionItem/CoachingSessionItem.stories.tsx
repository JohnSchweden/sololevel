import { log } from '@my/logging'
import type { Meta, StoryObj } from '@storybook/react'
import { CoachingSessionItem } from './CoachingSessionItem'

const meta = {
  title: 'HistoryProgress/CoachingSessionItem',
  component: CoachingSessionItem,
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    date: {
      control: 'text',
      description: 'Session date label',
    },
    title: {
      control: 'text',
      description: 'Session title',
    },
    onPress: {
      action: 'pressed',
      description: 'Press handler',
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof CoachingSessionItem>

export default meta
type Story = StoryObj<typeof meta>

/**
 * Default coaching session item with "Today" date
 */
export const Default: Story = {
  args: {
    date: 'Today',
    title: 'Muscle Soreness and Growth in Weightlifting',
    onPress: () => log.debug('CoachingSessionItem', 'Session pressed'),
  },
}

/**
 * Coaching session item with formatted date
 */
export const WithFormattedDate: Story = {
  args: {
    date: 'Monday, Jul 28',
    title: 'Personalised supplement recommendations',
    onPress: () => log.debug('CoachingSessionItem', 'Session pressed'),
  },
}

/**
 * Coaching session item with long title
 */
export const LongTitle: Story = {
  args: {
    date: 'Tuesday, Jul 29',
    title: 'Understanding Progressive Overload and Recovery Strategies for Advanced Athletes',
    onPress: () => log.debug('CoachingSessionItem', 'Session pressed'),
  },
}

/**
 * Multiple coaching session items stacked
 */
export const MultipleItems: Story = {
  args: {
    date: 'Today',
    title: 'Muscle Soreness and Growth in Weightlifting',
    onPress: () => log.debug('CoachingSessionItem', 'Session pressed'),
  },
  render: (args) => (
    <>
      <CoachingSessionItem {...args} />
      <CoachingSessionItem
        date="Monday, Jul 28"
        title="Personalised supplement recommendations"
        onPress={() => log.debug('CoachingSessionItem', 'Session 2 pressed')}
      />
      <CoachingSessionItem
        date="Monday, Jul 28"
        title="Personalised supplement recommendations"
        onPress={() => log.debug('CoachingSessionItem', 'Session 3 pressed')}
      />
      <CoachingSessionItem
        date="Sunday, Jul 27"
        title="Pre-workout nutrition guidelines"
        onPress={() => log.debug('CoachingSessionItem', 'Session 4 pressed')}
      />
    </>
  ),
}
