import { render } from '@testing-library/react-native'

import { ProcessingIndicator } from './ProcessingIndicator'

// Minimal Tamagui mock for RN test environment
jest.mock('tamagui', () => {
  const React = require('react')
  const RN = require('react-native')
  return {
    YStack: ({ children, testID, ...props }: any) =>
      React.createElement(RN.View, { testID, ...props }, children),
    Text: ({ children, ...props }: any) => React.createElement(RN.Text, { ...props }, children),
    Spinner: () => React.createElement(RN.View, { accessibilityRole: 'progressbar' }),
  }
})

describe('ProcessingIndicator', () => {
  it('renders processing overlay when not ready', () => {
    const { getByTestId } = render(
      <ProcessingIndicator
        phase="analyzing"
        progress={{ upload: 0, analysis: 0, feedback: 0 }}
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
        progress={{ upload: 0, analysis: 0, feedback: 0 }}
        channelExhausted
      />
    )

    expect(getByTestId('channel-warning')).toBeTruthy()
  })
})
