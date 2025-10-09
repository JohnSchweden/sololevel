# UI Package - Tamagui Components

## Purpose
Cross-platform UI components built with Tamagui for web and native platforms.

## Core Principles
- **Mobile-first design**: Start at 320px minimum width, enhance for larger screens
- **Token-based styling**: NEVER hardcode colors, spacing, or typography values
- **Touch targets**: Minimum 44px × 44px for all interactive elements
- **Platform-aware**: Handle web vs native differences properly
- **App-agnostic**: No business logic, keep components reusable
- **Named exports only**: No default exports

## Component Structure
```tsx
import { styled, YStack } from '@tamagui/core'

export const MyComponent = styled(YStack, {
  backgroundColor: '$background',
  padding: '$md',
})
```

## Token System
Always use tokens for consistency across platforms:

**Color Tokens:**
- `$background`, `$backgroundHover`, `$backgroundPress`
- `$primary`, `$primaryHover`
- `$text`, `$textSecondary`
- `$error`, `$success`
- `$borderColor`

**Spacing Tokens:**
- `$xs`, `$sm`, `$md`, `$lg`, `$xl`, `$xxl`

**Typography Tokens:**
- `$3`, `$4`, `$5`, `$6`, `$8`, `$10` (font sizes)

**Radius Tokens:**
- `$sm`, `$md`, `$lg`, `$xl`

**Shadow Tokens:**
- `$shadow.small`, `$shadow.medium`, `$shadow.large` (native only)

**Color System:**
- Use HSL color scales for better manipulation
- Support light/dark mode via Tamagui themes
- Test color contrast for accessibility

## Platform-Specific Guidelines

**Critical Shadow Rules:**
- NEVER use React Native shadow props on web
- NEVER pass `boxShadow` as DOM prop (causes React warnings)
- Use Tamagui's elevation system or platform-specific styling

**Platform Detection:**
- Use `$web={{}}` and `$native={{}}` for platform-specific styles
- Use `.web.tsx` and `.native.tsx` only when implementations fundamentally differ
- Prefer single-file components with platform detection when possible

**See:** `.cursor/rules/ui/platform-differences.mdc` for detailed patterns

## Responsive Design

**Mobile-First Approach:**
- Design for smallest screen first (320px minimum)
- Use breakpoints: `$xs`, `$sm`, `$md`, `$lg`, `$xl`
- Progressive enhancement for larger screens

**Breakpoint Usage:**
- Base styles apply to all screens
- Add breakpoint modifiers for larger screens
- Use `useMedia()` hook for conditional rendering

**See:** `.cursor/rules/ui/responsive.mdc` for detailed patterns

## Mobile UX Essentials

**Touch Interactions:**
- Touch targets: Minimum 44px × 44px (`minHeight={44}`, `minWidth={44}`)
- Touch feedback: Use `pressStyle={{ scale: 0.98 }}`, `hoverStyle={{ opacity: 0.8 }}`
- Visual feedback for all interactive elements

**Mobile Optimization:**
- Safe area handling: Use `useSafeAreaInsets()` for notches/edges
- Keyboard avoidance: Use `KeyboardAvoidingView` for forms
- Gesture support: Integrate react-native-gesture-handler when needed

**See:** `.cursor/rules/ui/mobile-ux.mdc` for detailed patterns

## Best Practices

- ✓ Always use tokens, never hardcode values
- ✓ Mobile-first responsive design (320px base)
- ✓ Platform-aware shadow implementation
- ✓ Touch-friendly targets (44px minimum)
- ✓ Named exports only (no default exports)
- ✓ Components must be app-agnostic
- ✓ Extract prop types with `GetProps<typeof Component>`
- ✓ Support light/dark mode via theme tokens

## Testing
- **Runner**: Jest with `jest-expo` preset, jsdom environment
- **Queries**: `getByRole()`, `getByTestId()`, `getByLabelText()` all work
- **Events**: `fireEvent.press()` for buttons (cross-platform compatible)
- **Components**: All interactive elements need `accessibilityLabel` prop

## References

For detailed patterns and code examples:
- **Cross-platform overview**: `.cursor/rules/ui/cross-platform-styling.mdc`
- **Theming system**: `.cursor/rules/ui/theming.mdc`
- **Responsive patterns**: `.cursor/rules/ui/responsive.mdc`
- **Mobile UX patterns**: `.cursor/rules/ui/mobile-ux.mdc`
- **Platform differences**: `.cursor/rules/ui/platform-differences.mdc`
