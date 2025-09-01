const React = require('react')

const mockComponent = (name) =>
  React.forwardRef((props, ref) =>
    React.createElement('div', { ...props, ref, 'data-testid': name })
  )

const mockStyled = (_component, _config) => mockComponent

module.exports = {
  TamaguiProvider: ({ children }) => children,
  styled: mockStyled,
  Stack: mockComponent('Stack'),
  XStack: mockComponent('XStack'),
  YStack: mockComponent('YStack'),
  Button: mockComponent('Button'),
  Text: mockComponent('Text'),
  View: mockComponent('View'),
  createTamagui: jest.fn(() => ({})),
  createTokens: jest.fn(() => ({})),
  createTheme: jest.fn(() => ({})),
  getVariableValue: jest.fn(),
}
