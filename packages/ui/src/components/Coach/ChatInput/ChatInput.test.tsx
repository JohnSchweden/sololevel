import { fireEvent, render, screen } from '@testing-library/react'
import { TestProvider } from '../../../test-utils'
import { ChatInput } from './ChatInput'

// Test wrapper with Tamagui provider
const renderWithProvider = (component: React.ReactElement) => {
  return render(<TestProvider>{component}</TestProvider>)
}

describe('ChatInput', () => {
  const defaultProps = {
    value: '',
    onChange: jest.fn(),
    onSend: jest.fn(),
    testID: 'chat-input',
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Visual Component Tests', () => {
    it('should render with default props', () => {
      // Arrange
      const { getByTestId } = renderWithProvider(<ChatInput {...defaultProps} />)

      // Act & Assert
      expect(getByTestId('chat-input')).toBeInTheDocument()
      expect(getByTestId('chat-input-textarea')).toBeInTheDocument()
    })

    it('should render with custom placeholder', () => {
      // Arrange
      const customPlaceholder = 'Type your message here'
      const { getByPlaceholderText } = renderWithProvider(
        <ChatInput
          {...defaultProps}
          placeholder={customPlaceholder}
        />
      )

      // Act & Assert
      expect(getByPlaceholderText(customPlaceholder)).toBeInTheDocument()
    })

    it('should render with value', () => {
      // Arrange
      const testValue = 'Hello coach!'
      const { getByTestId } = renderWithProvider(
        <ChatInput
          {...defaultProps}
          value={testValue}
        />
      )

      // Act & Assert
      const textarea = getByTestId('chat-input-textarea')
      expect(textarea).toHaveAttribute('value', testValue)
    })
  })

  describe('Interaction Tests', () => {
    it('should call onAttachment when attachment button is clicked', () => {
      // Arrange
      const onAttachment = jest.fn()
      const { getByTestId } = renderWithProvider(
        <ChatInput
          {...defaultProps}
          onAttachment={onAttachment}
        />
      )

      // Act
      fireEvent.click(getByTestId('chat-input-attachment'))

      // Assert
      expect(onAttachment).toHaveBeenCalledTimes(1)
    })

    it('should call onVoiceToggle when voice button is clicked', () => {
      // Arrange
      const onVoiceToggle = jest.fn()
      const { getByTestId } = renderWithProvider(
        <ChatInput
          {...defaultProps}
          onVoiceToggle={onVoiceToggle}
        />
      )

      // Act
      fireEvent.click(getByTestId('chat-input-voice'))

      // Assert
      expect(onVoiceToggle).toHaveBeenCalledTimes(1)
    })
  })

  describe('Accessibility Tests', () => {
    it('should have proper accessibility labels', () => {
      // Arrange & Act
      const { getByLabelText } = renderWithProvider(
        <ChatInput
          {...defaultProps}
          onAttachment={jest.fn()}
          onVoiceToggle={jest.fn()}
          onVoiceMode={jest.fn()}
        />
      )

      // Assert
      expect(getByLabelText('Message input')).toBeInTheDocument()
      expect(getByLabelText('Attach file')).toBeInTheDocument()
      expect(getByLabelText('Start voice input')).toBeInTheDocument()
      expect(getByLabelText('Voice mode')).toBeInTheDocument()
    })

    it('should show correct accessibility label when listening', () => {
      // Arrange & Act
      const { getByLabelText } = renderWithProvider(
        <ChatInput
          {...defaultProps}
          onVoiceToggle={jest.fn()}
          isListening={true}
        />
      )

      // Assert
      expect(getByLabelText('Stop voice input')).toBeInTheDocument()
    })
  })
})
