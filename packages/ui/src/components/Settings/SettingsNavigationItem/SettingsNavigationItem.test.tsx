import { Smartphone } from '@tamagui/lucide-icons'
import { fireEvent, screen } from '@testing-library/react'
import { renderWithProvider } from '@ui/test-utils'
import { SettingsNavigationItem } from './SettingsNavigationItem'

describe('SettingsNavigationItem', () => {
  const defaultProps = {
    icon: Smartphone,
    iconColor: '#C4B5FD',
    iconBackgroundColor: 'rgba(168, 85, 247, 0.2)',
    iconBorderColor: 'rgba(192, 132, 252, 0.3)',
    title: 'Active Sessions',
    subtitle: 'Manage logged in devices',
    onPress: jest.fn(),
  }

  // Arrange-Act-Assert pattern
  describe('Component Rendering', () => {
    it('renders title and subtitle text', () => {
      // Arrange: Navigation item with title and subtitle
      const { title, subtitle } = defaultProps

      // Act: Render component
      renderWithProvider(<SettingsNavigationItem {...defaultProps} />)

      // Assert: Title and subtitle visible
      expect(screen.getByText(title)).toBeInTheDocument()
      expect(screen.getByText(subtitle)).toBeInTheDocument()
    })

    it('renders icon container and chevron', () => {
      // Arrange: Navigation item with icon
      const { getByTestId } = renderWithProvider(<SettingsNavigationItem {...defaultProps} />)

      // Act: Query for icon container and chevron
      const iconContainer = getByTestId('settings-navigation-item-icon-container')
      const icon = getByTestId('smartphone-icon')
      const chevron = getByTestId('chevron-right-icon')

      // Assert: All elements present
      expect(iconContainer).toBeInTheDocument()
      expect(icon).toBeInTheDocument()
      expect(chevron).toBeInTheDocument()
    })

    it('applies correct accessibility label', () => {
      // Arrange: Navigation item for accessibility
      const { title, subtitle } = defaultProps

      // Act: Render component
      renderWithProvider(<SettingsNavigationItem {...defaultProps} />)

      // Assert: Accessible as button with combined label
      const button = screen.getByRole('button', {
        name: `${title}, ${subtitle}`,
      })
      expect(button).toBeInTheDocument()
    })
  })

  describe('User Interactions', () => {
    it('calls onPress when navigation item is clicked', () => {
      // Arrange: Spy on press handler
      const onPress = jest.fn()

      // Act: Render and click
      renderWithProvider(
        <SettingsNavigationItem
          {...defaultProps}
          onPress={onPress}
        />
      )
      const button = screen.getByRole('button')
      fireEvent.click(button)

      // Assert: Handler called once
      expect(onPress).toHaveBeenCalledTimes(1)
    })

    it('does not call onPress when disabled', () => {
      // Arrange: Disabled navigation item
      const onPress = jest.fn()

      // Act: Render disabled and attempt click
      renderWithProvider(
        <SettingsNavigationItem
          {...defaultProps}
          onPress={onPress}
          disabled={true}
        />
      )
      const button = screen.getByRole('button')
      fireEvent.click(button)

      // Assert: Handler not called
      expect(onPress).not.toHaveBeenCalled()
    })
  })

  describe('Customization', () => {
    it('accepts custom testID prop', () => {
      // Arrange: Navigation item with custom testID
      const customID = 'custom-nav-item'

      // Act: Render with custom testID
      const { getByTestId } = renderWithProvider(
        <SettingsNavigationItem
          {...defaultProps}
          testID={customID}
        />
      )

      // Assert: All elements use custom testID prefix
      expect(getByTestId(customID)).toBeInTheDocument()
      expect(getByTestId(`${customID}-title`)).toBeInTheDocument()
      expect(getByTestId(`${customID}-subtitle`)).toBeInTheDocument()
      expect(getByTestId(`${customID}-icon-container`)).toBeInTheDocument()
    })
  })
})
