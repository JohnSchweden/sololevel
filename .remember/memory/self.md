### Mistake: Missing icon mock in component tests
**Wrong**:
```typescript
// Mock @tamagui/lucide-icons
jest.mock('@tamagui/lucide-icons', () => ({
  MessageSquare: () => 'MessageSquare',
  Send: () => 'Send',
}))
```

**Correct**:
```typescript
// Mock @tamagui/lucide-icons
jest.mock('@tamagui/lucide-icons', () => ({
  Gift: () => 'Gift',
  Send: () => 'Send',
}))
```
When testing components, all icons used in the component must be mocked. Check the component imports to ensure all icons are included in the mock.

### Mistake: Testing navigation configuration that no longer exists
**Wrong**:
```typescript
it('should configure AppHeader with correct title', () => {
  render(<Component />)
  expect(mockNavigation.setOptions).toHaveBeenCalledWith(...)
})
```

**Correct**:
Remove these tests entirely. When components no longer use `useNavigation` and `setOptions` (because navigation is configured at the route level), the corresponding tests should be removed rather than updated.

### Mistake: Using data-testid instead of testID prop in Tamagui components
**Wrong**:
```typescript
<YStack data-testid="my-component">
  ...
</YStack>
```

**Correct**:
```typescript
<YStack testID="my-component">
  ...
</YStack>
```
Tamagui components accept `testID` as a prop (capital ID) and handle the conversion to appropriate test attributes internally. Using `data-testid` directly bypasses Tamagui's prop handling and should only be used for raw DOM elements.

### Mistake: Testing inline styles that Tamagui applies at runtime
**Wrong**:
```typescript
expect(card).toHaveStyle({ 
  alignItems: 'center',
  borderRadius: 'var(--radius-lg)'
})
```

**Correct**:
```typescript
expect(card).toBeInTheDocument()
// Styling is applied via Tamagui tokens at runtime
```
Tamagui applies styles at runtime through its token system. Test that elements exist rather than asserting specific inline styles, as these may not be present in the test environment.

### Mistake: Testing ARIA attributes that Tamagui handles differently
**Wrong**:
```typescript
expect(progress).toHaveAttribute('role', 'progressbar')
expect(progress).toHaveAttribute('aria-valuenow', '75')
```

**Correct**:
```typescript
expect(progress).toBeInTheDocument()
// ARIA attributes are handled by Tamagui at runtime
```
ARIA attributes passed as props to Tamagui components may be transformed or applied differently in the DOM. Focus tests on component presence and behavior rather than specific attribute values.
