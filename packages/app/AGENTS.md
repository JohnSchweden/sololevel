# App Package - Business Logic

## Structure
- `features/` - Feature screens and logic
- `stores/` - Zustand state management
- `hooks/` - Custom hooks
- `types/` - Shared types

### Testing Guidance
- Always use web testing (`@testing-library/react`) for screens that import only `tamagui` and no RN primitives.
- Always mock `@my/ui` primitives in `test-utils/setup.ts` to ensure proper rendering and prevent native/blur issues (GlassBackground, SettingsListItem, etc.).
- Always use `fireEvent.click()` for click interactions in web tests (use `fireEvent.press()` for native tests).
- Always cast `mockSetOptions.mock.calls[0][0] as any` when reading `navigation.setOptions` calls from mocks to satisfy strict TS.

## Expo Router Notes
- Always use default exports for route components in `apps/*/app/**`
- Always see `packages/app/AGENTS.md` for navigation patterns

## Authentication

### File Organization
- Always place auth hooks in `hooks/auth/`
- Always place auth store in `stores/auth.ts`
- Always use route protection pattern for protected screens

**Patterns:** See `.cursor/rules/features/authentication.mdc`
- Auth store interface (lines 15-26)
- useAuth and useLogin hooks (lines 54-75)
- Route protection for screens (lines 36-46)

## State Management

### When to Use What
- **Zustand**: UI state, transient data (recording status, playback state, local cache)
- **TanStack Query**: Server data, caching (video uploads, analysis history, user data)
- **Supabase Realtime**: Live updates (analysis progress, notifications)
- **useState**: Local component state

**Patterns:** See `.cursor/rules/features/data-state-management.mdc`
- TanStack Query setup
- Error boundaries and optimistic updates
- Zod validation with forms

### Rules
- Always keep feature logic in `features/` directories
- Always share reusable hooks across features
- Always use Zustand for client-side state that doesn't need server sync
- Always use TanStack Query for all server data
- Always subscribe to realtime updates only when needed and cleanup on unmount

### Best Practices
- **Store init that affects first paint**: if you must write to a store during mount and that value gates initial render, use `useLayoutEffect` (not `useEffect`) so the first frame doesn’t render “missing” UI.
- **No timeouts on user-driven UI flows**: don’t auto-reject promises for pickers/trimmers/auth screens; let users finish or cancel via the native UI.
- **React Native runtime ≠ browser**: don’t use browser-only APIs like `atob()` / `btoa()`; use a React Native-compatible base64 implementation.
- **Imperative-read hooks**: if a hook is documented as “no subscriptions / reads via `getState()`”, don’t “fix” it by adding `useStore(selector)` inside (you’ll reintroduce rerenders); consumers should subscribe directly.
- **FlatList header stability**: Always keep `ListHeaderComponent` reference stable; use refs + `extraData` to trigger updates instead of changing deps in a `useCallback` passed as header.
- **Thumbnail persistence**: Always persist cloud thumbnails to stable on-disk cache when they exist, regardless of metadata presence. `metadata.thumbnailUri` is often a temp path (e.g. `Library/Caches/`) and may disappear on restart; point the UI/cache at the persisted path.

## TypeScript

### This Package
- Always place shared interfaces in `types/`
- Always use discriminated unions for results
- Always use Zod schemas for navigation params and forms

**Standards:** See `.cursor/rules/core/typescript-standards.mdc`
- Import conventions (lines 52-62)
- Shared types location (line 18)
- Zod integration (lines 31-35)

## Performance
- Always use `staleTime` for stable data in TanStack Query and implement optimistic updates
- Always use `useMemo` for expensive computations and `React.memo` only for expensive components
- Focus on user-facing performance issues first; optimize based on measured bottlenecks rather than assumptions

**See:** `.cursor/rules/quality/performance.mdc`

