import { log } from '@my/logging'
import type { Meta, StoryObj } from '@storybook/react'
import { XStack, YStack } from 'tamagui'
import { VideoThumbnailCard } from './VideoThumbnailCard'

/**
 * VideoThumbnailCard displays a video thumbnail with a play icon overlay.
 * Used in the Videos section of the History & Progress screen.
 *
 * Features:
 * - 9:14 aspect ratio (180x280px default)
 * - Play icon overlay (56px circle)
 * - Loading state with spinner
 * - Error state with placeholder
 * - Press animation (scale to 0.95)
 * - Accessible with proper labels
 */
const meta: Meta<typeof VideoThumbnailCard> = {
  title: 'HistoryProgress/VideoThumbnailCard',
  component: VideoThumbnailCard,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Video thumbnail card with play icon overlay. Displays video preview with loading, error, and placeholder states.',
      },
    },
  },
  argTypes: {
    thumbnailUri: {
      control: 'text',
      description: 'URL of the thumbnail image',
    },
    width: {
      control: { type: 'number', min: 100, max: 400, step: 10 },
      description: 'Card width in pixels',
    },
    height: {
      control: { type: 'number', min: 100, max: 600, step: 10 },
      description: 'Card height in pixels',
    },
    accessibilityLabel: {
      control: 'text',
      description: 'Accessibility label for screen readers',
    },
  },
  decorators: [
    (Story) => (
      <YStack
        padding="$4"
        backgroundColor="$background"
      >
        <Story />
      </YStack>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof VideoThumbnailCard>

/**
 * Default state with thumbnail image
 */
export const Default: Story = {
  args: {
    thumbnailUri: 'https://picsum.photos/180/280',
    onPress: () => log.debug('VideoThumbnailCard', 'Thumbnail pressed'),
    accessibilityLabel: 'Video thumbnail, Golf Swing Analysis, recorded on Oct 11',
  },
}

/**
 * Without thumbnail - shows placeholder
 */
export const Placeholder: Story = {
  args: {
    onPress: () => log.debug('VideoThumbnailCard', 'Placeholder pressed'),
    accessibilityLabel: 'Video thumbnail, no preview available',
  },
}

/**
 * With custom dimensions (larger)
 */
export const CustomSize: Story = {
  args: {
    thumbnailUri: 'https://picsum.photos/200/320',
    width: 200,
    height: 320,
    onPress: () => log.debug('VideoThumbnailCard', 'Large thumbnail pressed'),
    accessibilityLabel: 'Video thumbnail, Running Form Analysis',
  },
}

/**
 * With custom dimensions (smaller)
 */
export const SmallSize: Story = {
  args: {
    thumbnailUri: 'https://picsum.photos/140/220',
    width: 140,
    height: 220,
    onPress: () => log.debug('VideoThumbnailCard', 'Small thumbnail pressed'),
    accessibilityLabel: 'Video thumbnail, Yoga Pose Check',
  },
}

/**
 * Multiple thumbnails in a row (preview of VideosSection)
 */
export const MultipleCards: Story = {
  render: () => (
    <XStack gap="$3">
      <VideoThumbnailCard
        thumbnailUri="https://picsum.photos/180/280?random=1"
        onPress={() => log.debug('VideoThumbnailCard', 'Thumbnail 1 pressed')}
        accessibilityLabel="Video 1"
      />
      <VideoThumbnailCard
        thumbnailUri="https://picsum.photos/180/280?random=2"
        onPress={() => log.debug('VideoThumbnailCard', 'Thumbnail 2 pressed')}
        accessibilityLabel="Video 2"
      />
      <VideoThumbnailCard
        thumbnailUri="https://picsum.photos/180/280?random=3"
        onPress={() => log.debug('VideoThumbnailCard', 'Thumbnail 3 pressed')}
        accessibilityLabel="Video 3"
      />
    </XStack>
  ),
}

/**
 * Error state - invalid image URL
 */
export const ErrorState: Story = {
  args: {
    thumbnailUri: 'https://invalid-url-that-will-fail.com/image.jpg',
    onPress: () => log.debug('VideoThumbnailCard', 'Error thumbnail pressed'),
    accessibilityLabel: 'Video thumbnail, failed to load',
  },
}

/**
 * Dark theme
 */
export const DarkTheme: Story = {
  args: {
    thumbnailUri: 'https://picsum.photos/180/280',
    onPress: () => log.debug('VideoThumbnailCard', 'Dark theme thumbnail pressed'),
    accessibilityLabel: 'Video thumbnail, dark theme',
  },
  parameters: {
    backgrounds: { default: 'dark' },
  },
}

/**
 * Light theme
 */
export const LightTheme: Story = {
  args: {
    thumbnailUri: 'https://picsum.photos/180/280',
    onPress: () => log.debug('VideoThumbnailCard', 'Light theme thumbnail pressed'),
    accessibilityLabel: 'Video thumbnail, light theme',
  },
  parameters: {
    backgrounds: { default: 'light' },
  },
}
