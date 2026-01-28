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

let mockSetActiveTab: jest.Mock
jest.mock('../hooks/useFeedbackPanel', () => {
  mockSetActiveTab = jest.fn()
  const clearCmd = jest.fn()
  return {
    useFeedbackPanel: jest.fn(() => ({
      panelFraction: 0.4,
      isExpanded: true,
      activeTab: 'feedback',
      selectedFeedbackId: null,
      expand: jest.fn(),
      collapse: jest.fn(),
      toggle: jest.fn(),
      setActiveTab: mockSetActiveTab,
      selectFeedback: jest.fn(),
      clearSelection: jest.fn(),
    })),
    useFeedbackPanelCommandStore: jest.fn((selector: (s: any) => unknown) => {
      const state = {
        command: null,
        clear: clearCmd,
        sequence: 0,
        requestTab: jest.fn(),
        reset: jest.fn(),
      }
      return typeof selector === 'function' ? selector(state) : state
    }),
    getFeedbackPanelCommandState: jest.fn(() => ({ clear: clearCmd })),
    requestFeedbackPanelTab: jest.fn(),
    resetFeedbackPanelCommandBus: jest.fn(),
  }
})

jest.mock('../stores', () => ({
  useVideoPlayerStore: jest.fn((selector?: (state: any) => unknown) =>
    selector
      ? selector({
          isPlaying: false,
          pendingSeek: null,
          displayTime: 0,
          controlsVisible: true,
        })
      : undefined
  ),
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
  feedbackItems: [createItem()],
  onCollapse: jest.fn(),
  onItemPress: jest.fn(),
  onSeek: jest.fn(),
  onRetryFeedback: jest.fn(),
  onDismissError: jest.fn(),
  onSelectAudio: jest.fn(),
  onFeedbackRatingChange: jest.fn(),
  onFullFeedbackRatingChange: jest.fn(),
})

// Mock components before importing FeedbackSection
jest.mock('@ui/components/VideoAnalysis', () => ({
  SocialIcons: jest.fn(() => null),
  FeedbackPanel: jest.fn(() => null),
}))

// Context removed - not used in FeedbackSection

describe('FeedbackSection', () => {
  // SocialIcons is now memoized, so cast through unknown first
  const mockSocialIcons = SocialIcons as unknown as jest.Mock
  const mockFeedbackPanel = FeedbackPanel as jest.MockedFunction<typeof FeedbackPanel>

  beforeEach(() => {
    mockSocialIcons.mockClear()
    mockFeedbackPanel.mockClear()
    mockSetActiveTab?.mockClear()
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

  it('calls setActiveTab when user switches tab via panel onTabChange', () => {
    // ARRANGE: Section renders with mocked useFeedbackPanel
    const props = createProps()
    render(<FeedbackSection {...props} />)
    const panelProps = mockFeedbackPanel.mock.calls[0][0]

    // ACT: User switches to insights tab via panel
    panelProps.onTabChange('insights')

    // ASSERT: setActiveTab from useFeedbackPanel was called with new tab
    expect(mockSetActiveTab).toHaveBeenCalledWith('insights')
  })
})
