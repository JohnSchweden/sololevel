import { render, screen } from '@testing-library/react'
import { TamaguiProvider } from 'tamagui'
import config from '../../../config/tamagui.config'
import { FeedbackStatusIndicator } from './FeedbackStatusIndicator'

const renderWithProvider = (component: React.ReactElement) => {
  return render(<TamaguiProvider config={config}>{component}</TamaguiProvider>)
}

describe('FeedbackStatusIndicator', () => {
  it('shows "Ready" when both SSML and audio are completed', () => {
    renderWithProvider(
      <FeedbackStatusIndicator
        ssmlStatus="completed"
        audioStatus="completed"
        ssmlAttempts={1}
        audioAttempts={2}
        testID="test-indicator"
      />
    )

    expect(screen.getByText('Ready')).toBeInTheDocument()
  })

  it('shows "Processing" when either SSML or audio is processing', () => {
    renderWithProvider(
      <FeedbackStatusIndicator
        ssmlStatus="processing"
        audioStatus="queued"
        ssmlAttempts={2}
        audioAttempts={0}
        testID="test-indicator"
      />
    )

    expect(screen.getByText('Processing')).toBeInTheDocument()
  })

  it('shows "Failed" when either SSML or audio has failed', () => {
    renderWithProvider(
      <FeedbackStatusIndicator
        ssmlStatus="failed"
        audioStatus="queued"
        ssmlLastError="SSML failed"
        audioLastError={null}
        testID="test-indicator"
      />
    )

    expect(screen.getByText('Failed')).toBeInTheDocument()
  })

  it('shows "Queued" by default', () => {
    renderWithProvider(
      <FeedbackStatusIndicator
        ssmlStatus="queued"
        audioStatus="queued"
        testID="test-indicator"
      />
    )

    expect(screen.getByText('Queued')).toBeInTheDocument()
  })
})
