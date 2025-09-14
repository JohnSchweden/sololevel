import type { Meta, StoryObj } from '@storybook/react'
import { SocialIcons } from './SocialIcons'

const meta: Meta<typeof SocialIcons> = {
  title: 'VideoAnalysis/SocialIcons',
  component: SocialIcons,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    likes: 1100,
    comments: 13,
    bookmarks: 1100,
    shares: 224,
    onLike: () => console.log('Liked'),
    onComment: () => console.log('Commented'),
    onBookmark: () => console.log('Bookmarked'),
    onShare: () => console.log('Shared'),
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

export const HighEngagement: Story = {
  args: {
    likes: 54321,
    comments: 892,
    bookmarks: 2341,
    shares: 15678,
    onLike: () => console.log('Liked'),
    onComment: () => console.log('Commented'),
    onBookmark: () => console.log('Bookmarked'),
    onShare: () => console.log('Shared'),
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

export const MillionEngagement: Story = {
  args: {
    likes: 1500000,
    comments: 89000,
    bookmarks: 500000,
    shares: 750000,
    onLike: () => console.log('Liked'),
    onComment: () => console.log('Commented'),
    onBookmark: () => console.log('Bookmarked'),
    onShare: () => console.log('Shared'),
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

export const LowEngagement: Story = {
  args: {
    likes: 12,
    comments: 3,
    bookmarks: 8,
    shares: 5,
    onLike: () => console.log('Liked'),
    onComment: () => console.log('Commented'),
    onBookmark: () => console.log('Bookmarked'),
    onShare: () => console.log('Shared'),
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
    likes: 1100,
    comments: 13,
    bookmarks: 1100,
    shares: 224,
    onLike: () => console.log('Liked'),
    onComment: () => console.log('Commented'),
    onBookmark: () => console.log('Bookmarked'),
    onShare: () => console.log('Shared'),
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
