# Team Guidelines for UI Testing

## Testing Philosophy

### Quality Over Quantity
- **Focus on behavior, not implementation**: Test what users experience, not internal code
- **Avoid testing implementation details**: Don't test private methods or internal state
- **Test the contract, not the code**: Ensure components fulfill their API promises

### Co-location Strategy
- **Tests live next to source code**: Easier to find, maintain, and understand
- **Unit/Component tests**: Co-located with their source files
- **Integration tests**: In dedicated `integration/` folders within features
- **Setup/Configuration tests**: Remain in `__tests__/` folders when appropriate

### Test Categories

#### 1. Unit Tests
- **Purpose**: Test individual functions and hooks in isolation
- **Coverage**: Core business logic, utilities, custom hooks
- **Location**: Co-located with source files (e.g., `useCounter.test.ts` next to `useCounter.ts`)
- **Examples**:
  ```typescript
  describe('useCounter', () => {
    it('starts at 0', () => {
      const { result } = renderHook(() => useCounter())
      expect(result.current.count).toBe(0)
    })
  })
  ```

#### 2. Component Tests
- **Purpose**: Test component rendering and user interactions
- **Coverage**: UI behavior, props handling, event responses
- **Location**: Co-located with components (e.g., `Button.test.tsx` in `Button/` folder)
- **Examples**:
  ```typescript
  describe('Button', () => {
    it('calls onPress when clicked', () => {
      const onPress = jest.fn()
      renderWithProvider(<Button onPress={onPress}>Click me</Button>)

      fireEvent.click(screen.getByRole('button'))
      expect(onPress).toHaveBeenCalled()
    })
  })
  ```

#### 3. Integration Tests
- **Purpose**: Test component interactions and data flow
- **Coverage**: Component composition, prop drilling, context usage
- **Location**: In `integration/` folders within feature directories
- **Examples**:
  ```typescript
  describe('UserProfile', () => {
    it('displays user data from context', () => {
      const user = { name: 'John', email: 'john@example.com' }
      renderWithProvider(
        <UserProvider value={user}>
          <UserProfile />
        </UserProvider>
      )

      expect(screen.getByText('John')).toBeInTheDocument()
      expect(screen.getByText('john@example.com')).toBeInTheDocument()
    })
  })
  ```

## Code Standards

### File Organization
```
src/
├── components/
│   ├── ComponentName/
│   │   ├── ComponentName.tsx
│   │   ├── index.ts
│   │   └── __tests__/
│   │       ├── ComponentName.test.tsx
│   │       └── ComponentName.integration.test.tsx
├── hooks/
│   ├── useHookName.ts
│   └── __tests__/
│       └── useHookName.test.tsx
└── test-utils/
    ├── mocks.ts
    ├── TestProvider.tsx
    └── setup.ts
```

### Naming Conventions

#### Test Files
- **Unit tests**: `ComponentName.test.tsx`
- **Integration tests**: `ComponentName.integration.test.tsx`
- **Hook tests**: `useHookName.test.tsx`

#### Test Descriptions
```typescript
describe('ComponentName', () => {
  describe('when user interacts', () => {
    it('should display success message', () => {
      // Test implementation
    })
  })

  describe('when error occurs', () => {
    it('should display error message', () => {
      // Test implementation
    })
  })
})
```

### Test Structure

#### AAA Pattern (Arrange, Act, Assert)
```typescript
it('should handle user input', () => {
  // Arrange: Set up test data and render component
  const onSubmit = jest.fn()
  renderWithProvider(<Form onSubmit={onSubmit} />)

  // Act: Perform user interaction
  fireEvent.change(screen.getByLabelText('Name'), {
    target: { value: 'John Doe' }
  })
  fireEvent.click(screen.getByRole('button', { name: /submit/i }))

  // Assert: Verify expected behavior
  expect(onSubmit).toHaveBeenCalledWith({ name: 'John Doe' })
})
```

## Mocking Guidelines

### When to Mock
- **External APIs**: Always mock network requests
- **Third-party libraries**: Mock complex libraries to control behavior
- **Heavy computations**: Mock expensive operations
- **File system**: Mock file operations
- **Date/Time**: Mock for consistent test results

### When NOT to Mock
- **Your own code**: Don't mock components you're testing
- **Simple utilities**: Test pure functions directly
- **UI libraries**: Use shared mock utilities instead of custom mocks

### Mock Best Practices
```typescript
// ✅ Good: Descriptive mock names
const mockOnSubmit = jest.fn()
const mockUser = { id: 1, name: 'John' }

// ✅ Good: Mock implementation that matches real behavior
jest.mock('../api/userService', () => ({
  fetchUser: jest.fn(() => Promise.resolve(mockUser)),
  updateUser: jest.fn(() => Promise.resolve(mockUser))
}))

// ❌ Avoid: Overly complex mocks
const complexMock = jest.fn().mockImplementationOnce(() => {
  // 20+ lines of mock logic
})
```

## Accessibility Testing

### ARIA Attributes
```typescript
it('should have proper accessibility attributes', () => {
  renderWithProvider(<Button>Click me</Button>)

  const button = screen.getByRole('button')
  expect(button).toHaveAttribute('aria-label', 'Click me')
  expect(button).toHaveAttribute('aria-describedby', 'button-help')
})
```

### Keyboard Navigation
```typescript
it('should support keyboard navigation', () => {
  renderWithProvider(<Modal />)

  // Tab to focusable elements
  fireEvent.keyDown(document, { key: 'Tab' })
  expect(screen.getByRole('button', { name: /close/i })).toHaveFocus()

  // Test keyboard interactions
  fireEvent.keyDown(document, { key: 'Enter' })
  expect(mockOnClose).toHaveBeenCalled()
})
```

### Screen Reader Support
```typescript
it('should announce dynamic content', () => {
  renderWithProvider(<Notification />)

  // Simulate content change
  act(() => {
    // Trigger state change that should be announced
  })

  // Verify aria-live region updates
  expect(screen.getByRole('status')).toHaveTextContent('New message received')
})
```

## Performance Testing

### Component Rendering
```typescript
it('should render without performance issues', () => {
  const { container } = renderWithProvider(<HeavyComponent />)

  // Check render count
  expect(container.querySelectorAll('*')).toHaveLength(expectedElementCount)
})
```

### Hook Performance
```typescript
it('should not cause unnecessary re-renders', () => {
  const renderCount = jest.fn()
  const TestComponent = () => {
    const value = useExpensiveHook()
    renderCount()
    return <div>{value}</div>
  }

  const { rerender } = renderWithProvider(<TestComponent />)

  // Initial render
  expect(renderCount).toHaveBeenCalledTimes(1)

  // Re-render with same props
  rerender(<TestComponent />)
  expect(renderCount).toHaveBeenCalledTimes(1) // Should not re-render
})
```

## Error Testing

### Error Boundaries
```typescript
it('should handle errors gracefully', () => {
  const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

  renderWithProvider(
    <ErrorBoundary>
      <ComponentThatThrows />
    </ErrorBoundary>
  )

  expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  expect(consoleSpy).toHaveBeenCalled()

  consoleSpy.mockRestore()
})
```

### Async Error Handling
```typescript
it('should handle async errors', async () => {
  // Mock API to throw error
  mockApiCall.mockRejectedValueOnce(new Error('Network error'))

  renderWithProvider(<AsyncComponent />)

  await waitFor(() => {
    expect(screen.getByText('Failed to load data')).toBeInTheDocument()
  })
})
```

## Data Testing

### Form Validation
```typescript
describe('ContactForm', () => {
  it('should validate required fields', async () => {
    renderWithProvider(<ContactForm onSubmit={jest.fn()} />)

    const submitButton = screen.getByRole('button', { name: /submit/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Name is required')).toBeInTheDocument()
      expect(screen.getByText('Email is required')).toBeInTheDocument()
    })
  })

  it('should validate email format', async () => {
    renderWithProvider(<ContactForm onSubmit={jest.fn()} />)

    const emailInput = screen.getByLabelText('Email')
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } })

    const submitButton = screen.getByRole('button', { name: /submit/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Invalid email format')).toBeInTheDocument()
    })
  })
})
```

## CI/CD Integration

### Pre-commit Hooks
```bash
# Run tests before committing
npm run test
npm run test:coverage
```

### Coverage Requirements
- **Statements**: > 80%
- **Branches**: > 75%
- **Functions**: > 85%
- **Lines**: > 80%

### Test Environments
```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/test-utils/setup.ts'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/test-utils/**',
    '!src/**/*.stories.tsx'
  ],
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 75,
      functions: 85,
      lines: 80
    }
  }
}
```

## Debugging Tests

### Common Issues

#### Test Timeout
```typescript
it('should handle slow operation', async () => {
  // Increase timeout for slow operations
}, 10000) // 10 seconds

// Or use waitFor with custom timeout
await waitFor(() => {
  expect(someAsyncOperation).toHaveResolved()
}, { timeout: 5000 })
```

#### Async Operations
```typescript
it('should handle async updates', async () => {
  renderWithProvider(<AsyncComponent />)

  // Wait for async operation to complete
  await waitFor(() => {
    expect(screen.getByText('Loaded')).toBeInTheDocument()
  })

  // Or use act for synchronous updates
  act(() => {
    fireEvent.click(button)
  })
})
```

#### State Updates
```typescript
it('should update state correctly', () => {
  const { result } = renderHook(() => useCounter())

  act(() => {
    result.current.increment()
  })

  expect(result.current.count).toBe(1)
})
```

## Documentation Standards

### Test Documentation
```typescript
/**
 * Button Component Tests
 *
 * Test coverage:
 * - ✅ Rendering with different variants
 * - ✅ Click event handling
 * - ✅ Loading states
 * - ✅ Accessibility attributes
 * - ✅ Keyboard navigation
 */
describe('Button', () => {
  // Tests...
})
```

### Component Documentation
```typescript
/**
 * Button component for user interactions
 *
 * @example
 * ```tsx
 * <Button onPress={handleClick} variant="primary">
 *   Click me
 * </Button>
 * ```
 *
 * @param onPress - Function called when button is pressed
 * @param variant - Visual style variant
 * @param loading - Shows loading spinner when true
 * @param disabled - Disables button when true
 */
export function Button({ onPress, variant, loading, disabled, children }) {
  // Implementation...
}
```

## Code Review Checklist

### For Test Files
- [ ] Tests use shared utilities (`../test-utils`)
- [ ] Tests follow AAA pattern (Arrange, Act, Assert)
- [ ] Tests use semantic queries over test IDs
- [ ] Tests include accessibility checks
- [ ] Tests mock external dependencies appropriately
- [ ] Tests have descriptive names and comments
- [ ] Tests cover error cases and edge cases

### For Component Files
- [ ] Components have comprehensive test coverage
- [ ] Components include accessibility attributes
- [ ] Components handle error states gracefully
- [ ] Components have proper TypeScript types
- [ ] Components follow established patterns

## Continuous Learning

### Stay Updated
- Follow React Testing Library releases
- Keep Jest and testing dependencies updated
- Review accessibility guidelines regularly
- Learn from testing best practices in the community

### Resources
- [React Testing Library Documentation](https://testing-library.com/docs/react-testing-library/intro/)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Accessibility Testing Guidelines](https://www.w3.org/WAI/test-evaluate/)
- [Testing Library Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

## Support and Questions

### Getting Help
1. **Check documentation first**: `TEST_INFRASTRUCTURE.md` and this guidelines document
2. **Review existing tests**: Look at similar components for patterns
3. **Use shared utilities**: Leverage the test infrastructure
4. **Ask the team**: Post in #testing channel with specific questions

### When to Ask for Help
- **New testing patterns**: When implementing something not covered in docs
- **Complex mocking scenarios**: When standard mocks don't work
- **Performance issues**: When tests are slow or flaky
- **Accessibility questions**: When unsure about a11y implementation

Remember: Good tests are documentation that never goes out of date. Write tests that explain how your code works, not just that it works.
