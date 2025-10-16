import { fireEvent, screen } from '@testing-library/react'
import { renderWithProvider } from '@ui/test-utils'
import { FeedbackTypeButton } from './FeedbackTypeButton'

describe('FeedbackTypeButton', () => {
  const mockOnPress = jest.fn()
  const defaultProps = {
    id: 'bug',
    label: 'Bug Report',
    icon: '🐛',
    color: 'red' as const,
    selected: false,
    onPress: mockOnPress,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Visual Component Tests', () => {
    it('should render with icon and label', () => {
      // Arrange & Act
      const { container } = renderWithProvider(<FeedbackTypeButton {...defaultProps} />)

      // Assert
      expect(container).toBeInTheDocument()
      expect(screen.getByText('🐛')).toBeInTheDocument()
      expect(screen.getByText('Bug Report')).toBeInTheDocument()
    })

    it('should have proper accessibility label when not selected', () => {
      // Arrange & Act
      renderWithProvider(<FeedbackTypeButton {...defaultProps} />)

      // Assert
      const button = screen.getByLabelText('Bug Report, not selected')
      expect(button).toBeInTheDocument()
    })

    it('should have proper accessibility label when selected', () => {
      // Arrange & Act
      renderWithProvider(
        <FeedbackTypeButton
          {...defaultProps}
          selected={true}
        />
      )

      // Assert
      const button = screen.getByLabelText('Bug Report, selected')
      expect(button).toBeInTheDocument()
    })
  })

  describe('User Interaction Tests', () => {
    it('should call onPress when clicked', () => {
      // Arrange
      renderWithProvider(<FeedbackTypeButton {...defaultProps} />)
      const button = screen.getByLabelText('Bug Report, not selected')

      // Act
      fireEvent.click(button)

      // Assert
      expect(mockOnPress).toHaveBeenCalledTimes(1)
      expect(mockOnPress).toHaveBeenCalledWith('bug')
    })
  })

  describe('Color Variants', () => {
    it('should render with different color variants', () => {
      const colors = ['red', 'blue', 'orange', 'purple'] as const

      colors.forEach((color) => {
        const { unmount } = renderWithProvider(
          <FeedbackTypeButton
            {...defaultProps}
            color={color}
            label={`${color} feedback`}
          />
        )

        expect(screen.getByText(`${color} feedback`)).toBeInTheDocument()

        unmount()
      })
    })
  })
})
