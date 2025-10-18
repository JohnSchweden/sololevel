import { Sparkles, Target } from '@tamagui/lucide-icons'
import { fireEvent, render, screen } from '@testing-library/react'
import { TestProvider } from '../../../test-utils'
import { SuggestionChip } from './SuggestionChip'

// Test wrapper with Tamagui provider
const renderWithProvider = (component: React.ReactElement) => {
  return render(<TestProvider>{component}</TestProvider>)
}

describe('SuggestionChip', () => {
  const defaultProps = {
    text: 'Analyze my deadlift form',
    testID: 'suggestion-chip',
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Visual Component Tests', () => {
    it('should render with basic props', () => {
      // Arrange
      const { getByTestId, getByText } = renderWithProvider(<SuggestionChip {...defaultProps} />)

      // Act & Assert
      expect(getByTestId('suggestion-chip')).toBeInTheDocument()
      expect(getByText('Analyze my deadlift form')).toBeInTheDocument()
    })

    it('should render with icon and category', () => {
      // Arrange
      const props = {
        ...defaultProps,
        icon: Target,
        category: 'Form Analysis',
      }
      const { getByText } = renderWithProvider(<SuggestionChip {...props} />)

      // Act & Assert
      expect(getByText('Analyze my deadlift form')).toBeInTheDocument()
      expect(getByText('Form Analysis')).toBeInTheDocument()
    })

    it('should render with different text and category', () => {
      // Arrange
      const props = {
        ...defaultProps,
        text: 'Give me workout tips',
        category: 'Training',
      }
      const { getByText } = renderWithProvider(<SuggestionChip {...props} />)

      // Act & Assert
      expect(getByText('Give me workout tips')).toBeInTheDocument()
      expect(getByText('Training')).toBeInTheDocument()
    })
  })

  describe('Interaction Tests', () => {
    it('should call onPress when clicked', () => {
      // Arrange
      const onPress = jest.fn()
      const { getByTestId } = renderWithProvider(
        <SuggestionChip
          {...defaultProps}
          onPress={onPress}
        />
      )

      // Act
      fireEvent.click(getByTestId('suggestion-chip'))

      // Assert
      expect(onPress).toHaveBeenCalledTimes(1)
    })

    it('should not call onPress when disabled', () => {
      // Arrange
      const onPress = jest.fn()
      const { getByTestId } = renderWithProvider(
        <SuggestionChip
          {...defaultProps}
          onPress={onPress}
          disabled
        />
      )

      // Act
      fireEvent.click(getByTestId('suggestion-chip'))

      // Assert
      expect(onPress).not.toHaveBeenCalled()
    })

    it('should be disabled when disabled prop is true', () => {
      // Arrange
      const onPress = jest.fn()
      const { getByTestId } = renderWithProvider(
        <SuggestionChip
          {...defaultProps}
          onPress={onPress}
          disabled
        />
      )

      // Act & Assert
      const chip = getByTestId('suggestion-chip')
      expect(chip).toBeDisabled()
    })
  })

  describe('Accessibility Tests', () => {
    it('should have proper accessibility label with text only', () => {
      // Arrange & Act
      const { getByLabelText } = renderWithProvider(<SuggestionChip {...defaultProps} />)

      // Assert
      expect(getByLabelText('Suggestion: Analyze my deadlift form')).toBeInTheDocument()
    })

    it('should have proper accessibility label with text and category', () => {
      // Arrange
      const props = {
        ...defaultProps,
        category: 'Form Analysis',
      }
      const { getByLabelText } = renderWithProvider(<SuggestionChip {...props} />)

      // Act & Assert
      expect(
        getByLabelText('Suggestion: Analyze my deadlift form, Form Analysis')
      ).toBeInTheDocument()
    })

    it('should have button accessibility role', () => {
      // Arrange & Act
      const { getByRole } = renderWithProvider(<SuggestionChip {...defaultProps} />)

      // Assert
      const chip = getByRole('button')
      expect(chip).toBeInTheDocument()
    })
  })
})
