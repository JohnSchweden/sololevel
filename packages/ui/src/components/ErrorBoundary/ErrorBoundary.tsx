import { log } from '@my/logging'
import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button, Text, YStack } from 'tamagui'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error
    log.error('ErrorBoundary', 'Caught React error', {
      error: error.message,
      stack: error.stack?.slice(0, 500), // Limit stack trace length
      componentStack: errorInfo.componentStack?.slice(0, 500),
    })

    // Call optional error handler
    this.props.onError?.(error, errorInfo)

    // Store error in logger's recent errors buffer (if implemented)
    // This allows debugging tools to access recent errors
    if (typeof window !== 'undefined') {
      try {
        const recentErrors = JSON.parse(localStorage.getItem('recent-errors') || '[]')
        recentErrors.unshift({
          timestamp: new Date().toISOString(),
          error: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
        })
        // Keep only last 10 errors
        recentErrors.splice(10)
        localStorage.setItem('recent-errors', JSON.stringify(recentErrors))
      } catch {
        // Ignore localStorage errors
      }
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined })
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default fallback UI
      return (
        <YStack
          flex={1}
          justifyContent="center"
          alignItems="center"
          padding="$4"
          backgroundColor="$background"
        >
          <Text
            fontSize="$6"
            fontWeight="bold"
            color="$color"
            marginBottom="$2"
            textAlign="center"
          >
            Something went wrong
          </Text>

          <Text
            fontSize="$4"
            color="$color10"
            marginBottom="$4"
            textAlign="center"
          >
            We encountered an unexpected error. Please try again.
          </Text>

          {__DEV__ && this.state.error && (
            <YStack
              marginBottom="$4"
              padding="$3"
              backgroundColor="$red2"
              borderRadius="$2"
            >
              <Text
                fontSize="$3"
                color="$red10"
              >
                {this.state.error.message}
              </Text>
            </YStack>
          )}

          <Button onPress={this.handleRetry}>Try Again</Button>
        </YStack>
      )
    }

    return this.props.children
  }
}

// Hook for accessing recent errors (for debugging tools)
export function getRecentErrors() {
  if (typeof window === 'undefined') return []

  try {
    return JSON.parse(localStorage.getItem('recent-errors') || '[]')
  } catch {
    return []
  }
}
