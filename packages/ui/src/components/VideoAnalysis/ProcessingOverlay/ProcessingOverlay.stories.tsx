import { log } from '@my/logging'
import type { Meta, StoryObj } from '@storybook/react'
import { ProcessingOverlay } from './ProcessingOverlay'

const meta: Meta<typeof ProcessingOverlay> = {
  title: 'VideoAnalysis/ProcessingOverlay',
  component: ProcessingOverlay,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

export const FrameExtraction: Story = {
  args: {
    progress: 20,
    currentStep: 'Extracting frames...',
    estimatedTime: 8,
    onCancel: () => log.debug('ProcessingOverlay', 'Cancel clicked'),
    onViewResults: () => log.debug('ProcessingOverlay', 'View Results clicked'),
    isComplete: false,
  },
}

export const PoseDetection: Story = {
  args: {
    progress: 40,
    currentStep: 'Analyzing movement...',
    estimatedTime: 6,
    onCancel: () => log.debug('ProcessingOverlay', 'Cancel clicked'),
    onViewResults: () => log.debug('ProcessingOverlay', 'View Results clicked'),
    isComplete: false,
  },
}

export const VideoAnalysis: Story = {
  args: {
    progress: 60,
    currentStep: 'Processing video/voice...',
    estimatedTime: 4,
    onCancel: () => log.debug('ProcessingOverlay', 'Cancel clicked'),
    onViewResults: () => log.debug('ProcessingOverlay', 'View Results clicked'),
    isComplete: false,
  },
}

export const LLMFeedback: Story = {
  args: {
    progress: 80,
    currentStep: 'Generating feedback...',
    estimatedTime: 2,
    onCancel: () => log.debug('ProcessingOverlay', 'Cancel clicked'),
    onViewResults: () => log.debug('ProcessingOverlay', 'View Results clicked'),
    isComplete: false,
  },
}

export const TTSGeneration: Story = {
  args: {
    progress: 95,
    currentStep: 'Creating audio...',
    estimatedTime: 1,
    onCancel: () => log.debug('ProcessingOverlay', 'Cancel clicked'),
    onViewResults: () => log.debug('ProcessingOverlay', 'View Results clicked'),
    isComplete: false,
  },
}

export const Complete: Story = {
  args: {
    progress: 100,
    currentStep: 'Analysis complete!',
    estimatedTime: 0,
    onCancel: () => log.debug('ProcessingOverlay', 'Cancel clicked'),
    onViewResults: () => log.debug('ProcessingOverlay', 'View Results clicked'),
    isComplete: true,
  },
}
