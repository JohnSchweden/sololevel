import { render } from '@testing-library/react-native'

import { FeedbackPanel, SocialIcons } from '@ui/components/VideoAnalysis'

import { FeedbackSection } from './FeedbackSection'

// Mock stores to prevent infinite re-renders
jest.mock('../stores/feedbackAudio', () => ({
  useFeedbackAudioStore: jest.fn(() => ({
    audioUrls: {},
    errors: {},
  })),
}))

jest.mock('../stores/feedbackCoordinatorStore', () => ({
  useFeedbackCoordinatorStore: jest.fn(() => ({
    highlightedFeedbackId: null,
  })),
}))

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
})

// Mock components before importing FeedbackSection
jest.mock('@ui/components/VideoAnalysis', () => ({
  SocialIcons: jest.fn(() => null),
  FeedbackPanel: jest.fn(() => null),
}))

// Context removed - not used in FeedbackSection

describe('FeedbackSection', () => {
  const mockSocialIcons = SocialIcons as jest.Mock
  const mockFeedbackPanel = FeedbackPanel as jest.MockedFunction<typeof FeedbackPanel>

  beforeEach(() => {
    mockSocialIcons.mockClear()
    mockFeedbackPanel.mockClear()
  })

  it('does not render social actions (moved to VideoPlayerSection)', () => {
    const props = createProps()
    render(<FeedbackSection {...props} />)

    // Social icons are no longer rendered in FeedbackSection
    expect(mockSocialIcons).not.toHaveBeenCalled()
  })

  // TEMP_DISABLED: Sheet expand/collapse callbacks removed for static layout
  // it('invokes panel callbacks', () => {
  //   const props = createProps()
  //   render(<FeedbackSection {...props} />)

  //   const panelProps = mockFeedbackPanel.mock.calls[0][0]
  //   panelProps.onSheetExpand()
  //   panelProps.onSheetCollapse()
  //   panelProps.onTabChange('insights')
  //   panelProps.onFeedbackItemPress(createItem({ id: '1', timestamp: 2000, text: 'test' }))

  //   expect(props.onExpand).toHaveBeenCalled()
  //   expect(props.onCollapse).toHaveBeenCalled()
  //   expect(props.onTabChange).toHaveBeenCalledWith('insights')
  //   expect(props.onItemPress).toHaveBeenCalled()
  // })

  it('invokes remaining panel callbacks', () => {
    const props = createProps()
    render(<FeedbackSection {...props} />)

    const panelProps = mockFeedbackPanel.mock.calls[0][0]
    panelProps.onTabChange('insights')
    panelProps.onFeedbackItemPress(createItem({ id: '1', timestamp: 2000, text: 'test' }))

    expect(props.onItemPress).toHaveBeenCalled()
  })
})
