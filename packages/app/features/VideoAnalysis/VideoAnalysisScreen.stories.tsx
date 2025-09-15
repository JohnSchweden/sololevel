import type { Meta, StoryObj } from '@storybook/react'
import { VideoAnalysisScreen } from './VideoAnalysisScreen'

const meta: Meta<typeof VideoAnalysisScreen> = {
  title: 'VideoAnalysis/VideoAnalysisScreen',
  component: VideoAnalysisScreen,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

export const ProcessingState: Story = {
  args: {
    analysisJobId: 1,
    initialStatus: 'processing',
    onBack: () => console.log('Back pressed'),
    onMenuPress: () => console.log('Menu pressed'),
  },
  decorators: [
    (Story) => (
      <div
        style={{
          width: '400px',
          height: '700px',
          border: '1px solid #ccc',
          borderRadius: '8px',
          overflow: 'hidden',
        }}
      >
        <Story />
      </div>
    ),
  ],
}

export const ReadyState: Story = {
  args: {
    analysisJobId: 1,
    initialStatus: 'ready',
    onBack: () => console.log('Back pressed'),
    onMenuPress: () => console.log('Menu pressed'),
  },
  decorators: [
    (Story) => (
      <div
        style={{
          width: '400px',
          height: '700px',
          border: '1px solid #ccc',
          borderRadius: '8px',
          overflow: 'hidden',
        }}
      >
        <Story />
      </div>
    ),
  ],
}

export const PlayingState: Story = {
  args: {
    analysisJobId: 1,
    initialStatus: 'playing',
    onBack: () => console.log('Back pressed'),
    onMenuPress: () => console.log('Menu pressed'),
  },
  decorators: [
    (Story) => (
      <div
        style={{
          width: '400px',
          height: '700px',
          border: '1px solid #ccc',
          borderRadius: '8px',
          overflow: 'hidden',
        }}
      >
        <Story />
      </div>
    ),
  ],
}

export const PausedState: Story = {
  args: {
    analysisJobId: 1,
    initialStatus: 'paused',
    onBack: () => console.log('Back pressed'),
    onMenuPress: () => console.log('Menu pressed'),
  },
  decorators: [
    (Story) => (
      <div
        style={{
          width: '400px',
          height: '700px',
          border: '1px solid #ccc',
          borderRadius: '8px',
          overflow: 'hidden',
        }}
      >
        <Story />
      </div>
    ),
  ],
}

export const WithCallbacks: Story = {
  args: {
    analysisJobId: 1,
    initialStatus: 'ready',
    onBack: () => alert('Back button pressed!'),
    onMenuPress: () => alert('Menu button pressed!'),
  },
  decorators: [
    (Story) => (
      <div
        style={{
          width: '400px',
          height: '700px',
          border: '1px solid #ccc',
          borderRadius: '8px',
          overflow: 'hidden',
        }}
      >
        <Story />
      </div>
    ),
  ],
}
