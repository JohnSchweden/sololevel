import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { GiveFeedbackScreen } from './GiveFeedbackScreen'

// Mock @my/ui components
jest.mock('@my/ui', () => ({
  GlassBackground: ({ children, testID }: any) => <div data-testid={testID}>{children}</div>,
  FeedbackTypeButton: ({ id, label, icon, selected, onPress }: any) => (
    <button
      data-testid={`feedback-type-${id}`}
      aria-label={`${label}, ${selected ? 'selected' : 'not selected'}`}
      onClick={() => onPress(id)}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  ),
  TextArea: ({ value, onChange, placeholder, maxLength }: any) => (
    <textarea
      data-testid="textarea"
      value={value || ''}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
    />
  ),
}))

// Mock tamagui components
jest.mock('tamagui', () => ({
  ScrollView: ({ children }: any) => <div>{children}</div>,
  YStack: ({ children }: any) => <div>{children}</div>,
  XStack: ({ children }: any) => <div>{children}</div>,
  Text: ({ children }: any) => <div>{children}</div>,
  Avatar: ({ children }: any) => <div role="img">{children}</div>,
  Button: ({ children, onPress, disabled }: any) => (
    <button
      onClick={onPress}
      disabled={disabled}
    >
      {children}
    </button>
  ),
}))

// Mock @tamagui/lucide-icons
jest.mock('@tamagui/lucide-icons', () => ({
  Gift: () => 'Gift',
  Send: () => 'Send',
}))

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => <div>{children}</div>,
}))

// Mock navigation hooks
const mockNavigation = {
  setOptions: jest.fn(),
}

jest.mock('expo-router', () => ({
  useNavigation: () => mockNavigation,
}))

jest.mock('@react-navigation/elements', () => ({}))

describe('GiveFeedbackScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Component Rendering', () => {
    it('should render screen with title and description', () => {
      // Arrange & Act
      render(<GiveFeedbackScreen testID="give-feedback-screen" />)

      // Assert
      expect(screen.getByTestId('give-feedback-screen')).toBeInTheDocument()
      expect(screen.getByText('Help us improve')).toBeInTheDocument()
      expect(
        screen.getByText(
          /We'd love to hear your thoughts, suggestions, or report any issues you've encountered/i
        )
      ).toBeInTheDocument()
    })

    it('should render all feedback type buttons', () => {
      // Arrange & Act
      render(<GiveFeedbackScreen />)

      // Assert
      expect(screen.getByText('What type of feedback is this?')).toBeInTheDocument()
      expect(screen.getByLabelText(/Bug Report/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Suggestion/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Complaint/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Other/i)).toBeInTheDocument()
    })

    it('should render message textarea with label', () => {
      // Arrange & Act
      render(<GiveFeedbackScreen />)

      // Assert
      expect(screen.getByText('Your message')).toBeInTheDocument()
      expect(screen.getByPlaceholderText("Tell us what's on your mind...")).toBeInTheDocument()
    })

    it('should render submit button', () => {
      // Arrange & Act
      render(<GiveFeedbackScreen />)

      // Assert
      expect(screen.getByText('Send Feedback')).toBeInTheDocument()
    })

    it('should have suggestion selected by default', () => {
      // Arrange & Act
      render(<GiveFeedbackScreen />)

      // Assert
      const suggestionButton = screen.getByLabelText('Suggestion, selected')
      expect(suggestionButton).toBeInTheDocument()
    })

    it('should apply custom testID', () => {
      // Arrange & Act
      render(<GiveFeedbackScreen testID="custom-feedback-screen" />)

      // Assert
      expect(screen.getByTestId('custom-feedback-screen')).toBeInTheDocument()
    })
  })

  describe('User Interactions', () => {
    it('should allow typing in message textarea', () => {
      // Arrange
      render(<GiveFeedbackScreen />)
      const textarea = screen.getByPlaceholderText(
        "Tell us what's on your mind..."
      ) as HTMLTextAreaElement

      // Act
      fireEvent.change(textarea, { target: { value: 'This is my feedback' } })

      // Assert
      expect(textarea.value).toBe('This is my feedback')
    })

    it('should show character count when message has content', () => {
      // Arrange
      render(<GiveFeedbackScreen />)
      const textarea = screen.getByPlaceholderText("Tell us what's on your mind...")

      // Act
      fireEvent.change(textarea, { target: { value: 'Hello world' } })

      // Assert
      expect(screen.getByText(/11 \/ 1000 characters/i)).toBeInTheDocument()
    })

    it('should enable submit button when message has content', () => {
      // Arrange
      render(<GiveFeedbackScreen />)
      const textarea = screen.getByPlaceholderText("Tell us what's on your mind...")
      const submitButton = screen.getByText('Send Feedback').closest('button')

      // Act
      fireEvent.change(textarea, { target: { value: 'My feedback' } })

      // Assert
      expect(submitButton?.disabled).toBe(false)
    })

    it('should call onSuccess callback when feedback is submitted', async () => {
      // Arrange
      const mockOnSuccess = jest.fn()
      render(<GiveFeedbackScreen onSuccess={mockOnSuccess} />)
      const textarea = screen.getByPlaceholderText("Tell us what's on your mind...")
      const submitButton = screen.getByText('Send Feedback').closest('button')

      // Act
      fireEvent.change(textarea, { target: { value: 'Great app!' } })
      fireEvent.click(submitButton!)

      // Assert
      await waitFor(
        () => {
          expect(mockOnSuccess).toHaveBeenCalledTimes(1)
        },
        { timeout: 2000 }
      )
    })

    it('should show "Sending..." text while submitting', async () => {
      // Arrange
      render(<GiveFeedbackScreen />)
      const textarea = screen.getByPlaceholderText("Tell us what's on your mind...")
      const submitButton = screen.getByText('Send Feedback').closest('button')

      // Act
      fireEvent.change(textarea, { target: { value: 'My feedback' } })
      fireEvent.click(submitButton!)

      // Assert
      expect(screen.getByText('Sending...')).toBeInTheDocument()

      await waitFor(
        () => {
          expect(screen.queryByText('Sending...')).not.toBeInTheDocument()
        },
        { timeout: 2000 }
      )
    })
  })

  describe('Accessibility', () => {
    it('should have accessible feedback type buttons', () => {
      // Arrange & Act
      render(<GiveFeedbackScreen />)

      // Assert - All feedback type buttons should have proper labels
      const feedbackTypes = ['Bug Report', 'Suggestion', 'Complaint', 'Other']
      feedbackTypes.forEach((type) => {
        const button = screen.getByLabelText(new RegExp(type, 'i'))
        expect(button).toBeInTheDocument()
      })
    })

    it('should have proper button roles', () => {
      // Arrange & Act
      render(<GiveFeedbackScreen />)

      // Assert - All buttons should be accessible
      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBeGreaterThan(0)
    })
  })
})
