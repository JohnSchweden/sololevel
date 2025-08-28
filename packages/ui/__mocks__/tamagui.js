const React = require('react')

const mockComponent = (name) =>
  React.forwardRef((props, ref) =>
    React.createElement('div', { ...props, ref, 'data-testid': name })
  )

const mockStyled = (component, config) => mockComponent

module.exports = {
  TamaguiProvider: ({ children }) => children,
  styled: mockStyled,
  createTamagui: jest.fn(() => ({})),
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
  },
}
