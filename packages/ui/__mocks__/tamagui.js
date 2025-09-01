const React = require('react')

console.log('Tamagui mock loaded!')

const mockComponent = (name) =>
  React.forwardRef((props, ref) => {
    // Filter out Tamagui-specific props that React DOM doesn't recognize
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
      style: {
        minHeight: minHeight || 44,
        minWidth: minWidth || 44,
        ...domProps.style,
      },
    })
  })

const mockStyled = (_component, _config) => mockComponent

module.exports = {
  TamaguiProvider: ({ children }) => children,
  styled: mockStyled,
  createTamagui: jest.fn(() => ({})),
  useIsomorphicLayoutEffect: React.useLayoutEffect,
  Stack: mockComponent('Stack'),
  XStack: mockComponent('XStack'),
  YStack: mockComponent('YStack'),
  Button: mockComponent('Button'),
  Text: mockComponent('Text'),
  View: mockComponent('View'),
  Circle: mockComponent('Circle'),
  Dialog: {
    Root: ({ children }) => children,
    Portal: ({ children }) => children,
    Overlay: mockComponent('DialogOverlay'),
    Content: mockComponent('DialogContent'),
    Title: mockComponent('DialogTitle'),
    Description: mockComponent('DialogDescription'),
    Close: mockComponent('DialogClose'),
    Trigger: mockComponent('DialogTrigger'),
    Header: mockComponent('DialogHeader'),
    Footer: mockComponent('DialogFooter'),
    ScrollView: mockComponent('DialogScrollView'),
  },
}
