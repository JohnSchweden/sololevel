import type { AudioControllerState } from '@app/features/VideoAnalysis/hooks/useAudioController'
import { log } from '@my/logging'
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
  setIsPlaying: () => log.debug('AudioFeedback', 'setIsPlaying called'),
  togglePlayback: () => log.debug('AudioFeedback', 'togglePlayback called'),
  handleLoad: () => log.debug('AudioFeedback', 'handleLoad called'),
  handleProgress: () => log.debug('AudioFeedback', 'handleProgress called'),
  handleEnd: () => log.debug('AudioFeedback', 'handleEnd called'),
  handleError: () => log.debug('AudioFeedback', 'handleError called'),
  handleSeekComplete: () => log.debug('AudioFeedback', 'handleSeekComplete called'),
  seekTo: () => log.debug('AudioFeedback', 'seekTo called'),
  reset: () => log.debug('AudioFeedback', 'reset called'),
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
    onClose: () => log.debug('AudioFeedback', 'Close clicked'),
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
    onClose: () => log.debug('AudioFeedback', 'Close clicked'),
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
    onClose: () => log.debug('AudioFeedback', 'Close clicked'),
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
    onClose: () => log.debug('AudioFeedback', 'Close clicked'),
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
    onClose: () => log.debug('AudioFeedback', 'Close clicked'),
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
