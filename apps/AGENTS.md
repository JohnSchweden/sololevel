# Applications

## Structure
- `expo/` - React Native mobile app (iOS/Android)
- `web/` - Expo Router web app (Metro bundler)

## Rules
- Consume shared packages via `@my/*` imports
- Don't duplicate business logic (use `@my/app`)
- Don't create custom UI components (use `@my/ui`)
- Keep app-specific code in respective app directories
- Both apps use Metro bundler → use `EXPO_PUBLIC_*` environment variables

## Navigation
- Route files implement navigation callbacks for screens
- See `packages/app/AGENTS.md` and `.cursor/rules/features/navigation-expo-router.mdc`

## Performance
- Use dynamic imports for non-critical features
- Tree-shake unused Tamagui components
- Both apps use Metro bundler → monitor bundle size

**See:** `.cursor/rules/quality/performance.mdc`

