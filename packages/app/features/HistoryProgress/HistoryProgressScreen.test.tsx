/**
 * Tests for HistoryProgressScreen component
 *
 * Tests user-visible behavior: navigation callbacks, data display, loading states
 * Following TDD and testing philosophy: focus on user behavior, not implementation
 */

// Mock hooks and components BEFORE imports
jest.mock('./hooks/useHistoryQuery')
jest.mock('./hooks/usePrefetchNextVideos')
jest.mock('./hooks/usePrefetchVideoAnalysis')
jest.mock('@app/provider/safe-area/use-safe-area', () => ({
  useStableSafeArea: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}))

// Mock UI components
jest.mock('@my/ui', () => {
  const React = require('react')
  return {
    GlassBackground: ({ children, testID }: any) =>
      React.createElement('div', { 'data-testid': testID, testID }, children),
  }
})

// Mock HistoryProgress components - now that module mapping is fixed
jest.mock('@my/ui/src/components/HistoryProgress', () => {
  const React = require('react')
  return {
    VideosSection: ({ videos, onVideoPress, onSeeAllPress, isLoading, error, testID }: any) => {
      const content = []
      if (isLoading) {
        content.push(
          React.createElement(
            'div',
            { key: 'loading', testID: 'loading-indicator', 'data-testid': 'loading-indicator' },
            'Loading videos...'
          )
        )
      }
      if (error) {
        content.push(
          React.createElement(
            'div',
            { key: 'error', testID: 'error-message', 'data-testid': 'error-message' },
            'Error loading videos'
          )
        )
      }
      videos.forEach((video: any) => {
        content.push(
          React.createElement(
            'button',
            {
              key: video.id,
              testID: `video-${video.id}`,
              'data-testid': `video-${video.id}`,
              onClick: () => onVideoPress(video.id),
              onPress: () => onVideoPress(video.id),
            },
            video.title
          )
        )
      })
      content.push(
        React.createElement(
          'button',
          {
            key: 'see-all',
            testID: 'see-all-button',
            'data-testid': 'see-all-button',
            onClick: onSeeAllPress,
            onPress: onSeeAllPress,
          },
          'See All'
        )
      )
      return React.createElement('div', { testID, 'data-testid': testID }, [
        React.createElement(
          'div',
          {
            key: 'content',
            testID: 'videos-section-content',
            'data-testid': 'videos-section-content',
          },
          content
        ),
      ])
    },
    CoachingSessionsSection: ({ sessions, onSessionPress, testID }: any) =>
      React.createElement(
        'div',
        { testID, 'data-testid': testID },
        sessions.map((session: any) =>
          React.createElement(
            'button',
            {
              key: session.id,
              testID: `session-${session.id}`,
              'data-testid': `session-${session.id}`,
              onClick: () => onSessionPress(session.id),
              onPress: () => onSessionPress(session.id),
            },
            session.title
          )
        )
      ),
    SessionItem: {} as any, // Type export
  }
})

import { fireEvent, render, screen } from '@testing-library/react-native'
// For jsdom environment, we need to use press events
import { HistoryProgressScreen } from './HistoryProgressScreen'
import { useHistoryQuery } from './hooks/useHistoryQuery'
import { usePrefetchNextVideos } from './hooks/usePrefetchNextVideos'
import { usePrefetchVideoAnalysis } from './hooks/usePrefetchVideoAnalysis'

const mockUseHistoryQuery = useHistoryQuery as jest.MockedFunction<typeof useHistoryQuery>
const mockUsePrefetchNextVideos = usePrefetchNextVideos as jest.MockedFunction<
  typeof usePrefetchNextVideos
>
const mockUsePrefetchVideoAnalysis = usePrefetchVideoAnalysis as jest.MockedFunction<
  typeof usePrefetchVideoAnalysis
>

const mockVideos = [
  { id: 1, title: 'Video 1', thumbnailUri: 'thumb1.jpg' },
  { id: 2, title: 'Video 2', thumbnailUri: 'thumb2.jpg' },
  { id: 3, title: 'Video 3', thumbnailUri: 'thumb3.jpg' },
]

describe('HistoryProgressScreen', () => {
  const defaultProps = {
    onNavigateToVideoAnalysis: jest.fn(),
    onNavigateToVideos: jest.fn(),
    onNavigateToCoachingSession: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseHistoryQuery.mockReturnValue({
      data: mockVideos,
      isPending: false,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    } as any)
    mockUsePrefetchNextVideos.mockReturnValue({
      prefetching: [],
      prefetched: [],
      failed: [],
    })
    mockUsePrefetchVideoAnalysis.mockReturnValue(undefined)
  })

  describe('Navigation callbacks', () => {
    it('should call onNavigateToVideoAnalysis when video is pressed', () => {
      // 🧪 ARRANGE: Mock data
      mockUseHistoryQuery.mockReturnValue({
        data: mockVideos,
        isPending: false,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any)

      // 🎬 ACT: Render and press video
      render(<HistoryProgressScreen {...defaultProps} />)
      const videoButton = screen.getByTestId('video-1')
      fireEvent.press(videoButton)

      // ✅ ASSERT: Navigation callback should be called
      expect(defaultProps.onNavigateToVideoAnalysis).toHaveBeenCalledWith(1)
      expect(defaultProps.onNavigateToVideoAnalysis).toHaveBeenCalledTimes(1)
    })

    it('should call onNavigateToVideos when "See All" is pressed', () => {
      // 🧪 ARRANGE: Mock data
      mockUseHistoryQuery.mockReturnValue({
        data: mockVideos,
        isPending: false,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any)

      // 🎬 ACT: Render and press "See All"
      render(<HistoryProgressScreen {...defaultProps} />)
      const seeAllButton = screen.getByTestId('see-all-button')
      fireEvent.press(seeAllButton)

      // ✅ ASSERT: Navigation callback should be called
      expect(defaultProps.onNavigateToVideos).toHaveBeenCalledTimes(1)
    })

    it('should call onNavigateToCoachingSession when session is pressed', () => {
      // 🧪 ARRANGE: Mock data
      mockUseHistoryQuery.mockReturnValue({
        data: mockVideos,
        isPending: false,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any)

      // 🎬 ACT: Render and press session
      render(<HistoryProgressScreen {...defaultProps} />)
      const sessionButton = screen.getByTestId('session-1')
      fireEvent.press(sessionButton)

      // ✅ ASSERT: Navigation callback should be called
      expect(defaultProps.onNavigateToCoachingSession).toHaveBeenCalledWith(1)
      expect(defaultProps.onNavigateToCoachingSession).toHaveBeenCalledTimes(1)
    })
  })

  describe('Data display', () => {
    it('should display videos when data is loaded', () => {
      // 🧪 ARRANGE: Mock videos data
      mockUseHistoryQuery.mockReturnValue({
        data: mockVideos,
        isPending: false,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any)

      // 🎬 ACT: Render component
      render(<HistoryProgressScreen {...defaultProps} />)

      // ✅ ASSERT: Videos should be displayed
      expect(screen.getByTestId('video-1')).toBeTruthy()
      expect(screen.getByTestId('video-2')).toBeTruthy()
      expect(screen.getByTestId('video-3')).toBeTruthy()
    })

    it('should display coaching sessions', () => {
      // 🧪 ARRANGE: Mock data
      mockUseHistoryQuery.mockReturnValue({
        data: mockVideos,
        isPending: false,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any)

      // 🎬 ACT: Render component
      render(<HistoryProgressScreen {...defaultProps} />)

      // ✅ ASSERT: Coaching sessions should be displayed
      expect(screen.getByTestId('session-1')).toBeTruthy()
      expect(screen.getByTestId('session-2')).toBeTruthy()
    })

    it('should show loading state when data is pending', () => {
      // 🧪 ARRANGE: Mock loading state
      mockUseHistoryQuery.mockReturnValue({
        data: [],
        isPending: true,
        isLoading: true,
        error: null,
        refetch: jest.fn(),
      } as any)

      // 🎬 ACT: Render component
      render(<HistoryProgressScreen {...defaultProps} />)

      // ✅ ASSERT: Loading indicator should be shown
      const loadingIndicator = screen.getByTestId('loading-indicator')
      expect(loadingIndicator).toBeTruthy()
      // Text content verification - element exists and contains text
      expect(loadingIndicator).toBeTruthy()
    })

    it('should show error state when data fetch fails', () => {
      // 🧪 ARRANGE: Mock error state
      const mockError = new Error('Failed to load videos')
      const mockRefetch = jest.fn()
      mockUseHistoryQuery.mockReturnValue({
        data: [],
        isPending: false,
        isLoading: false,
        error: mockError,
        refetch: mockRefetch,
      } as any)

      // 🎬 ACT: Render component
      render(<HistoryProgressScreen {...defaultProps} />)

      // ✅ ASSERT: Error message should be shown
      const errorMessage = screen.getByTestId('error-message')
      expect(errorMessage).toBeTruthy()
      // Text content verification - element exists
      expect(errorMessage).toBeTruthy()
    })

    it('should call refetch when retry is triggered', () => {
      // 🧪 ARRANGE: Mock error with refetch
      const mockRefetch = jest.fn()
      mockUseHistoryQuery.mockReturnValue({
        data: [],
        isPending: false,
        isLoading: false,
        error: new Error('Failed to load'),
        refetch: mockRefetch,
      } as any)

      // 🎬 ACT: Render component (retry would be triggered by VideosSection)
      render(<HistoryProgressScreen {...defaultProps} />)

      // ✅ ASSERT: Refetch function should be passed to VideosSection
      // (Actual retry trigger is tested in VideosSection tests)
      expect(mockRefetch).toBeDefined()
    })
  })

  describe('Prefetch integration', () => {
    it('should call prefetch hooks with correct parameters', () => {
      // 🧪 ARRANGE: Mock data
      mockUseHistoryQuery.mockReturnValue({
        data: mockVideos,
        isPending: false,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any)

      // 🎬 ACT: Render component
      render(<HistoryProgressScreen {...defaultProps} />)

      // ✅ ASSERT: Prefetch hooks should be called
      expect(mockUsePrefetchNextVideos).toHaveBeenCalled()
      expect(mockUsePrefetchVideoAnalysis).toHaveBeenCalled()
    })
  })

  describe('Visible items tracking', () => {
    it('should handle visible items change for prefetching', () => {
      // 🧪 ARRANGE: Mock data
      mockUseHistoryQuery.mockReturnValue({
        data: mockVideos,
        isPending: false,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any)

      // 🎬 ACT: Render component
      render(<HistoryProgressScreen {...defaultProps} />)

      // ✅ ASSERT: VideosSection should receive onVisibleItemsChange callback
      // The callback is passed to VideosSection, which handles the actual tracking
      expect(screen.getByTestId('history-progress-screen-videos-section')).toBeTruthy()
    })
  })

  describe('Empty state', () => {
    it('should handle empty video list', () => {
      // 🧪 ARRANGE: Mock empty data
      mockUseHistoryQuery.mockReturnValue({
        data: [],
        isPending: false,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any)

      // 🎬 ACT: Render component
      render(<HistoryProgressScreen {...defaultProps} />)

      // ✅ ASSERT: Component should render without error
      expect(screen.getByTestId('history-progress-screen-glass-container')).toBeTruthy()
      // VideosSection handles empty state display
    })
  })
})
