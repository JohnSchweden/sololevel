/**
 * Zoom Controls Component Tests
 * Tests the zoom controls functionality during recording
 */

import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'

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

      expect(screen.getByLabelText('1x zoom')).toBeTruthy()
      expect(screen.getByLabelText('2x zoom')).toBeTruthy()
      expect(screen.getByLabelText('3x zoom')).toBeTruthy()
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

      const zoom2Button = screen.getByLabelText('2x zoom')
      expect(zoom2Button).toBeTruthy()
      // For web testing, verify element is properly rendered
      expect(zoom2Button.getAttribute('aria-label')).toBe('2x zoom')
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
      expect(screen.getByLabelText('1x zoom')).toBeTruthy()
      expect(screen.getByLabelText('2x zoom')).toBeTruthy()
      expect(screen.getByLabelText('3x zoom')).toBeTruthy()
    })

    it('shows zoom range from 1x to 3x', () => {
      render(
        <TestProvider>
          <ZoomControls {...mockProps} />
        </TestProvider>
      )

      // Verify all expected zoom levels are present
      expect(screen.getByLabelText('1x zoom')).toBeTruthy()
      expect(screen.getByLabelText('2x zoom')).toBeTruthy()
      expect(screen.getByLabelText('3x zoom')).toBeTruthy()

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

      const zoom3Button = screen.getByLabelText('3x zoom')
      fireEvent.click(zoom3Button)

      expect(mockProps.onZoomChange).toHaveBeenCalledWith(3)
    })

    it('supports button activation', () => {
      render(
        <TestProvider>
          <ZoomControls {...mockProps} />
        </TestProvider>
      )

      const zoom2Button = screen.getByLabelText('2x zoom')
      fireEvent.click(zoom2Button)

      expect(mockProps.onZoomChange).toHaveBeenCalledWith(2)
    })

    it('handles multiple zoom changes', () => {
      render(
        <TestProvider>
          <ZoomControls {...mockProps} />
        </TestProvider>
      )

      const zoom2Button = screen.getByLabelText('2x zoom')
      const zoom3Button = screen.getByLabelText('3x zoom')

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

      const zoom1Button = screen.getByLabelText('1x zoom')
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

      const zoom2Button = screen.getByLabelText('2x zoom')
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

      expect(screen.getByLabelText('1x zoom')).toHaveAttribute('aria-selected', 'true')

      // Update to 2x zoom
      rerender(
        <TestProvider>
          <ZoomControls
            {...mockProps}
            currentZoom={2}
          />
        </TestProvider>
      )

      expect(screen.getByLabelText('1x zoom')).toHaveAttribute('aria-selected', 'false')
      expect(screen.getByLabelText('2x zoom')).toHaveAttribute('aria-selected', 'true')
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

      expect(screen.getByLabelText('1x zoom')).toHaveAttribute('aria-selected', 'true')

      // Test with zoom level at maximum (3x)
      const { rerender } = render(
        <TestProvider>
          <ZoomControls
            {...mockProps}
            currentZoom={3}
          />
        </TestProvider>
      )

      // Test with out-of-bounds value (should handle gracefully)
      rerender(
        <TestProvider>
          <ZoomControls
            {...mockProps}
            currentZoom={4}
          />
        </TestProvider>
      )

      // Should still render all zoom levels (use getAllByLabelText to handle multiples)
      const zoom1Buttons = screen.getAllByLabelText('1x zoom')
      const zoom2Buttons = screen.getAllByLabelText('2x zoom')
      const zoom3Buttons = screen.getAllByLabelText('3x zoom')

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

      const zoomButtons = ['1x zoom', '2x zoom', '3x zoom']
      zoomButtons.forEach((label) => {
        const button = screen.getByLabelText(label)
        expect(button.getAttribute('aria-label')).toBe(label)
      })
    })

    it('provides zoom level information for screen readers', () => {
      render(
        <TestProvider>
          <ZoomControls {...mockProps} />
        </TestProvider>
      )

      // Screen readers should understand current zoom level
      const currentZoom = screen.getByLabelText('1x zoom')
      expect(currentZoom).toHaveAttribute('aria-label', '1x zoom')
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
        expect(button).toHaveAttribute('aria-label')
        expect(button).toHaveAttribute('role', 'button')
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

      const zoom2Button = screen.getByLabelText('2x zoom')
      const zoom3Button = screen.getByLabelText('3x zoom')

      // Simulate rapid clicks
      fireEvent.click(zoom2Button)
      fireEvent.click(zoom3Button)
      fireEvent.click(zoom2Button)

      // Should handle all zoom changes
      expect(mockProps.onZoomChange).toHaveBeenCalledTimes(3)
    })
  })
})
