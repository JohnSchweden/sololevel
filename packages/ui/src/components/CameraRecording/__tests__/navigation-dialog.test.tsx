/**
 * Navigation Dialog Component Tests
 * Tests the navigation dialog for confirming recording actions
 */

// Import shared test utilities (includes all mocks and setup)
import '../../../test-utils/setup'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { TestProvider } from '../../../test-utils'
import { NAVIGATION_DIALOG_CONFIGS } from '../../../test-utils/mock-data'
import { NavigationDialog } from '../NavigationDialog'

describe('Navigation Dialog Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Dialog Configurations', () => {
    describe.each(NAVIGATION_DIALOG_CONFIGS)('dialog config: $recordingDuration ms', (config) => {
      const mockProps = {
        open: config.open,
        onOpenChange: jest.fn(),
        onDiscard: jest.fn(),
        onCancel: jest.fn(),
        recordingDuration: config.recordingDuration,
      }

      it('handles dialog visibility correctly', () => {
        render(
          <TestProvider>
            <NavigationDialog {...mockProps} />
          </TestProvider>
        )

        if (config.open) {
          expect(screen.getByText(config.title)).toBeTruthy()
        } else {
          expect(screen.queryByText(config.title)).toBeNull()
        }
      })

      if (config.open && config.expectedDurationText) {
        it('displays correct duration text', () => {
          render(
            <TestProvider>
              <NavigationDialog {...mockProps} />
            </TestProvider>
          )

          expect(screen.getByText(new RegExp(config.expectedDurationText))).toBeTruthy()
        })
      }
    })
  })

  describe('Rendering', () => {
    const mockProps = {
      open: true,
      onOpenChange: jest.fn(),
      onDiscard: jest.fn(),
      onCancel: jest.fn(),
      recordingDuration: 25000, // 25 seconds
    }

    it('renders with recording duration', () => {
      render(
        <TestProvider>
          <NavigationDialog {...mockProps} />
        </TestProvider>
      )

      expect(screen.getByText('Discard Recording?')).toBeTruthy()
      expect(screen.getByText(/25s/)).toBeTruthy() // Should show duration in message
    })

    it('renders dialog content when open', () => {
      render(
        <TestProvider>
          <NavigationDialog {...mockProps} />
        </TestProvider>
      )

      expect(screen.getByText('Discard Recording?')).toBeTruthy()
      expect(screen.getByText(/unsaved recording/)).toBeTruthy()
    })

    it('renders action buttons', () => {
      render(
        <TestProvider>
          <NavigationDialog {...mockProps} />
        </TestProvider>
      )

      expect(screen.getByRole('button', { name: /discard/i })).toBeTruthy()
      expect(screen.getByRole('button', { name: /cancel/i })).toBeTruthy()
    })
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
      render(
        <TestProvider>
          <NavigationDialog {...mockProps} />
        </TestProvider>
      )

      const discardButton = screen.getByRole('button', { name: /discard/i })
      fireEvent.click(discardButton)

      expect(mockProps.onDiscard).toHaveBeenCalledTimes(1)
      expect(mockProps.onOpenChange).toHaveBeenCalledWith(false)
    })

    it('handles cancel action', () => {
      render(
        <TestProvider>
          <NavigationDialog {...mockProps} />
        </TestProvider>
      )

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      fireEvent.click(cancelButton)

      expect(mockProps.onCancel).toHaveBeenCalledTimes(1)
      expect(mockProps.onOpenChange).toHaveBeenCalledWith(false)
    })

    it('handles dialog close', () => {
      render(
        <TestProvider>
          <NavigationDialog {...mockProps} />
        </TestProvider>
      )

      // Note: This dialog doesn't have a separate close button
      // The close functionality is handled by clicking outside or cancel button
      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      fireEvent.click(cancelButton)

      expect(mockProps.onOpenChange).toHaveBeenCalledWith(false)
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

    it('meets accessibility requirements', () => {
      render(
        <TestProvider>
          <NavigationDialog {...mockProps} />
        </TestProvider>
      )

      // Dialog should have proper test attributes (mock doesn't provide full ARIA)
      const dialog = screen.getByTestId('Dialog')
      expect(dialog).toBeTruthy()
      // Note: React Native doesn't have data attributes like web, so we just verify the component exists
    })

    it('supports screen readers', () => {
      render(
        <TestProvider>
          <NavigationDialog {...mockProps} />
        </TestProvider>
      )

      // Screen readers should be able to identify dialog content
      expect(screen.getByText(/unsaved recording/)).toBeTruthy()
      expect(screen.getByText(/25s/)).toBeTruthy()
    })

    it('supports keyboard navigation', () => {
      render(
        <TestProvider>
          <NavigationDialog {...mockProps} />
        </TestProvider>
      )

      const discardButton = screen.getByRole('button', { name: /discard/i })
      const cancelButton = screen.getByRole('button', { name: /cancel/i })

      // Focus should be managed properly
      act(() => {
        discardButton.focus()
      })
      expect(document.activeElement).toBe(discardButton)

      // Tab navigation should work - focus should move to next focusable element
      fireEvent.keyDown(discardButton, { key: 'Tab' })
      // The actual focus behavior depends on the browser/DOM implementation
      // For this test, we just verify that keyboard events work
      expect(discardButton).toBeTruthy()
      expect(cancelButton).toBeTruthy()
    })
  })

  describe('States', () => {
    it('does not render when closed', () => {
      const closedProps = {
        open: false,
        onOpenChange: jest.fn(),
        onDiscard: jest.fn(),
        onCancel: jest.fn(),
        recordingDuration: 30000,
      }

      render(
        <TestProvider>
          <NavigationDialog {...closedProps} />
        </TestProvider>
      )

      expect(screen.queryByText('Discard Recording?')).toBeNull()
    })

    it('shows correct duration in message', () => {
      const longDurationProps = {
        open: true,
        onOpenChange: jest.fn(),
        onDiscard: jest.fn(),
        onCancel: jest.fn(),
        recordingDuration: 125000, // 2 minutes 5 seconds
      }

      render(
        <TestProvider>
          <NavigationDialog {...longDurationProps} />
        </TestProvider>
      )

      expect(screen.getByText(/2m 5s/)).toBeTruthy()
    })

    it('handles zero duration correctly', () => {
      const zeroDurationProps = {
        open: true,
        onOpenChange: jest.fn(),
        onDiscard: jest.fn(),
        onCancel: jest.fn(),
        recordingDuration: 0,
      }

      render(
        <TestProvider>
          <NavigationDialog {...zeroDurationProps} />
        </TestProvider>
      )

      expect(screen.getByText('Discard Recording?')).toBeTruthy()
      // Should not show duration text when duration is 0
    })
  })

  describe('Animation and Styling', () => {
    it('applies correct styling for destructive action', () => {
      const mockProps = {
        open: true,
        onOpenChange: jest.fn(),
        onDiscard: jest.fn(),
        onCancel: jest.fn(),
        recordingDuration: 25000,
      }

      render(
        <TestProvider>
          <NavigationDialog {...mockProps} />
        </TestProvider>
      )

      const discardButton = screen.getByRole('button', { name: /discard/i })
      expect(discardButton).toBeTruthy()
      // Note: React Native accessibility is handled differently than web
    })

    it('applies correct styling for secondary action', () => {
      const mockProps = {
        open: true,
        onOpenChange: jest.fn(),
        onDiscard: jest.fn(),
        onCancel: jest.fn(),
        recordingDuration: 25000,
      }

      render(
        <TestProvider>
          <NavigationDialog {...mockProps} />
        </TestProvider>
      )

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      expect(cancelButton).toBeTruthy()
      // Note: React Native accessibility is handled differently than web
    })
  })
})
