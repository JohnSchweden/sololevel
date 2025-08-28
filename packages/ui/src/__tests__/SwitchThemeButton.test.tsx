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

      return React.createElement(name === 'Button' ? 'button' : 'div', {
        ...domProps,
        ref,
        'data-testid': name,
        'aria-label': accessibilityLabel,
        'aria-describedby': accessibilityHint,
        role: accessibilityRole || (name === 'Button' ? 'button' : undefined),
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
    useIsomorphicLayoutEffect: React.useLayoutEffect,
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
import { fireEvent, render, screen } from '@testing-library/react'

import { TamaguiProvider } from 'tamagui'

// Mock Tamagui theme hooks
const mockUseThemeSetting = jest.fn()
const mockUseRootTheme = jest.fn()

jest.mock('@tamagui/next-theme', () => ({
  useThemeSetting: () => mockUseThemeSetting(),
  useRootTheme: () => mockUseRootTheme(),
}))

import { SwitchThemeButton } from '../SwitchThemeButton'

function renderWithProvider(component: React.ReactElement) {
  return render(<TamaguiProvider config={config}>{component}</TamaguiProvider>)
}

describe('SwitchThemeButton', () => {
  const mockToggle = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()

    // Setup default mock implementations
    mockUseThemeSetting.mockReturnValue({
      current: 'light',
      toggle: mockToggle,
      forcedTheme: null,
      resolvedTheme: 'light',
    })

    mockUseRootTheme.mockReturnValue(['light'])
  })

  it('renders with light theme', () => {
    renderWithProvider(<SwitchThemeButton />)

    const btnLight = screen.getByRole('button', { name: /Change theme:\s*light/i })
    expect(btnLight).toBeTruthy()
  })

  it('renders with dark theme', () => {
    mockUseThemeSetting.mockReturnValue({
      current: 'dark',
      toggle: mockToggle,
      forcedTheme: null,
      resolvedTheme: 'dark',
    })

    mockUseRootTheme.mockReturnValue(['dark'])

    renderWithProvider(<SwitchThemeButton />)

    const btnDark = screen.getByRole('button', { name: /Change theme:\s*dark/i })
    expect(btnDark).toBeTruthy()
  })

  it('calls toggle function when clicked', () => {
    renderWithProvider(<SwitchThemeButton />)

    const button = screen.getByRole('button')
    fireEvent.click(button)

    expect(mockToggle).toHaveBeenCalledTimes(1)
  })

  it('handles forced theme correctly', () => {
    mockUseThemeSetting.mockReturnValue({
      current: 'light',
      toggle: mockToggle,
      forcedTheme: 'dark',
      resolvedTheme: 'dark',
    })

    renderWithProvider(<SwitchThemeButton />)

    // Should show the forced theme
    const btnForced = screen.getByRole('button', { name: /Change theme:\s*dark/i })
    expect(btnForced).toBeTruthy()
  })

  it('updates theme display when theme changes', () => {
    // Initial render with light theme
    const { rerender } = renderWithProvider(<SwitchThemeButton />)
    expect(screen.getByRole('button', { name: /Change theme:\s*light/i })).toBeTruthy()

    // Update mock to return dark theme
    mockUseThemeSetting.mockReturnValue({
      current: 'dark',
      toggle: mockToggle,
      forcedTheme: null,
      resolvedTheme: 'dark',
    })

    // Re-render component
    rerender(
      <TamaguiProvider config={config}>
        <SwitchThemeButton />
      </TamaguiProvider>
    )

    expect(screen.getByRole('button', { name: /Change theme:\s*dark/i })).toBeTruthy()
  })
})
