# Solo:Level - AI Feedback Coach App

## Tech Stack Overview
- **Frontend**: React Native (Expo) + Expo Router Web
- **UI**: Tamagui (cross-platform)
- **Backend**: Supabase (PostgreSQL, Realtime, Storage, Edge Functions)
- **State**: Zustand + TanStack Query
- **Language**: TypeScript exclusively, functional components only
- **Package Manager**: Yarn 4 workspaces + Turbo
- **Web Bundler**: Metro (via Expo Router)

## Code Style and Patterns
### TYPESCRIPT_GUIDELINES (see `core/typescript-standards.mdc`)
- Use strict typing, avoid `any` 
- Follow SOLID principles
- Document with JSDoc + ASCII Flow Diagrams where necessary
- All exported functions need explicit return types
- Use `type` for unions/intersections; `interface` for object shapes
- Prefer `as const` over enums
- Use Tamagui for cross-platform styling
- Prefer named exports over default exports

## Expo Router Notes
- Route components in `apps/*/app/**` are default exports. This is an expected exception to the "named exports only" rule for route files.
- **Static headers**: Configure in `apps/*/app/_layout.tsx` via `<Stack.Screen name="..." options={...} />`
- **Dynamic headers**: Use `useNavigation().setOptions()` in route files, triggered by screen callbacks

## Version Matrix
| Area          | Current        | Minimum | Source |
| ------------- | -------------- | ------- | ------ |
| Node          | 20.x           | 20.x    | `package.json engines.node` |
| Yarn          | 4.10.3         | 4.0.0   | `package.json packageManager` |
| Expo SDK      | 53.x           | 53.x    | root/workspace `expo` versions |
| React Native  | 0.79.x         | 0.79.x  | root `react-native` |
| React         | 19.x           | 19.x    | root `react` |
| Expo Router   | 5.1.x          | 5.1.x   | `apps/web/package.json` |
| Turbo         | 1.13.x         | 1.13.x  | root `turbo` |

CI enforces version alignment via Corepack. See `.cursor/rules/core/development-operations.mdc` for detailed version management.

## Core Principles
- Mobile-first, cross-platform development
- Named exports only (no default exports)
- Row Level Security (RLS) enabled for all database access
- Path aliases: `@ui/`, `@app/`, `@api/`, `@config/`, `@logging/`

## Import Strategy

### Package-Level Imports (Scoped)
Use `@my/` scoped package names for package-level exports and cross-package imports:

```typescript
// ✅ Correct - package-level imports
import { Button } from '@my/ui'
import { useAuth } from '@my/app' 
import { supabase } from '@my/api'
import { logger } from '@my/logging'
```

### Path-Level Imports (Aliases)
Use path aliases for specific file imports within packages:

```typescript
// ✅ Correct - path-level imports  
import { Button } from '@ui/components/Button'
import { useAuth } from '@app/hooks/useAuth'
import { supabase } from '@api/supabase'
import { logger } from '@logging/logger'
```

### Import Rules
1. Package exports: Always use `@my/` scoped names
2. File imports: Use path aliases (`@ui/`, `@app/`, `@api/`, `@config/`, `@logging/`)
3. Never mix: Don't use `@api` without `/*` - use `@api/services/...`
4. Export strategy: Export from package index files for `@my/` imports

See `.cursor/rules/core/monorepo-foundation.mdc` for architectural details.

## Quick Start Commands
- Install: `yarn install --immutable`
- Start: `yarn dev`
- Native: `yarn native` | Web: `yarn web`

## Workspace Scripts Reference
- `yarn native` → `expo-app` (React Native development)
- `yarn web` → `next-app` (Web development)
- `yarn build:web` → `--filter=next-app`
- `yarn build:native` → `--filter=expo-app`
- `yarn test` → `--exclude expo-app` (excludes native from unit tests)
- Supabase:
  - `yarn workspace @my/supabase-functions test` (Vitest for _shared)
  - `yarn workspace @my/supabase-functions test:deno` (Deno for Edge)
  - `yarn test:db` (pgTAP database tests)

## Quality Scripts Reference

Key scripts to maintain code quality and consistency across workspaces:

- **Type Checks**
  - `yarn type-check` — Run strict TypeScript validation across all workspaces
  - `yarn type-check:<workspace>` — Type check a specific workspace (`ui`, `app`, `api`, `config`, `logging`)
- **Linting**
  - `yarn lint` — Lint all packages for code style and errors
  - `yarn lint:fix` — Auto-fix lint issues project-wide
  - `yarn lint:<workspace>` — Lint a specific workspace
  - `yarn lint:<workspace>:fix` — Auto-fix for a specific workspace
- **Formatting**
  - `yarn format` — Format code using project standards
  - `yarn format:fix` — Auto-fix all formatting issues

Full table of workspace commands is in `.cursor/rules/core/development-operations.mdc`.

## Error Prevention
### VALIDATION_RULES
1. Verify type consistency (TypeScript strict mode)
2. Check for potential null/undefined
3. Validate against business rules
4. Ensure error handling with discriminated unions
5. Check RLS policies for database access
6. Validate cross-platform compatibility

## Testing
- **Test Runner by Package**: `@my/ui`, `@my/app` & `@my/logging` use Jest; `@my/api` uses Vitest
- **Commands**: `yarn workspace <package> test` (never mix runners across workspaces)
- **Ratio**: Maximum 1:2 test-to-code ratio
- **Pattern**: AAA (Arrange-Act-Assert) mandatory with comments
- **Focus**: Test user behavior, not implementation details
- **Event usage**: Web uses `fireEvent.click()`; Native uses `fireEvent.press()`

## Detailed Documentation

For comprehensive patterns and enforcement policies, see:
- **Architecture & Structure**: `.cursor/rules/core/monorepo-foundation.mdc`
- **Development Operations**: `.cursor/rules/core/development-operations.mdc`
- **TypeScript Standards**: `.cursor/rules/core/typescript-standards.mdc`
- **Testing Patterns**: `.cursor/rules/quality/testing-unified.mdc`
- **Error Handling**: `.cursor/rules/quality/error-handling.mdc`
- **Performance**: `.cursor/rules/quality/performance.mdc`
- **Security**: `.cursor/rules/quality/security-best-practices.mdc`

## Project Context
Read before starting:
- Architecture: `docs/spec/architecture.mermaid`
- Technical specs: `docs/spec/TRD.md`