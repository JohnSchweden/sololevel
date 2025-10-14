import { log } from '@my/logging'
import type { Meta, StoryObj } from '@storybook/react'
import { VideoControls } from './VideoControls'

const meta: Meta<typeof VideoControls> = {
  title: 'VideoAnalysis/VideoControls',
  component: VideoControls,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

export const Paused: Story = {
  args: {
    isPlaying: false,
    currentTime: 30,
    duration: 120,
    showControls: true,
    onPlay: () => log.debug('VideoControls', 'Play clicked'),
    onPause: () => log.debug('VideoControls', 'Pause clicked'),
    onSeek: (time) => log.debug('VideoControls', 'Seek to', { time }),
  },
}

export const Playing: Story = {
  args: {
    isPlaying: true,
    currentTime: 45,
    duration: 120,
    showControls: true,
    onPlay: () => log.debug('VideoControls', 'Play clicked'),
    onPause: () => log.debug('VideoControls', 'Pause clicked'),
    onSeek: (time) => log.debug('VideoControls', 'Seek to', { time }),
  },
}

export const ControlsHidden: Story = {
  args: {
    isPlaying: false,
    currentTime: 60,
    duration: 120,
    showControls: false,
    onPlay: () => log.debug('VideoControls', 'Play clicked'),
    onPause: () => log.debug('VideoControls', 'Pause clicked'),
    onSeek: (time) => log.debug('VideoControls', 'Seek to', { time }),
  },
}

export const EndOfVideo: Story = {
  args: {
    isPlaying: false,
    currentTime: 115,
    duration: 120,
    showControls: true,
    onPlay: () => log.debug('VideoControls', 'Play clicked'),
    onPause: () => log.debug('VideoControls', 'Pause clicked'),
    onSeek: (time) => log.debug('VideoControls', 'Seek to', { time }),
  },
}
