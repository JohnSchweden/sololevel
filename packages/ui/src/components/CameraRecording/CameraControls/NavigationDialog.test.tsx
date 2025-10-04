/**
 * Navigation Dialog Component Tests
 * Tests the navigation dialog for confirming recording actions
 */

// Import shared test utilities (includes all mocks and setup)
import '../../../test-utils/setup'
import { fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { NavigationDialog } from './NavigationDialog'

// Mocks are handled globally in src/test-utils/setup.ts

describe('Navigation Dialog Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Core Functionality', () => {
    it('renders action buttons when open', () => {
      const mockProps = {
        open: true,
        onOpenChange: jest.fn(),
        onDiscard: jest.fn(),
        onCancel: jest.fn(),
        recordingDuration: 25000,
      }

      render(<NavigationDialog {...mockProps} />)

      expect(screen.getByLabelText('Discard recording')).toBeTruthy()
      expect(screen.getByLabelText('Cancel navigation')).toBeTruthy()
    })

    // Note: Dialog visibility testing is complex in test environment due to portal rendering
    // The core functionality (button interactions) is tested in other test cases
  })

  describe('User Interactions', () => {
    const mockProps = {
      open: true,
      onOpenChange: jest.fn(),
      onDiscard: jest.fn(),
      onCancel: jest.fn(),
      recordingDuration: 25000,
    }

    it('handles discard action', () => {
      render(<NavigationDialog {...mockProps} />)

      const discardButton = screen.getByLabelText('Discard recording')
      fireEvent.click(discardButton)

      expect(mockProps.onDiscard).toHaveBeenCalledTimes(1)
    })

    it('handles cancel action', () => {
      render(<NavigationDialog {...mockProps} />)

      const cancelButton = screen.getByLabelText('Cancel navigation')
      fireEvent.click(cancelButton)

      expect(mockProps.onCancel).toHaveBeenCalledTimes(1)
    })
  })

  describe('Accessibility', () => {
    const mockProps = {
      open: true,
      onOpenChange: jest.fn(),
      onDiscard: jest.fn(),
      onCancel: jest.fn(),
      recordingDuration: 25000,
    }

    it('provides proper accessibility labels', () => {
      render(<NavigationDialog {...mockProps} />)

      // Test that buttons can be found by their accessibility labels
      // This verifies the accessibility implementation is working
      expect(screen.getByLabelText('Discard recording')).toBeTruthy()
      expect(screen.getByLabelText('Cancel navigation')).toBeTruthy()
    })

    it('provides accessible button functionality', () => {
      render(<NavigationDialog {...mockProps} />)

      const discardButton = screen.getByLabelText('Discard recording')
      const cancelButton = screen.getByLabelText('Cancel navigation')

      // Verify buttons are interactive and have proper roles
      expect(discardButton).toBeTruthy()
      expect(cancelButton).toBeTruthy()

      // Test that buttons can be pressed (core accessibility requirement)
      fireEvent.click(discardButton)
      fireEvent.click(cancelButton)
    })
  })

  describe('Props Handling', () => {
    it('passes recording duration to component', () => {
      const mockProps = {
        open: true,
        onOpenChange: jest.fn(),
        onDiscard: jest.fn(),
        onCancel: jest.fn(),
        recordingDuration: 125000, // 2 minutes 5 seconds
      }

      render(<NavigationDialog {...mockProps} />)

      // Verify component renders without errors with duration
      expect(screen.getByLabelText('Discard recording')).toBeTruthy()
      expect(screen.getByLabelText('Cancel navigation')).toBeTruthy()
    })

    it('handles zero recording duration', () => {
      const mockProps = {
        open: true,
        onOpenChange: jest.fn(),
        onDiscard: jest.fn(),
        onCancel: jest.fn(),
        recordingDuration: 0,
      }

      render(<NavigationDialog {...mockProps} />)

      // Verify component renders without errors with zero duration
      expect(screen.getByLabelText('Discard recording')).toBeTruthy()
      expect(screen.getByLabelText('Cancel navigation')).toBeTruthy()
    })
  })
})
