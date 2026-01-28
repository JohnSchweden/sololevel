# Applications

## Structure
- `expo/` - React Native mobile app (iOS/Android)
- `web/` - Expo Router web app (Metro bundler)

## Rules
- Always consume shared packages via `@my/*` imports
- Always use `@my/app` for business logic instead of duplicating it
- Always use `@my/ui` for UI components instead of creating custom ones
- Always keep app-specific code in respective app directories
- Always use `EXPO_PUBLIC_*` environment variables (both apps use Metro bundler)

## Navigation
- Route files implement navigation callbacks for screens
- See `packages/app/AGENTS.md` and `.cursor/rules/features/navigation-expo-router.mdc`

## Performance
- Use dynamic imports for non-critical features
- Tree-shake unused Tamagui components
- Both apps use Metro bundler → monitor bundle size

**See:** `.cursor/rules/quality/performance.mdc`

