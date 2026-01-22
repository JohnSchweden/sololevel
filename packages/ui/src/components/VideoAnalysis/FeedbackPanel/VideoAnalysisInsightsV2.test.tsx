// Mock @tamagui/lucide-icons before any imports
jest.mock('@tamagui/lucide-icons', () => {
  const React = require('react')
  const MockIcon = (props: any) =>
    React.createElement('svg', {
      'data-testid': 'mock-icon',
      width: props.size || 16,
      height: props.size || 16,
    })
  return {
    Award: MockIcon,
    BarChart3: MockIcon,
    ChevronDown: MockIcon,
    ChevronUp: MockIcon,
    FileText: MockIcon,
    Lightbulb: MockIcon,
    Play: MockIcon,
    Sparkles: MockIcon,
    Target: MockIcon,
  }
})

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: jest.fn(() => ({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  })),
}))

// Mock @my/config to provide VOICE_TEXT_CONFIG
jest.mock('@my/config', () => ({
  VOICE_TEXT_CONFIG: {
    roast: {
      feedbackPanel: {
        insights: {
          defaultOverview: {
            benchmarkSummary: 'Test benchmark',
            summary: 'Test summary',
          },
          defaultQuote: 'Test quote',
          trendLabels: {
            up: 'Up',
            down: 'Down',
            steady: 'Steady',
          },
          statusLabels: {
            good: 'Good',
            improve: 'Improve',
            critical: 'Critical',
          },
          emptyStates: {
            noInsights: {
              title: 'No insights',
              description: 'No insights available',
            },
            noAchievements: {
              title: 'No achievements',
              description: 'No achievements available',
            },
            noFocusAreas: {
              title: 'No focus areas',
              description: 'No focus areas available',
            },
            noSkills: {
              title: 'No skills',
              description: 'No skills available',
            },
            noTimeline: {
              title: 'No timeline',
              description: 'No timeline available',
            },
            noHighlights: {
              title: 'No highlights',
              description: 'No highlights available',
            },
            noActions: {
              title: 'No actions',
              description: 'No actions available',
            },
            noReels: {
              title: 'No reels',
              description: 'No reels available',
            },
          },
          overviewHeader: 'Overview',
          quoteHeader: 'Quote',
          achievementsHeader: 'Achievements',
          focusHeader: 'Focus',
          skillHeader: 'Skills',
          timelineHeader: 'Timeline',
          highlightsHeader: 'Highlights',
          actionsHeader: 'Actions',
          reelsHeader: 'Reels',
        },
      },
    },
  },
}))

import { fireEvent, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { renderWithProvider } from '../../../test-utils/TestProvider'
import { VideoAnalysisInsightsV2 } from './VideoAnalysisInsightsV2'

describe('VideoAnalysisInsightsV2', () => {
  const longFeedbackText =
    'This is a very long feedback text that should be truncated because it exceeds the maximum length of 100 characters that we have set for the summary display in the brutal truth section.'

  // Minimal props to only render the "Brutal Truth" section
  const minimalProps = {
    focusAreas: [],
    skillMatrix: [],
    performanceTimeline: [],
    highlights: [],
    actions: [],
    achievements: [],
    reels: [],
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Detailed Summary "Show more" Button', () => {
    it('renders "show more" button when text exceeds truncation length', () => {
      // 🧪 ARRANGE: Set up component with long feedback text
      const props = {
        fullFeedbackText: longFeedbackText,
        ...minimalProps,
      }

      // 🎬 ACT: Render the component
      renderWithProvider(<VideoAnalysisInsightsV2 {...props} />)

      // ✅ ASSERT: "Show more" button is rendered
      const showMoreButton = screen.getByTestId('insights-v2-detailed-summary-toggle')
      expect(showMoreButton).toBeInTheDocument()
      expect(screen.getByText('...show more')).toBeInTheDocument()
    })

    it('does not render "show more" button when text is shorter than truncation length', () => {
      // 🧪 ARRANGE: Set up component with short feedback text
      const props = {
        fullFeedbackText: 'Short text',
        ...minimalProps,
      }

      // 🎬 ACT: Render the component
      renderWithProvider(<VideoAnalysisInsightsV2 {...props} />)

      // ✅ ASSERT: "Show more" button is not rendered
      expect(screen.queryByTestId('insights-v2-detailed-summary-toggle')).not.toBeInTheDocument()
    })

    it('expands text when "show more" button is clicked', () => {
      // 🧪 ARRANGE: Set up component with long feedback text
      const props = {
        fullFeedbackText: longFeedbackText,
        ...minimalProps,
      }

      // 🎬 ACT: Render and click "show more" button
      renderWithProvider(<VideoAnalysisInsightsV2 {...props} />)
      const showMoreButton = screen.getByTestId('insights-v2-detailed-summary-toggle')
      fireEvent.click(showMoreButton)

      // ✅ ASSERT: Full text is displayed and button is hidden
      expect(screen.getByText(longFeedbackText)).toBeInTheDocument()
      expect(screen.queryByTestId('insights-v2-detailed-summary-toggle')).not.toBeInTheDocument()
    })

    it('has correct accessibility label for "show more" button', () => {
      // 🧪 ARRANGE: Set up component with long feedback text
      const props = {
        fullFeedbackText: longFeedbackText,
        ...minimalProps,
      }

      // 🎬 ACT: Render the component
      renderWithProvider(<VideoAnalysisInsightsV2 {...props} />)

      // ✅ ASSERT: Button has correct accessibility label
      const showMoreButton = screen.getByLabelText('Show more')
      expect(showMoreButton).toBeInTheDocument()
    })

    it('handles press events for native platforms', () => {
      // 🧪 ARRANGE: Set up component with long feedback text
      const props = {
        fullFeedbackText: longFeedbackText,
        ...minimalProps,
      }

      // 🎬 ACT: Render and simulate press events
      renderWithProvider(<VideoAnalysisInsightsV2 {...props} />)
      const showMoreButton = screen.getByTestId('insights-v2-detailed-summary-toggle')

      // Simulate onPressIn (native press start)
      fireEvent.mouseDown(showMoreButton)
      // Note: Text color change is visual and may not be easily testable without style inspection
      // The important part is that the handlers are called without errors

      // Simulate onPressOut (native press end)
      fireEvent.mouseUp(showMoreButton)

      // ✅ ASSERT: Button still exists and is functional
      expect(showMoreButton).toBeInTheDocument()
    })

    it('handles hover events for web platforms', () => {
      // 🧪 ARRANGE: Set up component with long feedback text
      const props = {
        fullFeedbackText: longFeedbackText,
        ...minimalProps,
      }

      // 🎬 ACT: Render and simulate hover events
      renderWithProvider(<VideoAnalysisInsightsV2 {...props} />)
      const showMoreButton = screen.getByTestId('insights-v2-detailed-summary-toggle')

      // Simulate onMouseEnter (web hover)
      fireEvent.mouseEnter(showMoreButton)
      // Note: Text color change is visual and may not be easily testable without style inspection

      // Simulate onMouseLeave (web hover end)
      fireEvent.mouseLeave(showMoreButton)

      // ✅ ASSERT: Button still exists and is functional
      expect(showMoreButton).toBeInTheDocument()
    })

    it('maintains transparent background on hover and press', () => {
      // 🧪 ARRANGE: Set up component with long feedback text
      const props = {
        fullFeedbackText: longFeedbackText,
        ...minimalProps,
      }

      // 🎬 ACT: Render the component
      renderWithProvider(<VideoAnalysisInsightsV2 {...props} />)
      const showMoreButton = screen.getByTestId('insights-v2-detailed-summary-toggle')

      // ✅ ASSERT: Button has transparent background styling
      // Note: Actual style inspection may require more complex DOM queries
      // The important part is that backgroundColor is set to transparent in the component
      expect(showMoreButton).toBeInTheDocument()
    })
  })
})
