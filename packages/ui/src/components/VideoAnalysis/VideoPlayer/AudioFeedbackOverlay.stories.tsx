import type { Meta, StoryObj } from '@storybook/react'
import { AudioFeedbackOverlay } from './AudioFeedbackOverlay'

const meta: Meta<typeof AudioFeedbackOverlay> = {
  title: 'VideoAnalysis/AudioFeedbackOverlay',
  component: AudioFeedbackOverlay,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

export const Playing: Story = {
  args: {
    audioUrl: 'https://example.com/audio.mp3',
    isPlaying: true,
    currentTime: 45,
    duration: 120,
    onPlayPause: () => console.log('Play/Pause clicked'),
    onClose: () => console.log('Close clicked'),
    isVisible: true,
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

export const Paused: Story = {
  args: {
    audioUrl: 'https://example.com/audio.mp3',
    isPlaying: false,
    currentTime: 30,
    duration: 120,
    onPlayPause: () => console.log('Play/Pause clicked'),
    onClose: () => console.log('Close clicked'),
    isVisible: true,
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

export const Hidden: Story = {
  args: {
    audioUrl: 'https://example.com/audio.mp3',
    isPlaying: false,
    currentTime: 0,
    duration: 120,
    onPlayPause: () => console.log('Play/Pause clicked'),
    onClose: () => console.log('Close clicked'),
    isVisible: false,
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

export const NoAudio: Story = {
  args: {
    audioUrl: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    onPlayPause: () => console.log('Play/Pause clicked'),
    onClose: () => console.log('Close clicked'),
    isVisible: true,
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

export const EndOfAudio: Story = {
  args: {
    audioUrl: 'https://example.com/audio.mp3',
    isPlaying: false,
    currentTime: 115,
    duration: 120,
    onPlayPause: () => console.log('Play/Pause clicked'),
    onClose: () => console.log('Close clicked'),
    isVisible: true,
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
