import { render } from '@testing-library/react-native'

import { FeedbackPanel, SocialIcons } from '@ui/components/VideoAnalysis'

import { FeedbackSection } from './FeedbackSection'

const createItem = (overrides?: Partial<any>) => ({
  id: '1',
  timestamp: 2000,
  text: 'Great posture',
  type: 'suggestion' as const,
  category: 'voice' as const,
  ssmlStatus: 'completed' as const,
  audioStatus: 'completed' as const,
  confidence: 1,
  ...overrides,
})

const createProps = () => ({
  panelFraction: 0.2,
  activeTab: 'feedback' as const,
  feedbackItems: [createItem()],
  selectedFeedbackId: null,
  currentVideoTime: 0,
  videoDuration: 60,
  errors: {},
  audioUrls: {},
  onTabChange: jest.fn(),
  onExpand: jest.fn(),
  onCollapse: jest.fn(),
  onItemPress: jest.fn(),
  onSeek: jest.fn(),
  onRetryFeedback: jest.fn(),
  onDismissError: jest.fn(),
  onSelectAudio: jest.fn(),
  onShare: jest.fn(),
  onLike: jest.fn(),
  onComment: jest.fn(),
  onBookmark: jest.fn(),
})

// Mock components before importing FeedbackSection
jest.mock('@ui/components/VideoAnalysis', () => ({
  SocialIcons: jest.fn(() => null),
  FeedbackPanel: jest.fn(() => null),
}))

describe('FeedbackSection', () => {
  const mockSocialIcons = SocialIcons as jest.Mock
  const mockFeedbackPanel = FeedbackPanel as jest.Mock

  beforeEach(() => {
    mockSocialIcons.mockClear()
    mockFeedbackPanel.mockClear()
  })

  it('renders social actions when panel expanded', () => {
    const props = createProps()
    render(
      <FeedbackSection
        {...props}
        panelFraction={0.2}
      />
    )

    expect(mockSocialIcons).toHaveBeenCalled()
    const socialProps = mockSocialIcons.mock.calls[0][0]
    socialProps.onShare()
    socialProps.onLike()
    socialProps.onComment()
    socialProps.onBookmark()

    expect(props.onShare).toHaveBeenCalled()
    expect(props.onLike).toHaveBeenCalled()
    expect(props.onComment).toHaveBeenCalled()
    expect(props.onBookmark).toHaveBeenCalled()
  })

  it('invokes panel callbacks', () => {
    const props = createProps()
    render(<FeedbackSection {...props} />)

    const panelProps = mockFeedbackPanel.mock.calls[0][0]
    panelProps.onSheetExpand()
    panelProps.onSheetCollapse()
    panelProps.onTabChange('insights')
    panelProps.onFeedbackItemPress({ id: '1', timestamp: 2000, text: 'test' })

    expect(props.onExpand).toHaveBeenCalled()
    expect(props.onCollapse).toHaveBeenCalled()
    expect(props.onTabChange).toHaveBeenCalledWith('insights')
    expect(props.onItemPress).toHaveBeenCalled()
  })
})
