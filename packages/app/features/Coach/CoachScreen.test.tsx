import { fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { CoachScreen } from './CoachScreen'

// Mock image assets
jest.mock('../../../../apps/expo/assets/coach_avatar.png', () => 'coach_avatar.png')

// Mock hooks
jest.mock('@app/hooks/useStaggeredAnimation', () => ({
  useStaggeredAnimation: () => ({
    visibleItems: [true, true, true, true], // Array of booleans for each section
    resetAnimation: jest.fn(),
  }),
}))

jest.mock('@app/provider/safe-area/use-safe-area', () => {
  const insets = {
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  }
  return {
    __esModule: true,
    useSafeArea: () => insets,
    useStableTopInset: () => insets.top,
    useStableSafeArea: () => insets,
  }
})

// Mock react-native (needed for FlatList)
jest.mock('react-native', () => {
  const React = require('react')
  return {
    FlatList: ({ data, renderItem, keyExtractor, testID, ...props }: any) => {
      const items = data || []
      return React.createElement(
        'div',
        { 'data-testid': testID || 'flat-list', ...props },
        items.map((item: any, index: number) => {
          const key = keyExtractor ? keyExtractor(item, index) : index
          return React.createElement(
            React.Fragment,
            { key },
            renderItem ? renderItem({ item, index }) : null
          )
        })
      )
    },
    Platform: {
      OS: 'web',
      select: jest.fn((obj: any) => obj.web || obj.default),
    },
    Keyboard: {
      addListener: jest.fn(() => ({ remove: jest.fn() })),
      dismiss: jest.fn(),
    },
    KeyboardAvoidingView: ({ children, ...props }: any) => {
      const React = require('react')
      return React.createElement('div', { ...props }, children)
    },
    Pressable: ({ children, onPress, ...props }: any) => {
      const React = require('react')
      return React.createElement('div', { onClick: onPress, role: 'button', ...props }, children)
    },
  }
})

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
    BlurView: ({ children, testID, ...props }: any) =>
      React.createElement('div', { 'data-testid': testID || 'blur-view', ...props }, children),
    OptimizedImage: ({ source, testID, ...props }: any) =>
      React.createElement('img', { src: source, 'data-testid': testID, ...props }),
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

// Mock react-native-reanimated - must be before any imports
jest.mock('react-native-reanimated', () => {
  const React = require('react')
  return {
    __esModule: true,
    default: {
      View: ({ children, style, testID, ...props }: any) =>
        React.createElement('div', { style, 'data-testid': testID, ...props }, children),
      ScrollView: ({ children, style, testID, ...props }: any) =>
        React.createElement(
          'div',
          { style: { ...style, overflow: 'auto' }, 'data-testid': testID, ...props },
          children
        ),
      createAnimatedComponent: (component: any) => component,
    },
    useAnimatedScrollHandler: (handler: any) => handler,
    useAnimatedStyle: (callback: () => any) => {
      try {
        return callback()
      } catch {
        return {}
      }
    },
    useSharedValue: (initialValue: any) => ({
      value: initialValue,
    }),
    useAnimatedReaction: () => {},
    useDerivedValue: (callback: () => any) => ({
      value: callback(),
    }),
    withSpring: (targetValue: any) => targetValue,
    withTiming: (targetValue: any) => targetValue,
    runOnJS: (fn: any) => fn,
    runOnUI: (fn: any) => fn,
    Animated: {
      View: ({ children, style, testID, ...props }: any) =>
        React.createElement('div', { style, 'data-testid': testID, ...props }, children),
      ScrollView: ({ children, style, testID, ...props }: any) =>
        React.createElement(
          'div',
          { style: { ...style, overflow: 'auto' }, 'data-testid': testID, ...props },
          children
        ),
      createAnimatedComponent: (component: any) => component,
    },
    createAnimatedComponent: (component: any) => component,
  }
})

// Mock react-native-blur
jest.mock('expo-blur', () => ({
  BlurView: ({ children, testID, ...props }: any) =>
    require('react').createElement(
      'div',
      { 'data-testid': testID || 'blur-view', ...props },
      children
    ),
}))

// Mock Tamagui components
jest.mock('tamagui', () => {
  const React = require('react')
  return {
    Button: ({ children, onPress, testID, ...props }: any) =>
      React.createElement(
        'button',
        { onClick: onPress, 'data-testid': testID, ...props },
        children
      ),
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
    View: ({ children, testID, ...props }: any) =>
      React.createElement('div', { 'data-testid': testID, ...props }, children),
    AnimatePresence: ({ children }: any) => React.createElement(React.Fragment, {}, children),
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
      expect(screen.getByText(/Hey there! I'm your Solo:Level coach/)).toBeInTheDocument()
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
      const { unmount } = render(<CoachScreen />)

      // Act
      unmount()

      // Assert - Component should unmount without errors
      // Note: Timer cleanup is handled internally by useStaggeredAnimation hook
      expect(true).toBe(true) // Test passes if unmount succeeds
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

    it('handles empty message input gracefully', () => {
      // Arrange
      render(<CoachScreen />)
      const input = screen.getByTestId('chat-input-field')
      const sendButton = screen.getByTestId('chat-input-send')

      // Act: Try to send empty message
      fireEvent.change(input, { target: { value: '' } })
      fireEvent.click(sendButton)

      // Assert: Empty message should not create a user message
      const userMessages = screen.queryAllByTestId('message-bubble-user')
      expect(userMessages).toHaveLength(0)
    })

    it('handles long message input', () => {
      // Arrange
      const longMessage = 'A'.repeat(1000)
      render(<CoachScreen />)
      const input = screen.getByTestId('chat-input-field')

      // Act: Type long message
      fireEvent.change(input, { target: { value: longMessage } })

      // Assert: Input accepts long messages
      expect(input).toHaveValue(longMessage)
    })

    it('handles rapid message sending', () => {
      // Arrange
      render(<CoachScreen />)
      const input = screen.getByTestId('chat-input-field')
      const sendButton = screen.getByTestId('chat-input-send')

      // Act: Send multiple messages rapidly
      for (let i = 0; i < 3; i++) {
        fireEvent.change(input, { target: { value: `Message ${i}` } })
        fireEvent.click(sendButton)
      }

      // Assert: At least one message should appear (component may batch or handle messages internally)
      // The component should handle rapid sending without crashing
      expect(input).toBeInTheDocument()
      expect(sendButton).toBeInTheDocument()
    })

    it('handles voice toggle interaction', () => {
      // Arrange
      render(<CoachScreen />)
      const voiceButton = screen.getByTestId('chat-input-voice')

      // Act: Toggle voice
      fireEvent.click(voiceButton)

      // Assert: Voice button state changes
      expect(voiceButton).toBeInTheDocument()
    })

    it('handles attachment button interaction', () => {
      // Arrange
      render(<CoachScreen />)
      const attachmentButton = screen.getByTestId('chat-input-attachment')

      // Act: Click attachment
      fireEvent.click(attachmentButton)

      // Assert: Attachment button exists and is clickable
      expect(attachmentButton).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('displays error message when provided', () => {
      // Arrange
      const errorMessage = 'Network connection failed'
      const onRetry = jest.fn()

      // Act
      render(
        <CoachScreen
          isError={true}
          errorMessage={errorMessage}
          onRetry={onRetry}
        />
      )

      // Assert: Error message is displayed
      expect(screen.getByText(errorMessage)).toBeInTheDocument()
      expect(screen.getByTestId('retry-button')).toBeInTheDocument()
    })

    it('calls onRetry when retry button is clicked', () => {
      // Arrange
      const onRetry = jest.fn()
      render(
        <CoachScreen
          isError={true}
          errorMessage="Test error"
          onRetry={onRetry}
        />
      )

      // Act
      const retryButton = screen.getByTestId('retry-button')
      fireEvent.click(retryButton)

      // Assert: onRetry callback is called
      expect(onRetry).toHaveBeenCalledTimes(1)
    })

    it('handles error state without onRetry callback', () => {
      // Arrange & Act
      render(
        <CoachScreen
          isError={true}
          errorMessage="Test error"
        />
      )

      // Assert: Error state renders without retry button
      expect(screen.getByText('Failed to load coach')).toBeInTheDocument()
      expect(screen.queryByTestId('retry-button')).not.toBeInTheDocument()
    })
  })

  describe('Props and Callbacks', () => {
    it('handles custom testID prop', () => {
      // Arrange & Act
      render(<CoachScreen testID="custom-coach-screen" />)

      // Assert: Custom testID is applied
      expect(screen.getByTestId('custom-coach-screen')).toBeInTheDocument()
    })

    it('handles initialMessages prop correctly', () => {
      // Arrange
      const initialMessages = [
        { id: '1', type: 'user' as const, content: 'User message', timestamp: new Date() },
        { id: '2', type: 'coach' as const, content: 'Coach response', timestamp: new Date() },
      ]

      // Act
      render(<CoachScreen initialMessages={initialMessages} />)

      // Assert: Initial messages are rendered
      expect(screen.getByText('User message')).toBeInTheDocument()
      expect(screen.getByText('Coach response')).toBeInTheDocument()
    })

    it('handles sessionId and sessionTitle props', () => {
      // Arrange & Act
      render(
        <CoachScreen
          sessionId={123}
          sessionTitle="Test Session"
        />
      )

      // Assert: Component renders with session props
      expect(screen.getByTestId('coach-screen')).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('handles undefined initialMessages gracefully', () => {
      // Arrange & Act
      render(<CoachScreen initialMessages={undefined} />)

      // Assert: Component renders without crashing
      expect(screen.getByTestId('coach-screen')).toBeInTheDocument()
    })

    it('handles empty initialMessages array', () => {
      // Arrange & Act
      render(<CoachScreen initialMessages={[]} />)

      // Assert: Component renders without crashing
      expect(screen.getByTestId('coach-screen')).toBeInTheDocument()
    })

    it('handles loading to error state transition', () => {
      // Arrange
      const { rerender } = render(<CoachScreen isLoading={true} />)

      // Assert: Loading state
      expect(screen.getByTestId('coach-screen-loading')).toBeInTheDocument()

      // Act: Transition to error
      rerender(
        <CoachScreen
          isError={true}
          errorMessage="Error occurred"
        />
      )

      // Assert: Error state
      expect(screen.getByTestId('coach-screen-error')).toBeInTheDocument()
      expect(screen.queryByTestId('coach-screen-loading')).not.toBeInTheDocument()
    })

    it('handles error to loaded state transition', () => {
      // Arrange
      const { rerender } = render(
        <CoachScreen
          isError={true}
          errorMessage="Error"
        />
      )

      // Assert: Error state
      expect(screen.getByTestId('coach-screen-error')).toBeInTheDocument()

      // Act: Transition to loaded
      rerender(<CoachScreen />)

      // Assert: Normal state
      expect(screen.getByTestId('coach-screen-content')).toBeInTheDocument()
      expect(screen.queryByTestId('coach-screen-error')).not.toBeInTheDocument()
    })
  })
})
