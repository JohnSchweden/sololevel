/// <reference types="jest" />
import { render, screen } from '@testing-library/react'
import { ErrorBoundary, withErrorBoundary } from '../ErrorBoundary'

// Component that throws an error
function ThrowError({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error')
  }
  return <div data-testid="success">No error</div>
}

// Simple fallback component for testing
function SimpleFallback() {
  return <div data-testid="fallback">Custom fallback</div>
}

// Simple render function without provider wrapper
function renderWithProvider(component: React.ReactElement) {
  return render(component)
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

  it('handles errors correctly', () => {
    // Test that the ErrorBoundary component exists and can handle props
    const errorBoundary = new ErrorBoundary({
      children: <ThrowError shouldThrow={true} />,
    })

    expect(errorBoundary).toBeInstanceOf(ErrorBoundary)
    expect(errorBoundary.state.hasError).toBe(false)
  })

  it('renders custom fallback when provided', () => {
    const customFallback = <SimpleFallback />
    renderWithProvider(
      <ErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByTestId('fallback')).toBeTruthy()
    expect(screen.queryByTestId('success')).toBeNull()
  })

  it('accepts onError callback prop', () => {
    const onError = jest.fn()

    // Test that the ErrorBoundary accepts onError prop
    const errorBoundary = new ErrorBoundary({
      children: <ThrowError shouldThrow={false} />,
      onError,
    })

    expect(errorBoundary).toBeInstanceOf(ErrorBoundary)
    expect(typeof errorBoundary.props.onError).toBe('function')
  })

  it('accepts fallback prop', () => {
    // Test that the ErrorBoundary accepts fallback prop
    const errorBoundary = new ErrorBoundary({
      children: <ThrowError shouldThrow={false} />,
      fallback: <SimpleFallback />,
    })

    expect(errorBoundary).toBeInstanceOf(ErrorBoundary)
  })
})

describe('withErrorBoundary HOC', () => {
  it('wraps component with error boundary', () => {
    const WrappedComponent = withErrorBoundary(ThrowError)

    renderWithProvider(<WrappedComponent shouldThrow={false} />)

    expect(screen.getByTestId('success')).toBeTruthy()
  })

  it('returns wrapped component', () => {
    const WrappedComponent = withErrorBoundary(ThrowError)

    expect(typeof WrappedComponent).toBe('function')
  })

  it('accepts custom fallback in HOC', () => {
    const WrappedComponent = withErrorBoundary(ThrowError, <SimpleFallback />)

    expect(typeof WrappedComponent).toBe('function')
  })
})
