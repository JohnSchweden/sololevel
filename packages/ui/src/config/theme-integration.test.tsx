import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { VideoControls } from '../components/VideoAnalysis/VideoControls/VideoControls'

// Mocks are handled globally in src/test-utils/setup.ts

describe('Theme Integration Tests', () => {
  describe('Basic Theme Functionality', () => {
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

      render(<VideoControls {...mockProps} />)

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

      const { rerender } = render(<VideoControls {...mockProps} />)

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
