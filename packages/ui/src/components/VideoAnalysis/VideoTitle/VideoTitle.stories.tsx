import type { Meta, StoryObj } from '@storybook/react'
import { VideoTitle } from './VideoTitle'

const meta: Meta<typeof VideoTitle> = {
  title: 'VideoAnalysis/VideoTitle',
  component: VideoTitle,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    title: 'Golf Swing Analysis',
    isGenerating: false,
    isEditable: true,
    timestamp: '2 days ago',
    onTitleEdit: (newTitle) => console.log('Title edited to:', newTitle),
  },
  decorators: [
    (Story) => (
      <div
        style={{
          width: '400px',
          padding: '20px',
          backgroundColor: '#f5f5f5',
        }}
      >
        <Story />
      </div>
    ),
  ],
}

export const Generating: Story = {
  args: {
    title: null,
    isGenerating: true,
    isEditable: false,
    timestamp: 'Just now',
    onTitleEdit: (newTitle) => console.log('Title edited to:', newTitle),
  },
  decorators: [
    (Story) => (
      <div
        style={{
          width: '400px',
          padding: '20px',
          backgroundColor: '#f5f5f5',
        }}
      >
        <Story />
      </div>
    ),
  ],
}

export const NoTitle: Story = {
  args: {
    title: null,
    isGenerating: false,
    isEditable: true,
    timestamp: '1 hour ago',
    onTitleEdit: (newTitle) => console.log('Title edited to:', newTitle),
  },
  decorators: [
    (Story) => (
      <div
        style={{
          width: '400px',
          padding: '20px',
          backgroundColor: '#f5f5f5',
        }}
      >
        <Story />
      </div>
    ),
  ],
}

export const ReadOnly: Story = {
  args: {
    title: 'Basketball Shooting Form',
    isGenerating: false,
    isEditable: false,
    timestamp: '3 days ago',
    onTitleEdit: (newTitle) => console.log('Title edited to:', newTitle),
  },
  decorators: [
    (Story) => (
      <div
        style={{
          width: '400px',
          padding: '20px',
          backgroundColor: '#f5f5f5',
        }}
      >
        <Story />
      </div>
    ),
  ],
}

export const LongTitle: Story = {
  args: {
    title: 'Professional Tennis Serve Analysis and Technique Improvement Session',
    isGenerating: false,
    isEditable: true,
    timestamp: '5 hours ago',
    onTitleEdit: (newTitle) => console.log('Title edited to:', newTitle),
  },
  decorators: [
    (Story) => (
      <div
        style={{
          width: '400px',
          padding: '20px',
          backgroundColor: '#f5f5f5',
        }}
      >
        <Story />
      </div>
    ),
  ],
}

export const EditingMode: Story = {
  args: {
    title: 'Baseball Pitching Mechanics',
    isGenerating: false,
    isEditable: true,
    timestamp: '1 day ago',
    onTitleEdit: (newTitle) => console.log('Title edited to:', newTitle),
  },
  decorators: [
    (Story) => (
      <div
        style={{
          width: '400px',
          padding: '20px',
          backgroundColor: '#f5f5f5',
        }}
      >
        <Story />
      </div>
    ),
  ],
  play: async ({ canvasElement }) => {
    const canvas = canvasElement as HTMLElement
    const editButton = canvas.querySelector('[data-testid="edit-title-button"]')
    if (editButton) {
      ;(editButton as HTMLElement).click()
    }
  },
}
