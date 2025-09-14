import type { Meta, StoryObj } from '@storybook/react'
import { BottomSheet } from './BottomSheet'

const meta: Meta<typeof BottomSheet> = {
  title: 'VideoAnalysis/BottomSheet',
  component: BottomSheet,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

const mockFeedbackItems = [
  {
    id: '1',
    timestamp: 1000,
    text: 'Great posture! Keep your back straight and maintain good balance.',
    type: 'positive' as const,
    category: 'posture' as const,
  },
  {
    id: '2',
    timestamp: 2000,
    text: 'Try bending your knees slightly for better stability.',
    type: 'suggestion' as const,
    category: 'movement' as const,
  },
  {
    id: '3',
    timestamp: 3000,
    text: 'Grip the club more firmly with your left hand.',
    type: 'correction' as const,
    category: 'grip' as const,
  },
  {
    id: '4',
    timestamp: 4000,
    text: 'Your swing tempo is excellent. Keep that rhythm consistent.',
    type: 'positive' as const,
    category: 'movement' as const,
  },
]

const mockSocialStats = {
  likes: 1100,
  comments: 13,
  bookmarks: 1100,
  shares: 224,
}

export const Collapsed: Story = {
  args: {
    isExpanded: false,
    activeTab: 'feedback',
    feedbackItems: mockFeedbackItems,
    socialStats: mockSocialStats,
    onTabChange: (tab) => console.log('Tab changed to:', tab),
    onSheetExpand: () => console.log('Sheet expanded'),
    onSheetCollapse: () => console.log('Sheet collapsed'),
    onFeedbackItemPress: (item) => console.log('Feedback item pressed:', item),
    onLike: () => console.log('Liked'),
    onComment: () => console.log('Commented'),
    onBookmark: () => console.log('Bookmarked'),
    onShare: () => console.log('Shared'),
  },
  decorators: [
    (Story) => (
      <div
        style={{
          width: '400px',
          height: '600px',
          position: 'relative',
          backgroundColor: '#f0f0f0',
        }}
      >
        <Story />
      </div>
    ),
  ],
}

export const ExpandedFeedback: Story = {
  args: {
    isExpanded: true,
    activeTab: 'feedback',
    feedbackItems: mockFeedbackItems,
    socialStats: mockSocialStats,
    onTabChange: (tab) => console.log('Tab changed to:', tab),
    onSheetExpand: () => console.log('Sheet expanded'),
    onSheetCollapse: () => console.log('Sheet collapsed'),
    onFeedbackItemPress: (item) => console.log('Feedback item pressed:', item),
    onLike: () => console.log('Liked'),
    onComment: () => console.log('Commented'),
    onBookmark: () => console.log('Bookmarked'),
    onShare: () => console.log('Shared'),
  },
  decorators: [
    (Story) => (
      <div
        style={{
          width: '400px',
          height: '600px',
          position: 'relative',
          backgroundColor: '#f0f0f0',
        }}
      >
        <Story />
      </div>
    ),
  ],
}

export const ExpandedInsights: Story = {
  args: {
    isExpanded: true,
    activeTab: 'insights',
    feedbackItems: mockFeedbackItems,
    socialStats: mockSocialStats,
    onTabChange: (tab) => console.log('Tab changed to:', tab),
    onSheetExpand: () => console.log('Sheet expanded'),
    onSheetCollapse: () => console.log('Sheet collapsed'),
    onFeedbackItemPress: (item) => console.log('Feedback item pressed:', item),
    onLike: () => console.log('Liked'),
    onComment: () => console.log('Commented'),
    onBookmark: () => console.log('Bookmarked'),
    onShare: () => console.log('Shared'),
  },
  decorators: [
    (Story) => (
      <div
        style={{
          width: '400px',
          height: '600px',
          position: 'relative',
          backgroundColor: '#f0f0f0',
        }}
      >
        <Story />
      </div>
    ),
  ],
}

export const ExpandedComments: Story = {
  args: {
    isExpanded: true,
    activeTab: 'comments',
    feedbackItems: mockFeedbackItems,
    socialStats: mockSocialStats,
    onTabChange: (tab) => console.log('Tab changed to:', tab),
    onSheetExpand: () => console.log('Sheet expanded'),
    onSheetCollapse: () => console.log('Sheet collapsed'),
    onFeedbackItemPress: (item) => console.log('Feedback item pressed:', item),
    onLike: () => console.log('Liked'),
    onComment: () => console.log('Commented'),
    onBookmark: () => console.log('Bookmarked'),
    onShare: () => console.log('Shared'),
  },
  decorators: [
    (Story) => (
      <div
        style={{
          width: '400px',
          height: '600px',
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
    isExpanded: false,
    activeTab: 'feedback',
    feedbackItems: mockFeedbackItems,
    socialStats: {
      likes: 5432,
      comments: 89,
      bookmarks: 234,
      shares: 1567,
    },
    onTabChange: (tab) => console.log('Tab changed to:', tab),
    onSheetExpand: () => console.log('Sheet expanded'),
    onSheetCollapse: () => console.log('Sheet collapsed'),
    onFeedbackItemPress: (item) => console.log('Feedback item pressed:', item),
    onLike: () => console.log('Liked'),
    onComment: () => console.log('Commented'),
    onBookmark: () => console.log('Bookmarked'),
    onShare: () => console.log('Shared'),
  },
  decorators: [
    (Story) => (
      <div
        style={{
          width: '400px',
          height: '600px',
          position: 'relative',
          backgroundColor: '#f0f0f0',
        }}
      >
        <Story />
      </div>
    ),
  ],
}
