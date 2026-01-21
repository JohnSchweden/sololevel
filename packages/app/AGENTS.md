# App Package - Business Logic

## Structure
- `features/` - Feature screens and logic
- `stores/` - Zustand state management
- `hooks/` - Custom hooks
- `types/` - Shared types

### Testing Guidance
- Prefer web testing (`@testing-library/react`) for screens that import only `tamagui` and no RN primitives.
- Mock `@my/ui` primitives in `test-utils/setup.ts` to avoid native/blur issues (GlassBackground, SettingsListItem, etc.).
- When asserting click interactions in web tests, use `fireEvent.click()` (not `press`).
- When reading `navigation.setOptions` calls from mocks, cast `mockSetOptions.mock.calls[0][0] as any` where necessary to satisfy strict TS.

## Expo Router Notes
- Route components in `apps/*/app/**` are default exports
- See `packages/app/AGENTS.md` for navigation patterns

## Authentication

### File Organization
- Auth hooks: `hooks/auth/`
- Auth store: `stores/auth.ts`
- Protected screens: Use route protection pattern

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
- Keep feature logic in `features/` directories
- Share reusable hooks across features
- Use Zustand for client-side state that doesn't need server sync
- Use TanStack Query for all server data
- Subscribe to realtime updates only when needed (cleanup on unmount)

### Common pitfalls (avoid these)
- **Store init that affects first paint**: if you must write to a store during mount and that value gates initial render, use `useLayoutEffect` (not `useEffect`) so the first frame doesn’t render “missing” UI.
- **No timeouts on user-driven UI flows**: don’t auto-reject promises for pickers/trimmers/auth screens; let users finish or cancel via the native UI.
- **React Native runtime ≠ browser**: don’t use browser-only APIs like `atob()` / `btoa()`; use a React Native-compatible base64 implementation.
- **Imperative-read hooks**: if a hook is documented as “no subscriptions / reads via `getState()`”, don’t “fix” it by adding `useStore(selector)` inside (you’ll reintroduce rerenders); consumers should subscribe directly.
- **FlatList header remounts**: keep `ListHeaderComponent` reference stable (avoid changing deps in a `useCallback` passed as header); use refs + `extraData` to trigger updates instead.
- **Thumbnails: always persist cloud thumbnails**: `metadata.thumbnailUri` is often a temp path (e.g. `Library/Caches/`) and may disappear on restart. If a cloud thumbnail exists, persist it to a stable on-disk cache regardless of metadata presence, then point the UI/cache at the persisted path.

## TypeScript

### This Package
- Shared interfaces → `types/`
- Use discriminated unions for results
- Zod schemas for navigation params and forms

**Standards:** See `.cursor/rules/core/typescript-standards.mdc`
- Import conventions (lines 52-62)
- Shared types location (line 18)
- Zod integration (lines 31-35)

## Performance
- TanStack Query: Use `staleTime` for stable data, implement optimistic updates
- React: Use `useMemo` for expensive computations, `React.memo` only for expensive components
- Avoid premature optimization in MVP phase

**See:** `.cursor/rules/quality/performance.mdc`

