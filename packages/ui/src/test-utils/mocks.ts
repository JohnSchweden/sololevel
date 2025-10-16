/**
 * Centralized Mock Utilities for Tamagui Testing
 * Provides consistent mock implementations across all test files
 */

import { jest } from '@jest/globals'
import React from 'react'

// Types for better type safety
export interface MockComponentProps {
  children?: React.ReactNode
  icon?: React.ReactElement | React.ComponentType | string
  onPress?: () => void
  onPressIn?: () => void
  onPressOut?: () => void
  onLongPress?: () => void
  onClick?: () => void
  disabled?: boolean
  accessibilityLabel?: string
  accessibilityHint?: string
  accessibilityRole?: string
  accessibilityState?: {
    selected?: boolean
    disabled?: boolean
  }
  minWidth?: number
  minHeight?: number
  testID?: string
  // Allow additional props for flexibility
  [key: string]: unknown
}

export interface MockStyledOptions {
  component?: string | React.ComponentType
  config?: Record<string, unknown>
}

export interface IconProps {
  size?: number
  color?: string
  className?: string
  testID?: string
  [key: string]: unknown
}

export interface DialogProps {
  children?: React.ReactNode
  modal?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  [key: string]: unknown
}

export interface DialogComponentProps {
  children?: React.ReactNode
  asChild?: boolean
  [key: string]: unknown
}

export interface ImageProps {
  source?: { uri?: string } | number
  width?: number | string
  height?: number | string
  borderRadius?: number | string
  testID?: string
  onLoad?: () => void
  onError?: () => void
  accessibilityLabel?: string
  [key: string]: unknown
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

  // Other common Tamagui props
  'icon',
  // 'testID', // Removed - needed for testing
  'key',
  'radius',
  'space',
  'zIndex',
  'disabled',
  'circular',
  'unstyled',
  'hoverTheme',
  'pressTheme',
  'focusTheme',

  // Additional animation props
  'animationDuration',
  'animationDelay',
  'animationTimingFunction',

  // Responsive props
  'responsive',
  'mediaQueries',

  // Interaction states
  'hover',
  'focus',
  'press',
  'active',

  // Additional layout props
  'overflow',
  'overflowX',
  'overflowY',
  'cursor',
  'horizontal',
  'showsHorizontalScrollIndicator',
  'contentContainerStyle',

  // Additional spacing props
  'paddingBlock',
  'paddingInline',
  'marginBlock',
  'marginInline',

  // Additional border props
  'borderBlock',
  'borderInline',
  'borderBlockStart',
  'borderBlockEnd',
  'borderInlineStart',
  'borderInlineEnd',

  // Additional background props
  'backgroundImage',
  'backgroundSize',
  'backgroundPosition',
  'backgroundRepeat',

  // Additional typography props
  'fontStyle',
  'textDecoration',
  'textDecorationLine',
  'textTransform',
  'letterSpacing',
  'wordSpacing',
  'textIndent',

  // Additional interaction props
  'onHoverIn',
  'onHoverOut',
  'onFocusIn',
  'onFocusOut',
  'onPressStart',
  'onPressEnd',

  // Additional accessibility props
  'accessibilityValue',
  'accessibilityActions',
  'accessibilityRoleDescription',

  // Missing props from navigation dialog
  'paddingVertical',
  'borderradius',
  'backgroundcolor',
  'lineheight',
  'maxwidth',
  'enterstyle',
  'exitstyle',
  'displaywhenadapted',
  'borderradius',
  'lineheight',
  'backgroundcolor',
  'maxwidth',
  'paddingvertical',
  'enterstyle',
  'exitstyle',
  'displaywhenadapted',
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
        const IconComponent = icon as React.ComponentType<IconProps>
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

      finalChildren = children
        ? [iconElement, ...React.Children.toArray(children as React.ReactNode)]
        : [iconElement]
    }

    // Determine element type - use button for interactive elements, div for layout
    const isInteractive = name === 'Button' || props.onPress
    const elementType = isInteractive ? 'button' : 'div'

    // Prioritize data-testid from domProps, then testID, then component name
    const finalTestId = domProps['data-testid'] || props.testID || name
    // Remove data-testid from domProps to avoid duplication
    const { 'data-testid': _, ...finalDomProps } = domProps

    return React.createElement(
      elementType,
      {
        ...finalDomProps,
        ref,
        'data-testid': finalTestId,
        'aria-label': props.accessibilityLabel,
        'aria-describedby': props.accessibilityHint,
        role: props.accessibilityRole,
        'aria-selected': (props.accessibilityState as { selected?: boolean })?.selected,
        'aria-disabled': props.disabled,
        disabled: props.disabled,
        onClick: props.onPress, // Convert onPress to onClick for web
        style: {
          minHeight: props.minHeight || 44,
          minWidth: props.minWidth || 44,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          ...(domProps.style as Record<string, unknown>),
        },
      },
      finalChildren as React.ReactNode
    )
  })
}

/**
 * Creates a mock styled function that works with Tamagui's styled API
 */
export function createMockStyled(component?: string | React.ComponentType) {
  return (componentOrConfig?: string | React.ComponentType | MockStyledOptions) => {
    const targetComponent = component || componentOrConfig
    return createMockComponent(
      typeof targetComponent === 'string' ? targetComponent : 'StyledComponent'
    )
  }
}

/**
 * Creates a comprehensive Select mock for Tamagui Select component
 */
function createSelectMock() {
  const SelectRoot = ({ children, value, onValueChange, disabled }: any) => {
    const [isOpen, setIsOpen] = React.useState(false)

    return React.createElement(
      'div',
      {
        'data-testid': 'select-root',
        'data-value': value,
        'data-disabled': disabled,
      },
      React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, {
            value,
            onValueChange,
            disabled,
            isOpen,
            setIsOpen,
          })
        }
        return child
      })
    )
  }

  const SelectTrigger = ({ children, testID, disabled, value, isOpen, setIsOpen, ...props }: any) =>
    React.createElement(
      'button',
      {
        'data-testid': testID || 'select-trigger',
        'aria-label': props.accessibilityLabel,
        'aria-describedby': props.accessibilityHint,
        disabled,
        onClick: disabled ? undefined : () => setIsOpen?.(!isOpen),
        style: {
          minHeight: props.minHeight || 44,
          minWidth: props.minWidth,
          ...props.style,
        },
      },
      children
    )

  const SelectValue = ({ children, placeholder, color }: any) =>
    React.createElement(
      'span',
      {
        'data-testid': 'select-value',
        style: { color },
      },
      children || placeholder
    )

  const SelectContent = ({ children, value, onValueChange, isOpen, setIsOpen }: any) => {
    if (!isOpen) return null
    return React.createElement(
      'div',
      {
        'data-testid': 'select-content',
        role: 'listbox',
      },
      React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, {
            value,
            onValueChange,
            setIsOpen,
          })
        }
        return child
      })
    )
  }

  const SelectViewport = ({ children, value, onValueChange, setIsOpen }: any) =>
    React.createElement(
      'div',
      {
        'data-testid': 'select-viewport',
      },
      React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, {
            value,
            onValueChange,
            setIsOpen,
          })
        }
        return child
      })
    )

  const SelectGroup = ({ children, value, onValueChange, setIsOpen }: any) =>
    React.createElement(
      'div',
      {
        role: 'group',
        'data-testid': 'select-group',
      },
      React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, {
            value,
            onValueChange,
            setIsOpen,
          })
        }
        return child
      })
    )

  const SelectLabel = ({ children }: any) =>
    React.createElement(
      'div',
      {
        role: 'label',
        'data-testid': 'select-label',
      },
      children
    )

  const SelectItem = ({ children, value: itemValue, testID, onValueChange, setIsOpen }: any) => {
    return React.createElement(
      'div',
      {
        'data-testid': testID || `select-item-${itemValue}`,
        role: 'option',
        'data-value': itemValue,
        onClick: () => {
          onValueChange?.(itemValue)
          setIsOpen?.(false)
        },
        style: { cursor: 'pointer' },
      },
      children
    )
  }

  const SelectItemText = ({ children }: any) =>
    React.createElement(
      'span',
      {
        'data-testid': 'select-item-text',
      },
      children
    )

  const SelectItemIndicator = ({ children }: any) =>
    React.createElement(
      'span',
      {
        'data-testid': 'select-item-indicator',
      },
      children
    )

  const SelectScrollUpButton = ({ children }: any) =>
    React.createElement(
      'div',
      {
        'data-testid': 'select-scroll-up',
      },
      children
    )

  const SelectScrollDownButton = ({ children }: any) =>
    React.createElement(
      'div',
      {
        'data-testid': 'select-scroll-down',
      },
      children
    )

  // Mock Adapt component for native sheet support
  const SelectAdapt = () => null // Adapt doesn't render on web in jsdom
  SelectAdapt.Contents = ({ children }: any) =>
    React.createElement('div', { 'data-testid': 'select-adapt-contents' }, children)

  // Attach sub-components
  const Select: any = SelectRoot
  Select.Trigger = SelectTrigger
  Select.Value = SelectValue
  Select.Content = SelectContent
  Select.Viewport = SelectViewport
  Select.Group = SelectGroup
  Select.Label = SelectLabel
  Select.Item = SelectItem
  Select.ItemText = SelectItemText
  Select.ItemIndicator = SelectItemIndicator
  Select.ScrollUpButton = SelectScrollUpButton
  Select.ScrollDownButton = SelectScrollDownButton
  Select.Adapt = SelectAdapt

  return Select
}

/**
 * Creates a comprehensive Dialog mock using a builder pattern
 * This makes the Dialog mock more maintainable and easier to extend
 */
function createDialogMock() {
  // Base dialog component
  const Dialog = React.forwardRef<HTMLElement, DialogProps>(
    ({ children, modal, open, onOpenChange, ...props }, ref) => {
      // Filter out Tamagui-specific props
      const domProps = Object.fromEntries(
        Object.entries(props).filter(([key]) => !TAMAGUI_PROPS_TO_FILTER.has(key))
      )

      return open
        ? React.createElement(
            'div',
            {
              ...domProps,
              ref,
              'data-testid': 'Dialog',
              'data-modal': modal,
              'data-open': open,
              onClick: onOpenChange
                ? () => (onOpenChange as (open: boolean) => void)(false)
                : undefined,
            },
            children as React.ReactNode
          )
        : null
    }
  )

  // Dialog component builder
  const createDialogComponent = (
    componentName: string,
    defaultElement = 'div',
    defaultProps: Record<string, unknown> = {},
    customStyle?: Record<string, unknown>
  ) => {
    return React.forwardRef<HTMLElement, DialogComponentProps>(
      ({ children, asChild, ...props }, ref) => {
        // Filter out Tamagui-specific props
        const domProps = Object.fromEntries(
          Object.entries(props).filter(([key]) => !TAMAGUI_PROPS_TO_FILTER.has(key))
        )

        const element = asChild ? 'span' : defaultElement
        const baseProps = {
          ...defaultProps,
          ...domProps,
          ref,
          'data-testid': `Dialog${componentName}`,
        }

        if (customStyle) {
          ;(baseProps as any).style = {
            ...customStyle,
            ...(props.style as Record<string, unknown>),
          }
        }

        return React.createElement(element, baseProps, children as React.ReactNode)
      }
    )
  }

  // Compose dialog with all sub-components
  return Object.assign(Dialog, {
    Root: createDialogComponent('Root'),
    Portal: createDialogComponent('Portal'),
    Overlay: createDialogComponent(
      'Overlay',
      'div',
      {},
      {
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
      }
    ),
    Content: createDialogComponent(
      'Content',
      'div',
      {},
      {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 20,
        maxWidth: 400,
      }
    ),
    Title: createDialogComponent('Title', 'h2'),
    Description: createDialogComponent('Description', 'p'),
    Close: createDialogComponent('Close', 'button', { type: 'button' }),
    Trigger: createDialogComponent('Trigger'),
    Header: createDialogComponent('Header'),
    Footer: createDialogComponent('Footer'),
    ScrollView: createDialogComponent('ScrollView'),
  })
}

/**
 * Creates a comprehensive Tamagui mock object
 */
export function createTamaguiMock() {
  const mockComponent = createMockComponent('Component')
  const mockStyled = createMockStyled()

  // RadioGroup mock
  let lastClickedLabel: any = null
  let lastClickTime = 0

  const RadioGroupComponent: any = ({
    children,
    value,
    onValueChange,
    testID,
    disabled,
    accessibilityLabel,
  }: any) => {
    const handleClick = (e: any) => {
      // Only handle clicks directly on labels or their children, not on the container
      if (e.target === e.currentTarget) return

      const label = e.target.closest('label')
      if (label && onValueChange && !disabled) {
        // Get the htmlFor attribute to find the associated input
        const inputId = label.getAttribute('for')
        if (inputId) {
          // Find the input with this ID anywhere in the RadioGroup
          const radioGroup = e.currentTarget
          const input = radioGroup.querySelector(`input[id="${inputId}"]`)
          if (input && input.value !== value) {
            // Prevent double-firing by tracking last click
            const now = Date.now()
            if (label === lastClickedLabel && now - lastClickTime < 10) {
              return
            }
            lastClickedLabel = label
            lastClickTime = now

            onValueChange(input.value)
          }
        }
      }
    }

    return React.createElement(
      'div',
      {
        'data-testid': testID,
        'data-value': value,
        'data-disabled': disabled,
        'aria-label': accessibilityLabel,
        role: 'radiogroup',
        onClick: handleClick,
      },
      children
    )
  }

  RadioGroupComponent.Item = ({ value, id, disabled, testID, children, ...props }: any) =>
    React.createElement(
      'div',
      {
        'data-testid': testID,
        ...Object.fromEntries(
          Object.entries(props).filter(([key]) => !TAMAGUI_PROPS_TO_FILTER.has(key.toLowerCase()))
        ),
      },
      React.createElement('input', {
        type: 'radio',
        id,
        value,
        disabled,
        'aria-label': `${value} theme`,
        style: { position: 'absolute', opacity: 0 },
      }),
      children
    )

  RadioGroupComponent.Indicator = () => null

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
    SizableText: createMockComponent('SizableText'),
    View: mockComponent,

    // Form components
    Input: createMockComponent('Input'),
    TextArea: createMockComponent('TextArea'),
    Checkbox: createMockComponent('Checkbox'),
    Switch: createMockComponent('Switch'),
    RadioGroup: RadioGroupComponent,
    Label: ({ children, htmlFor, testID, ...props }: any) =>
      React.createElement(
        'label',
        {
          htmlFor,
          'data-testid': testID,
          ...Object.fromEntries(
            Object.entries(props).filter(([key]) => !TAMAGUI_PROPS_TO_FILTER.has(key.toLowerCase()))
          ),
        },
        children
      ),

    // Layout components
    ScrollView: mockComponent,
    Spacer: mockComponent,
    Separator: mockComponent,
    Circle: mockComponent,
    Square: mockComponent,

    // Overlay components with improved composition
    Dialog: createDialogMock(),
    Select: createSelectMock(),
    Adapt: Object.assign(({ children }: any) => children, {
      Contents: createMockComponent('Adapt.Contents'),
    }),
    Sheet: Object.assign(createMockComponent('Sheet'), {
      Frame: createMockComponent('Sheet.Frame'),
      ScrollView: createMockComponent('Sheet.ScrollView'),
      Overlay: createMockComponent('Sheet.Overlay'),
    }),

    // Theme and styling
    useTheme: jest.fn(() => ({ background: '#fff', color: '#000' })),
    Theme: ({ children }: { children: React.ReactNode }) => children,

    // Animations
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,

    // Loading components
    Spinner: createMockComponent('Spinner'),

    // Image component (doesn't work in jsdom - use mock)
    Image: MockImage,
  }
}

/**
 * Creates mock implementations for common icon libraries
 */
export function createIconMocks() {
  const createIcon = (name: string) =>
    React.forwardRef<SVGElement, IconProps>((props, ref) =>
      React.createElement('svg', {
        ...props,
        ref,
        'data-testid': props.testID || `${name}-icon`,
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
    ChevronRight: createIcon('ChevronRight'),
    RefreshCw: createIcon('RefreshCw'),
    AlertCircle: createIcon('AlertCircle'),
    AlertTriangle: createIcon('AlertTriangle'),
    CheckCircle: createIcon('CheckCircle'),
    X: createIcon('X'),
    Play: createIcon('Play'),
    PlayCircle: createIcon('PlayCircle'),
    Pause: createIcon('Pause'),
    Square: createIcon('Square'),
    RotateCcw: createIcon('RotateCcw'),
    Upload: createIcon('Upload'),
    SwitchCamera: createIcon('SwitchCamera'),
    Settings: createIcon('Settings'),
    SkipBack: createIcon('SkipBack'),
    SkipForward: createIcon('SkipForward'),
    XCircle: createIcon('XCircle'),
    Clock: createIcon('Clock'),
    Share: createIcon('Share'),
    Download: createIcon('Download'),
  }
}

/**
 * Mock Image component for Tamagui (doesn't work in jsdom)
 * Renders as a div with data-testid and simulates image loading
 */
export const MockImage = React.forwardRef<HTMLDivElement, ImageProps>((props, ref) => {
  const { source, testID, onLoad, onError, accessibilityLabel, width, height, ...rest } = props

  // Filter out Tamagui props
  const domProps = Object.fromEntries(
    Object.entries(rest).filter(([key]) => !TAMAGUI_PROPS_TO_FILTER.has(key))
  )

  // Simulate image loading behavior
  React.useEffect(() => {
    if (source && typeof onLoad === 'function') {
      // Simulate successful load by default
      onLoad()
    }
  }, [source, onLoad])

  return React.createElement('div', {
    ...domProps,
    ref,
    'data-testid': testID || 'mock-image',
    'aria-label': accessibilityLabel,
    role: 'img',
    style: {
      width: typeof width === 'number' ? `${width}px` : width,
      height: typeof height === 'number' ? `${height}px` : height,
      ...(domProps.style as React.CSSProperties),
    },
  })
})

MockImage.displayName = 'MockImage'

// Global logger mocking for UI package tests
jest.mock('@my/logging', () => ({
  log: {
    trace: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    fatal: jest.fn(),
  },
  logger: {
    trace: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    fatal: jest.fn(),
  },
}))

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
