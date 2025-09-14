import type { Meta, StoryObj } from '@storybook/react'
import { FeedbackBubbles } from './FeedbackBubbles'

const meta: Meta<typeof FeedbackBubbles> = {
  title: 'VideoAnalysis/FeedbackBubbles',
  component: FeedbackBubbles,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

const mockMessages = [
  {
    id: '1',
    timestamp: 1000,
    text: 'Great posture!',
    type: 'positive' as const,
    category: 'posture' as const,
    position: { x: 50, y: 50 },
    isHighlighted: false,
    isActive: true,
  },
  {
    id: '2',
    timestamp: 2000,
    text: 'Bend your knees a little bit and keep your back straight!',
    type: 'suggestion' as const,
    category: 'movement' as const,
    position: { x: 100, y: 100 },
    isHighlighted: false,
    isActive: true,
  },
]

const highlightedMessages = [
  {
    id: '3',
    timestamp: 3000,
    text: 'Perfect grip on the club!',
    type: 'positive' as const,
    category: 'grip' as const,
    position: { x: 150, y: 150 },
    isHighlighted: true,
    isActive: true,
  },
]

const inactiveMessages = [
  {
    id: '4',
    timestamp: 4000,
    text: 'Old feedback message',
    type: 'correction' as const,
    category: 'posture' as const,
    position: { x: 200, y: 200 },
    isHighlighted: false,
    isActive: false,
  },
]

const manyMessages = [
  ...mockMessages,
  {
    id: '5',
    timestamp: 5000,
    text: 'Keep your head steady',
    type: 'correction' as const,
    category: 'posture' as const,
    position: { x: 250, y: 250 },
    isHighlighted: false,
    isActive: true,
  },
  {
    id: '6',
    timestamp: 6000,
    text: 'Great follow-through!',
    type: 'positive' as const,
    category: 'movement' as const,
    position: { x: 300, y: 300 },
    isHighlighted: false,
    isActive: true,
  },
  {
    id: '7',
    timestamp: 7000,
    text: 'Too many messages to display',
    type: 'suggestion' as const,
    category: 'voice' as const,
    position: { x: 350, y: 350 },
    isHighlighted: false,
    isActive: true,
  },
]

export const Default: Story = {
  args: {
    messages: mockMessages,
    onBubbleTap: (message) => console.log('Bubble tapped:', message),
  },
  decorators: [
    (Story) => (
      <div
        style={{
          width: '400px',
          height: '300px',
          position: 'relative',
          backgroundColor: '#f0f0f0',
        }}
      >
        <Story />
      </div>
    ),
  ],
}

export const Highlighted: Story = {
  args: {
    messages: highlightedMessages,
    onBubbleTap: (message) => console.log('Bubble tapped:', message),
  },
  decorators: [
    (Story) => (
      <div
        style={{
          width: '400px',
          height: '300px',
          position: 'relative',
          backgroundColor: '#f0f0f0',
        }}
      >
        <Story />
      </div>
    ),
  ],
}

export const Inactive: Story = {
  args: {
    messages: inactiveMessages,
    onBubbleTap: (message) => console.log('Bubble tapped:', message),
  },
  decorators: [
    (Story) => (
      <div
        style={{
          width: '400px',
          height: '300px',
          position: 'relative',
          backgroundColor: '#f0f0f0',
        }}
      >
        <Story />
      </div>
    ),
  ],
}

export const ManyMessages: Story = {
  args: {
    messages: manyMessages,
    onBubbleTap: (message) => console.log('Bubble tapped:', message),
  },
  decorators: [
    (Story) => (
      <div
        style={{
          width: '400px',
          height: '300px',
          position: 'relative',
          backgroundColor: '#f0f0f0',
        }}
      >
        <Story />
      </div>
    ),
  ],
}

export const Empty: Story = {
  args: {
    messages: [],
    onBubbleTap: (message) => console.log('Bubble tapped:', message),
  },
  decorators: [
    (Story) => (
      <div
        style={{
          width: '400px',
          height: '300px',
          position: 'relative',
          backgroundColor: '#f0f0f0',
        }}
      >
        <Story />
      </div>
    ),
  ],
}
