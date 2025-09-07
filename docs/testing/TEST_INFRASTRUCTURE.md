# UI Package Test Infrastructure

## Overview

This document describes the optimized test infrastructure for the UI package, designed for testing Tamagui components with React Testing Library and Jest.

## Architecture

### Shared Utilities (`src/test-utils/`)

The test infrastructure is built around centralized utilities that provide:

- **Consistent mocking** of Tamagui components and external dependencies
- **Shared test providers** for consistent theming
- **Common test patterns** and utilities
- **Type safety** with proper TypeScript interfaces

### File Structure

```
src/test-utils/
├── index.ts          # Main exports
├── mocks.ts          # Centralized mock utilities
├── TestProvider.tsx  # Shared test provider component
└── setup.ts          # Global test setup and mocks
```

## Quick Start

### Basic Test Setup

```typescript
// Import shared test utilities (includes all mocks and setup)
import '../test-utils/setup'
import { renderWithProvider, screen } from '../test-utils'
import { MyComponent } from '../MyComponent'

describe('MyComponent', () => {
  it('renders correctly', () => {
    renderWithProvider(<MyComponent />)
    expect(screen.getByTestId('MyComponent')).toBeInTheDocument()
  })
})
```

That's it! The shared setup handles:
- ✅ Tamagui component mocking
- ✅ Icon library mocking
- ✅ React Native/Expo module mocking
- ✅ Test provider with proper theming
- ✅ Jest DOM matchers
- ✅ Global test cleanup

## Mocking System

### Tamagui Components

All Tamagui components are automatically mocked with proper prop filtering:

```typescript
// These props are automatically filtered out:
const filteredProps = [
  'backgroundColor', 'borderRadius', 'padding', 'margin',
  'flexDirection', 'alignItems', 'justifyContent',
  'shadowColor', 'elevation', 'animation', 'enterStyle', 'exitStyle',
  // ... and many more
]

// Components render as appropriate HTML elements
<Button /> // → <button>
<Text />   // → <div> with text styling
<Stack />  // → <div> with flexbox styling
```

### Icons

Lucide icons are mocked as proper SVG elements:

```typescript
import { Menu, Bell, Camera } from '@tamagui/lucide-icons'

// All icons render as <svg> elements with proper test IDs
<Menu size={24} color="blue" /> // → <svg data-testid="Menu-icon" ...>
```

### External Dependencies

Common external dependencies are pre-mocked:

```typescript
// React Native
jest.mock('react-native', () => ({ /* web-compatible mocks */ }))

// Expo modules
jest.mock('expo-camera', () => ({ /* camera mocks */ }))
jest.mock('expo-router', () => ({ /* router mocks */ }))

// Other libraries
jest.mock('expo-modules-core', () => ({ /* module mocks */ }))
```

## Test Patterns

### Component Testing

```typescript
import '../test-utils/setup'
import { renderWithProvider, screen, fireEvent } from '../test-utils'
import { MyButton } from '../MyButton'

describe('MyButton', () => {
  it('handles click events', () => {
    const onClick = jest.fn()
    renderWithProvider(<MyButton onPress={onClick}>Click me</MyButton>)

    const button = screen.getByRole('button')
    fireEvent.click(button)

    expect(onClick).toHaveBeenCalled()
  })

  it('shows loading state', () => {
    renderWithProvider(<MyButton loading>Submit</MyButton>)

    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })
})
```

### Hook Testing

```typescript
import '../test-utils/setup'
import { renderHook, act } from '../test-utils'
import { useCounter } from '../hooks/useCounter'

describe('useCounter', () => {
  it('increments counter', () => {
    const { result } = renderHook(() => useCounter())

    act(() => {
      result.current.increment()
    })

    expect(result.current.count).toBe(1)
  })
})
```

### Form Testing

```typescript
import '../test-utils/setup'
import { renderWithProvider, screen, fireEvent } from '../test-utils'
import { LoginForm } from '../LoginForm'

describe('LoginForm', () => {
  it('validates email input', async () => {
    const onSubmit = jest.fn()
    renderWithProvider(<LoginForm onSubmit={onSubmit} />)

    const emailInput = screen.getByLabelText('Email')
    const submitButton = screen.getByRole('button', { name: /submit/i })

    fireEvent.change(emailInput, { target: { value: 'invalid-email' } })
    fireEvent.click(submitButton)

    expect(await screen.findByText('Invalid email')).toBeInTheDocument()
  })
})
```

## Advanced Features

### Custom Mocks

For components that need special mocking:

```typescript
import { createMockComponent } from '../test-utils/mocks'

// Create a custom mock for a specific component
const CustomMock = createMockComponent('CustomComponent')

// Use in your test
jest.mock('../CustomComponent', () => CustomMock)
```

### Suppressing Console Warnings

For tests that intentionally trigger warnings:

```typescript
import { suppressConsoleWarnings } from '../test-utils'

describe('Component with warnings', () => {
  suppressConsoleWarnings()

  it('triggers console warning but still works', () => {
    // Test that would normally show console warnings
    renderWithProvider(<ComponentWithWarning />)
    // Assertions...
  })
})
```

### Icon Testing

```typescript
import '../test-utils/setup'
import { renderWithProvider, screen } from '../test-utils'
import { MenuButton } from '../MenuButton'

describe('MenuButton', () => {
  it('displays menu icon', () => {
    renderWithProvider(<MenuButton />)

    const icon = screen.getByTestId('Menu-icon')
    expect(icon).toBeInTheDocument()
    expect(icon).toHaveAttribute('width', '24')
  })
})
```

## Best Practices

### 1. Use Shared Utilities
Always import from `../test-utils` instead of individual testing libraries:

```typescript
// ✅ Good
import { renderWithProvider, screen, fireEvent } from '../test-utils'

// ❌ Avoid
import { render } from '@testing-library/react'
import { screen } from '@testing-library/react'
```

### 2. Test User Interactions
Focus on testing what users actually do:

```typescript
// ✅ Good - tests user behavior
const button = screen.getByRole('button', { name: /save/i })
fireEvent.click(button)

// ❌ Avoid - tests implementation details
const button = screen.getByTestId('save-button')
fireEvent.click(button)
```

### 3. Use Semantic Queries
Prefer semantic queries over test IDs:

```typescript
// ✅ Good
screen.getByRole('button', { name: /submit/i })
screen.getByLabelText('Email address')
screen.getByPlaceholderText('Enter your name')

// ❌ Avoid
screen.getByTestId('submit-btn')
screen.getByTestId('email-input')
```

### 4. Test Accessibility
Ensure your components are accessible:

```typescript
// ✅ Good
expect(button).toHaveAttribute('aria-label', 'Close menu')
expect(input).toHaveAttribute('aria-describedby', 'email-help')

// Test keyboard navigation
fireEvent.keyDown(button, { key: 'Enter' })
```

### 5. Mock External Dependencies
Don't rely on real network calls or external services:

```typescript
// ✅ Good - mock API calls
jest.mock('../api/userService', () => ({
  fetchUser: jest.fn(() => Promise.resolve(mockUser))
}))

// ❌ Avoid - real network calls in tests
// Tests should be fast and reliable
```

## Troubleshooting

### Common Issues

**"Property 'toHaveAttribute' does not exist"**
- Solution: Import `@testing-library/jest-dom` (included in setup)

**"React is not defined"**
- Solution: Import shared setup before other imports

**Console warnings about Tamagui props**
- Solution: These are expected - the mock system filters them automatically

**"Cannot find module" errors**
- Solution: Ensure all external dependencies are mocked in `setup.ts`

### Performance Tips

1. **Use `beforeEach` for setup**: Keep tests isolated
2. **Mock heavy dependencies**: Avoid importing large libraries
3. **Use `act()` for state updates**: Ensure all updates are processed
4. **Clear mocks between tests**: Prevents test pollution

## Migration Guide

### From Old Test Files

**Old approach:**
```typescript
// Lots of manual mock setup...
jest.mock('tamagui', () => { /* 50+ lines of mock code */ })

import { render } from '@testing-library/react'
import { TamaguiProvider } from 'tamagui'
import config from '../../../config/tamagui.config'

function renderWithProvider(component) {
  return render(<TamaguiProvider config={config}>{component}</TamaguiProvider>)
}
```

**New approach:**
```typescript
// Just 3 lines!
import '../test-utils/setup'
import { renderWithProvider } from '../test-utils'
import { MyComponent } from '../MyComponent'
```

### Benefits of Migration

- **90% less code** in test files
- **Consistent mocking** across all tests
- **Better maintainability** with centralized utilities
- **Type safety** improvements
- **Faster test runs** with optimized mocks

## Contributing

When adding new test utilities:

1. Add to `src/test-utils/mocks.ts` for mock functions
2. Add to `src/test-utils/TestProvider.tsx` for provider components
3. Update `src/test-utils/index.ts` to export new utilities
4. Update this documentation

## Examples

See the existing test files for examples:
- `src/__tests__/MyComponent.test.tsx` - Basic component testing
- `src/components/CameraRecording/__tests__/interactive-elements.test.tsx` - Complex component testing
- `src/components/CameraRecording/__tests__/mobile-viewport.test.tsx` - Mobile-specific testing

## Support

For questions about the test infrastructure:
1. Check this documentation first
2. Look at existing test examples
3. Check the shared utilities in `src/test-utils/`
4. Ask in the team chat with #testing-infrastructure tag
