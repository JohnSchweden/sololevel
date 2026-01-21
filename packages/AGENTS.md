# Shared Packages

## Structure
- `ui/` - Tamagui components (cross-platform)
- `app/` - Business logic, screens, hooks
- `api/` - Backend integrations & clients
- `config/` - Configuration & shared types
- `logging/` - Cross-platform structured logger with dev/prod gating

## Rules
- Use named exports only
- Import via path aliases: `@ui/`, `@app/`, `@api/`, `@config/`, `@logging/`
- Package imports: `@my/ui`, `@my/app`, `@my/api`, `@my/config`, `@my/logging`
- Keep UI components app-agnostic

## Component Structure (directory-per-component)
- Prefer `Component.tsx`, `Component.test.tsx`, `index.ts` per component folder; parent folders re-export.
- Tests follow AAA with comments.
- Components accept `testID` (capital ID) with sensible defaults and forward props with `{...props}`.


## Testing
- **ui/**: Jest + jsdom → `yarn workspace @my/ui test`
- **app/**: Jest + jsdom → `yarn workspace @my/app test`
- **api/**: Vitest + node → `yarn workspace @my/api test`
- **logging/**: Jest + jsdom → `yarn workspace @my/logging test`
- Mock external dependencies only (APIs, native modules)
- See package-specific AGENTS.md for detailed patterns
