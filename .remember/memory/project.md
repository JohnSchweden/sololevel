# Project Preferences

## Architecture Patterns

### React Native New Architecture
- **Status**: ✅ Enabled (Expo SDK 53)
- **Config**: `"newArchEnabled": true` in `apps/expo/app.json`
- **Benefits**: Fabric renderer + TurboModules for improved performance
- **Impact**: Future-proofing for React Native 0.80+, better bridge performance

### Navigation Pattern (Battle-Tested)
**Screen/Route Separation:**
- **Screens** (`packages/app/features/`): Accept callback props for navigation
  - Props: `onBack?: () => void`, `onNavigate?: (route: string) => void`
  - NO direct router/navigation imports (framework-agnostic, testable)
  - Example: AccountScreen, SettingsScreen, CameraRecordingScreen
- **Routes** (`apps/{expo,web}/app/`): Implement callbacks with platform router
  - Provide callback implementations: `onBack={() => router.back()}`
  - Wrap with `<AuthGate>` for protected routes
  - Handle platform-specific: Linking (native) vs window.open (web)
- **Benefits**: Framework-agnostic screens, easier testing (mock callbacks not hooks), reusable in different navigation contexts

## Testing
- All icons used in components must be mocked in tests
- Navigation: Mock callback props in screen tests (not router/navigation hooks)
- Tests should focus on component behavior, not implementation details
- Use `testID` prop (capital ID) for Tamagui components - they handle conversion internally
- Don't assert inline styles for Tamagui components - they apply at runtime via token system
- Test component presence and behavior, not Tamagui's internal style/ARIA handling

## TDD Implementation Pattern
- Follow strict Red-Green-Refactor cycle
- Write failing tests first (RED)
- Implement minimal code to pass (GREEN)
- Refactor while keeping tests green (REFACTOR)
- Use TODO tracking to manage progress through complex implementations
- Run quality gates after each phase: tests, type-check, lint
- Target: All tests pass, zero TS errors, zero lint errors before moving to next phase

## Component Structure (Insights Pattern)
- Create component directory with subdirectories per component
- Each component has: `Component.tsx`, `Component.test.tsx`, `index.ts`
- Parent directory has `index.ts` that exports all components
- Test files use AAA pattern (Arrange-Act-Assert) with comments
- All components accept `testID` prop with sensible defaults
- Forward additional props using spread operator: `{...props}`

