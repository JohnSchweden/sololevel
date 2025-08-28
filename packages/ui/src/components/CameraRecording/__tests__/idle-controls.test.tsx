/**
 * Idle Controls Component Tests
 * Tests the idle state UI controls (record, upload, camera switch)
 */

// Import shared test utilities (includes all mocks and setup)
import '../../../test-utils/setup'
import { fireEvent, render, screen } from '@testing-library/react'
import { act } from '@testing-library/react'
import { TestProvider } from '../../../test-utils'
import { IdleControls } from '../IdleControls'

describe('Idle Controls Component', () => {
  const mockProps = {
    onStartRecording: jest.fn(),
    onUploadVideo: jest.fn(),
    onCameraSwap: jest.fn(),
    disabled: false,
    cameraSwapDisabled: false,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders all idle control buttons', () => {
      render(
        <TestProvider>
          <IdleControls {...mockProps} />
        </TestProvider>
      )

      expect(screen.getByRole('button', { name: /record/i })).toBeTruthy()
      expect(screen.getByRole('button', { name: /upload/i })).toBeTruthy()
      expect(screen.getByRole('button', { name: /camera/i })).toBeTruthy()
    })

    it('renders with proper accessibility labels', () => {
      render(
        <TestProvider>
          <IdleControls {...mockProps} />
        </TestProvider>
      )

      expect(screen.getByLabelText('Start recording')).toBeTruthy()
      expect(screen.getByLabelText('Upload video file')).toBeTruthy()
      expect(screen.getByLabelText('Switch camera')).toBeTruthy()
    })
  })

  describe('User Interactions', () => {
    it('handles record button press', () => {
      render(
        <TestProvider>
          <IdleControls {...mockProps} />
        </TestProvider>
      )

      const recordButton = screen.getByRole('button', { name: /record/i })
      fireEvent.click(recordButton)

      expect(mockProps.onStartRecording).toHaveBeenCalledTimes(1)
    })

    it('handles upload button press', () => {
      render(
        <TestProvider>
          <IdleControls {...mockProps} />
        </TestProvider>
      )

      const uploadButton = screen.getByRole('button', { name: /upload/i })
      fireEvent.click(uploadButton)

      expect(mockProps.onUploadVideo).toHaveBeenCalledTimes(1)
    })

    it('handles camera switch button press', () => {
      render(
        <TestProvider>
          <IdleControls {...mockProps} />
        </TestProvider>
      )

      const cameraButton = screen.getByRole('button', { name: /camera/i })
      fireEvent.click(cameraButton)

      expect(mockProps.onCameraSwap).toHaveBeenCalledTimes(1)
    })
  })

  describe('Accessibility', () => {
    it('renders buttons with proper accessibility roles', () => {
      render(
        <TestProvider>
          <IdleControls {...mockProps} />
        </TestProvider>
      )

      const buttons = screen.getAllByRole('button')
      expect(buttons).toHaveLength(3) // upload, record, camera buttons
      buttons.forEach((button) => {
        expect(button).toHaveAttribute('aria-label')
      })
    })

    it('supports keyboard navigation', () => {
      render(
        <TestProvider>
          <IdleControls {...mockProps} />
        </TestProvider>
      )

      const recordButton = screen.getByLabelText('Start recording')

      act(() => {
        recordButton.focus()
      })

      expect(document.activeElement).toBe(recordButton)

      // Tab to next button
      fireEvent.keyDown(recordButton, { key: 'Tab' })
      expect(mockProps.onStartRecording).not.toHaveBeenCalled()
    })
  })

  describe('States', () => {
    it('disables controls when disabled prop is true', () => {
      const disabledProps = { ...mockProps, disabled: true }

      render(
        <TestProvider>
          <IdleControls {...disabledProps} />
        </TestProvider>
      )

      const buttons = screen.getAllByRole('button')
      buttons.forEach((button) => {
        expect(button).toHaveAttribute('aria-disabled', 'true')
      })
    })

    it('handles disabled state for camera swap', () => {
      const cameraDisabledProps = { ...mockProps, cameraSwapDisabled: true }

      render(
        <TestProvider>
          <IdleControls {...cameraDisabledProps} />
        </TestProvider>
      )

      const cameraButton = screen.getByRole('button', { name: /camera/i })
      expect(cameraButton).toHaveAttribute('aria-disabled', 'true')
    })
  })

  describe('Visual States', () => {
    it('applies correct styling for record button', () => {
      render(
        <TestProvider>
          <IdleControls {...mockProps} />
        </TestProvider>
      )

      const recordButton = screen.getByRole('button', { name: /record/i })
      expect(recordButton).toHaveAttribute('aria-label', 'Start recording')
    })

    it('applies correct styling for secondary actions', () => {
      render(
        <TestProvider>
          <IdleControls {...mockProps} />
        </TestProvider>
      )

      const uploadButton = screen.getByRole('button', { name: /upload/i })
      const cameraButton = screen.getByRole('button', { name: /camera/i })

      expect(uploadButton).toHaveAttribute('aria-label', 'Upload video file')
      expect(cameraButton).toHaveAttribute('aria-label', 'Switch camera')
    })
  })
})
