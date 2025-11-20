import { fireEvent, render, screen } from '@testing-library/react'
import { GiveFeedbackScreen } from './GiveFeedbackScreen'

// Mock useSubmitFeedback hook
const mockMutate = jest.fn()
const mockUseSubmitFeedback = jest.fn(() => ({
  mutate: mockMutate,
  isPending: false,
  isError: false,
  error: null,
}))

jest.mock('./hooks/useSubmitFeedback', () => ({
  useSubmitFeedback: () => mockUseSubmitFeedback(),
}))

// Mock @my/logging
jest.mock('@my/logging', () => ({
  log: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}))

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
  ConfirmDialog: ({ open, title, description, children }: any) =>
    open ? (
      <div data-testid="confirm-dialog">
        <div>{title}</div>
        <div>{description}</div>
        {children}
      </div>
    ) : null,
  GlassButton: ({ children, onPress, disabled, ...props }: any) => (
    <button
      onClick={onPress}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  ),
}))

// Mock tamagui components
jest.mock('tamagui', () => ({
  ScrollView: ({ children }: any) => <div>{children}</div>,
  YStack: ({ children }: any) => <div>{children}</div>,
  XStack: ({ children }: any) => <div>{children}</div>,
  Text: ({ children }: any) => <div>{children}</div>,
  Avatar: ({ children }: any) => <div role="img">{children}</div>,
  Spinner: () => <div data-testid="spinner">Loading...</div>,
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
    mockUseSubmitFeedback.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      isError: false,
      error: null,
    })
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

    it('should call mutate with feedback data when submit button is clicked', () => {
      // Arrange
      const mockOnSuccess = jest.fn()
      render(<GiveFeedbackScreen onSuccess={mockOnSuccess} />)
      const textarea = screen.getByPlaceholderText("Tell us what's on your mind...")
      const submitButton = screen.getByText('Send Feedback').closest('button')

      // Act
      fireEvent.change(textarea, { target: { value: 'Great app!' } })
      fireEvent.click(submitButton!)

      // Assert
      expect(mockMutate).toHaveBeenCalledTimes(1)
      expect(mockMutate).toHaveBeenCalledWith(
        { type: 'suggestion', message: 'Great app!' },
        expect.objectContaining({
          onSuccess: expect.any(Function),
          onError: expect.any(Function),
        })
      )
    })

    it('should call onSuccess callback when feedback submission succeeds', () => {
      // Arrange
      const mockOnSuccess = jest.fn()
      render(<GiveFeedbackScreen onSuccess={mockOnSuccess} />)
      const textarea = screen.getByPlaceholderText("Tell us what's on your mind...")
      const submitButton = screen.getByText('Send Feedback').closest('button')

      // Act
      fireEvent.change(textarea, { target: { value: 'Great app!' } })
      fireEvent.click(submitButton!)

      // Assert - Get the onSuccess callback from the mutate call
      const mutateCall = mockMutate.mock.calls[0]
      const onSuccessCallback = mutateCall[1]?.onSuccess

      // Simulate successful submission
      onSuccessCallback?.()

      expect(mockOnSuccess).toHaveBeenCalledTimes(1)
    })

    it('should show "Sending..." text while submitting', () => {
      // Arrange
      mockUseSubmitFeedback.mockReturnValue({
        mutate: mockMutate,
        isPending: true,
        isError: false,
        error: null,
      })
      render(<GiveFeedbackScreen />)
      const textarea = screen.getByPlaceholderText("Tell us what's on your mind...")

      // Act
      fireEvent.change(textarea, { target: { value: 'My feedback' } })

      // Assert
      expect(screen.getByText('Sending...')).toBeInTheDocument()
      const submitButton = screen.getByText('Sending...').closest('button')
      expect(submitButton?.disabled).toBe(true)
    })

    it('should handle submission errors', () => {
      // Arrange
      const { log } = require('@my/logging')
      render(<GiveFeedbackScreen />)
      const textarea = screen.getByPlaceholderText("Tell us what's on your mind...")
      const submitButton = screen.getByText('Send Feedback').closest('button')

      // Act
      fireEvent.change(textarea, { target: { value: 'My feedback' } })
      fireEvent.click(submitButton!)

      // Assert - Get the onError callback from the mutate call
      const mutateCall = mockMutate.mock.calls[0]
      const onErrorCallback = mutateCall[1]?.onError

      // Simulate error
      const testError = new Error('Submission failed')
      onErrorCallback?.(testError)

      expect(log.error).toHaveBeenCalledWith(
        'GiveFeedbackScreen',
        'Failed to submit feedback',
        expect.objectContaining({
          error: 'Submission failed',
          feedbackType: 'suggestion',
        })
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
