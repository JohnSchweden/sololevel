# Shared Packages

## Structure
- `ui/` - Tamagui components (cross-platform)
- `app/` - Business logic, screens, hooks
- `api/` - Backend integrations & clients
- `config/` - Configuration & shared types
- `logging/` - Cross-platform structured logger with dev/prod gating

## Rules
- Always use named exports (default exports only for Expo Router route files)
- Always import via path aliases: `@ui/`, `@app/`, `@api/`, `@config/`, `@logging/`
- Always use package imports: `@my/ui`, `@my/app`, `@my/api`, `@my/config`, `@my/logging`
- Always keep UI components app-agnostic with no business logic

## Component Structure (directory-per-component)
- Prefer `Component.tsx`, `Component.test.tsx`, `index.ts` per component folder; parent folders re-export.
- Tests follow AAA with comments.
- Components accept `testID` (capital ID) with sensible defaults and forward props with `{...props}`.


## Testing
- **ui/**: Always use Jest + jsdom → `yarn workspace @my/ui test`
- **app/**: Always use Jest + jsdom → `yarn workspace @my/app test`
- **api/**: Always use Vitest + node → `yarn workspace @my/api test`
- **logging/**: Always use Jest + jsdom → `yarn workspace @my/logging test`
- Always mock external dependencies only (APIs, native modules)
- Always see package-specific AGENTS.md for detailed patterns
