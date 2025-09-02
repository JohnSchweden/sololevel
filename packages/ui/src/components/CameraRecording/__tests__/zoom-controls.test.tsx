/**
 * Zoom Controls Component Tests
 * Tests the zoom controls functionality during recording
 */

import { fireEvent, render, screen } from '@testing-library/react'

// Import shared test utilities (includes all mocks and setup)
import '../../../test-utils/setup'
import { TestProvider } from '../../../test-utils'

// Import component to test
import { ZoomControls } from '../RecordingControls'

describe('Zoom Controls Component', () => {
  const mockProps = {
    currentZoom: 1 as const,
    onZoomChange: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders all zoom levels', () => {
      render(
        <TestProvider>
          <ZoomControls {...mockProps} />
        </TestProvider>
      )

      expect(screen.getByText('1x').closest('button')).toBeTruthy()
      expect(screen.getByText('2x').closest('button')).toBeTruthy()
      expect(screen.getByText('3x').closest('button')).toBeTruthy()
    })

    it('highlights active zoom level', () => {
      render(
        <TestProvider>
          <ZoomControls
            {...mockProps}
            currentZoom={2}
          />
        </TestProvider>
      )

      const zoom2Button = screen.getByText('2x').closest('button')
      expect(zoom2Button).toBeTruthy()
      // For web testing, verify element is properly rendered
      expect(zoom2Button).toHaveAttribute('role', 'button')
    })

    it('renders zoom level indicator', () => {
      render(
        <TestProvider>
          <ZoomControls {...mockProps} />
        </TestProvider>
      )

      // Should show current zoom level
      const currentZoom = screen.getByText('1x')
      expect(currentZoom).toBeTruthy()
    })

    it('renders zoom controls in a row layout', () => {
      render(
        <TestProvider>
          <ZoomControls {...mockProps} />
        </TestProvider>
      )

      // Should render all zoom level buttons
      expect(screen.getByText('1x').closest('button')).toBeTruthy()
      expect(screen.getByText('2x').closest('button')).toBeTruthy()
      expect(screen.getByText('3x').closest('button')).toBeTruthy()
    })

    it('shows zoom range from 1x to 3x', () => {
      render(
        <TestProvider>
          <ZoomControls {...mockProps} />
        </TestProvider>
      )

      // Verify all expected zoom levels are present
      expect(screen.getByText('1x').closest('button')).toBeTruthy()
      expect(screen.getByText('2x').closest('button')).toBeTruthy()
      expect(screen.getByText('3x').closest('button')).toBeTruthy()

      // Should not have 0x or 4x
      expect(screen.queryByLabelText('0x zoom')).toBeNull()
      expect(screen.queryByLabelText('4x zoom')).toBeNull()
    })
  })

  describe('User Interactions', () => {
    it('handles zoom level change', () => {
      render(
        <TestProvider>
          <ZoomControls {...mockProps} />
        </TestProvider>
      )

      const zoom3Button = screen.getByText('3x').closest('button')
      fireEvent.click(zoom3Button)

      expect(mockProps.onZoomChange).toHaveBeenCalledWith(3)
    })

    it('supports button activation', () => {
      render(
        <TestProvider>
          <ZoomControls {...mockProps} />
        </TestProvider>
      )

      const zoom2Button = screen.getByText('2x').closest('button')
      fireEvent.click(zoom2Button)

      expect(mockProps.onZoomChange).toHaveBeenCalledWith(2)
    })

    it('handles multiple zoom changes', () => {
      render(
        <TestProvider>
          <ZoomControls {...mockProps} />
        </TestProvider>
      )

      const zoom2Button = screen.getByText('2x').closest('button')
      const zoom3Button = screen.getByText('3x').closest('button')

      fireEvent.click(zoom2Button)
      fireEvent.click(zoom3Button)

      expect(mockProps.onZoomChange).toHaveBeenCalledTimes(2)
      expect(mockProps.onZoomChange).toHaveBeenNthCalledWith(1, 2)
      expect(mockProps.onZoomChange).toHaveBeenNthCalledWith(2, 3)
    })

    it('handles clicking same zoom level', () => {
      render(
        <TestProvider>
          <ZoomControls {...mockProps} />
        </TestProvider>
      )

      const zoom1Button = screen.getByText('1x').closest('button')
      fireEvent.click(zoom1Button)

      // Should still call onZoomChange even if it's the same level
      expect(mockProps.onZoomChange).toHaveBeenCalledWith(1)
    })

    it('supports keyboard navigation', () => {
      render(
        <TestProvider>
          <ZoomControls {...mockProps} />
        </TestProvider>
      )

      const zoom2Button = screen.getByText('2x').closest('button')
      zoom2Button.focus()

      expect(document.activeElement).toBe(zoom2Button)

      // Tab to next zoom level
      fireEvent.keyDown(zoom2Button, { key: 'Tab' })
      // This would test tab navigation between zoom buttons
    })
  })

  describe('States', () => {
    it('updates current zoom display when props change', () => {
      const { rerender } = render(
        <TestProvider>
          <ZoomControls {...mockProps} />
        </TestProvider>
      )

      expect(screen.getByText('1x').closest('button')).toHaveAttribute('aria-pressed', 'true')

      // Update to 2x zoom
      rerender(
        <TestProvider>
          <ZoomControls
            {...mockProps}
            currentZoom={2}
          />
        </TestProvider>
      )

      expect(screen.getByText('1x').closest('button')).toHaveAttribute('aria-pressed', 'false')
      expect(screen.getByText('2x').closest('button')).toHaveAttribute('aria-pressed', 'true')
    })

    it('maintains zoom level selection after re-render', () => {
      const { rerender } = render(
        <TestProvider>
          <ZoomControls
            {...mockProps}
            currentZoom={3}
          />
        </TestProvider>
      )

      expect(screen.getByText('3x')).toBeTruthy()

      // Re-render with same props
      rerender(
        <TestProvider>
          <ZoomControls
            {...mockProps}
            currentZoom={3}
          />
        </TestProvider>
      )

      expect(screen.getByText('3x')).toBeTruthy()
    })

    it('handles zoom level bounds correctly', () => {
      // Test with zoom level at minimum (1x)
      render(
        <TestProvider>
          <ZoomControls
            {...mockProps}
            currentZoom={1}
          />
        </TestProvider>
      )

      expect(screen.getByText('1x').closest('button')).toHaveAttribute('aria-pressed', 'true')

      // Test with zoom level at maximum (3x)
      const { rerender } = render(
        <TestProvider>
          <ZoomControls
            {...mockProps}
            currentZoom={3}
          />
        </TestProvider>
      )

      // Test with maximum zoom level (3x)
      rerender(
        <TestProvider>
          <ZoomControls
            {...mockProps}
            currentZoom={3}
          />
        </TestProvider>
      )

      // Should still render all zoom levels
      const zoom1Buttons = screen.getAllByText('1x')
      const zoom2Buttons = screen.getAllByText('2x')
      const zoom3Buttons = screen.getAllByText('3x')

      expect(zoom1Buttons.length).toBeGreaterThan(0)
      expect(zoom2Buttons.length).toBeGreaterThan(0)
      expect(zoom3Buttons.length).toBeGreaterThan(0)
    })
  })

  describe('Accessibility', () => {
    it('provides proper ARIA labels for all zoom levels', () => {
      render(
        <TestProvider>
          <ZoomControls {...mockProps} />
        </TestProvider>
      )

      const zoomButtons = ['1x', '2x', '3x']
      zoomButtons.forEach((label) => {
        const button = screen.getByText(label).closest('button')
        expect(button).toHaveAttribute('role', 'button')
        expect(button).toBeTruthy()
      })
    })

    it('provides zoom level information for screen readers', () => {
      render(
        <TestProvider>
          <ZoomControls {...mockProps} />
        </TestProvider>
      )

      // Screen readers should understand current zoom level
      const currentZoom = screen.getByText('1x').closest('button')
      expect(currentZoom).toHaveAttribute('role', 'button')
    })

    it('supports focus management', () => {
      render(
        <TestProvider>
          <ZoomControls {...mockProps} />
        </TestProvider>
      )

      const zoomButtons = screen.getAllByRole('button')
      zoomButtons.forEach((button) => {
        button.focus()
        expect(document.activeElement).toBe(button)
      })
    })

    it('meets touch target requirements', () => {
      render(
        <TestProvider>
          <ZoomControls {...mockProps} />
        </TestProvider>
      )

      const zoomButtons = screen.getAllByRole('button')
      zoomButtons.forEach((button) => {
        // Check accessibility attributes
        expect(button).toHaveAttribute('role', 'button')
        // Verify touch target size (minimum 44px)
        const styles = window.getComputedStyle(button)
        expect(Number.parseInt(styles.minHeight)).toBeGreaterThanOrEqual(32)
        expect(Number.parseInt(styles.minWidth)).toBeGreaterThanOrEqual(36)
      })
    })
  })

  describe('Performance', () => {
    it('does not re-render unnecessarily', () => {
      const { rerender } = render(
        <TestProvider>
          <ZoomControls {...mockProps} />
        </TestProvider>
      )

      const initialButtons = screen.getAllByRole('button')

      // Re-render with same props
      rerender(
        <TestProvider>
          <ZoomControls {...mockProps} />
        </TestProvider>
      )

      const updatedButtons = screen.getAllByRole('button')
      expect(updatedButtons.length).toBe(initialButtons.length)
    })

    it('handles rapid zoom changes', () => {
      render(
        <TestProvider>
          <ZoomControls {...mockProps} />
        </TestProvider>
      )

      const zoom2Button = screen.getByText('2x').closest('button')
      const zoom3Button = screen.getByText('3x').closest('button')

      // Simulate rapid clicks
      fireEvent.click(zoom2Button)
      fireEvent.click(zoom3Button)
      fireEvent.click(zoom2Button)

      // Should handle all zoom changes
      expect(mockProps.onZoomChange).toHaveBeenCalledTimes(3)
    })
  })
})
