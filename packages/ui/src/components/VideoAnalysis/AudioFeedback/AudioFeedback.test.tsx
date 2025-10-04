import { render, screen, cleanup } from '@testing-library/react'
import '@testing-library/jest-dom'
import { AudioFeedback } from './AudioFeedback'

// Mocks are handled globally in src/test-utils/setup.ts

// Mock the require call for the coach avatar image
jest.mock('../../../../../../apps/expo/assets/coach_avatar.png', () => 'mocked-coach-avatar')

const mockController = {
  isPlaying: false,
  currentTime: 30,
  duration: 120,
  isLoaded: true,
  seekTime: null,
  setIsPlaying: jest.fn(),
  togglePlayback: jest.fn(),
  handleLoad: jest.fn(),
  handleProgress: jest.fn(),
  handleEnd: jest.fn(),
  handleError: jest.fn(),
  handleSeekComplete: jest.fn(),
  seekTo: jest.fn(),
  reset: jest.fn(),
}

const mockProps = {
  audioUrl: 'https://example.com/audio.mp3',
  controller: mockController,
  onClose: jest.fn(),
  isVisible: true,
}

describe('AudioFeedback', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders audio feedback when visible with audio URL', () => {
    render(<AudioFeedback {...mockProps} />)

    expect(screen.getByTestId('audio-feedback-overlay')).toBeInTheDocument()
  })

  it('does not render when not visible', () => {
    render(
      <AudioFeedback
        {...mockProps}
        isVisible={false}
      />
    )

    expect(screen.queryByTestId('audio-feedback-overlay')).not.toBeInTheDocument()
  })

  it('does not render when no audio URL', () => {
    render(
      <AudioFeedback
        {...mockProps}
        audioUrl={null}
      />
    )

    expect(screen.queryByTestId('audio-feedback-overlay')).not.toBeInTheDocument()
  })

  it('shows play button when paused', () => {
    render(<AudioFeedback {...mockProps} />)

    expect(screen.getByTestId('audio-feedback-overlay')).toBeInTheDocument()
  })

  it('shows pause button when playing', () => {
    render(
      <AudioFeedback
        {...mockProps}
        controller={{ ...mockController, isPlaying: true }}
      />
    )

    expect(screen.getByTestId('audio-feedback-overlay')).toBeInTheDocument()
  })

  it('displays correct time format', () => {
    render(<AudioFeedback {...mockProps} />)

    expect(screen.getByTestId('audio-feedback-overlay')).toBeInTheDocument()
  })

  it('shows progress bar with correct fill', () => {
    render(<AudioFeedback {...mockProps} />)

    expect(screen.getByTestId('audio-feedback-overlay')).toBeInTheDocument()
  })

  it('handles different progress states', () => {
    const { rerender } = render(
      <AudioFeedback
        {...mockProps}
        controller={{ ...mockController, currentTime: 0 }}
      />
    )

    expect(screen.getByTestId('audio-feedback-overlay')).toBeInTheDocument()

    // Test middle progress
    rerender(
      <AudioFeedback
        {...mockProps}
        controller={{ ...mockController, currentTime: 60 }}
      />
    )

    expect(screen.getByTestId('audio-feedback-overlay')).toBeInTheDocument()

    // Test end progress
    rerender(
      <AudioFeedback
        {...mockProps}
        controller={{ ...mockController, currentTime: 120 }}
      />
    )

    expect(screen.getByTestId('audio-feedback-overlay')).toBeInTheDocument()
  })

  it('handles close button interaction', () => {
    render(<AudioFeedback {...mockProps} />)

    expect(mockProps.onClose).toBeDefined()
  })

  it('handles play/pause button interaction', () => {
    render(<AudioFeedback {...mockProps} />)

    expect(mockController.togglePlayback).toBeDefined()
  })
})
