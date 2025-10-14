import { log } from '@my/logging'
import type { Meta, StoryObj } from '@storybook/react'
import { YStack } from 'tamagui'
import { VideosSection } from './VideosSection'

/**
 * VideosSection displays a horizontal gallery of video thumbnails.
 * Used in the History & Progress screen to show recent analyses.
 *
 * Features:
 * - Section header with "Videos" title and "See all" link
 * - Horizontal scroll of up to 3 video thumbnails
 * - Empty state with CTA message
 * - Loading state with spinner
 * - Error state with retry button
 * - Accessible with proper labels
 */
const meta: Meta<typeof VideosSection> = {
  title: 'HistoryProgress/VideosSection',
  component: VideosSection,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Videos section with header and horizontal thumbnail gallery. Displays up to 3 recent video analyses with navigation to individual videos and full videos list.',
      },
    },
  },
  argTypes: {
    isLoading: {
      control: 'boolean',
      description: 'Loading state',
    },
    error: {
      control: 'object',
      description: 'Error object',
    },
  },
  decorators: [
    (Story) => (
      <YStack
        padding="$4"
        backgroundColor="$background"
        width="100%"
      >
        <Story />
      </YStack>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof VideosSection>

// Mock video data
const mockVideos = [
  {
    id: 1,
    videoId: 10,
    title: 'Golf Swing Analysis',
    createdAt: '2025-10-11T10:00:00Z',
    thumbnailUri: 'https://picsum.photos/180/280?random=1',
  },
  {
    id: 2,
    videoId: 20,
    title: 'Running Form Check',
    createdAt: '2025-10-10T14:30:00Z',
    thumbnailUri: 'https://picsum.photos/180/280?random=2',
  },
  {
    id: 3,
    videoId: 30,
    title: 'Yoga Pose Analysis',
    createdAt: '2025-10-09T09:15:00Z',
    thumbnailUri: 'https://picsum.photos/180/280?random=3',
  },
]

/**
 * Default state with 3 videos
 */
export const Default: Story = {
  args: {
    videos: mockVideos,
    onVideoPress: (id) => log.debug('VideosSection', 'Video pressed', { id }),
    onSeeAllPress: () => log.debug('VideosSection', 'See all pressed'),
  },
}

/**
 * With 1 video
 */
export const SingleVideo: Story = {
  args: {
    videos: [mockVideos[0]],
    onVideoPress: (id) => log.debug('VideosSection', 'Video pressed', { id }),
    onSeeAllPress: () => log.debug('VideosSection', 'See all pressed'),
  },
}

/**
 * With 2 videos
 */
export const TwoVideos: Story = {
  args: {
    videos: mockVideos.slice(0, 2),
    onVideoPress: (id) => log.debug('VideosSection', 'Video pressed', { id }),
    onSeeAllPress: () => log.debug('VideosSection', 'See all pressed'),
  },
}

/**
 * Empty state - no videos yet
 */
export const Empty: Story = {
  args: {
    videos: [],
    onVideoPress: (id) => log.debug('VideosSection', 'Video pressed', { id }),
    onSeeAllPress: () => log.debug('VideosSection', 'See all pressed'),
  },
}

/**
 * Loading state
 */
export const Loading: Story = {
  args: {
    videos: [],
    onVideoPress: (id) => log.debug('VideosSection', 'Video pressed', { id }),
    onSeeAllPress: () => log.debug('VideosSection', 'See all pressed'),
    isLoading: true,
  },
}

/**
 * Error state with retry
 */
export const ErrorState: Story = {
  args: {
    videos: [],
    onVideoPress: (id) => log.debug('VideosSection', 'Video pressed', { id }),
    onSeeAllPress: () => log.debug('VideosSection', 'See all pressed'),
    error: new globalThis.Error('Failed to fetch videos from server'),
    onRetry: () => log.debug('VideosSection', 'Retry pressed'),
  },
}

/**
 * Error state without retry button
 */
export const ErrorNoRetry: Story = {
  args: {
    videos: [],
    onVideoPress: (id) => log.debug('VideosSection', 'Video pressed', { id }),
    onSeeAllPress: () => log.debug('VideosSection', 'See all pressed'),
    error: new globalThis.Error('Network connection lost'),
  },
}

/**
 * With more than 3 videos (only first 3 shown)
 */
export const MoreThanThree: Story = {
  args: {
    videos: [
      ...mockVideos,
      {
        id: 4,
        videoId: 40,
        title: 'Weightlifting Form',
        createdAt: '2025-10-08T12:00:00Z',
        thumbnailUri: 'https://picsum.photos/180/280?random=4',
      },
      {
        id: 5,
        videoId: 50,
        title: 'Swimming Technique',
        createdAt: '2025-10-07T08:30:00Z',
        thumbnailUri: 'https://picsum.photos/180/280?random=5',
      },
    ],
    onVideoPress: (id) => log.debug('VideosSection', 'Video pressed', { id }),
    onSeeAllPress: () => log.debug('VideosSection', 'See all pressed'),
  },
  parameters: {
    docs: {
      description: {
        story: 'When more than 3 videos are provided, only the first 3 are displayed.',
      },
    },
  },
}

/**
 * Videos without thumbnails (placeholders)
 */
export const NoThumbnails: Story = {
  args: {
    videos: mockVideos.map((v) => ({ ...v, thumbnailUri: undefined })),
    onVideoPress: (id) => log.debug('VideosSection', 'Video pressed', { id }),
    onSeeAllPress: () => log.debug('VideosSection', 'See all pressed'),
  },
}

/**
 * Dark theme
 */
export const DarkTheme: Story = {
  args: {
    videos: mockVideos,
    onVideoPress: (id) => log.debug('VideosSection', 'Video pressed', { id }),
    onSeeAllPress: () => log.debug('VideosSection', 'See all pressed'),
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
    videos: mockVideos,
    onVideoPress: (id) => log.debug('VideosSection', 'Video pressed', { id }),
    onSeeAllPress: () => log.debug('VideosSection', 'See all pressed'),
  },
  parameters: {
    backgrounds: { default: 'light' },
  },
}

/**
 * Interactive example - full screen width
 */
export const FullWidth: Story = {
  args: {
    videos: mockVideos,
    onVideoPress: (id) => alert(`Navigating to video analysis ${id}`),
    onSeeAllPress: () => alert('Navigating to full videos list'),
  },
  decorators: [
    (Story) => (
      <YStack
        padding="$4"
        backgroundColor="$background"
        width="100%"
        minWidth={375}
      >
        <Story />
      </YStack>
    ),
  ],
}
