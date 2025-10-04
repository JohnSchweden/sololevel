import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { FeedbackStatusIndicator } from './FeedbackStatusIndicator'

// Mocks are handled globally in src/test-utils/setup.ts

describe('FeedbackStatusIndicator', () => {
  it('shows "Ready" when both SSML and audio are completed', () => {
    render(
      <FeedbackStatusIndicator
        ssmlStatus="completed"
        audioStatus="completed"
        ssmlAttempts={1}
        audioAttempts={2}
        testID="test-indicator"
      />
    )

    expect(screen.getByTestId('test-indicator')).toHaveTextContent('Ready')
  })

  it('shows "Processing" when either SSML or audio is processing', () => {
    render(
      <FeedbackStatusIndicator
        ssmlStatus="processing"
        audioStatus="queued"
        ssmlAttempts={2}
        audioAttempts={0}
        testID="test-indicator"
      />
    )

    expect(screen.getByTestId('test-indicator')).toHaveTextContent(/Processing/)
  })

  it('shows "Failed" when either SSML or audio has failed', () => {
    render(
      <FeedbackStatusIndicator
        ssmlStatus="failed"
        audioStatus="queued"
        ssmlLastError="SSML failed"
        audioLastError={null}
        testID="test-indicator"
      />
    )

    expect(screen.getByTestId('test-indicator')).toHaveTextContent(/Failed/)
  })

  it('shows "Queued" by default', () => {
    render(
      <FeedbackStatusIndicator
        ssmlStatus="queued"
        audioStatus="queued"
        testID="test-indicator"
      />
    )

    expect(screen.getByTestId('test-indicator')).toHaveTextContent('Queued')
  })
})
