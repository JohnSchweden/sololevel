import { fireEvent, render, screen } from '@testing-library/react'
import { TestProvider } from '../../test-utils'
import { StateDisplay } from './StateDisplay'

describe('StateDisplay', () => {
  describe('Loading State', () => {
    it('should render loading state with spinner and title', () => {
      // Arrange
      const props = {
        type: 'loading' as const,
        title: 'Loading insights...',
      }

      // Act
      render(
        <TestProvider>
          <StateDisplay {...props} />
        </TestProvider>
      )

      // Assert
      expect(screen.getByTestId('state-display')).toBeInTheDocument()
      expect(screen.getByTestId('state-display-spinner')).toBeInTheDocument()
      expect(screen.getByTestId('state-display-title')).toHaveTextContent('Loading insights...')
    })

    it('should render loading state with description', () => {
      // Arrange
      const props = {
        type: 'loading' as const,
        title: 'Loading...',
        description: 'Please wait while we fetch your data',
      }

      // Act
      render(
        <TestProvider>
          <StateDisplay {...props} />
        </TestProvider>
      )

      // Assert
      expect(screen.getByTestId('state-display-description')).toHaveTextContent(
        'Please wait while we fetch your data'
      )
    })
  })

  describe('Empty State', () => {
    it('should render empty state with icon, title and description', () => {
      // Arrange
      const props = {
        type: 'empty' as const,
        title: 'No data available yet',
        description: 'Complete workouts to see insights about your performance.',
        icon: '📊',
      }

      // Act
      render(
        <TestProvider>
          <StateDisplay {...props} />
        </TestProvider>
      )

      // Assert
      expect(screen.getByTestId('state-display')).toBeInTheDocument()
      expect(screen.getByTestId('state-display-icon')).toHaveTextContent('📊')
      expect(screen.getByTestId('state-display-title')).toHaveTextContent('No data available yet')
      expect(screen.getByTestId('state-display-description')).toHaveTextContent(
        'Complete workouts to see insights about your performance.'
      )
    })

    it('should render empty state without icon when not provided', () => {
      // Arrange
      const props = {
        type: 'empty' as const,
        title: 'No data available yet',
        description: 'Complete workouts to see insights.',
      }

      // Act
      render(
        <TestProvider>
          <StateDisplay {...props} />
        </TestProvider>
      )

      // Assert
      expect(screen.queryByTestId('state-display-icon')).not.toBeInTheDocument()
      expect(screen.getByTestId('state-display-title')).toHaveTextContent('No data available yet')
    })
  })

  describe('Error State', () => {
    it('should render error state with title and description', () => {
      // Arrange
      const props = {
        type: 'error' as const,
        title: 'Failed to load insights',
        description: 'Please try again later or pull to refresh.',
      }

      // Act
      render(
        <TestProvider>
          <StateDisplay {...props} />
        </TestProvider>
      )

      // Assert
      expect(screen.getByTestId('state-display')).toBeInTheDocument()
      expect(screen.getByTestId('state-display-title')).toHaveTextContent('Failed to load insights')
      expect(screen.getByTestId('state-display-description')).toHaveTextContent(
        'Please try again later or pull to refresh.'
      )
    })

    it('should render error state with retry button when onRetry is provided', () => {
      // Arrange
      const mockOnRetry = jest.fn()
      const props = {
        type: 'error' as const,
        title: 'Failed to load insights',
        description: 'Please try again later.',
        onRetry: mockOnRetry,
      }

      // Act
      render(
        <TestProvider>
          <StateDisplay {...props} />
        </TestProvider>
      )

      // Assert
      const retryButton = screen.getByTestId('state-display-retry-button')
      expect(retryButton).toBeInTheDocument()
      expect(retryButton).toHaveTextContent('Retry')

      // Test button interaction
      fireEvent.click(retryButton)
      expect(mockOnRetry).toHaveBeenCalledTimes(1)
    })

    it('should not render retry button when onRetry is not provided', () => {
      // Arrange
      const props = {
        type: 'error' as const,
        title: 'Failed to load insights',
        description: 'Please try again later.',
      }

      // Act
      render(
        <TestProvider>
          <StateDisplay {...props} />
        </TestProvider>
      )

      // Assert
      expect(screen.queryByTestId('state-display-retry-button')).not.toBeInTheDocument()
    })

    it('should render error state with icon when provided', () => {
      // Arrange
      const props = {
        type: 'error' as const,
        title: 'Failed to load insights',
        description: 'Please try again later.',
        icon: '⚠️',
      }

      // Act
      render(
        <TestProvider>
          <StateDisplay {...props} />
        </TestProvider>
      )

      // Assert
      expect(screen.getByTestId('state-display-icon')).toHaveTextContent('⚠️')
    })
  })

  describe('Custom Props', () => {
    it('should accept custom testID', () => {
      // Arrange
      const props = {
        type: 'loading' as const,
        title: 'Loading...',
        testID: 'custom-state-display',
      }

      // Act
      render(
        <TestProvider>
          <StateDisplay {...props} />
        </TestProvider>
      )

      // Assert
      expect(screen.getByTestId('custom-state-display')).toBeInTheDocument()
      expect(screen.getByTestId('custom-state-display-spinner')).toBeInTheDocument()
      expect(screen.getByTestId('custom-state-display-title')).toBeInTheDocument()
    })

    it('should accept container props', () => {
      // Arrange
      const props = {
        type: 'loading' as const,
        title: 'Loading...',
        containerProps: {
          backgroundColor: '$color2',
          borderRadius: '$4',
        },
      }

      // Act
      render(
        <TestProvider>
          <StateDisplay {...props} />
        </TestProvider>
      )

      // Assert
      const container = screen.getByTestId('state-display')
      expect(container).toBeInTheDocument()
      // Note: We can't easily test Tamagui props in jsdom, but we can verify the component renders
    })
  })
})
