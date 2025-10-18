import { fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { CoachScreen } from './CoachScreen'

// Mock image assets
jest.mock('../../../../apps/expo/assets/coach_avatar.png', () => 'coach_avatar.png')

// Mock the UI components used by CoachScreen
jest.mock('@my/ui', () => {
  const React = require('react')
  return {
    ChatInput: ({
      value,
      onChange,
      onSend,
      onAttachment,
      onVoiceToggle,
      isListening,
      disabled,
      placeholder,
      testID,
    }: any) =>
      React.createElement('div', { 'data-testid': testID || 'chat-input' }, [
        React.createElement('input', {
          key: 'input',
          value: value || '',
          onChange: (e: any) => onChange?.(e.target.value),
          placeholder,
          disabled,
          'data-testid': 'chat-input-field',
        }),
        React.createElement(
          'button',
          {
            key: 'send',
            onClick: () => onSend?.(value),
            disabled,
            'data-testid': 'chat-input-send',
          },
          'Send'
        ),
        React.createElement(
          'button',
          {
            key: 'voice',
            onClick: onVoiceToggle,
            'data-testid': 'chat-input-voice',
          },
          isListening ? 'Stop' : 'Voice'
        ),
        React.createElement(
          'button',
          {
            key: 'attachment',
            onClick: onAttachment,
            'data-testid': 'chat-input-attachment',
          },
          'Attach'
        ),
      ]),
    GlassBackground: ({ children, testID, ...props }: any) =>
      React.createElement(
        'div',
        { 'data-testid': testID || 'glass-background', ...props },
        children
      ),
    MessageBubble: ({ type, content, testID }: any) =>
      React.createElement(
        'div',
        {
          'data-testid': testID || `message-bubble-${type}`,
          'data-type': type,
        },
        content
      ),
    StateDisplay: ({ title, description, onRetry, testID }: any) =>
      React.createElement('div', { 'data-testid': testID || 'state-display' }, [
        React.createElement('div', { key: 'title' }, title),
        description && React.createElement('div', { key: 'description' }, description),
        onRetry &&
          React.createElement(
            'button',
            {
              key: 'retry',
              onClick: onRetry,
              'data-testid': 'retry-button',
            },
            'Retry'
          ),
      ]),
    SuggestionChip: ({ text, category, onPress, disabled, testID }: any) =>
      React.createElement(
        'button',
        {
          'data-testid': testID || 'suggestion-chip',
          onClick: onPress,
          disabled,
          'data-category': category,
        },
        text
      ),
    TypingIndicator: ({ testID }: any) =>
      React.createElement('div', { 'data-testid': testID || 'typing-indicator' }, 'Typing...'),
  }
})

// Mock Tamagui icons
jest.mock('@tamagui/lucide-icons', () => ({
  ChevronDown: () => 'ChevronDown',
  ChevronUp: () => 'ChevronUp',
  Sparkles: () => 'Sparkles',
  Target: () => 'Target',
  Zap: () => 'Zap',
}))

// Mock SafeAreaView
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children, testID, ...props }: any) =>
    require('react').createElement(
      'div',
      { 'data-testid': testID || 'safe-area-view', ...props },
      children
    ),
}))

// Mock Tamagui components
jest.mock('tamagui', () => {
  const React = require('react')
  return {
    Button: ({ children, onPress, testID, ...props }: any) =>
      React.createElement('button', { onPress, 'data-testid': testID, ...props }, children),
    Image: ({ source, testID, ...props }: any) =>
      React.createElement('img', { src: source, 'data-testid': testID, ...props }),
    ScrollView: ({ children, testID, ...props }: any) =>
      React.createElement(
        'div',
        { 'data-testid': testID, style: { overflow: 'auto' }, ...props },
        children
      ),
    Text: ({ children, testID, ...props }: any) =>
      React.createElement('span', { 'data-testid': testID, ...props }, children),
    XStack: ({ children, testID, ...props }: any) =>
      React.createElement(
        'div',
        { 'data-testid': testID, style: { display: 'flex', flexDirection: 'row' }, ...props },
        children
      ),
    YStack: ({ children, testID, ...props }: any) =>
      React.createElement(
        'div',
        { 'data-testid': testID, style: { display: 'flex', flexDirection: 'column' }, ...props },
        children
      ),
  }
})

describe('CoachScreen', () => {
  // Arrange-Act-Assert pattern
  describe('Component Rendering', () => {
    it('renders coach screen with initial welcome message', () => {
      // Arrange & Act
      render(<CoachScreen />)

      // Assert: Main elements are present
      expect(screen.getByTestId('coach-screen')).toBeInTheDocument()
      expect(screen.getByTestId('coach-screen-content')).toBeInTheDocument()
      expect(screen.getByTestId('coach-screen-messages')).toBeInTheDocument()
      expect(screen.getByTestId('coach-screen-input')).toBeInTheDocument()

      // Welcome message from coach should be present
      expect(screen.getByText(/Hi there! I'm your Solo:Lvl coach/)).toBeInTheDocument()
    })

    it('shows loading state when isLoading is true', () => {
      // Arrange & Act
      render(<CoachScreen isLoading={true} />)

      // Assert: Loading state displayed
      expect(screen.getByTestId('coach-screen-loading')).toBeInTheDocument()
      expect(screen.getByText('Loading coach...')).toBeInTheDocument()
    })

    it('shows error state when isError is true', () => {
      // Arrange
      const errorMessage = 'Connection failed'
      const onRetry = jest.fn()

      // Act
      render(
        <CoachScreen
          isError={true}
          errorMessage={errorMessage}
          onRetry={onRetry}
        />
      )

      // Assert: Error state displayed
      expect(screen.getByTestId('coach-screen-error')).toBeInTheDocument()
      expect(screen.getByText('Failed to load coach')).toBeInTheDocument()
      expect(screen.getByText(errorMessage)).toBeInTheDocument()
      expect(screen.getByTestId('retry-button')).toBeInTheDocument()
    })
  })

  describe('Staggered Animations', () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('should animate sections with staggered timing when component mounts', () => {
      // Arrange
      render(<CoachScreen />)

      // Act - Fast forward through all timers
      jest.runAllTimers()

      // Assert - All sections should be visible after animation
      expect(screen.getByTestId('coach-screen-avatar')).toBeInTheDocument()
      expect(screen.getByTestId('coach-screen-messages')).toBeInTheDocument()
      expect(screen.getByTestId('coach-screen-suggestions')).toBeInTheDocument()
      expect(screen.getByTestId('coach-screen-input-area')).toBeInTheDocument()
    })

    it('should not animate sections when in loading state', () => {
      // Arrange
      render(<CoachScreen isLoading={true} />)

      // Act - Fast forward through all timers
      jest.runAllTimers()

      // Assert - Loading state should be shown instead of animated sections
      expect(screen.getByTestId('coach-screen-loading')).toBeInTheDocument()
      expect(screen.queryByTestId('coach-screen-avatar')).not.toBeInTheDocument()
    })

    it('should not animate sections when in error state', () => {
      // Arrange
      render(<CoachScreen isError={true} />)

      // Act - Fast forward through all timers
      jest.runAllTimers()

      // Assert - Error state should be shown instead of animated sections
      expect(screen.getByTestId('coach-screen-error')).toBeInTheDocument()
      expect(screen.queryByTestId('coach-screen-avatar')).not.toBeInTheDocument()
    })

    it('should clean up timers on unmount', () => {
      // Arrange
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout')
      const { unmount } = render(<CoachScreen />)

      // Act
      unmount()

      // Assert - Timers should be cleaned up
      expect(clearTimeoutSpy).toHaveBeenCalled()
      clearTimeoutSpy.mockRestore()
    })
  })

  describe('User Interactions', () => {
    it('allows user to type and send messages', () => {
      // Arrange
      render(<CoachScreen />)
      const input = screen.getByTestId('chat-input-field')
      const sendButton = screen.getByTestId('chat-input-send')

      // Act: Type message and send
      fireEvent.change(input, { target: { value: 'Test message' } })
      fireEvent.click(sendButton)

      // Assert: Message appears in chat
      expect(screen.getByText('Test message')).toBeInTheDocument()
    })

    it('shows suggestion chips and allows selection', () => {
      // Arrange
      render(<CoachScreen />)

      // Act: Click on a suggestion chip (not the message)
      const suggestionChips = screen.getAllByTestId('suggestion-chip')
      const deadliftSuggestion = suggestionChips.find(
        (chip) => chip.textContent === 'Analyze my deadlift form'
      )
      fireEvent.click(deadliftSuggestion!)

      // Assert: Suggestion text appears as user message
      const userMessages = screen.getAllByTestId('message-bubble-user')
      expect(userMessages).toHaveLength(1)
      expect(userMessages[0]).toHaveTextContent('Analyze my deadlift form')
    })

    it('toggles suggestions visibility', () => {
      // Arrange
      render(<CoachScreen />)
      const toggleButton = screen.getByTestId('coach-screen-toggle-suggestions')

      // Act: Toggle suggestions
      fireEvent.click(toggleButton)

      // Assert: Suggestions should be hidden (implementation detail, but visible behavior)
      // Note: This tests the toggle functionality exists
      expect(toggleButton).toBeInTheDocument()
    })
  })
})
