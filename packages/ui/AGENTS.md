# UI Package - Tamagui Components

## Purpose
Cross-platform UI components built with Tamagui for web and native platforms.

## Core Principles
- **Mobile-first design**: Always start at 320px minimum width, then enhance for larger screens
- **Token-based styling**: Always use design tokens for colors, spacing, and typography; never hardcode values
- **Touch targets**: Always ensure minimum 44px × 44px for all interactive elements
- **Platform-aware**: Always handle web vs native differences properly
- **App-agnostic**: Always keep components reusable with no business logic
- **Named exports only**: Always use named exports (default exports only for Expo Router route files)
- **Pure Tamagui preferred**: Always prefer pure Tamagui components; use React Native primitives (Pressable, StyleSheet, View) only when platform-specific files are needed

### Implementation Checklist

**Before Writing Component:**
- [ ] Can this be pure Tamagui? (preferred)
- [ ] Does it need platform-specific files (.web/.native)?
- [ ] What Tamagui components handle my use case?
- [ ] Use React Native primitives only when absolutely necessary

## Component Structure

**Basic Component:**
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
- Always use Tamagui's elevation system or platform-specific styling for shadows
- Always use `$web={{}}` and `$native={{}}` for shadow differences; never use React Native shadow props on web
- Always use Tamagui's shadow tokens; never pass `boxShadow` as a DOM prop (causes React warnings)

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
- ✓ Always use mobile-first responsive design (320px base)
- ✓ Always implement platform-aware shadows using Tamagui's system
- ✓ Always ensure touch-friendly targets (44px minimum)
- ✓ Always use named exports (default exports only for Expo Router route files)
- ✓ Always keep components app-agnostic with no business logic
- ✓ Always extract prop types with `GetProps<typeof Component>`
- ✓ Always support light/dark mode via theme tokens

## Testing

### Overview
- **Runner**: Jest with `jest-expo` preset, jsdom environment
- **Queries**: `getByRole()`, `getByTestId()`, `getByLabelText()` all work
- **Events**: Web → `fireEvent.click()`; Native → `fireEvent.press()`
- **Components**: All interactive elements need `accessibilityLabel` prop

### Decision Tree for UI Component Testing

**Component imports React Native primitives?**
```
├─ YES → Use @testing-library/react-native + renderWithProviderNative
└─ NO  → Use @testing-library/react + renderWithProvider
```

**Component file extension?**
```
├─ .native.tsx → Always use React Native testing
├─ .web.tsx    → Always use web testing  
└─ .tsx        → Check imports (see above)
```

### Implementation Checklist

**Before Writing Tests:**
- [ ] Read component imports first
- [ ] Match test environment to component environment
- [ ] Verify test provider matches component type
- [ ] Pure Tamagui components = web testing (@testing-library/react)
- [ ] Components with React Native imports = native testing (@testing-library/react-native)

**Key Rule:** If your component only imports from `tamagui` and has no React Native imports, use web testing tools. The `jsdom environment` in Jest means Tamagui components render to DOM, not React Native.

## Performance
- Use `React.memo` for expensive components only (avoid premature optimization)
- Use `expo-image` with explicit `width`/`height` props
- Use `FlatList` for long lists with `keyExtractor` and `getItemLayout`

**See:** `.cursor/rules/quality/performance.mdc` for details

## References

For detailed patterns and code examples:
- **Cross-platform overview**: `.cursor/rules/ui/cross-platform-styling.mdc`
- **Theming system**: `.cursor/rules/ui/theming.mdc`
- **Responsive patterns**: `.cursor/rules/ui/responsive.mdc`
- **Mobile UX patterns**: `.cursor/rules/ui/mobile-ux.mdc`
- **Platform differences**: `.cursor/rules/ui/platform-differences.mdc`
