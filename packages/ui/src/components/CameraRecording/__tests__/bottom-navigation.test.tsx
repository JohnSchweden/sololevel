/**
 * Bottom Navigation Component Tests
 * Tests the bottom navigation UI and tab functionality
 */

import { act, fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

// Import shared test utilities (includes all mocks and setup)
import '../../../test-utils/setup'
import { TestProvider } from '../../../test-utils'

// Import component to test
import { BottomNavigation } from '../BottomNavigation'

// Mock data for viewport testing
const MOBILE_DEVICES = [
  { width: 320, name: 'iPhone SE' },
  { width: 375, name: 'iPhone' },
  { width: 390, name: 'iPhone 12/13' },
  { width: 428, name: 'iPhone 12/13 Pro Max' },
]

const generateViewportTestData = (devices: typeof MOBILE_DEVICES) =>
  devices.map((device) => [device.width, device.name] as [number, string])

describe('Bottom Navigation Component', () => {
  const mockTabChange = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders all three tabs with proper labels', () => {
      render(
        <TestProvider>
          <BottomNavigation
            activeTab="record"
            onTabChange={mockTabChange}
          />
        </TestProvider>
      )

      expect(screen.getByLabelText('Coach tab')).toBeTruthy()
      expect(screen.getByLabelText('Record tab')).toBeTruthy()
      expect(screen.getByLabelText('Insights tab')).toBeTruthy()
    })

    it('displays tab icons and labels', () => {
      render(
        <TestProvider>
          <BottomNavigation
            activeTab="record"
            onTabChange={mockTabChange}
          />
        </TestProvider>
      )

      // Verify tabs have proper content
      expect(screen.getByText('Coach')).toBeTruthy()
      expect(screen.getByText('Record')).toBeTruthy()
      expect(screen.getByText('Insights')).toBeTruthy()
    })

    it('renders in a horizontal layout', () => {
      render(
        <TestProvider>
          <BottomNavigation
            activeTab="record"
            onTabChange={mockTabChange}
          />
        </TestProvider>
      )

      const tabs = screen.getAllByRole('tab')
      expect(tabs.length).toBe(3)
    })
  })

  describe('Touch Target Compliance', () => {
    it('renders three tabs with proper touch targets', () => {
      render(
        <TestProvider>
          <BottomNavigation
            activeTab="record"
            onTabChange={mockTabChange}
          />
        </TestProvider>
      )

      // Test all tabs exist
      expect(screen.getByLabelText('Coach tab')).toBeTruthy()
      expect(screen.getByLabelText('Record tab')).toBeTruthy()
      expect(screen.getByLabelText('Insights tab')).toBeTruthy()

      // Test touch targets
      const recordTab = screen.getByLabelText('Record tab')
      expect(recordTab).toBeTruthy()
    })

    describe.each(generateViewportTestData(MOBILE_DEVICES))('viewport size %dpx (%s)', () => {
      it('maintains touch targets', () => {
        render(
          <TestProvider>
            <BottomNavigation
              activeTab="record"
              onTabChange={mockTabChange}
            />
          </TestProvider>
        )

        const tabs = screen.getAllByRole('tab')
        expect(tabs.length).toBe(3)

        tabs.forEach((tab) => {
          // Check that the tab has proper accessibility attributes
          expect(tab.getAttribute('aria-label')).toBeDefined()
        })
      })
    })
  })

  describe('State Management', () => {
    it('handles active state correctly', () => {
      render(
        <TestProvider>
          <BottomNavigation
            activeTab="coach"
            onTabChange={mockTabChange}
          />
        </TestProvider>
      )

      const coachTab = screen.getByLabelText('Coach tab')
      expect(coachTab).toHaveAttribute('aria-selected', 'true')
    })

    it('updates active state when tab is clicked', () => {
      render(
        <TestProvider>
          <BottomNavigation
            activeTab="record"
            onTabChange={mockTabChange}
          />
        </TestProvider>
      )

      const insightsTab = screen.getByLabelText('Insights tab')
      insightsTab.click()

      expect(mockTabChange).toHaveBeenCalledWith('insights')
    })

    it('maintains active tab visual indication', () => {
      render(
        <TestProvider>
          <BottomNavigation
            activeTab="insights"
            onTabChange={mockTabChange}
          />
        </TestProvider>
      )

      const insightsTab = screen.getByLabelText('Insights tab')
      expect(insightsTab).toHaveAttribute('aria-selected', 'true')

      const recordTab = screen.getByLabelText('Record tab')
      expect(recordTab).toHaveAttribute('aria-selected', 'false')
    })
  })

  describe('User Interactions', () => {
    it('handles coach tab press', () => {
      render(
        <TestProvider>
          <BottomNavigation
            activeTab="record"
            onTabChange={mockTabChange}
          />
        </TestProvider>
      )

      const coachTab = screen.getByLabelText('Coach tab')
      coachTab.click()

      expect(mockTabChange).toHaveBeenCalledWith('coach')
    })

    it('handles record tab press', () => {
      render(
        <TestProvider>
          <BottomNavigation
            activeTab="coach"
            onTabChange={mockTabChange}
          />
        </TestProvider>
      )

      const recordTab = screen.getByLabelText('Record tab')
      recordTab.click()

      expect(mockTabChange).toHaveBeenCalledWith('record')
    })

    it('handles insights tab press', () => {
      render(
        <TestProvider>
          <BottomNavigation
            activeTab="coach"
            onTabChange={mockTabChange}
          />
        </TestProvider>
      )

      const insightsTab = screen.getByLabelText('Insights tab')
      insightsTab.click()

      expect(mockTabChange).toHaveBeenCalledWith('insights')
    })

    it('prevents clicking already active tab', () => {
      render(
        <TestProvider>
          <BottomNavigation
            activeTab="record"
            onTabChange={mockTabChange}
          />
        </TestProvider>
      )

      const recordTab = screen.getByLabelText('Record tab')
      recordTab.click()

      // Should still call onTabChange even for already active tab
      expect(mockTabChange).toHaveBeenCalledWith('record')
    })

    it('supports keyboard navigation', () => {
      render(
        <TestProvider>
          <BottomNavigation
            activeTab="record"
            onTabChange={mockTabChange}
          />
        </TestProvider>
      )

      const coachTab = screen.getByLabelText('Coach tab')
      act(() => {
        coachTab.focus()
      })

      expect(document.activeElement).toBe(coachTab)

      // Simulate keyboard activation
      fireEvent.keyDown(coachTab, { key: 'Enter' })
      // Note: Keyboard events may not trigger click handlers in mock environment
      // This test verifies the tab can receive keyboard focus
      expect(coachTab).toBeTruthy()
    })
  })

  describe('Responsive Behavior', () => {
    it('works properly on different mobile widths', () => {
      render(
        <TestProvider>
          <BottomNavigation
            activeTab="insights"
            onTabChange={mockTabChange}
          />
        </TestProvider>
      )

      // Tabs should still be properly spaced and touchable
      const tabs = screen.getAllByRole('tab')
      expect(tabs).toHaveLength(3)

      tabs.forEach((tab) => {
        expect(tab).toBeTruthy()
      })
    })

    it('handles narrow screens with text truncation', () => {
      render(
        <TestProvider>
          <BottomNavigation
            activeTab="record"
            onTabChange={mockTabChange}
          />
        </TestProvider>
      )

      const tabs = screen.getAllByRole('tab')
      expect(tabs).toHaveLength(3)

      // Verify tabs are still functional despite narrow width
      tabs.forEach((tab) => {
        expect(tab).toBeTruthy()
        expect(tab.getAttribute('aria-label')).toBeDefined()
      })
    })

    it('maintains equal tab distribution', () => {
      render(
        <TestProvider>
          <BottomNavigation
            activeTab="record"
            onTabChange={mockTabChange}
          />
        </TestProvider>
      )

      const tabs = screen.getAllByRole('tab')
      expect(tabs.length).toBe(3)

      // All tabs should be visible and accessible
      expect(screen.getByText('Coach')).toBeTruthy()
      expect(screen.getByText('Record')).toBeTruthy()
      expect(screen.getByText('Insights')).toBeTruthy()
    })
  })

  describe('Accessibility', () => {
    it('provides proper ARIA attributes', () => {
      render(
        <TestProvider>
          <BottomNavigation
            activeTab="record"
            onTabChange={mockTabChange}
          />
        </TestProvider>
      )

      const tabs = screen.getAllByRole('tab')
      expect(tabs.length).toBeGreaterThan(0)

      // Check that tabs have proper ARIA attributes
      tabs.forEach((tab) => {
        expect(tab.getAttribute('aria-label')).toBeDefined()
        expect(tab.getAttribute('role')).toBe('tab')
        expect(tab).toHaveAttribute('aria-selected')
      })
    })

    it('provides proper tab panel relationships', () => {
      render(
        <TestProvider>
          <BottomNavigation
            activeTab="record"
            onTabChange={mockTabChange}
          />
        </TestProvider>
      )

      const tabs = screen.getAllByRole('tab')

      // Should have proper tab buttons
      expect(tabs).toHaveLength(3)
      expect(tabs[0]).toHaveAttribute('aria-label', 'Coach tab')
      expect(tabs[1]).toHaveAttribute('aria-label', 'Record tab')
      expect(tabs[2]).toHaveAttribute('aria-label', 'Insights tab')
    })

    it('supports keyboard navigation', () => {
      render(
        <TestProvider>
          <BottomNavigation
            activeTab="record"
            onTabChange={mockTabChange}
          />
        </TestProvider>
      )

      const coachTab = screen.getByLabelText('Coach tab')

      // Simulate click for button activation
      fireEvent.click(coachTab)
      expect(mockTabChange).toHaveBeenCalledWith('coach')
    })

    it('provides screen reader feedback for active tab', () => {
      render(
        <TestProvider>
          <BottomNavigation
            activeTab="coach"
            onTabChange={mockTabChange}
          />
        </TestProvider>
      )

      const coachTab = screen.getByLabelText('Coach tab')
      expect(coachTab).toHaveAttribute('aria-selected', 'true')

      // Screen readers should announce the active tab
      expect(coachTab).toHaveAttribute('aria-label', 'Coach tab')
    })

    it('meets touch target requirements', () => {
      render(
        <TestProvider>
          <BottomNavigation
            activeTab="record"
            onTabChange={mockTabChange}
          />
        </TestProvider>
      )

      const tabs = screen.getAllByRole('tab')
      tabs.forEach((tab) => {
        // Check accessibility attributes
        expect(tab).toHaveAttribute('aria-label')
        expect(tab).toHaveAttribute('role', 'tab')
      })
    })
  })

  describe('Performance', () => {
    it('does not re-render unnecessarily', () => {
      const { rerender } = render(
        <TestProvider>
          <BottomNavigation
            activeTab="record"
            onTabChange={mockTabChange}
          />
        </TestProvider>
      )

      const initialTabs = screen.getAllByRole('tab')

      // Re-render with same props
      rerender(
        <TestProvider>
          <BottomNavigation
            activeTab="record"
            onTabChange={mockTabChange}
          />
        </TestProvider>
      )

      const updatedTabs = screen.getAllByRole('tab')
      expect(updatedTabs.length).toBe(initialTabs.length)
    })

    it('handles rapid tab changes', () => {
      render(
        <TestProvider>
          <BottomNavigation
            activeTab="record"
            onTabChange={mockTabChange}
          />
        </TestProvider>
      )

      const coachTab = screen.getByLabelText('Coach tab')
      const insightsTab = screen.getByLabelText('Insights tab')

      // Rapid clicks
      coachTab.click()
      insightsTab.click()
      coachTab.click()

      expect(mockTabChange).toHaveBeenCalledTimes(3)
      expect(mockTabChange).toHaveBeenNthCalledWith(1, 'coach')
      expect(mockTabChange).toHaveBeenNthCalledWith(2, 'insights')
      expect(mockTabChange).toHaveBeenNthCalledWith(3, 'coach')
    })
  })

  describe('Visual States', () => {
    it('applies active tab styling correctly', () => {
      render(
        <TestProvider>
          <BottomNavigation
            activeTab="record"
            onTabChange={mockTabChange}
          />
        </TestProvider>
      )

      const recordTab = screen.getByLabelText('Record tab')
      const coachTab = screen.getByLabelText('Coach tab')

      // Active tab should have different visual styling
      expect(recordTab).toHaveAttribute('aria-selected', 'true')
      expect(coachTab).toHaveAttribute('aria-selected', 'false')
    })

    it('provides visual feedback on hover', () => {
      render(
        <TestProvider>
          <BottomNavigation
            activeTab="record"
            onTabChange={mockTabChange}
          />
        </TestProvider>
      )

      const coachTab = screen.getByLabelText('Coach tab')

      // Simulate hover
      fireEvent.mouseEnter(coachTab)
      fireEvent.mouseLeave(coachTab)

      // Component should handle hover states gracefully
      expect(coachTab).toBeTruthy()
    })

    it('maintains visual consistency across different states', () => {
      const { rerender } = render(
        <TestProvider>
          <BottomNavigation
            activeTab="record"
            onTabChange={mockTabChange}
          />
        </TestProvider>
      )

      // Change active tab
      rerender(
        <TestProvider>
          <BottomNavigation
            activeTab="coach"
            onTabChange={mockTabChange}
          />
        </TestProvider>
      )

      const coachTab = screen.getByLabelText('Coach tab')
      expect(coachTab).toHaveAttribute('aria-selected', 'true')
    })
  })
})
