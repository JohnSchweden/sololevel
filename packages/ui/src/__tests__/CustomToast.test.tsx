import React from 'react'

// Mock Tamagui components before imports
jest.mock('tamagui', () => {
  const React = require('react')
  const mockComponent = (name: string) =>
    React.forwardRef((props: any, ref: any) => {
      // Filter out Tamagui-specific props
      const {
        backgroundColor,
        borderRadius,
        minHeight,
        minWidth,
        pressStyle,
        hoverStyle,
        accessibilityRole,
        accessibilityLabel,
        accessibilityHint,
        accessibilityState,
        scale,
        animation,
        borderWidth,
        borderColor,
        shadowColor,
        shadowOffset,
        shadowOpacity,
        shadowRadius,
        elevation,
        gap,
        paddingHorizontal,
        alignItems,
        justifyContent,
        size,
        opacity,
        onPress,
        ...domProps
      } = props

      return React.createElement('div', {
        ...domProps,
        ref,
        'data-testid': name,
        'aria-label': accessibilityLabel,
        'aria-describedby': accessibilityHint,
        role: accessibilityRole,
        'aria-selected': accessibilityState?.selected,
        'aria-disabled': props.disabled,
        onClick: onPress, // Convert onPress to onClick for web
        style: {
          minHeight: minHeight || 44,
          minWidth: minWidth || 44,
          ...domProps.style,
        },
      })
    })

  return {
    TamaguiProvider: ({ children }: { children: any }) => children,
    createTamagui: jest.fn(() => ({})),
    Stack: mockComponent('Stack'),
    XStack: mockComponent('XStack'),
    YStack: mockComponent('YStack'),
    Button: mockComponent('Button'),
    Text: mockComponent('Text'),
    View: mockComponent('View'),
    Circle: mockComponent('Circle'),
  }
})

import { config } from '@my/config'
import { render, renderWithProvider, screen } from '../test-utils'

import { TamaguiProvider } from 'tamagui'
import { CustomToast } from '../CustomToast'

// Mock Platform to control web/native behavior
jest.mock('react-native', () => ({
  Platform: {
    OS: 'web' as 'web' | 'ios' | 'android',
  },
}))

// Mock NativeToast component
jest.mock('../NativeToast', () => ({
  NativeToast: () => <div data-testid="native-toast">Native Toast</div>,
}))

describe('CustomToast', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders NativeToast on web platform', async () => {
    // Ensure Platform.OS is 'web'
    const { Platform } = await import('react-native')
    Platform.OS = 'web'

    renderWithProvider(<CustomToast />)

    // Should render the NativeToast component
    expect(screen.getByTestId('native-toast')).toBeTruthy()
    expect(screen.getByText('Native Toast')).toBeTruthy()
  })

  it('renders nothing on Expo/native platforms', async () => {
    // Set Platform.OS to a native platform
    const { Platform } = await import('react-native')
    Platform.OS = 'ios'

    // Re-import the component after changing Platform.OS
    const { CustomToast: FreshCustomToast } = await import('../CustomToast')

    const { container } = renderWithProvider(<FreshCustomToast />)

    // Should render nothing - check for empty or minimal content
    const hasContent = container.textContent && container.textContent.trim().length > 0
    expect(hasContent).toBeFalsy()
  })

  it('renders nothing on Android platform', async () => {
    const { Platform } = await import('react-native')
    Platform.OS = 'android'

    // Re-import the component after changing Platform.OS
    const { CustomToast: FreshCustomToast } = await import('../CustomToast')

    const { container } = renderWithProvider(<FreshCustomToast />)

    // Should render nothing - check for empty or minimal content
    const hasContent = container.textContent && container.textContent.trim().length > 0
    expect(hasContent).toBeFalsy()
  })
})
