# API Package - Backend Integration

## Purpose
Central package for all backend communication, Supabase integration, and API client management.

## Structure
- `supabase/` - Client initialization and auth
- `services/` - Typed service wrappers (video, user, analysis)
- `types/` - Generated database types (`Database`)
- `mock.ts` - Mock client for dev/test

## Development Workflow

### Type Generation
```bash
yarn supabase gen types typescript --local > packages/api/types/database.ts
```
Run after any database schema changes.

### Mocking Strategy
- Toggle: `EXPO_PUBLIC_USE_MOCKS`
- DI pattern: Export real or mock client
- Location: `mock.ts` for mock implementations

**Patterns:** See `.cursor/rules/features/api-mocking.mdc`
- Mock client injection (lines 47-64)
- MSW Node for tests (lines 68-82)
- Supabase wrapper mocking (lines 84-87)

## Authentication

### Responsibilities
- Initialize Supabase client
- Handle auth state changes
- Provide auth context to apps

### Auth retry logging (session refresh fallback)
- **Before retry**: `log.warn` with what triggered the retry
- **Success**: `log.info` with `userId` and session expiry
- **Failure**: `log.error` with specific failure reason
  - Rationale: high retry frequency is a signal of broken session management that needs investigation.

**Patterns:** See `.cursor/rules/features/authentication.mdc`
- Supabase auth integration (lines 9-12)
- Auth state listener (lines 107-115)
- RLS policies (lines 77-88)

## TypeScript

### Database Types
- Client type: `SupabaseClient<Database>`
- Table rows: `Database['public']['Tables']['<name>']['Row']`
- Validate responses with Zod

**Standards:** See `.cursor/rules/core/typescript-standards.mdc`
- Supabase type integration (lines 22-28)
- Zod validation (lines 31-35)
- Result types (lines 45-50)

## Query Integration

### Service Pattern
- Wrap Supabase calls in typed services
- Return discriminated unions (Result<T, E>)
- Use with TanStack Query in `@my/app`

**Patterns:** See `.cursor/rules/features/data-state-management.mdc`
- TanStack Query usage
- Error handling
- Optimistic updates

## Import Conventions

- Package: `import { supabase } from '@my/api'`
- Path: `import { VideoService } from '@api/services/video'`

## Rules
- Always route all backend calls through this package
- Always keep secrets in environment variables and Edge Functions; never include them in client code
- Always use Edge Functions for privileged operations that require elevated permissions
- Always ensure RLS is enabled for all database tables

## Testing
- **Runner**: Vitest with `node` environment
- **Focus**: Service methods, error handling, data transformations
- **Mocking**: Mock Supabase client methods with realistic return data
- **Async**: Use `await` for all service tests, verify Result<T, E> types
- **Note**: React hooks were moved to `@my/app` for better separation of concerns

