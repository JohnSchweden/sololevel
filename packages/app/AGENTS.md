# App Package - Business Logic

## Structure
- `features/` - Feature screens and logic
- `stores/` - Zustand state management
- `hooks/` - Custom hooks
- `types/` - Shared types

## Navigation

### Structure
- Screens: `features/<feature>/screens/`
- Keep screens platform-agnostic
- Route files in `apps/expo/app/` or `apps/web/app/`

**Patterns:** See `.cursor/rules/features/navigation-expo-router.mdc`
- Platform-agnostic screen patterns (lines 33-67)
- Navigation injection via props
- Typed params with useLocalSearchParams()

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

## TypeScript

### This Package
- Shared interfaces → `types/`
- Use discriminated unions for results
- Zod schemas for navigation params and forms

**Standards:** See `.cursor/rules/core/typescript-standards.mdc`
- Import conventions (lines 52-62)
- Shared types location (line 18)
- Zod integration (lines 31-35)
