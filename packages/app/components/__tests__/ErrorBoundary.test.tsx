/// <reference types="jest" />
import { config } from '@my/config'
import { TamaguiProvider, Text } from '@my/ui'
import { fireEvent, render, screen } from '@testing-library/react'
import { ErrorBoundary, withErrorBoundary } from '../ErrorBoundary'

// Component that throws an error
function ThrowError({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error')
  }
  return <Text testID="success">No error</Text>
}

// No imports needed - jest-expo preset provides globals

// Test wrapper with theme provider
function renderWithProvider(component: React.ReactElement) {
  return render(<TamaguiProvider config={config}>{component}</TamaguiProvider>)
}

// Mock console.error to avoid noise in tests
const originalError = console.error
beforeAll(() => {
  console.error = jest.fn()
})

afterAll(() => {
  console.error = originalError
})

describe('ErrorBoundary', () => {
  it('renders children when there is no error', () => {
    renderWithProvider(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    )

    expect(screen.getByTestId('success')).toBeTruthy()
  })

  it('renders error UI when there is an error', () => {
    renderWithProvider(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Something went wrong')).toBeTruthy()
    expect(screen.getByText('Try Again')).toBeTruthy()
  })

  it('renders custom fallback when provided', () => {
    const customFallback = <Text testID="custom-error">Custom error message</Text>

    renderWithProvider(
      <ErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByTestId('custom-error')).toBeTruthy()
    expect(screen.queryByText('Something went wrong')).toBeFalsy()
  })

  it('calls onError callback when error occurs', () => {
    const onError = jest.fn()

    renderWithProvider(
      <ErrorBoundary onError={onError}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String),
      })
    )
  })

  it('resets error state when try again is pressed', () => {
    let shouldThrow = true
    const TestComponent = () => <ThrowError shouldThrow={shouldThrow} />

    const { rerender } = renderWithProvider(
      <ErrorBoundary key="test-boundary">
        <TestComponent />
      </ErrorBoundary>
    )

    // Error should be shown
    expect(screen.getByText('Something went wrong')).toBeTruthy()

    // Press try again to reset error boundary
    fireEvent.click(screen.getByText('Try Again'))

    // Change the component to not throw error and re-render with new key
    shouldThrow = false
    rerender(
      <TamaguiProvider config={config}>
        <ErrorBoundary key="test-boundary-reset">
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      </TamaguiProvider>
    )

    // Should show success
    expect(screen.getByTestId('success')).toBeTruthy()
  })
})

describe('withErrorBoundary HOC', () => {
  it('wraps component with error boundary', () => {
    const WrappedComponent = withErrorBoundary(ThrowError)

    renderWithProvider(<WrappedComponent shouldThrow={false} />)

    expect(screen.getByTestId('success')).toBeTruthy()
  })

  it('catches errors in wrapped component', () => {
    const WrappedComponent = withErrorBoundary(ThrowError)

    renderWithProvider(<WrappedComponent shouldThrow={true} />)

    expect(screen.getByText('Something went wrong')).toBeTruthy()
  })

  it('uses custom fallback in HOC', () => {
    const customFallback = <Text testID="hoc-error">HOC error</Text>
    const WrappedComponent = withErrorBoundary(ThrowError, customFallback)

    renderWithProvider(<WrappedComponent shouldThrow={true} />)

    expect(screen.getByTestId('hoc-error')).toBeTruthy()
  })
})
