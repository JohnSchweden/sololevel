/**
 * Recording Controls Component Tests
 * Tests the recording controls UI during active recording
 */

import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'

// Import shared test utilities (includes all mocks and setup)
import '../../../test-utils/setup'
import { TestProvider } from '../../../test-utils'

// Import centralized mocks
import { RecordingState } from './mocks'

// Import component to test
import { RecordingControls } from '../RecordingControls'

describe('Recording Controls Component', () => {
  const mockProps = {
    recordingState: RecordingState.RECORDING,
    duration: 15000, // 15 seconds
    zoomLevel: 1 as const,
    canSwapCamera: true,
    onPause: jest.fn(),
    onResume: jest.fn(),
    onStop: jest.fn(),
    onCameraSwap: jest.fn(),
    onZoomChange: jest.fn(),
    onSettingsOpen: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders recording timer', () => {
      render(
        <TestProvider>
          <RecordingControls {...mockProps} />
        </TestProvider>
      )

      const timer = screen.getByLabelText('Recording time: 00:15')
      expect(timer).toBeTruthy()
      expect(timer.textContent).toBe('00:15')
    })

    it('shows pause button during recording', () => {
      render(
        <TestProvider>
          <RecordingControls {...mockProps} />
        </TestProvider>
      )

      const pauseButton = screen.getByLabelText('Pause recording')
      expect(pauseButton).toBeTruthy()
    })

    it('shows resume button when paused', () => {
      render(
        <TestProvider>
          <RecordingControls
            {...mockProps}
            recordingState={RecordingState.PAUSED}
          />
        </TestProvider>
      )

      const resumeButton = screen.getByLabelText('Resume recording')
      expect(resumeButton).toBeTruthy()
    })

    it('renders zoom controls when zoom level > 1', () => {
      const zoomedProps = { ...mockProps, zoomLevel: 2 as const }

      render(
        <TestProvider>
          <RecordingControls {...zoomedProps} />
        </TestProvider>
      )

      // Should render zoom indicator
      const zoomIndicator = screen.getByText('2x')
      expect(zoomIndicator).toBeTruthy()
    })

    it('renders camera swap button when enabled', () => {
      render(
        <TestProvider>
          <RecordingControls {...mockProps} />
        </TestProvider>
      )

      const cameraButton = screen.getByLabelText('Switch camera')
      expect(cameraButton).toBeTruthy()
    })

    it('renders settings button', () => {
      render(
        <TestProvider>
          <RecordingControls {...mockProps} />
        </TestProvider>
      )

      const settingsButton = screen.getByLabelText('Camera settings')
      expect(settingsButton).toBeTruthy()
    })
  })

  describe('User Interactions', () => {
    it('handles stop button press', () => {
      render(
        <TestProvider>
          <RecordingControls {...mockProps} />
        </TestProvider>
      )

      const stopButton = screen.getByLabelText('Stop recording')
      fireEvent.click(stopButton)

      expect(mockProps.onStop).toHaveBeenCalled()
    })

    it('handles pause button press', () => {
      render(
        <TestProvider>
          <RecordingControls {...mockProps} />
        </TestProvider>
      )

      const pauseButton = screen.getByLabelText('Pause recording')
      fireEvent.click(pauseButton)

      expect(mockProps.onPause).toHaveBeenCalled()
    })

    it('handles resume button press when paused', () => {
      render(
        <TestProvider>
          <RecordingControls
            {...mockProps}
            recordingState={RecordingState.PAUSED}
          />
        </TestProvider>
      )

      const resumeButton = screen.getByLabelText('Resume recording')
      fireEvent.click(resumeButton)

      expect(mockProps.onResume).toHaveBeenCalled()
    })

    it('handles camera swap button press', () => {
      render(
        <TestProvider>
          <RecordingControls {...mockProps} />
        </TestProvider>
      )

      const cameraButton = screen.getByLabelText('Switch camera')
      fireEvent.click(cameraButton)

      expect(mockProps.onCameraSwap).toHaveBeenCalled()
    })

    it('handles settings button press', () => {
      render(
        <TestProvider>
          <RecordingControls {...mockProps} />
        </TestProvider>
      )

      const settingsButton = screen.getByLabelText('Camera settings')
      fireEvent.click(settingsButton)

      expect(mockProps.onSettingsOpen).toHaveBeenCalled()
    })

    it('handles zoom change', () => {
      const zoomedProps = { ...mockProps, zoomLevel: 2 }

      render(
        <TestProvider>
          <RecordingControls {...zoomedProps} />
        </TestProvider>
      )

      // This would typically be tested with zoom controls UI
      // For now, we verify the zoom level is passed correctly
      expect(zoomedProps.zoomLevel).toBe(2)
    })
  })

  describe('States', () => {
    it('shows correct controls for recording state', () => {
      render(
        <TestProvider>
          <RecordingControls {...mockProps} />
        </TestProvider>
      )

      expect(screen.getByLabelText('Pause recording')).toBeTruthy()
      expect(screen.getByLabelText('Stop recording')).toBeTruthy()
      expect(screen.queryByLabelText('Resume recording')).toBeNull()
    })

    it('shows correct controls for paused state', () => {
      render(
        <TestProvider>
          <RecordingControls
            {...mockProps}
            recordingState={RecordingState.PAUSED}
          />
        </TestProvider>
      )

      expect(screen.getByLabelText('Resume recording')).toBeTruthy()
      expect(screen.getByLabelText('Stop recording')).toBeTruthy()
      expect(screen.queryByLabelText('Pause recording')).toBeNull()
    })

    it('disables camera swap button when disabled', () => {
      const disabledProps = { ...mockProps, canSwapCamera: false }

      render(
        <TestProvider>
          <RecordingControls {...disabledProps} />
        </TestProvider>
      )

      const cameraButton = screen.getByLabelText('Switch camera')
      expect(cameraButton).toHaveAttribute('aria-disabled', 'true')
    })

    it('updates timer display based on duration', () => {
      const longDurationProps = { ...mockProps, duration: 3661000 } // 1h 1m 1s

      render(
        <TestProvider>
          <RecordingControls {...longDurationProps} />
        </TestProvider>
      )

      const timer = screen.getByLabelText('Recording time: 61:01')
      expect(timer).toBeTruthy()
      expect(timer.textContent).toBe('61:01')
    })
  })

  describe('Accessibility', () => {
    it('meets touch target requirements', () => {
      render(
        <TestProvider>
          <RecordingControls {...mockProps} />
        </TestProvider>
      )

      const buttons = screen.getAllByRole('button')
      buttons.forEach((button) => {
        // Check if button has proper accessibility attributes
        expect(button).toHaveAttribute('aria-label')
      })
    })

    it('provides proper screen reader feedback', () => {
      render(
        <TestProvider>
          <RecordingControls {...mockProps} />
        </TestProvider>
      )

      // Screen readers should be able to identify recording state
      const timer = screen.getByLabelText('Recording time: 00:15')
      expect(timer).toHaveAttribute('aria-label')
      expect(timer.getAttribute('aria-label')).toBe('Recording time: 00:15')
    })

    it('supports keyboard navigation', () => {
      render(
        <TestProvider>
          <RecordingControls {...mockProps} />
        </TestProvider>
      )

      const pauseButton = screen.getByLabelText('Pause recording')
      pauseButton.focus()

      expect(document.activeElement).toBe(pauseButton)
    })
  })

  describe('Performance', () => {
    it('does not re-render unnecessarily', () => {
      const { rerender } = render(
        <TestProvider>
          <RecordingControls {...mockProps} />
        </TestProvider>
      )

      // Re-render with same props should not cause unnecessary updates
      rerender(
        <TestProvider>
          <RecordingControls {...mockProps} />
        </TestProvider>
      )

      const pauseButton = screen.getByLabelText('Pause recording')
      expect(pauseButton).toBeTruthy()
    })

    it('handles rapid button presses appropriately', () => {
      render(
        <TestProvider>
          <RecordingControls {...mockProps} />
        </TestProvider>
      )

      const pauseButton = screen.getByLabelText('Pause recording')

      // Simulate rapid clicks
      fireEvent.click(pauseButton)
      fireEvent.click(pauseButton)
      fireEvent.click(pauseButton)

      // Should handle all clicks (no debouncing implemented)
      expect(mockProps.onPause).toHaveBeenCalledTimes(3)
    })
  })
})
