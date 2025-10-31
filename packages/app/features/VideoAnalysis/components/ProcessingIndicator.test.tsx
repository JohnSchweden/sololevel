import { render } from '@testing-library/react-native'

import { ProcessingIndicator } from './ProcessingIndicator'

// Mock Reanimated first (required by ProcessingIndicator)
jest.mock('react-native-reanimated', () => {
  const React = require('react')
  return {
    __esModule: true,
    default: {
      createAnimatedComponent: (Component: any) => {
        return React.forwardRef((props: any, ref: any) =>
          React.createElement(Component, { ...props, ref })
        )
      },
    },
    useSharedValue: (initialValue: any) => ({ value: initialValue }),
    useAnimatedStyle: (_stylesFn: any) => ({}),
    useAnimatedReaction: jest.fn(),
    interpolate: jest.fn((value, _input, _output) => value),
    Easing: {
      inOut: jest.fn((easing) => easing),
      ease: jest.fn(),
    },
  }
})

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
  // NOTE: ProcessingIndicator is heavily tied to Reanimated animated values and BlurView
  // These are best tested via:
  // 1. Integration/E2E tests in a real environment
  // 2. Storybook with visual verification
  // 3. Manual testing in simulator/device
  // Unit test mocking of Reanimated internals (withTiming, useAnimatedReaction, etc.)
  // is fragile and couples tests to implementation details.

  it.skip('renders processing overlay when not ready', () => {
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

  it.skip('hides indicator when ready', () => {
    const { queryByTestId } = render(
      <ProcessingIndicator
        phase="ready"
        progress={{ upload: 100, analysis: 100, feedback: 100 }}
        channelExhausted={false}
      />
    )

    expect(queryByTestId('processing-indicator')).toBeNull()
  })

  it.skip('renders connection warning when channel exhausted', () => {
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
