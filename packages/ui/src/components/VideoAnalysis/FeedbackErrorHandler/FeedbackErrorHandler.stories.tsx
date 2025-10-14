import { log } from '@my/logging'
import type { Meta, StoryObj } from '@storybook/react'
import { FeedbackErrorHandler } from './FeedbackErrorHandler'

const meta: Meta<typeof FeedbackErrorHandler> = {
  title: 'VideoAnalysis/FeedbackErrorHandler',
  component: FeedbackErrorHandler,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['small', 'medium', 'large'],
    },
    ssmlFailed: {
      control: 'boolean',
    },
    audioFailed: {
      control: 'boolean',
    },
  },
}

export default meta
type Story = StoryObj<typeof meta>

const mockRetry = (feedbackId: string) => {
  log.debug('FeedbackErrorHandler', 'Retrying feedback', { feedbackId })
}

const mockDismiss = (feedbackId: string) => {
  log.debug('FeedbackErrorHandler', 'Dismissing error for feedback', { feedbackId })
}

export const SSMLError: Story = {
  args: {
    feedbackId: '1',
    feedbackText:
      'Your posture looks great! Keep your shoulders back and maintain that confident stance.',
    ssmlFailed: true,
    audioFailed: false,
    onRetry: mockRetry,
    onDismiss: mockDismiss,
    size: 'medium',
  },
}

export const AudioError: Story = {
  args: {
    feedbackId: '2',
    feedbackText: 'Try to speak a bit louder and more clearly for better audience engagement.',
    ssmlFailed: false,
    audioFailed: true,
    onRetry: mockRetry,
    onDismiss: mockDismiss,
    size: 'medium',
  },
}

export const BothFailed: Story = {
  args: {
    feedbackId: '3',
    feedbackText: 'Excellent eye contact with the audience! This helps build connection and trust.',
    ssmlFailed: true,
    audioFailed: true,
    onRetry: mockRetry,
    onDismiss: mockDismiss,
    size: 'medium',
  },
}

export const LongText: Story = {
  args: {
    feedbackId: '4',
    feedbackText:
      'This is a very long feedback message that should be truncated in the error display to prevent the component from becoming too large and overwhelming for the user interface.',
    ssmlFailed: true,
    audioFailed: false,
    onRetry: mockRetry,
    onDismiss: mockDismiss,
    size: 'medium',
  },
}

export const SmallSize: Story = {
  args: {
    feedbackId: '5',
    feedbackText: 'Good hand gestures!',
    ssmlFailed: true,
    audioFailed: true,
    onRetry: mockRetry,
    size: 'small',
  },
}

export const LargeSize: Story = {
  args: {
    feedbackId: '6',
    feedbackText: 'Your presentation flow is smooth and engaging.',
    ssmlFailed: false,
    audioFailed: true,
    onRetry: mockRetry,
    onDismiss: mockDismiss,
    size: 'large',
  },
}

export const NoDismiss: Story = {
  args: {
    feedbackId: '7',
    feedbackText: 'Great voice projection and clarity!',
    ssmlFailed: true,
    audioFailed: false,
    onRetry: mockRetry,
    // No onDismiss prop - dismiss button should not appear
    size: 'medium',
  },
}
