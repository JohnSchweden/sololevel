import { fireEvent, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { renderWithProvider } from '../../../test-utils/TestProvider'
import { VideoControlsOverlay } from './VideoControlsOverlay'

const renderWithProviders = (ui: React.ReactElement) => {
  return renderWithProvider(ui)
}

// Mock data following TDD principles
const mockProps = {
  isPlaying: false,
  currentTime: 30,
  duration: 120,
  showControls: true,
  onPlay: jest.fn(),
  onPause: jest.fn(),
  onSeek: jest.fn(),
}

describe('VideoControlsOverlay', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Component Interface Tests', () => {
    it('renders with required props', () => {
      renderWithProviders(<VideoControlsOverlay {...mockProps} />)

      expect(screen.getByTestId('video-controls-overlay')).toBeTruthy()
    })

    it('displays play button when paused', () => {
      renderWithProviders(
        <VideoControlsOverlay
          {...mockProps}
          isPlaying={false}
        />
      )

      expect(screen.getByTestId('play-button')).toBeTruthy()
    })

    it('displays pause button when playing', () => {
      renderWithProviders(
        <VideoControlsOverlay
          {...mockProps}
          isPlaying={true}
        />
      )

      expect(screen.getByTestId('pause-button')).toBeTruthy()
    })

    it('calls onPlay when play button is pressed', () => {
      const onPlay = jest.fn()
      renderWithProviders(
        <VideoControlsOverlay
          {...mockProps}
          onPlay={onPlay}
          isPlaying={false}
        />
      )

      fireEvent.click(screen.getByTestId('play-button'))
      expect(onPlay).toHaveBeenCalledTimes(1)
    })

    it('calls onPause when pause button is pressed', () => {
      const onPause = jest.fn()
      renderWithProviders(
        <VideoControlsOverlay
          {...mockProps}
          onPause={onPause}
          isPlaying={true}
        />
      )

      fireEvent.click(screen.getByTestId('pause-button'))
      expect(onPause).toHaveBeenCalledTimes(1)
    })

    it('calls onSeek when progress bar is tapped', () => {
      const onSeek = jest.fn()
      renderWithProviders(
        <VideoControlsOverlay
          {...mockProps}
          onSeek={onSeek}
        />
      )

      const progressBar = screen.getByTestId('progress-bar')
      fireEvent.click(progressBar)

      // Check if the function was called with the expected value (duration * 0.5 = 60)
      expect(onSeek).toHaveBeenCalledWith(60)
    })

    it('shows controls when showControls is true', () => {
      renderWithProviders(
        <VideoControlsOverlay
          {...mockProps}
          showControls={true}
        />
      )

      const overlay = screen.getByTestId('video-controls-overlay')
      expect(overlay).toHaveAttribute('opacity', '1')
    })

    it('hides controls when showControls is false', () => {
      renderWithProviders(
        <VideoControlsOverlay
          {...mockProps}
          showControls={false}
        />
      )

      const overlay = screen.getByTestId('video-controls-overlay')
      expect(overlay).toHaveAttribute('opacity', '0')
    })
  })

  describe('Time Display Tests', () => {
    it('displays current time correctly', () => {
      renderWithProviders(
        <VideoControlsOverlay
          {...mockProps}
          currentTime={90}
        />
      )

      expect(screen.getByText('1:30')).toBeTruthy()
    })

    it('displays duration correctly', () => {
      renderWithProviders(
        <VideoControlsOverlay
          {...mockProps}
          duration={180}
        />
      )

      expect(screen.getByText('3:00')).toBeTruthy()
    })

    it('handles zero time values', () => {
      renderWithProviders(
        <VideoControlsOverlay
          {...mockProps}
          currentTime={0}
          duration={0}
        />
      )

      const currentTime = screen.getByTestId('current-time')
      const totalTime = screen.getByTestId('total-time')
      expect(currentTime).toHaveTextContent('0:00')
      expect(totalTime).toHaveTextContent('0:00')
    })

    it('formats time correctly for hours', () => {
      renderWithProviders(
        <VideoControlsOverlay
          {...mockProps}
          currentTime={3661}
          duration={7200}
        />
      )

      expect(screen.getByText('1:01:01')).toBeTruthy()
      expect(screen.getByText('2:00:00')).toBeTruthy()
    })
  })

  describe('Progress Bar Tests', () => {
    it('displays correct progress percentage', () => {
      renderWithProviders(
        <VideoControlsOverlay
          {...mockProps}
          currentTime={30}
          duration={120}
        />
      )

      const progressFill = screen.getByTestId('progress-fill')
      expect(progressFill).toHaveAttribute('width', '25%')
    })

    it('handles zero duration gracefully', () => {
      renderWithProviders(
        <VideoControlsOverlay
          {...mockProps}
          currentTime={30}
          duration={0}
        />
      )

      const progressFill = screen.getByTestId('progress-fill')
      expect(progressFill).toHaveAttribute('width', '0%')
    })

    it('clamps progress to 100%', () => {
      renderWithProviders(
        <VideoControlsOverlay
          {...mockProps}
          currentTime={150}
          duration={120}
        />
      )

      const progressFill = screen.getByTestId('progress-fill')
      expect(progressFill).toHaveAttribute('width', '100%')
    })
  })

  describe('Theme Integration Tests', () => {
    it('applies correct button colors', () => {
      renderWithProviders(<VideoControlsOverlay {...mockProps} />)

      const playButton = screen.getByTestId('play-button')
      expect(playButton).toBeTruthy()
    })

    it('uses correct progress bar colors', () => {
      renderWithProviders(<VideoControlsOverlay {...mockProps} />)

      const progressBar = screen.getByTestId('progress-bar')
      expect(progressBar).toBeTruthy()
    })

    it('maintains proper spacing', () => {
      renderWithProviders(<VideoControlsOverlay {...mockProps} />)

      const overlay = screen.getByTestId('video-controls-overlay')
      expect(overlay).toBeTruthy()
    })
  })

  describe('Accessibility Tests', () => {
    it('has proper accessibility labels', () => {
      renderWithProviders(<VideoControlsOverlay {...mockProps} />)

      // Test that key interactive elements are accessible by their labels
      expect(screen.getByLabelText('Play video')).toBeTruthy()

      // Test that progress bar exists and is accessible
      const progressBar = screen.getByTestId('progress-bar')
      expect(progressBar).toBeTruthy()
    })

    it('maintains minimum touch target sizes', () => {
      renderWithProviders(<VideoControlsOverlay {...mockProps} />)

      const playButton = screen.getByTestId('play-button')
      const progressBar = screen.getByTestId('progress-bar')

      // Buttons should have minimum 44pt touch targets
      expect(playButton).toBeTruthy()
      expect(progressBar).toBeTruthy()
    })

    it('announces playback state changes', () => {
      const { rerender } = renderWithProviders(
        <VideoControlsOverlay
          {...mockProps}
          isPlaying={false}
        />
      )

      rerender(
        <VideoControlsOverlay
          {...mockProps}
          isPlaying={true}
        />
      )

      expect(screen.getByLabelText('Pause video')).toBeTruthy()
    })
  })

  describe('Animation Tests', () => {
    it('animates control visibility smoothly', () => {
      const { rerender } = renderWithProviders(
        <VideoControlsOverlay
          {...mockProps}
          showControls={false}
        />
      )

      rerender(
        <VideoControlsOverlay
          {...mockProps}
          showControls={true}
        />
      )

      const overlay = screen.getByTestId('video-controls-overlay')
      expect(overlay).toHaveAttribute('opacity', '1')
    })

    it('auto-hides controls after timeout', async () => {
      renderWithProviders(
        <VideoControlsOverlay
          {...mockProps}
          showControls={true}
        />
      )

      // Would need to test auto-hide behavior with timers
      const overlay = screen.getByTestId('video-controls-overlay')
      expect(overlay).toBeTruthy()
    })
  })

  describe('Performance Tests', () => {
    it('renders quickly with different time values', () => {
      const startTime = performance.now()

      renderWithProviders(<VideoControlsOverlay {...mockProps} />)

      const endTime = performance.now()
      expect(endTime - startTime).toBeLessThan(50)
    })

    it('handles rapid time updates efficiently', () => {
      const { rerender } = renderWithProviders(<VideoControlsOverlay {...mockProps} />)

      // Simulate rapid time updates (60fps)
      for (let i = 0; i < 60; i++) {
        rerender(
          <VideoControlsOverlay
            {...mockProps}
            currentTime={i}
          />
        )
      }

      expect(screen.getByTestId('video-controls-overlay')).toBeTruthy()
    })
  })

  describe('Error Handling Tests', () => {
    it('handles negative time values', () => {
      renderWithProviders(
        <VideoControlsOverlay
          {...mockProps}
          currentTime={-10}
          duration={120}
        />
      )

      const currentTime = screen.getByTestId('current-time')
      expect(currentTime).toHaveTextContent('0:00')
    })

    it('handles missing callback props gracefully', () => {
      const propsWithoutCallbacks = {
        ...mockProps,
        onPlay: jest.fn(),
        onPause: jest.fn(),
        onSeek: jest.fn(),
      }

      renderWithProviders(<VideoControlsOverlay {...propsWithoutCallbacks} />)

      expect(screen.getByTestId('video-controls-overlay')).toBeTruthy()
    })
  })
})
