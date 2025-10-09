# Shared Packages

## Structure
- `ui/` - Tamagui components (cross-platform)
- `app/` - Business logic, screens, hooks
- `api/` - Backend integrations & clients
- `config/` - Configuration & shared types

## Rules
- Use named exports only
- Import via path aliases: `@ui/`, `@app/`, `@api/`, `@config/`
- Package imports: `@my/ui`, `@my/app`, `@my/api`, `@my/config`
- Keep UI components app-agnostic


## Testing
- **ui/**: Jest + jsdom → `yarn workspace @my/ui test`
- **app/**: Jest + jsdom → `yarn workspace @my/app test`
- **api/**: Vitest + node → `yarn workspace @my/api test`
- Mock external dependencies only (APIs, native modules)
- See package-specific AGENTS.md for detailed patterns
