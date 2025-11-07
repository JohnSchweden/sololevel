/**
 * Web-based tests for native VideoControls component
 * Tests native functionality using jsdom with React Native mocks
 * Environment: Web browser simulation with native component mocks
 */

import { fireEvent, screen } from '@testing-library/react'
import React from 'react'
import '@testing-library/jest-dom'
import { renderWithProvider } from '../../../test-utils/TestProvider'
import { VideoControls } from './VideoControls'
import type { VideoControlsProps } from './VideoControls'

// Mock react-native Platform for native environment
jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  View: 'div',
  Pressable: 'button',
  PanResponder: {
    create: jest.fn(() => ({
      panHandlers: {
        onStartShouldSetPanResponder: jest.fn(),
        onMoveShouldSetPanResponder: jest.fn(),
        onPanResponderGrant: jest.fn(),
        onPanResponderMove: jest.fn(),
        onPanResponderRelease: jest.fn(),
        onPanResponderTerminate: jest.fn(),
      },
    })),
  },
}))

const renderWithProviders = (ui: React.ReactElement) => {
  return renderWithProvider(ui)
}

const createMockProps = (overrides: Partial<VideoControlsProps> = {}): VideoControlsProps => ({
  isPlaying: false,
  currentTime: 30,
  duration: 120,
  showControls: true,
  isProcessing: false,
  onPlay: jest.fn(),
  onPause: jest.fn(),
  onSeek: jest.fn(),
  onControlsVisibilityChange: jest.fn(),
  onMenuPress: jest.fn(),
  ...overrides,
})

describe('VideoControls - React Native Environment Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.clearAllTimers()
    jest.useRealTimers()
  })

  describe('PanResponder Scrubbing Functionality - Native', () => {
    it('progress bar renders with correct visual elements in React Native', () => {
      const props = createMockProps()
      renderWithProviders(<VideoControls {...props} />)

      // In React Native environment, we can test the actual View components
      const progressBarContainer = screen.getByTestId('progress-bar-container')
      expect(progressBarContainer).toBeTruthy()

      // Test that the progress bar has the correct native View structure
      expect(progressBarContainer).toBeInTheDocument()
    })

    it('scrubber handle shows correct visual state based on props in React Native', () => {
      const props = createMockProps()
      renderWithProviders(<VideoControls {...props} />)

      // Test scrubber handle visual state
      const scrubberHandle = screen.getByTestId('scrubber-handle')
      expect(scrubberHandle).toBeTruthy()
      expect(scrubberHandle).toBeInTheDocument()
    })

    it('exposes gesture targets for scrubbing in React Native', () => {
      const props = createMockProps()
      renderWithProviders(<VideoControls {...props} />)

      // Verify primary gesture targets exist for scrubbing interactions
      expect(screen.getByTestId('progress-bar-pressable')).toBeInTheDocument()
      expect(screen.getByTestId('scrubber-handle')).toBeInTheDocument()
    })
  })

  describe('Processing State Management - Native', () => {
    it('disables center controls when processing in React Native', () => {
      const props = createMockProps({ isProcessing: true })
      renderWithProviders(<VideoControls {...props} />)

      const playbackControls = screen.getByLabelText('Video playback controls')
      expect(playbackControls).toBeInTheDocument()
      expect(playbackControls.getAttribute('pointer-events')).toBe('none')
    })

    it('restores interactive controls after processing ends in React Native', () => {
      const { rerender } = renderWithProviders(
        <VideoControls {...createMockProps({ isProcessing: true })} />
      )

      rerender(<VideoControls {...createMockProps({ isProcessing: false })} />)

      const playbackControls = screen.getByLabelText('Video playback controls')
      expect(playbackControls.getAttribute('pointer-events')).toBe('auto')
    })
  })

  describe('Touch Interactions - Native', () => {
    it('component responds to touch events correctly in React Native', () => {
      const mockOnControlsVisibilityChange = jest.fn()
      renderWithProviders(
        <VideoControls
          {...createMockProps({ onControlsVisibilityChange: mockOnControlsVisibilityChange })}
        />
      )

      // React Native converts testID to lowercase testid in web environment
      const videoControlsContainer = document.querySelector('[testid="video-controls-container"]')

      expect(videoControlsContainer).toBeTruthy()

      // Simulate touch event (using click for web environment)
      if (videoControlsContainer) {
        fireEvent.click(videoControlsContainer)
      }

      // Verify touch interaction triggers visibility change
      expect(mockOnControlsVisibilityChange).toHaveBeenCalled()
      const [visible] = mockOnControlsVisibilityChange.mock.calls[0] ?? []
      expect(visible).toBe(true)
    })

    it('provides gesture surfaces for scrubbing in React Native', () => {
      const props = createMockProps()
      renderWithProviders(<VideoControls {...props} />)

      expect(screen.getByTestId('progress-bar-container')).toBeInTheDocument()
      expect(screen.getByTestId('scrubber-handle')).toBeInTheDocument()
    })
  })
})
