import type { Meta, StoryObj } from '@storybook/react'
import { FeedbackPanel, type FeedbackPanelProps } from './FeedbackPanel'

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

const mockFeedbackItems: FeedbackPanelProps['feedbackItems'] = [
  {
    id: 'feedback-1',
    timestamp: 12,
    text: 'Nice job keeping your shoulders relaxed!',
    type: 'positive',
    category: 'posture',
    ssmlStatus: 'completed',
    audioStatus: 'completed',
    ssmlAttempts: 1,
    audioAttempts: 1,
    ssmlLastError: null,
    audioLastError: null,
  },
  {
    id: 'feedback-2',
    timestamp: 28,
    text: 'Lift your chin slightly to improve posture alignment.',
    type: 'suggestion',
    category: 'voice',
    ssmlStatus: 'processing',
    audioStatus: 'queued',
    ssmlAttempts: 2,
    audioAttempts: 0,
    ssmlLastError: null,
    audioLastError: null,
  },
  {
    id: 'feedback-3',
    timestamp: 45,
    text: 'Try gripping the club without squeezing too hard.',
    type: 'correction',
    category: 'grip',
    ssmlStatus: 'failed',
    audioStatus: 'failed',
    ssmlAttempts: 3,
    audioAttempts: 2,
    ssmlLastError: 'TTS provider timeout',
    audioLastError: 'Audio upload failed',
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
