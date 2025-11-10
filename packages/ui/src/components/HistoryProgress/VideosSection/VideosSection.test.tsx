import { fireEvent, screen } from '@testing-library/react'
import { renderWithProvider } from '../../../test-utils/TestProvider'
import { VideosSection } from './VideosSection'

// Mock video data
const mockVideos = [
  {
    id: 1,
    videoId: 10,
    title: 'Golf Swing Analysis',
    createdAt: '2025-10-11T10:00:00Z',
    thumbnailUri: 'https://example.com/thumb1.jpg',
  },
  {
    id: 2,
    videoId: 20,
    title: 'Running Form',
    createdAt: '2025-10-10T14:30:00Z',
    thumbnailUri: 'https://example.com/thumb2.jpg',
  },
  {
    id: 3,
    videoId: 30,
    title: 'Yoga Pose Check',
    createdAt: '2025-10-09T09:15:00Z',
    thumbnailUri: 'https://example.com/thumb3.jpg',
  },
]

describe('VideosSection', () => {
  const mockOnVideoPress = jest.fn()
  const mockOnSeeAllPress = jest.fn()
  const mockOnRetry = jest.fn()
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ARRANGE: Setup
  // ACT: Render and interaction
  // ASSERT: Expected behavior

  describe('Rendering - Success State', () => {
    it('should render section header with title', () => {
      // ARRANGE & ACT: Render with videos
      const { getByText } = renderWithProvider(
        <VideosSection
          videos={mockVideos}
          onVideoPress={mockOnVideoPress}
          onSeeAllPress={mockOnSeeAllPress}
        />
      )

      // ASSERT: Header title visible
      expect(getByText('Videos')).toBeTruthy()
    })

    it('should render "See all" button', () => {
      // ARRANGE & ACT: Render with videos
      const { getByTestId } = renderWithProvider(
        <VideosSection
          videos={mockVideos}
          onVideoPress={mockOnVideoPress}
          onSeeAllPress={mockOnSeeAllPress}
        />
      )

      // ASSERT: "See all" button rendered
      expect(getByTestId('videos-section-see-all-button')).toBeTruthy()
    })

    it('should render all provided video thumbnails', () => {
      // ARRANGE & ACT: Render with 3 videos
      const { getByTestId } = renderWithProvider(
        <VideosSection
          videos={mockVideos}
          onVideoPress={mockOnVideoPress}
          onSeeAllPress={mockOnSeeAllPress}
        />
      )

      // ASSERT: All 3 thumbnails rendered
      expect(getByTestId('videos-section-thumbnail-1')).toBeTruthy()
      expect(getByTestId('videos-section-thumbnail-2')).toBeTruthy()
      expect(getByTestId('videos-section-thumbnail-3')).toBeTruthy()
    })

    it('should render all videos when many provided', () => {
      // ARRANGE: 5 videos
      const manyVideos = [
        ...mockVideos,
        { id: 4, videoId: 40, title: 'Video 4', createdAt: '2025-10-08T10:00:00Z' },
        { id: 5, videoId: 50, title: 'Video 5', createdAt: '2025-10-07T10:00:00Z' },
      ]

      // ACT: Render with 5 videos
      const { getByTestId } = renderWithProvider(
        <VideosSection
          videos={manyVideos}
          onVideoPress={mockOnVideoPress}
          onSeeAllPress={mockOnSeeAllPress}
        />
      )

      // ASSERT: All 5 rendered (component doesn't limit, caller does)
      expect(getByTestId('videos-section-thumbnail-1')).toBeTruthy()
      expect(getByTestId('videos-section-thumbnail-2')).toBeTruthy()
      expect(getByTestId('videos-section-thumbnail-3')).toBeTruthy()
      expect(getByTestId('videos-section-thumbnail-4')).toBeTruthy()
      expect(getByTestId('videos-section-thumbnail-5')).toBeTruthy()
    })

    it('should render single video', () => {
      // ARRANGE & ACT: Render with 1 video
      const { getByTestId, queryByTestId } = renderWithProvider(
        <VideosSection
          videos={[mockVideos[0]]}
          onVideoPress={mockOnVideoPress}
          onSeeAllPress={mockOnSeeAllPress}
        />
      )

      // ASSERT: Only 1 thumbnail rendered
      expect(getByTestId('videos-section-thumbnail-1')).toBeTruthy()
      expect(queryByTestId('videos-section-thumbnail-2')).toBeNull()
    })

    it('should render horizontal ScrollView', () => {
      // ARRANGE & ACT: Render with videos
      const { getByTestId } = renderWithProvider(
        <VideosSection
          videos={mockVideos}
          onVideoPress={mockOnVideoPress}
          onSeeAllPress={mockOnSeeAllPress}
        />
      )

      // ASSERT: ScrollView exists
      expect(getByTestId('videos-section-scroll')).toBeTruthy()
    })
  })

  describe('Rendering - Loading State', () => {
    it('should render loading spinner when loading', () => {
      // ARRANGE & ACT: Render in loading state
      const { getByTestId, getByText } = renderWithProvider(
        <VideosSection
          videos={[]}
          onVideoPress={mockOnVideoPress}
          onSeeAllPress={mockOnSeeAllPress}
          isLoading={true}
        />
      )

      // ASSERT: Loading indicator visible
      expect(getByTestId('videos-section-loading')).toBeTruthy()
      expect(getByText('Loading videos...')).toBeTruthy()
    })

    it('should not render thumbnails when loading', () => {
      // ARRANGE & ACT: Render in loading state
      const { queryByTestId } = renderWithProvider(
        <VideosSection
          videos={mockVideos}
          onVideoPress={mockOnVideoPress}
          onSeeAllPress={mockOnSeeAllPress}
          isLoading={true}
        />
      )

      // ASSERT: No thumbnails rendered
      expect(queryByTestId('videos-section-scroll')).toBeNull()
    })
  })

  describe('Rendering - Error State', () => {
    it('should render error message when error occurs', () => {
      // ARRANGE: Error object
      const error = new Error('Network error')

      // ACT: Render in error state
      const { getByTestId, getByText } = renderWithProvider(
        <VideosSection
          videos={[]}
          onVideoPress={mockOnVideoPress}
          onSeeAllPress={mockOnSeeAllPress}
          error={error}
          onRetry={mockOnRetry}
        />
      )

      // ASSERT: Error message visible
      expect(getByTestId('videos-section-error')).toBeTruthy()
      expect(getByText('Failed to load videos')).toBeTruthy()
      expect(getByText('Network error')).toBeTruthy()
    })

    it('should render retry button when error and onRetry provided', () => {
      // ARRANGE: Error with retry handler
      const error = new Error('Network error')

      // ACT: Render in error state
      const { getByTestId } = renderWithProvider(
        <VideosSection
          videos={[]}
          onVideoPress={mockOnVideoPress}
          onSeeAllPress={mockOnSeeAllPress}
          error={error}
          onRetry={mockOnRetry}
        />
      )

      // ASSERT: Retry button rendered
      expect(getByTestId('videos-section-retry-button')).toBeTruthy()
    })

    it('should not render retry button when no onRetry handler', () => {
      // ARRANGE: Error without retry handler
      const error = new Error('Network error')

      // ACT: Render without onRetry
      const { queryByTestId } = renderWithProvider(
        <VideosSection
          videos={[]}
          onVideoPress={mockOnVideoPress}
          onSeeAllPress={mockOnSeeAllPress}
          error={error}
        />
      )

      // ASSERT: No retry button
      expect(queryByTestId('videos-section-retry-button')).toBeNull()
    })
  })

  describe('Rendering - Empty State', () => {
    it('should render empty state when no videos', () => {
      // ARRANGE & ACT: Render with empty array
      const { getByTestId, getByText } = renderWithProvider(
        <VideosSection
          videos={[]}
          onVideoPress={mockOnVideoPress}
          onSeeAllPress={mockOnSeeAllPress}
        />
      )

      // ASSERT: Empty state visible
      expect(getByTestId('videos-section-empty')).toBeTruthy()
      expect(getByText('No videos yet')).toBeTruthy()
      expect(getByText('Record your first video to see it here')).toBeTruthy()
    })

    it('should not render empty state when loading', () => {
      // ARRANGE & ACT: Loading state with empty videos
      const { queryByTestId } = renderWithProvider(
        <VideosSection
          videos={[]}
          onVideoPress={mockOnVideoPress}
          onSeeAllPress={mockOnSeeAllPress}
          isLoading={true}
        />
      )

      // ASSERT: Empty state not shown during loading
      expect(queryByTestId('videos-section-empty')).toBeNull()
    })
  })

  describe('Interaction', () => {
    it('should call onVideoPress with correct analysisId when thumbnail pressed', async () => {
      // ARRANGE: Render with videos
      renderWithProvider(
        <VideosSection
          videos={mockVideos}
          onVideoPress={mockOnVideoPress}
          onSeeAllPress={mockOnSeeAllPress}
        />
      )

      // ACT: Click first thumbnail
      fireEvent.click(screen.getByTestId('videos-section-thumbnail-1'))

      // ASSERT: Handler called with correct ID
      expect(mockOnVideoPress).toHaveBeenCalledTimes(1)
      expect(mockOnVideoPress).toHaveBeenCalledWith(1)
    })

    it('should call onSeeAllPress when "See all" button pressed', async () => {
      // ARRANGE: Render with videos
      renderWithProvider(
        <VideosSection
          videos={mockVideos}
          onVideoPress={mockOnVideoPress}
          onSeeAllPress={mockOnSeeAllPress}
        />
      )

      // ACT: Click "See all" button
      fireEvent.click(screen.getByRole('button', { name: /see all/i }))

      // ASSERT: Handler called
      expect(mockOnSeeAllPress).toHaveBeenCalledTimes(1)
    })

    it('should call onRetry when retry button pressed', async () => {
      // ARRANGE: Render in error state
      const error = new Error('Network error')
      renderWithProvider(
        <VideosSection
          videos={[]}
          onVideoPress={mockOnVideoPress}
          onSeeAllPress={mockOnSeeAllPress}
          error={error}
          onRetry={mockOnRetry}
        />
      )

      // ACT: Click retry button
      fireEvent.click(screen.getByRole('button', { name: /retry/i }))

      // ASSERT: Handler called
      expect(mockOnRetry).toHaveBeenCalledTimes(1)
    })

    it('should call onVideoPress for different thumbnails with correct IDs', async () => {
      // ARRANGE: Render with multiple videos
      renderWithProvider(
        <VideosSection
          videos={mockVideos}
          onVideoPress={mockOnVideoPress}
          onSeeAllPress={mockOnSeeAllPress}
        />
      )

      // ACT: Click second thumbnail
      fireEvent.click(screen.getByTestId('videos-section-thumbnail-2'))

      // ASSERT: Handler called with ID 2
      expect(mockOnVideoPress).toHaveBeenCalledWith(2)

      // ACT: Click third thumbnail
      fireEvent.click(screen.getByTestId('videos-section-thumbnail-3'))

      // ASSERT: Handler called with ID 3
      expect(mockOnVideoPress).toHaveBeenCalledWith(3)
    })
  })

  describe('Accessibility', () => {
    it('should have accessible "See all" button', () => {
      // ARRANGE & ACT: Render with videos
      renderWithProvider(
        <VideosSection
          videos={mockVideos}
          onVideoPress={mockOnVideoPress}
          onSeeAllPress={mockOnSeeAllPress}
        />
      )

      // ASSERT: Button has proper accessibility
      const button = screen.getByRole('button', { name: /see all/i })
      expect(button).toBeInTheDocument()
      expect(button).toHaveAccessibleName('See all videos')
    })

    it('should pass accessibility labels to thumbnail cards', () => {
      // ARRANGE & ACT: Render with videos
      renderWithProvider(
        <VideosSection
          videos={[mockVideos[0]]}
          onVideoPress={mockOnVideoPress}
          onSeeAllPress={mockOnSeeAllPress}
        />
      )

      // ASSERT: Thumbnail has accessibility label with title and date
      const thumbnail = screen.getByTestId('videos-section-thumbnail-1')
      const label = thumbnail.getAttribute('aria-label')
      expect(label).toContain('Golf Swing Analysis')
    })
  })

  describe('Custom Test ID', () => {
    it('should accept custom testID', () => {
      // ARRANGE & ACT: Render with custom testID
      const { getByTestId } = renderWithProvider(
        <VideosSection
          videos={mockVideos}
          onVideoPress={mockOnVideoPress}
          onSeeAllPress={mockOnSeeAllPress}
          testID="custom-videos"
        />
      )

      // ASSERT: Custom testID used
      expect(getByTestId('custom-videos')).toBeTruthy()
      expect(getByTestId('custom-videos-header')).toBeTruthy()
      expect(getByTestId('custom-videos-see-all-button')).toBeTruthy()
    })
  })
})
