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

