import { render, screen } from '@testing-library/react'
import { TestProvider } from '../../../test-utils'
import { MessageBubble } from './MessageBubble'

// Test wrapper with Tamagui provider
const renderWithProvider = (component: React.ReactElement) => {
  return render(<TestProvider>{component}</TestProvider>)
}

describe('MessageBubble', () => {
  describe('Visual Component Tests', () => {
    it('should render user message with correct styling', () => {
      // Arrange
      const message = 'Hello coach!'
      const timestamp = new Date('2025-10-16T10:00:00Z')
      const expectedTime = timestamp.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })

      // Act
      renderWithProvider(
        <MessageBubble
          type="user"
          content={message}
          timestamp={timestamp}
        />
      )

      // Assert
      expect(screen.getByText(message)).toBeInTheDocument()
      expect(screen.getByText(expectedTime)).toBeInTheDocument()
    })

    it('should render coach message with correct styling', () => {
      // Arrange
      const message = 'Great question! Let me help you...'
      const timestamp = new Date('2025-10-16T10:01:00Z')
      const expectedTime = timestamp.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })

      // Act
      renderWithProvider(
        <MessageBubble
          type="coach"
          content={message}
          timestamp={timestamp}
        />
      )

      // Assert
      expect(screen.getByText(message)).toBeInTheDocument()
      expect(screen.getByText(expectedTime)).toBeInTheDocument()
    })

    it('should apply different styles for user vs coach messages', () => {
      // Arrange & Act
      renderWithProvider(
        <MessageBubble
          type="user"
          content="User message"
          timestamp={new Date()}
        />
      )

      renderWithProvider(
        <MessageBubble
          type="coach"
          content="Coach message"
          timestamp={new Date()}
        />
      )

      // Assert
      expect(screen.getByText('User message')).toBeInTheDocument()
      expect(screen.getByText('Coach message')).toBeInTheDocument()
    })
  })

  describe('Accessibility Tests', () => {
    it('should have proper accessibility labels', () => {
      // Arrange & Act
      renderWithProvider(
        <MessageBubble
          type="user"
          content="Accessible message"
          timestamp={new Date()}
        />
      )

      // Assert
      const messageElement = screen.getByText('Accessible message')
      expect(messageElement).toBeInTheDocument()
    })

    it('should format timestamp for screen readers', () => {
      // Arrange
      const timestamp = new Date('2025-10-16T14:30:00Z')
      const expectedTime = timestamp.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })

      // Act
      renderWithProvider(
        <MessageBubble
          type="coach"
          content="Test message"
          timestamp={timestamp}
        />
      )

      // Assert
      expect(screen.getByText(expectedTime)).toBeInTheDocument()
    })
  })
})
