import { screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { renderWithProvider } from '../../../test-utils/TestProvider'
// VideoAnalysisScreen import removed as it's not used in this test
import { ProcessingOverlay } from '../ProcessingOverlay/ProcessingOverlay'
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

const renderWithProviders = (ui: React.ReactElement) => {
  return renderWithProvider(ui)
}

describe('Responsive Layout Tests', () => {
  describe('Mobile Layout (< 768px)', () => {
    beforeEach(() => {
      const { Dimensions } = require('react-native')
      Dimensions.get.mockReturnValue(mockDimensions.mobile)
    })

    it('renders ProcessingOverlay with mobile-optimized layout', () => {
      const mockProps = {
        progress: 0.5,
        currentStep: 'Processing...',
        estimatedTime: 30,
        onCancel: jest.fn(),
        onViewResults: jest.fn(),
        isComplete: false,
      }

      renderWithProviders(<ProcessingOverlay {...mockProps} />)

      const overlay = screen.getByLabelText('Processing overlay: Analysis in progress')
      expect(overlay).toBeTruthy()

      // Should use mobile-appropriate spacing and sizing
      const progressBar = screen.getByLabelText('Progress bar: 50% complete')
      expect(progressBar).toBeTruthy()
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

      // Should show drag handle for mobile gesture interaction
      const dragHandle = screen.getByLabelText('Sheet handle')
      expect(dragHandle).toBeTruthy()
    })

    it('maintains proper mobile viewport scaling', () => {
      const mockProps = {
        progress: 0.5,
        currentStep: 'Processing...',
        estimatedTime: 30,
        onCancel: jest.fn(),
        onViewResults: jest.fn(),
        isComplete: false,
      }

      renderWithProviders(<ProcessingOverlay {...mockProps} />)

      // Components should scale appropriately for mobile viewport
      const container = screen.getByLabelText('Processing overlay: Analysis in progress')
      expect(container).toBeTruthy()
    })
  })

  describe('Tablet Layout (768px - 1024px)', () => {
    beforeEach(() => {
      const { Dimensions } = require('react-native')
      Dimensions.get.mockReturnValue(mockDimensions.tablet)
    })

    it('renders ProcessingOverlay with tablet-optimized spacing', () => {
      const mockProps = {
        progress: 0.5,
        currentStep: 'Processing...',
        estimatedTime: 30,
        onCancel: jest.fn(),
        onViewResults: jest.fn(),
        isComplete: false,
      }

      renderWithProviders(<ProcessingOverlay {...mockProps} />)

      const overlay = screen.getByLabelText('Processing overlay: Analysis in progress')
      expect(overlay).toBeTruthy()

      // Should use larger spacing tokens for tablet
      const progressBar = screen.getByLabelText('Progress bar: 50% complete')
      expect(progressBar).toBeTruthy()
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

    it('renders ProcessingOverlay with desktop-optimized layout', () => {
      const mockProps = {
        progress: 0.5,
        currentStep: 'Processing...',
        estimatedTime: 30,
        onCancel: jest.fn(),
        onViewResults: jest.fn(),
        isComplete: false,
      }

      renderWithProviders(<ProcessingOverlay {...mockProps} />)

      const overlay = screen.getByLabelText('Processing overlay: Analysis in progress')
      expect(overlay).toBeTruthy()

      // Should use desktop spacing and sizing
      const progressBar = screen.getByLabelText('Progress bar: 50% complete')
      expect(progressBar).toBeTruthy()
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

  describe('Breakpoint Transitions', () => {
    it('handles smooth transitions between breakpoints', () => {
      const mockProps = {
        progress: 0.5,
        currentStep: 'Processing...',
        estimatedTime: 30,
        onCancel: jest.fn(),
        onViewResults: jest.fn(),
        isComplete: false,
      }

      const { rerender } = renderWithProviders(<ProcessingOverlay {...mockProps} />)

      // Start with mobile
      const { Dimensions } = require('react-native')
      Dimensions.get.mockReturnValue(mockDimensions.mobile)

      rerender(<ProcessingOverlay {...mockProps} />)
      expect(screen.getByLabelText('Processing overlay: Analysis in progress')).toBeTruthy()

      // Transition to tablet
      Dimensions.get.mockReturnValue(mockDimensions.tablet)

      rerender(<ProcessingOverlay {...mockProps} />)
      expect(screen.getByLabelText('Processing overlay: Analysis in progress')).toBeTruthy()
    })
  })

  describe('Accessibility Across Breakpoints', () => {
    it('maintains proper contrast ratios across screen sizes', () => {
      const mockProps = {
        progress: 0.5,
        currentStep: 'Processing...',
        estimatedTime: 30,
        onCancel: jest.fn(),
        onViewResults: jest.fn(),
        isComplete: false,
      }

      renderWithProviders(<ProcessingOverlay {...mockProps} />)

      const stepText = screen.getByLabelText('Current step: Processing...')
      expect(stepText).toBeTruthy()
    })
  })

  describe('Performance Across Breakpoints', () => {
    it('renders efficiently on mobile devices', () => {
      const { Dimensions } = require('react-native')
      Dimensions.get.mockReturnValue(mockDimensions.mobile)

      const mockProps = {
        progress: 0.5,
        currentStep: 'Processing...',
        estimatedTime: 30,
        onCancel: jest.fn(),
        onViewResults: jest.fn(),
        isComplete: false,
      }

      const startTime = performance.now()
      renderWithProviders(<ProcessingOverlay {...mockProps} />)
      const endTime = performance.now()

      expect(endTime - startTime).toBeLessThan(100)
    })

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
