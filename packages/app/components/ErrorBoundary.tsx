import { Button } from '@my/ui'
import { Component, type ReactNode } from 'react'
import { H3, Paragraph, YStack } from 'tamagui'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
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

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error but don't expose internal details to users
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <YStack
          flex={1}
          justifyContent="center"
          alignItems="center"
          gap="$4"
          padding="$4"
          backgroundColor="$background"
        >
          <H3
            color="$red10"
            textAlign="center"
          >
            Something went wrong
          </H3>
          <Paragraph
            color="$color10"
            textAlign="center"
            maxWidth={300}
          >
            We encountered an unexpected error. Please try again.
          </Paragraph>
          <Button
            onPress={this.handleRetry}
            variant="outlined"
          >
            Try Again
          </Button>
        </YStack>
      )
    }

    return this.props.children
  }
}

// Higher-order component for easier usage
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function WrappedComponent(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    )
  }
}
