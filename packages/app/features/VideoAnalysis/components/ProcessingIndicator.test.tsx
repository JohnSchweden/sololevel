import { render } from '@testing-library/react-native'

import { ProcessingIndicator } from './ProcessingIndicator'

describe('ProcessingIndicator', () => {
  it('renders phase and progress', () => {
    const { getByTestId } = render(
      <ProcessingIndicator
        phase="analyzing"
        progress={{ upload: 20, analysis: 40, feedback: 10 }}
        channelExhausted={false}
      />
    )

    const container = getByTestId('processing-indicator')
    expect(container).toBeTruthy()
  })

  it('hides indicator when ready', () => {
    const { queryByTestId } = render(
      <ProcessingIndicator
        phase="ready"
        progress={{ upload: 100, analysis: 100, feedback: 100 }}
        channelExhausted={false}
      />
    )

    expect(queryByTestId('processing-indicator')).toBeNull()
  })

  it('renders connection warning when channel exhausted', () => {
    const { getByTestId } = render(
      <ProcessingIndicator
        phase="analyzing"
        progress={{ upload: 20, analysis: 40, feedback: 10 }}
        channelExhausted
      />
    )

    expect(getByTestId('channel-warning')).toBeTruthy()
  })
})
