# Project Preferences

## Architecture Patterns

### React Native New Architecture
- **Status**: ✅ Enabled (Expo SDK 53)
- **Config**: `"newArchEnabled": true` in `apps/expo/app.json`
- **Benefits**: Fabric renderer + TurboModules for improved performance
- **Impact**: Future-proofing for React Native 0.80+, better bridge performance

### Navigation Pattern
**Summary:** Screens accept callbacks as props, routes handle all navigation. Keeps screens framework-agnostic, testable.
**Screens** (`packages/app/features/`): Accept callbacks only (`onBack`, `onNavigate`, `onHeaderStateChange`, `onBackPress`) — no navigation hooks
**Routes** (`apps/{expo,web}/app/`): Handle all navigation, use only Expo Router APIs (`useRouter()`, `useNavigation()`, `useLocalSearchParams()`), wrap with `<AuthGate>` for protected routes

## Testing Guidelines
- Mock all icons in tests
- Screen tests: mock callback props (not router/navigation hooks)
- Test behavior, not implementation details
- Tamagui: Use `testID` (capital ID), don't assert inline styles, test presence/user-observable behavior

## TDD Workflow
**Red-Green-Refactor:** Write failing test → implement minimum → refactor while green. Run quality checks after each phase. Track TODOs.

## Component Structure (Insights Pattern)
Directory per component: `Component.tsx`, `Component.test.tsx`, `index.ts` (parent consolidates exports). Tests use AAA with comments. Components accept `testID` with defaults, forward props with `{...props}`

## Debug Logging
Remove troubleshooting logs once resolved. Keep only errors/warnings. Clean before commit. Use structured logging for long-term, remove temporary diagnostics.

## Performance Rules

### React Optimization
- Use React.memo for expensive components ONLY
- Prefer useMemo for expensive computations
- AVOID premature optimization in MVP phase

### TanStack Query Optimization
- Use staleTime for stable data
- Enable background refetch for user data
- Implement optimistic updates for mutations

### Images and Assets
- Use optimized Image components with proper sizing
- Lazy load images below fold
- Use optimized formats (WebP/AVIF for web)

### List Performance
- Use FlatList for long lists on native
- Implement proper keyExtractor
- Use getItemLayout when possible

### Bundle Size (MVP Focus)
- Use dynamic imports for non-critical features
- Tree-shake unused Tamagui components
- AVOID heavy libraries during MVP phase