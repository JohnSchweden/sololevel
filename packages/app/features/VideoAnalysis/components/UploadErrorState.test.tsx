import { fireEvent, render } from '@testing-library/react-native'

import { UploadErrorState } from './UploadErrorState'

describe('UploadErrorState', () => {
  const onRetry = jest.fn()
  const onBack = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders null when not visible', () => {
    const { queryByTestId } = render(
      <UploadErrorState
        visible={false}
        errorMessage="Something went wrong"
        onRetry={onRetry}
        onBack={onBack}
      />
    )

    expect(queryByTestId('upload-error-state')).toBeNull()
  })

  it('renders error content when visible', () => {
    const { getByTestId } = render(
      <UploadErrorState
        visible
        errorMessage="Custom error"
        onRetry={onRetry}
        onBack={onBack}
      />
    )

    // Assert: Component renders with testID
    expect(getByTestId('upload-error-state')).toBeTruthy()
    expect(getByTestId('upload-error-retry-button')).toBeTruthy()
    expect(getByTestId('upload-error-back-button')).toBeTruthy()
  })

  it('renders with default error message when none provided', () => {
    const { getByTestId } = render(
      <UploadErrorState
        visible
        errorMessage={null}
        onRetry={onRetry}
        onBack={onBack}
      />
    )

    // Assert: Component still renders with required buttons
    expect(getByTestId('upload-error-state')).toBeTruthy()
    expect(getByTestId('upload-error-retry-button')).toBeTruthy()
    expect(getByTestId('upload-error-back-button')).toBeTruthy()
  })

  it('triggers retry and back actions', () => {
    const { getByTestId } = render(
      <UploadErrorState
        visible
        errorMessage="Custom error"
        onRetry={onRetry}
        onBack={onBack}
      />
    )

    fireEvent.press(getByTestId('upload-error-retry-button'))
    fireEvent.press(getByTestId('upload-error-back-button'))

    expect(onRetry).toHaveBeenCalledTimes(1)
    expect(onBack).toHaveBeenCalledTimes(1)
  })
})
