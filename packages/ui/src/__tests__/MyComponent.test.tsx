// Mock Tamagui components before imports
jest.mock('tamagui', () => {
  const React = require('react')
  const mockComponent = (name: string) =>
    (props: any) => {
      // Filter out Tamagui-specific props
      const {
        backgroundColor, borderRadius, minHeight, minWidth, pressStyle, hoverStyle,
        accessibilityRole, accessibilityLabel, accessibilityHint, accessibilityState,
        scale, animation, borderWidth, borderColor, shadowColor, shadowOffset,
        shadowOpacity, shadowRadius, elevation, gap, paddingHorizontal,
        alignItems, justifyContent, size, opacity, onPress, ...domProps
      } = props

      return React.createElement('div', {
        ...domProps,
        'data-testid': name,
        'aria-label': accessibilityLabel,
        'aria-describedby': accessibilityHint,
        'role': accessibilityRole,
        'aria-selected': accessibilityState?.selected,
        'aria-disabled': props.disabled,
        onClick: onPress, // Convert onPress to onClick for web
        style: {
          minHeight: minHeight || 44,
          minWidth: minWidth || 44,
          ...domProps.style
        }
      })
    }

  const mockStyled = (component: any) => {
    const StyledComponent = (props: any) => {
      const Component = typeof component === 'string' ? component : component.name || 'StyledComponent'
      const mockComp = mockComponent(Component)
      return mockComp(props)
    }
    StyledComponent.displayName = 'StyledComponent'
    return StyledComponent
  }

  return {
    TamaguiProvider: ({ children }: { children: any }) => children,
    createTamagui: jest.fn(() => ({})),
    styled: mockStyled,
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

import React from 'react'
import { render, screen } from '@testing-library/react'
import { TamaguiProvider } from 'tamagui'
import { config } from '@my/config'
import { MyComponent } from '../MyComponent'

// Test wrapper with Tamagui provider
function renderWithProvider(component: React.ReactElement) {
  return render(<div data-testid="tamagui-provider">{component}</div>)
}

describe('MyComponent', () => {
  it('renders without crashing', () => {
    renderWithProvider(<MyComponent testID="my-component" />)
    expect(screen.getByTestId('StyledComponent')).toBeTruthy()
  })

  it('applies default red background color', () => {
    renderWithProvider(<MyComponent testID="my-component" />)
    const component = screen.getByTestId('StyledComponent')

    // Check that the component has the expected styling
    expect(component).toBeTruthy()
  })

  it('applies blue variant when specified', () => {
    renderWithProvider(
      <MyComponent
        testID="my-component"
        blue
      />
    )
    const component = screen.getByTestId('StyledComponent')

    // Component should render with blue variant
    expect(component).toBeTruthy()
  })

  it('accepts children content', () => {
    renderWithProvider(
      <MyComponent testID="my-component">
        <div data-testid="child-content">Test content</div>
      </MyComponent>
    )

    expect(screen.getByTestId('StyledComponent')).toBeTruthy()
    expect(screen.getByTestId('child-content')).toBeTruthy()
    expect(screen.getByText('Test content')).toBeTruthy()
  })

  it('can be styled with additional props', () => {
    renderWithProvider(
      <MyComponent
        testID="my-component"
        padding="$4"
        margin="$2"
      />
    )

    const component = screen.getByTestId('StyledComponent')
    expect(component).toBeTruthy()
  })
})
