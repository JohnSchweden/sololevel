import type { AudioControllerState } from '@app/features/VideoAnalysis/hooks/useAudioController'
import type { Meta, StoryObj } from '@storybook/react'
import { AudioFeedback } from './AudioFeedback'

const meta: Meta<typeof AudioFeedback> = {
  title: 'VideoAnalysis/AudioFeedback',
  component: AudioFeedback,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

// Mock controller for stories
const createMockController = (
  overrides: Partial<AudioControllerState> = {}
): AudioControllerState => ({
  isPlaying: false,
  currentTime: 0,
  duration: 120,
  isLoaded: true,
  seekTime: null,
  setIsPlaying: () => console.log('setIsPlaying called'),
  togglePlayback: () => console.log('togglePlayback called'),
  handleLoad: () => console.log('handleLoad called'),
  handleProgress: () => console.log('handleProgress called'),
  handleEnd: () => console.log('handleEnd called'),
  handleError: () => console.log('handleError called'),
  handleSeekComplete: () => console.log('handleSeekComplete called'),
  seekTo: () => console.log('seekTo called'),
  reset: () => console.log('reset called'),
  ...overrides,
})

export const Playing: Story = {
  args: {
    audioUrl: 'https://example.com/audio.mp3',
    controller: createMockController({
      isPlaying: true,
      currentTime: 45,
      duration: 120,
    }),
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
    controller: createMockController({
      isPlaying: false,
      currentTime: 30,
      duration: 120,
    }),
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
    controller: createMockController({
      isPlaying: false,
      currentTime: 0,
      duration: 120,
    }),
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
    controller: createMockController({
      isPlaying: false,
      currentTime: 0,
      duration: 0,
    }),
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
    controller: createMockController({
      isPlaying: false,
      currentTime: 115,
      duration: 120,
    }),
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
