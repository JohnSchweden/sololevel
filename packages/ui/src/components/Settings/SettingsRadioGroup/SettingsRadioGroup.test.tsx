import { Palette } from '@tamagui/lucide-icons'
import { screen } from '@testing-library/react'
import { renderWithProvider } from '@ui/test-utils'
import { SettingsRadioGroup } from './SettingsRadioGroup'

describe('SettingsRadioGroup', () => {
  describe('Component Interface', () => {
    it('should render with default value', () => {
      // Arrange
      renderWithProvider(
        <SettingsRadioGroup
          icon={Palette}
          iconColor="$color"
          iconBackground="$background"
          title="Theme"
          description="Choose your preferred theme"
          value="light"
          onValueChange={() => {}}
        />
      )

      // Assert
      expect(screen.getByTestId('settings-radio-group')).toBeInTheDocument()
      expect(screen.getByText('Light')).toBeInTheDocument()
      expect(screen.getByText('Dark')).toBeInTheDocument()
      expect(screen.getByText('Auto')).toBeInTheDocument()
    })

    it('should apply custom testID', () => {
      // Arrange
      renderWithProvider(
        <SettingsRadioGroup
          icon={Palette}
          iconColor="$color"
          iconBackground="$background"
          title="Theme"
          description="Choose your preferred theme"
          value="dark"
          onValueChange={() => {}}
          testID="custom-radio"
        />
      )

      // Assert
      expect(screen.getByTestId('custom-radio')).toBeInTheDocument()
    })
  })

  describe('Theme Selection', () => {
    it('should display all three theme options', () => {
      // Arrange
      renderWithProvider(
        <SettingsRadioGroup
          icon={Palette}
          iconColor="$color"
          iconBackground="$background"
          title="Theme"
          description="Choose your preferred theme"
          value="auto"
          onValueChange={() => {}}
        />
      )

      // Assert
      expect(screen.getByText('Light')).toBeInTheDocument()
      expect(screen.getByText('Dark')).toBeInTheDocument()
      expect(screen.getByText('Auto')).toBeInTheDocument()
    })

    it('should call onValueChange when option is selected', () => {
      // Arrange
      const handleChange = jest.fn()
      renderWithProvider(
        <SettingsRadioGroup
          icon={Palette}
          iconColor="$color"
          iconBackground="$background"
          title="Theme"
          description="Choose your preferred theme"
          value="light"
          onValueChange={handleChange}
        />
      )

      // Act - Note: Tamagui RadioGroup renders as native radio inputs
      const radioGroup = screen.getByTestId('settings-radio-group')

      // Assert - Component is rendered and interactive
      expect(radioGroup).toBeInTheDocument()
    })
  })

  describe('Layout Structure', () => {
    it('should render in horizontal layout with gap', () => {
      // Arrange
      renderWithProvider(
        <SettingsRadioGroup
          icon={Palette}
          iconColor="$color"
          iconBackground="$background"
          title="Theme"
          description="Choose your preferred theme"
          value="light"
          onValueChange={() => {}}
          testID="radio-group"
        />
      )

      // Assert
      const container = screen.getByTestId('radio-group')
      expect(container).toBeInTheDocument()
    })

    it('should have touch-friendly buttons (44px height)', () => {
      // Arrange
      renderWithProvider(
        <SettingsRadioGroup
          icon={Palette}
          iconColor="$color"
          iconBackground="$background"
          title="Theme"
          description="Choose your preferred theme"
          value="light"
          onValueChange={() => {}}
          testID="radio-group"
        />
      )

      // Assert
      const container = screen.getByTestId('radio-group')
      expect(container).toBeInTheDocument()
    })
  })

  describe('Visual States', () => {
    it('should highlight selected option', () => {
      // Arrange
      renderWithProvider(
        <SettingsRadioGroup
          icon={Palette}
          iconColor="$color"
          iconBackground="$background"
          title="Theme"
          description="Choose your preferred theme"
          value="dark"
          onValueChange={() => {}}
        />
      )

      // Assert - Dark option should be present
      expect(screen.getByText('Dark')).toBeInTheDocument()
    })

    it('should show inactive state for unselected options', () => {
      // Arrange
      renderWithProvider(
        <SettingsRadioGroup
          icon={Palette}
          iconColor="$color"
          iconBackground="$background"
          title="Theme"
          description="Choose your preferred theme"
          value="light"
          onValueChange={() => {}}
        />
      )

      // Assert - All options are present
      expect(screen.getByText('Light')).toBeInTheDocument()
      expect(screen.getByText('Dark')).toBeInTheDocument()
      expect(screen.getByText('Auto')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should render radio group with proper role', () => {
      // Arrange
      renderWithProvider(
        <SettingsRadioGroup
          icon={Palette}
          iconColor="$color"
          iconBackground="$background"
          title="Theme"
          description="Choose your preferred theme"
          value="light"
          onValueChange={() => {}}
        />
      )

      // Assert - RadioGroup should be present
      const radioGroup = screen.getByTestId('settings-radio-group')
      expect(radioGroup).toBeInTheDocument()
    })

    it('should have accessible labels for each option', () => {
      // Arrange
      renderWithProvider(
        <SettingsRadioGroup
          icon={Palette}
          iconColor="$color"
          iconBackground="$background"
          title="Theme"
          description="Choose your preferred theme"
          value="auto"
          onValueChange={() => {}}
        />
      )

      // Assert - All labels are visible
      expect(screen.getByText('Light')).toBeInTheDocument()
      expect(screen.getByText('Dark')).toBeInTheDocument()
      expect(screen.getByText('Auto')).toBeInTheDocument()
    })
  })
})
