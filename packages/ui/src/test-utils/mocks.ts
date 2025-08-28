/**
 * Centralized Mock Utilities for Tamagui Testing
 * Provides consistent mock implementations across all test files
 */

import React from 'react'

// Types for better type safety
export interface MockComponentProps {
  children?: React.ReactNode
  [key: string]: any
}

export interface MockStyledOptions {
  component?: string | React.ComponentType
  config?: Record<string, any>
}

// Comprehensive list of Tamagui props to filter out
export const TAMAGUI_PROPS_TO_FILTER = new Set([
  // Layout props
  'position',
  'top',
  'right',
  'bottom',
  'left',
  'width',
  'height',
  'maxWidth',
  'maxHeight',
  'minWidth',
  'minHeight',
  'aspectRatio',

  // Flexbox props
  'display',
  'flexDirection',
  'flexWrap',
  'alignContent',
  'alignSelf',
  'alignItems',
  'justifyContent',
  'flex',
  'flexGrow',
  'flexShrink',
  'flexBasis',

  // Spacing props
  'padding',
  'paddingHorizontal',
  'paddingVertical',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'margin',
  'marginHorizontal',
  'marginVertical',
  'marginTop',
  'marginRight',
  'marginBottom',
  'marginLeft',
  'gap',

  // Border props
  'borderWidth',
  'borderTopWidth',
  'borderRightWidth',
  'borderBottomWidth',
  'borderLeftWidth',
  'borderColor',
  'borderTopColor',
  'borderRightColor',
  'borderBottomColor',
  'borderLeftColor',
  'borderRadius',
  'borderTopLeftRadius',
  'borderTopRightRadius',
  'borderBottomLeftRadius',
  'borderBottomRightRadius',

  // Background and colors
  'backgroundColor',
  'background',
  'foreground',

  // Shadow and elevation
  'shadowColor',
  'shadowOffset',
  'shadowOpacity',
  'shadowRadius',
  'elevation',

  // Typography
  'fontSize',
  'fontWeight',
  'fontFamily',
  'lineHeight',
  'textAlign',
  'numberOfLines',
  'color',

  // Interaction
  'onPress',
  'onPressIn',
  'onPressOut',
  'onLongPress',
  'pressStyle',
  'hoverStyle',

  // Accessibility
  'accessibilityRole',
  'accessibilityLabel',
  'accessibilityHint',
  'accessibilityState',

  // Animation and styling
  'animation',
  'scale',
  'opacity',
  'enterStyle',
  'exitStyle',
  'animationStyle',

  // Tamagui specific
  'size',
  'variant',
  'circular',
  'elevate',
  'bordered',
  'chromeless',
  'modal',
  'open',
  'onOpenChange',
  'asChild',
  'displayWhenAdapted',

  // Theme colors
  'blue',
  'red',
  'green',
  'yellow',
  'purple',
  'orange',
  'pink',
  'gray',
  'black',
  'white',

  // Other
  'icon',
  'testID',
  'key',
  'radius',
  'space',
  'zIndex',
  'disabled',
])

/**
 * Creates a mock component that filters out Tamagui-specific props
 */
export function createMockComponent(name: string) {
  return React.forwardRef<HTMLElement, MockComponentProps>((props, ref) => {
    // Filter out Tamagui-specific props
    const { icon, children, ...filteredProps } = props

    // Remove Tamagui props from the filtered props
    const domProps = Object.fromEntries(
      Object.entries(filteredProps).filter(([key]) => !TAMAGUI_PROPS_TO_FILTER.has(key))
    )

    // Handle icon prop by rendering it as a child if it exists
    let finalChildren = children
    if (icon) {
      let iconElement: React.ReactElement | null = null

      if (React.isValidElement(icon)) {
        iconElement = React.cloneElement(icon, { key: 'icon' })
      } else if (typeof icon === 'function') {
        // Icon is a component function, render it
        const IconComponent = icon as React.ComponentType<any>
        iconElement = React.createElement(IconComponent, {
          key: 'icon',
          size: 24,
          color: 'currentColor',
        })
      } else {
        // Icon is a string or other primitive
        iconElement = React.createElement(
          'span',
          {
            key: 'icon',
            'data-testid': 'icon',
          },
          String(icon || 'icon')
        )
      }

      finalChildren = children ? [iconElement, ...React.Children.toArray(children)] : [iconElement]
    }

    return React.createElement(
      name === 'Button' ? 'button' : 'div',
      {
        ...domProps,
        ref,
        'data-testid': name,
        'aria-label': props.accessibilityLabel,
        'aria-describedby': props.accessibilityHint,
        role: props.accessibilityRole,
        'aria-selected': props.accessibilityState?.selected,
        'aria-disabled': props.disabled,
        onClick: props.onPress, // Convert onPress to onClick for web
        style: {
          minHeight: props.minHeight || 44,
          minWidth: props.minWidth || 44,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          ...domProps.style,
        },
      },
      finalChildren
    )
  })
}

/**
 * Creates a mock styled function that works with Tamagui's styled API
 */
export function createMockStyled(component?: any) {
  return (componentOrConfig?: any) => {
    const targetComponent = component || componentOrConfig
    return createMockComponent(
      typeof targetComponent === 'string' ? targetComponent : 'StyledComponent'
    )
  }
}

/**
 * Creates a comprehensive Tamagui mock object
 */
export function createTamaguiMock() {
  const mockComponent = createMockComponent('Component')
  const mockStyled = createMockStyled()

  return {
    // Provider
    TamaguiProvider: ({ children }: { children: React.ReactNode }) => children,
    createTamagui: jest.fn(() => ({})),
    styled: mockStyled,
    useIsomorphicLayoutEffect: React.useLayoutEffect,

    // Layout components
    Stack: mockComponent,
    XStack: mockComponent,
    YStack: mockComponent,
    ZStack: mockComponent,

    // Interactive components
    Button: createMockComponent('Button'),
    Text: createMockComponent('Text'),
    View: mockComponent,

    // Form components
    Input: createMockComponent('Input'),
    TextArea: createMockComponent('TextArea'),
    Checkbox: createMockComponent('Checkbox'),
    Switch: createMockComponent('Switch'),

    // Layout components
    ScrollView: mockComponent,
    Spacer: mockComponent,
    Separator: mockComponent,
    Circle: mockComponent,
    Square: mockComponent,

    // Overlay components
    Dialog: {
      Root: ({ children }: { children: React.ReactNode }) => children,
      Portal: ({ children }: { children: React.ReactNode }) => children,
      Overlay: ({ children }: { children: React.ReactNode }) =>
        React.createElement(
          'div',
          {
            'data-testid': 'DialogOverlay',
            style: {
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
            },
          },
          children
        ),
      Content: ({ children }: { children: React.ReactNode }) =>
        React.createElement(
          'div',
          {
            'data-testid': 'DialogContent',
            style: {
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              backgroundColor: 'white',
              borderRadius: 8,
              padding: 20,
              maxWidth: 400,
            },
          },
          children
        ),
      Title: ({ children }: { children: React.ReactNode }) =>
        React.createElement(
          'h2',
          {
            'data-testid': 'DialogTitle',
          },
          children
        ),
      Description: ({ children }: { children: React.ReactNode }) =>
        React.createElement(
          'p',
          {
            'data-testid': 'DialogDescription',
          },
          children
        ),
      Close: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) =>
        React.createElement(
          asChild ? 'span' : 'button',
          {
            'data-testid': 'DialogClose',
            ...(asChild ? {} : { type: 'button' }),
          },
          children
        ),
      Trigger: mockComponent,
      Header: mockComponent,
      Footer: mockComponent,
      ScrollView: mockComponent,
    },

    // Theme and styling
    useTheme: jest.fn(() => ({ background: '#fff', color: '#000' })),
    Theme: ({ children }: { children: React.ReactNode }) => children,

    // Animations
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  }
}

/**
 * Creates mock implementations for common icon libraries
 */
export function createIconMocks() {
  const createIcon = (name: string) =>
    React.forwardRef<SVGElement>((props, ref) =>
      React.createElement('svg', {
        ...props,
        ref,
        'data-testid': `${name}-icon`,
        width: props.size || 24,
        height: props.size || 24,
        fill: props.color || 'currentColor',
      })
    )

  return {
    // Lucide icons
    Menu: createIcon('Menu'),
    Bell: createIcon('Bell'),
    Home: createIcon('Home'),
    Camera: createIcon('Camera'),
    BarChart3: createIcon('BarChart3'),
    ChevronLeft: createIcon('ChevronLeft'),
    RefreshCw: createIcon('RefreshCw'),
    AlertCircle: createIcon('AlertCircle'),
    AlertTriangle: createIcon('AlertTriangle'),
    CheckCircle: createIcon('CheckCircle'),
    X: createIcon('X'),
    Play: createIcon('Play'),
    Pause: createIcon('Pause'),
    Square: createIcon('Square'),
    RotateCcw: createIcon('RotateCcw'),
    Upload: createIcon('Upload'),
    SwitchCamera: createIcon('SwitchCamera'),
    Settings: createIcon('Settings'),
  }
}

/**
 * Utility to silence console warnings during tests
 */
export function suppressConsoleWarnings() {
  const originalWarn = console.warn
  const originalError = console.error

  beforeAll(() => {
    console.warn = jest.fn()
    console.error = jest.fn()
  })

  afterAll(() => {
    console.warn = originalWarn
    console.error = originalError
  })
}

/**
 * Utility to restore console warnings
 */
export function restoreConsoleWarnings() {
  console.warn = jest.fn()
  console.error = jest.fn()
}
