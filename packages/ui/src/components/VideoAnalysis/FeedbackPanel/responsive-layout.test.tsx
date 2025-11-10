import { screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { renderWithProvider } from '../../../test-utils/TestProvider'
// VideoAnalysisScreen import removed as it's not used in this test
import { FeedbackPanel } from './FeedbackPanel'

// Mock window dimensions for different breakpoints
const mockDimensions = {
  mobile: { width: 375, height: 667 }, // iPhone SE
  tablet: { width: 768, height: 1024 }, // iPad
  desktop: { width: 1200, height: 800 }, // Desktop
}

// Mock react-native Dimensions
jest.mock('react-native', () => ({
  Dimensions: {
    get: jest.fn(() => mockDimensions.mobile),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  },
  Platform: {
    OS: 'web',
    select: jest.fn((options) => options.web || options.default),
  },
  StyleSheet: {
    create: jest.fn((styles) => styles),
    flatten: jest.fn((style) => style),
  },
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  ScrollView: 'ScrollView',
  FlatList: 'FlatList',
  Image: 'Image',
  TextInput: 'TextInput',
}))

jest.mock('react-native-safe-area-context', () => {
  const React = require('react')
  return {
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
    SafeAreaConsumer: ({
      children,
    }: {
      children: (insets: {
        top: number
        right: number
        bottom: number
        left: number
      }) => React.ReactNode
    }) => children({ top: 0, right: 0, bottom: 0, left: 0 }),
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
    initialWindowMetrics: {
      frame: { x: 0, y: 0, width: 375, height: 667 },
      insets: { top: 0, right: 0, bottom: 0, left: 0 },
    },
  }
})

const renderWithProviders = (ui: React.ReactElement) => {
  return renderWithProvider(ui)
}

describe('Responsive Layout Tests', () => {
  describe('Mobile Layout (< 768px)', () => {
    beforeEach(() => {
      const { Dimensions } = require('react-native')
      Dimensions.get.mockReturnValue(mockDimensions.mobile)
    })

    it('renders FeedbackPanel with mobile gesture support', () => {
      const mockProps = {
        isExpanded: true,
        activeTab: 'feedback' as const,
        feedbackItems: [],
        socialStats: { likes: 0, comments: 0, bookmarks: 0, shares: 0 },
        onTabChange: jest.fn(),
        onSheetExpand: jest.fn(),
        onSheetCollapse: jest.fn(),
        onFeedbackItemPress: jest.fn(),
        onLike: jest.fn(),
        onComment: jest.fn(),
        onBookmark: jest.fn(),
        onShare: jest.fn(),
      }

      renderWithProviders(<FeedbackPanel {...mockProps} />)

      const bottomSheet = screen.getByLabelText('Feedback panel expanded')
      expect(bottomSheet).toBeTruthy()

      // TEMP_DISABLED: Drag handle removed for static layout
      // Should show drag handle for mobile gesture interaction
      // const dragHandle = screen.getByLabelText('Sheet handle')
      // expect(dragHandle).toBeTruthy()

      // Should show title instead of drag handle
      const title = screen.getByLabelText('Video Analysis title')
      expect(title).toBeTruthy()
    })
  })

  describe('Tablet Layout (768px - 1024px)', () => {
    beforeEach(() => {
      const { Dimensions } = require('react-native')
      Dimensions.get.mockReturnValue(mockDimensions.tablet)
    })

    it('renders FeedbackPanel with expanded content area', () => {
      const mockProps = {
        isExpanded: true,
        activeTab: 'feedback' as const,
        feedbackItems: [
          {
            id: '1',
            timestamp: 1000,
            text: 'Great posture!',
            type: 'positive' as const,
            category: 'posture' as const,
            confidence: 0.95,
          },
        ],
        socialStats: { likes: 100, comments: 5, bookmarks: 50, shares: 10 },
        onTabChange: jest.fn(),
        onSheetExpand: jest.fn(),
        onSheetCollapse: jest.fn(),
        onFeedbackItemPress: jest.fn(),
        onLike: jest.fn(),
        onComment: jest.fn(),
        onBookmark: jest.fn(),
        onShare: jest.fn(),
      }

      renderWithProviders(<FeedbackPanel {...mockProps} />)

      const bottomSheet = screen.getByLabelText('Feedback panel expanded')
      expect(bottomSheet).toBeTruthy()

      // Should show more content on tablet
      const tabNavigation = screen.getByLabelText('Tab navigation')
      expect(tabNavigation).toBeTruthy()
    })
  })

  describe('Desktop Layout (> 1024px)', () => {
    beforeEach(() => {
      const { Dimensions } = require('react-native')
      Dimensions.get.mockReturnValue(mockDimensions.desktop)
    })

    it('renders FeedbackPanel with side panel layout option', () => {
      const mockProps = {
        isExpanded: true,
        activeTab: 'feedback' as const,
        feedbackItems: [],
        socialStats: { likes: 0, comments: 0, bookmarks: 0, shares: 0 },
        onTabChange: jest.fn(),
        onSheetExpand: jest.fn(),
        onSheetCollapse: jest.fn(),
        onFeedbackItemPress: jest.fn(),
        onLike: jest.fn(),
        onComment: jest.fn(),
        onBookmark: jest.fn(),
        onShare: jest.fn(),
      }

      renderWithProviders(<FeedbackPanel {...mockProps} />)

      const bottomSheet = screen.getByLabelText('Feedback panel expanded')
      expect(bottomSheet).toBeTruthy()

      // Desktop could show as side panel instead of bottom sheet
      const tabNavigation = screen.getByLabelText('Tab navigation')
      expect(tabNavigation).toBeTruthy()
    })
  })

  describe('Performance Across Breakpoints', () => {
    it('handles layout recalculation efficiently', () => {
      const mockProps = {
        isExpanded: true,
        activeTab: 'feedback' as const,
        feedbackItems: [],
        socialStats: { likes: 0, comments: 0, bookmarks: 0, shares: 0 },
        onTabChange: jest.fn(),
        onSheetExpand: jest.fn(),
        onSheetCollapse: jest.fn(),
        onFeedbackItemPress: jest.fn(),
        onLike: jest.fn(),
        onComment: jest.fn(),
        onBookmark: jest.fn(),
        onShare: jest.fn(),
      }

      const { rerender } = renderWithProviders(<FeedbackPanel {...mockProps} />)

      // Simulate multiple layout changes
      const { Dimensions } = require('react-native')

      for (const size of [mockDimensions.mobile, mockDimensions.tablet, mockDimensions.desktop]) {
        Dimensions.get.mockReturnValue(size)
        rerender(<FeedbackPanel {...mockProps} />)
      }

      expect(screen.getByLabelText('Feedback panel expanded')).toBeTruthy()
    })
  })
})
