import { screen } from '@testing-library/react-native'
import { ProcessingOverlay } from '../components/VideoAnalysis/ProcessingOverlay/ProcessingOverlay'
import { VideoControls } from '../components/VideoAnalysis/VideoControls/VideoControls'
import { renderWithProviderNative } from '../test-utils/TestProvider'

describe('Theme Integration Tests', () => {
  describe('Basic Theme Functionality', () => {
    it('ProcessingOverlay renders with theme integration', () => {
      const mockProps = {
        progress: 0.5,
        currentStep: 'Processing...',
        estimatedTime: 30,
        onCancel: jest.fn(),
        onViewResults: jest.fn(),
        isComplete: false,
      }

      renderWithProviderNative(<ProcessingOverlay {...mockProps} />)

      // Component should render without errors with theme
      expect(screen.getByLabelText('Processing overlay: Analysis in progress')).toBeTruthy()
      expect(screen.getByLabelText('Cancel processing')).toBeTruthy()
    })

    it('VideoControls renders with theme integration', () => {
      const mockProps = {
        isPlaying: false,
        currentTime: 30,
        duration: 120,
        showControls: true,
        onPlay: jest.fn(),
        onPause: jest.fn(),
        onSeek: jest.fn(),
      }

      renderWithProviderNative(<VideoControls {...mockProps} />)

      // Component should render without errors with theme
      expect(screen.getByLabelText('Play video')).toBeTruthy()
    })

    it('theme supports state changes', () => {
      const mockProps = {
        isPlaying: false,
        currentTime: 30,
        duration: 120,
        showControls: true,
        onPlay: jest.fn(),
        onPause: jest.fn(),
        onSeek: jest.fn(),
      }

      const { rerender } = renderWithProviderNative(<VideoControls {...mockProps} />)

      // Component should handle theme changes gracefully
      rerender(
        <VideoControls
          {...mockProps}
          isPlaying={true}
        />
      )

      expect(screen.getByLabelText('Pause video')).toBeTruthy()
    })
  })
})
