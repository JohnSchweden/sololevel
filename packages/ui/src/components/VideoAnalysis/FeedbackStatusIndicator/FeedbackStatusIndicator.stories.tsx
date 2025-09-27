import type { Meta, StoryObj } from '@storybook/react'
import { FeedbackStatusIndicator } from './FeedbackStatusIndicator'

const meta: Meta<typeof FeedbackStatusIndicator> = {
  title: 'VideoAnalysis/FeedbackStatusIndicator',
  component: FeedbackStatusIndicator,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    ssmlStatus: {
      control: 'select',
      options: ['queued', 'processing', 'completed', 'failed'],
    },
    audioStatus: {
      control: 'select',
      options: ['queued', 'processing', 'completed', 'failed'],
    },
    size: {
      control: 'select',
      options: ['small', 'medium'],
    },
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    ssmlStatus: 'completed',
    audioStatus: 'processing',
    size: 'medium',
  },
}

export const AllQueued: Story = {
  args: {
    ssmlStatus: 'queued',
    audioStatus: 'queued',
    size: 'medium',
  },
}

export const AllProcessing: Story = {
  args: {
    ssmlStatus: 'processing',
    audioStatus: 'processing',
    size: 'medium',
  },
}

export const AllCompleted: Story = {
  args: {
    ssmlStatus: 'completed',
    audioStatus: 'completed',
    size: 'medium',
  },
}

export const WithFailures: Story = {
  args: {
    ssmlStatus: 'failed',
    audioStatus: 'completed',
    size: 'medium',
  },
}

export const SmallSize: Story = {
  args: {
    ssmlStatus: 'completed',
    audioStatus: 'processing',
    size: 'small',
  },
}
