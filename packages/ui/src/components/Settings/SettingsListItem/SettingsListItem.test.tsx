import { fireEvent, render, screen } from '@testing-library/react'
import { TamaguiProvider } from 'tamagui'
import config from '../../../config/tamagui.config'
import { SettingsListItem } from './SettingsListItem'

const renderWithProvider = (ui: React.ReactElement) => {
  return render(<TamaguiProvider config={config}>{ui}</TamaguiProvider>)
}

describe('SettingsListItem', () => {
  // Arrange-Act-Assert pattern
  describe('Component Rendering', () => {
    it('renders label and chevron icon', () => {
      // Arrange: List item with label
      const label = 'Account'

      // Act: Render component
      renderWithProvider(
        <SettingsListItem
          label={label}
          onPress={jest.fn()}
        />
      )

      // Assert: Label and chevron visible
      expect(screen.getByText('Account')).toBeInTheDocument()
      expect(screen.getByTestId('chevron-right-icon')).toBeInTheDocument()
    })

    it('applies correct accessibility label', () => {
      // Arrange: List item for navigation
      const label = 'Security'

      // Act: Render component
      renderWithProvider(
        <SettingsListItem
          label={label}
          onPress={jest.fn()}
        />
      )

      // Assert: Accessible as button
      const button = screen.getByRole('button', { name: /Security/i })
      expect(button).toBeInTheDocument()
    })
  })

  describe('User Interactions', () => {
    it('calls onPress when list item is clicked', () => {
      // Arrange: Spy on press handler
      const onPress = jest.fn()

      // Act: Render and click
      renderWithProvider(
        <SettingsListItem
          label="Account"
          onPress={onPress}
        />
      )
      const button = screen.getByRole('button')
      fireEvent.click(button)

      // Assert: Handler called once
      expect(onPress).toHaveBeenCalledTimes(1)
    })

    it('does not call onPress when disabled', () => {
      // Arrange: Disabled list item
      const onPress = jest.fn()

      // Act: Render disabled and attempt click
      renderWithProvider(
        <SettingsListItem
          label="Account"
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
})
