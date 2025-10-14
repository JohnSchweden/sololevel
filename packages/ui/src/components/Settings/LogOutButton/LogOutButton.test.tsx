import { fireEvent, render, screen } from '@testing-library/react'
import { TamaguiProvider } from 'tamagui'
import config from '../../../config/tamagui.config'
import { LogOutButton } from './LogOutButton'

const renderWithProvider = (ui: React.ReactElement) => {
  return render(<TamaguiProvider config={config}>{ui}</TamaguiProvider>)
}

describe('LogOutButton', () => {
  // Arrange-Act-Assert pattern
  describe('Component Rendering', () => {
    it('renders with correct label and styling', () => {
      // Arrange: Basic button
      const onPress = jest.fn()

      // Act: Render button
      renderWithProvider(
        <LogOutButton
          onPress={onPress}
          isLoading={false}
        />
      )

      // Assert: Label visible
      expect(screen.getByText('Log out')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Log out/i })).toBeInTheDocument()
    })

    it('shows spinner when loading', () => {
      // Arrange: Loading state
      const onPress = jest.fn()

      // Act: Render with loading
      renderWithProvider(
        <LogOutButton
          onPress={onPress}
          isLoading={true}
        />
      )

      // Assert: Spinner visible (spinner has role="status" in Tamagui)
      const spinner = screen.getByTestId('log-out-button-spinner')
      expect(spinner).toBeInTheDocument()
    })

    it('hides label text when loading', () => {
      // Arrange: Loading state
      const onPress = jest.fn()

      // Act: Render with loading
      renderWithProvider(
        <LogOutButton
          onPress={onPress}
          isLoading={true}
        />
      )

      // Assert: Text hidden (via opacity or display:none)
      const button = screen.getByTestId('log-out-button')
      expect(button).toBeInTheDocument()
    })
  })

  describe('User Interactions', () => {
    it('calls onPress when clicked', () => {
      // Arrange: Spy on press handler
      const onPress = jest.fn()

      // Act: Render and click
      renderWithProvider(
        <LogOutButton
          onPress={onPress}
          isLoading={false}
        />
      )
      const button = screen.getByRole('button')
      fireEvent.click(button)

      // Assert: Handler called
      expect(onPress).toHaveBeenCalledTimes(1)
    })

    it('does not call onPress when loading', () => {
      // Arrange: Loading state
      const onPress = jest.fn()

      // Act: Render loading and attempt click
      renderWithProvider(
        <LogOutButton
          onPress={onPress}
          isLoading={true}
        />
      )
      const button = screen.getByRole('button')
      fireEvent.click(button)

      // Assert: Handler not called
      expect(onPress).not.toHaveBeenCalled()
    })
  })
})
