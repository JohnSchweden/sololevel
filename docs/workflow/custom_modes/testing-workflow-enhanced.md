# Enhanced Testing Workflow - Lessons Learned

## SYSTEM_CONTEXT
This document codifies the patterns and solutions discovered during the major test infrastructure fixes in September 2025. These patterns should be applied automatically to prevent recurring issues.

**INTEGRATION**: This document supplements `quality/testing-unified.mdc` and should be consulted for every React Native component test.

## MANDATORY TESTING PATTERNS

### 1. React Native Component Query Strategy
**ALWAYS use accessibility-based queries for React Native components:**

```typescript
// ✅ CORRECT - Use accessibility labels
const button = screen.getByLabelText('Start recording')
const overlay = screen.getByLabelText('Processing overlay')

// ❌ WRONG - Avoid testID queries
const button = screen.getByTestId('record-button')
```

**REQUIRED**: All testable components must have `accessibilityLabel`:
```typescript
<Button accessibilityLabel="Start recording" onPress={onRecord}>
  Record
</Button>
```

### 2. React Native State Assertions
**ALWAYS check props directly for React Native components:**

```typescript
// ✅ CORRECT - Check props directly
expect(button.props.disabled).toBe(true)

// ❌ WRONG - DOM matchers don't work
expect(button).toBeDisabled()
```

### 3. React Native Mock Setup (Jest)
**MANDATORY Jest setup pattern for React Native:**

```javascript
// Selective React Native mocking - NEVER use jest.requireActual
jest.mock('react-native', () => ({
  Alert: { alert: jest.fn() },
  Platform: { OS: 'web', select: jest.fn((options) => options.web || options.default) },
  Dimensions: { get: jest.fn(() => ({ width: 375, height: 667 })) },
  StyleSheet: { create: jest.fn((styles) => styles) },
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  Pressable: (props) => {
    const React = require('react')
    const { testID, children, onPress, accessibilityLabel, disabled, ...otherProps } = props
    return React.createElement('div', {
      ...otherProps,
      'data-testid': testID || 'Pressable',
      'aria-label': accessibilityLabel,
      'aria-disabled': disabled ? 'true' : 'false',
      onClick: disabled ? undefined : onPress
    }, children)
  },
  // Add other components as needed
}))
```

### 4. Tamagui Component Mocking
**MANDATORY comprehensive Tamagui mocking:**

```javascript
jest.mock('tamagui', () => {
  const React = require('react')
  
  const mockComponent = (name) => React.forwardRef((props, ref) => {
    const { testID, children, accessibilityLabel, ...otherProps } = props
    return React.createElement('div', {
      ...otherProps,
      ref,
      'data-testid': testID || name,
      'aria-label': accessibilityLabel
    }, children)
  })

  const mockButtonComponent = React.forwardRef((props, ref) => {
    const { testID, onPress, accessibilityLabel, disabled, ...otherProps } = props
    return React.createElement('button', {
      ...otherProps,
      ref,
      'data-testid': testID || 'Button',
      'aria-label': accessibilityLabel,
      'aria-disabled': disabled ? 'true' : 'false',
      onClick: disabled ? undefined : onPress,
      disabled: disabled
    })
  })

  return {
    TamaguiProvider: ({ children }) => children,
    Stack: mockComponent('Stack'),
    XStack: mockComponent('XStack'),
    YStack: mockComponent('YStack'),
    Button: mockButtonComponent,
    Text: mockComponent('Text'),
    View: mockComponent('View'),
    Spinner: mockComponent('Spinner'),
    ScrollView: mockComponent('ScrollView'),
    Circle: mockComponent('Circle'),
    // Add all used Tamagui components
  }
})
```

### 5. Browser API Mocking
**MANDATORY for touch target and responsive tests:**

```javascript
// Mock window.getComputedStyle for CSS property tests
Object.defineProperty(window, 'getComputedStyle', {
  writable: true,
  value: jest.fn().mockImplementation((element) => ({
    minHeight: '44px',
    minWidth: '44px',
    getPropertyValue: jest.fn((prop) => {
      switch (prop) {
        case 'min-height': return '44px'
        case 'min-width': return '44px'
        default: return ''
      }
    })
  }))
})
```

## TEST WRITING CHECKLIST

Before writing any React Native component test:

- [ ] Component has `accessibilityLabel` for ALL interactive elements
- [ ] Using `getByLabelText()` instead of `getByTestId()` for React Native queries
- [ ] Using `fireEvent.press()` instead of `fireEvent.click()` for React Native
- [ ] Using `props.disabled` instead of `toBeDisabled()` for state assertions
- [ ] ALL used Tamagui components are mocked in jest.setup.js
- [ ] Expo modules are properly mocked with correct interfaces
- [ ] Browser APIs are mocked if testing CSS/styling properties
- [ ] Service mocks return proper data structures with expected properties
- [ ] Using `Button` component instead of `YStack` for clickable elements in tests

## ANTI-PATTERNS TO AVOID

### ❌ Never Do These:
1. **Don't use `jest.requireActual('react-native')`** - Causes TurboModule errors
2. **Don't use `getByTestId()` for React Native** - Use `getByLabelText()` instead
3. **Don't use DOM matchers on React Native components** - Use prop checks
4. **Don't forget to mock new Tamagui components** - Add to jest.setup.js
5. **Don't use `document.querySelector()`** - Use Testing Library queries
6. **Don't use `fireEvent.click()` for React Native** - Use `fireEvent.press()` instead
7. **Don't use `YStack` with `onPress` for clickable elements** - Use `Button` component
8. **Don't assume service mocks work without proper return values** - Mock complete data structures
9. **Don't forget `accessibilityLabel` on interactive elements** - Critical for test queries

### ✅ Always Do These:
1. **Add `accessibilityLabel` to ALL testable components**
2. **Use `getByLabelText()` for React Native component queries**
3. **Use `fireEvent.press()` for React Native interactions**
4. **Check `props.disabled` for React Native state assertions**
5. **Mock ALL UI library components comprehensively**
6. **Use `Button` for clickable elements that need reliable test interactions**
7. **Mock service methods with complete, realistic return values**
8. **Test user-visible behavior, not implementation details**
5. **Use Testing Library queries consistently**

## DEBUGGING FAILING TESTS

If tests fail with these errors:
- **"TurboModuleRegistry.getEnforcing(...): 'DevMenu' could not be found"** → Fix React Native mock
- **"Element type is invalid: expected a string... but got: undefined"** → Add missing component mock
- **"Unable to find an element with testID"** → Switch to `getByLabelText()`
- **"expect(element).toBeDisabled() - Received element is not disabled"** → Use `props.disabled`
- **"Unable to find an accessible element with role"** → Add `accessibilityRole` to component

## IMPLEMENTATION WORKFLOW

1. **Before writing tests**: Ensure all patterns above are in jest.setup.js
2. **When adding new components**: Add mocks to jest.setup.js immediately
3. **When tests fail**: Check against this checklist before debugging
4. **When reviewing tests**: Verify all patterns are followed

This document should be consulted for every React Native component test to prevent the issues we encountered during the September 2025 test infrastructure fixes.
