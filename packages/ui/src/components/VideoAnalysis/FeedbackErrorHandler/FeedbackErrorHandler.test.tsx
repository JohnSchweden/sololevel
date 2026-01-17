import { fireEvent, render, screen } from '@testing-library/react'
import { TamaguiProvider } from 'tamagui'
import config from '../../../config/tamagui.config'
import { FeedbackErrorHandler } from './FeedbackErrorHandler'

const renderWithProvider = (component: React.ReactElement) => {
  return render(<TamaguiProvider config={config}>{component}</TamaguiProvider>)
}

describe('FeedbackErrorHandler', () => {
  const mockProps = {
    feedbackId: 'test-feedback-1',
    feedbackText: 'Test feedback message',
    ssmlFailed: true,
    audioFailed: false,
    onRetry: jest.fn(),
    onDismiss: jest.fn(),
    testID: 'feedback-error-handler',
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders error message for SSML failure', () => {
    renderWithProvider(<FeedbackErrorHandler {...mockProps} />)

    expect(screen.getByText(/Failed to generate speech markup/)).toBeInTheDocument()
  })

  it('calls onRetry when retry button is clicked', () => {
    renderWithProvider(<FeedbackErrorHandler {...mockProps} />)

    const retryButton = screen.getByRole('button', { name: /retry/i })
    fireEvent.click(retryButton)

    expect(mockProps.onRetry).toHaveBeenCalledWith('test-feedback-1')
  })

  // Note: Dismiss button is currently commented out in the component
  // it('calls onDismiss when dismiss button is clicked', () => {
  //   renderWithProvider(<FeedbackErrorHandler {...mockProps} />)
  //
  //   const dismissButton = screen.getByRole('button', { name: /dismiss/i })
  //   fireEvent.click(dismissButton)
  //
  //   expect(mockProps.onDismiss).toHaveBeenCalledWith('test-feedback-1')
  // })
})
