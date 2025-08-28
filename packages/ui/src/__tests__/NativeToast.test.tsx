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
        paddingVertical,
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

// Mock Tamagui toast hook
const mockUseToastState = jest.fn()

jest.mock('@tamagui/toast', () => {
  const FakeToast: any = ({ children, ...props }: any) => {
    // Strip non-DOM props to avoid React warnings
    const { viewportName, enterStyle, exitStyle, y, opacity, scale, animation, ...rest } = props
    return (
      <div
        data-testid="toast"
        data-viewport-name={viewportName}
        {...rest}
      >
        {children}
      </div>
    )
  }
  FakeToast.Title = ({ children }: any) => <span data-testid="toast-title">{children}</span>
  FakeToast.Description = ({ children }: any) => (
    <span data-testid="toast-description">{children}</span>
  )

  return {
    Toast: FakeToast,
    useToastState: () => mockUseToastState(),
  }
})

import { NativeToast } from '../NativeToast'

describe('NativeToast', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders nothing when no toast state', () => {
    mockUseToastState.mockReturnValue(null)

    renderWithProvider(<NativeToast />)

    expect(screen.queryByTestId('toast')).toBeNull()
  })

  it('renders nothing when toast is handled natively', () => {
    mockUseToastState.mockReturnValue({
      id: 'toast-1',
      title: 'Test Toast',
      isHandledNatively: true,
    })

    renderWithProvider(<NativeToast />)

    expect(screen.queryByTestId('toast')).toBeNull()
  })

  it('renders toast with title only', () => {
    mockUseToastState.mockReturnValue({
      id: 'toast-1',
      title: 'Test Toast Title',
      message: null,
      duration: 3000,
      viewportName: 'main',
      isHandledNatively: false,
    })

    renderWithProvider(<NativeToast />)

    expect(screen.getByTestId('toast')).toBeTruthy()
    expect(screen.getByText('Test Toast Title')).toBeTruthy()
  })

  it('renders toast with title and message', () => {
    mockUseToastState.mockReturnValue({
      id: 'toast-2',
      title: 'Success',
      message: 'Operation completed successfully',
      duration: 5000,
      viewportName: 'main',
      isHandledNatively: false,
    })

    renderWithProvider(<NativeToast />)

    expect(screen.getByTestId('toast')).toBeTruthy()
    expect(screen.getByText('Success')).toBeTruthy()
    expect(screen.getByText('Operation completed successfully')).toBeTruthy()
  })

  it('renders toast without message when message is empty', () => {
    mockUseToastState.mockReturnValue({
      id: 'toast-3',
      title: 'Info',
      message: '',
      duration: 2000,
      viewportName: 'main',
      isHandledNatively: false,
    })

    renderWithProvider(<NativeToast />)

    expect(screen.getByTestId('toast')).toBeTruthy()
    expect(screen.getByText('Info')).toBeTruthy()
    // Description should not be rendered when message is empty
    expect(screen.queryByTestId('toast-description')).toBeNull()
  })

  it('applies correct toast properties', () => {
    const mockToast = {
      id: 'toast-4',
      title: 'Test',
      message: 'Test message',
      duration: 4000,
      viewportName: 'custom-viewport',
      isHandledNatively: false,
    }

    mockUseToastState.mockReturnValue(mockToast)

    renderWithProvider(<NativeToast />)

    const toast = screen.getByTestId('toast')
    expect(toast).toBeTruthy()
    expect(toast.getAttribute('duration')).toBe('4000')
    expect(toast.getAttribute('data-viewport-name')).toBe('custom-viewport')
  })
})
