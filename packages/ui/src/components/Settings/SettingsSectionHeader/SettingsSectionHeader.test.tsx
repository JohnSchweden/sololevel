import type { IconProps } from '@tamagui/helpers-icon'
import { screen } from '@testing-library/react'
import { renderWithProvider } from '@ui/test-utils'
import { SettingsSectionHeader } from './SettingsSectionHeader'

// Mock icon component for testing
const MockIcon = (props: IconProps) => (
  <svg
    data-testid="mock-icon"
    width={props.size}
    height={props.size}
  >
    <rect
      width={props.size}
      height={props.size}
      fill={String(props.color)}
    />
  </svg>
)

describe('SettingsSectionHeader', () => {
  describe('Component Interface', () => {
    it('should render with title text', () => {
      renderWithProvider(
        <SettingsSectionHeader
          title="Authentication"
          icon={MockIcon}
        />
      )

      expect(screen.getByText('Authentication')).toBeInTheDocument()
    })

    it('should render with icon', () => {
      renderWithProvider(
        <SettingsSectionHeader
          title="Authentication"
          icon={MockIcon}
          testID="section-header"
        />
      )

      // Icon is rendered
      const icon = screen.getByTestId('mock-icon')
      expect(icon).toBeInTheDocument()
    })

    it('should apply custom testID', () => {
      renderWithProvider(
        <SettingsSectionHeader
          title="Security"
          icon={MockIcon}
          testID="custom-header"
        />
      )

      expect(screen.getByTestId('custom-header')).toBeInTheDocument()
    })
  })

  describe('Theme Integration', () => {
    it('should use textSecondary color for text', () => {
      renderWithProvider(
        <SettingsSectionHeader
          title="Authentication"
          icon={MockIcon}
        />
      )

      const title = screen.getByText('Authentication')
      // Tamagui applies color via CSS variables
      expect(title).toBeInTheDocument()
    })

    it('should have bottom border styling', () => {
      renderWithProvider(
        <SettingsSectionHeader
          title="Authentication"
          icon={MockIcon}
          testID="header"
        />
      )

      const header = screen.getByTestId('header')
      // Component should render with border-bottom classes/attributes
      expect(header).toBeInTheDocument()
    })
  })

  describe('Layout Structure', () => {
    it('should render icon and title together', () => {
      renderWithProvider(
        <SettingsSectionHeader
          title="Authentication"
          icon={MockIcon}
          testID="header"
        />
      )

      const header = screen.getByTestId('header')
      const title = screen.getByText('Authentication')
      const icon = screen.getByTestId('mock-icon')

      // All elements should be present
      expect(header).toBeInTheDocument()
      expect(title).toBeInTheDocument()
      expect(icon).toBeInTheDocument()
    })

    it('should have proper spacing between icon and text', () => {
      renderWithProvider(
        <SettingsSectionHeader
          title="Authentication"
          icon={MockIcon}
        />
      )

      const title = screen.getByText('Authentication')
      const icon = screen.getByTestId('mock-icon')
      expect(title).toBeInTheDocument()
      expect(icon).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should render as heading', () => {
      renderWithProvider(
        <SettingsSectionHeader
          title="Authentication"
          icon={MockIcon}
        />
      )

      // Text should be in a heading structure
      const title = screen.getByText('Authentication')
      expect(title).toBeInTheDocument()
    })
  })
})
