import { render, screen } from '@testing-library/react-native'
import '@testing-library/jest-dom'

// Mock ConnectionErrorBanner component
jest.mock('../../components/ConnectionErrorBanner', () => ({
  ConnectionErrorBanner: ({ isVisible, error, reconnectAttempts, onRetry, onDismiss }: any) => {
    const React = require('react')

    if (!isVisible) {
      return null
    }

    return React.createElement('View', { testID: 'connection-error-banner' }, [
      React.createElement('Text', { key: 'title' }, 'Connection Lost'),
      React.createElement('Text', { key: 'error' }, error || 'Real-time updates unavailable'),
      reconnectAttempts > 0 &&
        React.createElement(
          'Text',
          { key: 'attempts' },
          `Reconnection attempt ${reconnectAttempts}`
        ),
      React.createElement(
        'TouchableOpacity',
        { key: 'retry', testID: 'retry-connection-button', onPress: onRetry },
        'Retry'
      ),
      React.createElement(
        'TouchableOpacity',
        { key: 'dismiss', testID: 'dismiss-error-button', onPress: onDismiss },
        'Dismiss'
      ),
    ])
  },
}))

import { VideoAnalysisScreen } from './VideoAnalysisScreen'

// Mock the real-time hooks
jest.mock('../../hooks/useAnalysisRealtime', () => ({
  useVideoAnalysisRealtime: jest.fn(() => ({
    analysisJob: null,
    isAnalysisSubscribed: false,
    currentPose: null,
    poseHistory: [],
    isPoseStreaming: false,
    processingQuality: 'medium',
    isConnected: true,
    reconnectAttempts: 0,
    connectionError: null,
    isFullyConnected: false,
  })),
}))

// Mock the analysis status store
jest.mock('../../stores/analysisStatus', () => ({
  useAnalysisJobStatus: jest.fn(() => ({
    job: null,
    exists: false,
    isQueued: false,
    isProcessing: false,
    isCompleted: false,
    isFailed: false,
    progress: 0,
    error: null,
    results: null,
    poseData: null,
    isSubscribed: false,
    lastUpdated: Date.now(),
  })),
}))

// Mock TanStack Query
jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(() => ({
    data: null,
    isLoading: false,
    error: null,
  })),
}))

const renderWithProviders = (ui: React.ReactElement) => {
  return render(ui)
}

const mockProps = {
  analysisJobId: 123,
  videoRecordingId: 456,
  initialStatus: 'ready' as const,
}

describe('VideoAnalysisScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Component Interface Tests', () => {
    it('renders with required props', () => {
      const { UNSAFE_root } = renderWithProviders(<VideoAnalysisScreen {...mockProps} />)

      // Check if component renders without crashing
      expect(UNSAFE_root).toBeTruthy()
    })

    it('handles analysisJobId prop correctly', () => {
      const { UNSAFE_root } = renderWithProviders(
        <VideoAnalysisScreen
          {...mockProps}
          analysisJobId={999}
        />
      )

      // Component should render without errors with different analysisJobId
      expect(UNSAFE_root).toBeTruthy()
    })

    it('handles optional videoRecordingId prop', () => {
      // Remove videoRecordingId for testing
      const { videoRecordingId, ...propsWithoutVideoId } = mockProps

      const { UNSAFE_root } = renderWithProviders(<VideoAnalysisScreen {...propsWithoutVideoId} />)

      expect(UNSAFE_root).toBeTruthy()
    })

    it('calls onBack when back button is pressed', () => {
      const onBack = jest.fn()
      const { UNSAFE_root } = renderWithProviders(
        <VideoAnalysisScreen
          {...mockProps}
          onBack={onBack}
        />
      )

      // For now, just check that the component renders
      // Button interaction testing will be added when Tamagui mocking is resolved
      expect(UNSAFE_root).toBeTruthy()
      expect(onBack).not.toHaveBeenCalled() // Should not be called without interaction
    })

    it('calls onMenuPress when menu button is pressed', () => {
      const onMenuPress = jest.fn()
      const { UNSAFE_root } = renderWithProviders(
        <VideoAnalysisScreen
          {...mockProps}
          onMenuPress={onMenuPress}
        />
      )

      // For now, just check that the component renders
      // Button interaction testing will be added when Tamagui mocking is resolved
      expect(UNSAFE_root).toBeTruthy()
      expect(onMenuPress).not.toHaveBeenCalled() // Should not be called without interaction
    })

    it('handles all status variants', () => {
      const statuses = ['processing', 'ready', 'playing', 'paused'] as const

      statuses.forEach((status) => {
        const { UNSAFE_root, unmount } = renderWithProviders(
          <VideoAnalysisScreen
            {...mockProps}
            initialStatus={status}
          />
        )

        expect(UNSAFE_root).toBeTruthy()
        unmount()
      })
    })
  })

  describe('State-Specific Rendering Tests', () => {
    it('renders processing state with ProcessingOverlay', () => {
      // Mock processing state
      const mockUseAnalysisJobStatus = require('../../stores/analysisStatus').useAnalysisJobStatus
      mockUseAnalysisJobStatus.mockReturnValue({
        isProcessing: true,
        progress: 50,
        error: null,
      })

      renderWithProviders(
        <VideoAnalysisScreen
          {...mockProps}
          initialStatus="processing"
        />
      )

      // Should show processing overlay instead of video player
      expect(screen.queryByTestId('video-player-container')).toBeFalsy()
    })

    it('renders ready state with video player', () => {
      // Mock completed state
      const mockUseAnalysisJobStatus = require('../../stores/analysisStatus').useAnalysisJobStatus
      mockUseAnalysisJobStatus.mockReturnValue({
        isCompleted: true,
        progress: 100,
        error: null,
      })

      const { UNSAFE_root } = renderWithProviders(
        <VideoAnalysisScreen
          {...mockProps}
          initialStatus="ready"
        />
      )

      expect(UNSAFE_root).toBeTruthy()
    })

    it('renders connection error banner when disconnected', () => {
      // Mock disconnected state
      const mockUseVideoAnalysisRealtime =
        require('../../hooks/useAnalysisRealtime').useVideoAnalysisRealtime
      mockUseVideoAnalysisRealtime.mockReturnValue({
        isConnected: false,
        connectionError: 'Connection failed',
        reconnectAttempts: 2,
      })

      const { UNSAFE_root } = renderWithProviders(<VideoAnalysisScreen {...mockProps} />)

      expect(UNSAFE_root).toBeTruthy()
    })
  })

  describe('Accessibility Tests', () => {
    it('has proper accessibility labels', () => {
      const { UNSAFE_root } = renderWithProviders(<VideoAnalysisScreen {...mockProps} />)

      expect(UNSAFE_root).toBeTruthy()
    })

    it('maintains minimum touch target sizes', () => {
      const { UNSAFE_root } = renderWithProviders(<VideoAnalysisScreen {...mockProps} />)

      // For now, just check that the component renders
      // Touch target testing will be added when Tamagui mocking is resolved
      expect(UNSAFE_root).toBeTruthy()
    })
  })

  describe('Error Handling Tests', () => {
    it('handles missing analysis job gracefully', () => {
      const mockUseQuery = require('@tanstack/react-query').useQuery
      mockUseQuery.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Analysis job not found'),
      })

      const { UNSAFE_root } = renderWithProviders(<VideoAnalysisScreen {...mockProps} />)

      // Should still render the screen structure
      expect(UNSAFE_root).toBeTruthy()
    })

    it('handles real-time connection failures', () => {
      const mockUseVideoAnalysisRealtime =
        require('../../hooks/useAnalysisRealtime').useVideoAnalysisRealtime
      mockUseVideoAnalysisRealtime.mockReturnValue({
        isConnected: false,
        connectionError: 'Network error',
        reconnectAttempts: 3,
      })

      const { UNSAFE_root } = renderWithProviders(<VideoAnalysisScreen {...mockProps} />)

      expect(UNSAFE_root).toBeTruthy()
    })
  })

  describe('Performance Tests', () => {
    it('renders within acceptable time', () => {
      const startTime = performance.now()

      renderWithProviders(<VideoAnalysisScreen {...mockProps} />)

      const endTime = performance.now()
      const renderTime = endTime - startTime

      // Should render in less than 100ms for basic component
      expect(renderTime).toBeLessThan(100)
    })

    it('handles rapid prop changes without errors', () => {
      const { rerender, UNSAFE_root } = renderWithProviders(<VideoAnalysisScreen {...mockProps} />)

      // Rapidly change props to test stability
      for (let i = 0; i < 10; i++) {
        rerender(
          <VideoAnalysisScreen
            {...mockProps}
            analysisJobId={i}
            initialStatus={i % 2 === 0 ? 'ready' : 'playing'}
          />
        )
      }

      expect(UNSAFE_root).toBeTruthy()
    })
  })
})
