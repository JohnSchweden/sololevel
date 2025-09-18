import type { Meta, StoryObj } from '@storybook/react'
import { FeedbackPanel } from './FeedbackPanel'

const meta: Meta<typeof FeedbackPanel> = {
  title: 'VideoAnalysis/FeedbackPanel',
  component: FeedbackPanel,
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

export const Collapsed: Story = {
  args: {
    isExpanded: false,
    activeTab: 'feedback',
    feedbackItems: mockFeedbackItems,
    onTabChange: (tab) => console.log('Tab changed to:', tab),
    onSheetExpand: () => console.log('Panel expanded'),
    onSheetCollapse: () => console.log('Panel collapsed'),
    onFeedbackItemPress: (item) => console.log('Feedback item pressed:', item),
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
    onTabChange: (tab) => console.log('Tab changed to:', tab),
    onSheetExpand: () => console.log('Panel expanded'),
    onSheetCollapse: () => console.log('Panel collapsed'),
    onFeedbackItemPress: (item) => console.log('Feedback item pressed:', item),
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
    onTabChange: (tab) => console.log('Tab changed to:', tab),
    onSheetExpand: () => console.log('Panel expanded'),
    onSheetCollapse: () => console.log('Panel collapsed'),
    onFeedbackItemPress: (item) => console.log('Feedback item pressed:', item),
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
    onTabChange: (tab) => console.log('Tab changed to:', tab),
    onSheetExpand: () => console.log('Panel expanded'),
    onSheetCollapse: () => console.log('Panel collapsed'),
    onFeedbackItemPress: (item) => console.log('Feedback item pressed:', item),
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
    onTabChange: (tab) => console.log('Tab changed to:', tab),
    onSheetExpand: () => console.log('Panel expanded'),
    onSheetCollapse: () => console.log('Panel collapsed'),
    onFeedbackItemPress: (item) => console.log('Feedback item pressed:', item),
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
