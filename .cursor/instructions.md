## Rule Precedence and Scoping

### Platform-Specific Rules
- Native-specific rules apply to `**/*.native.{ts,tsx}` files
- Web-specific rules apply to `apps/web/**/*.{ts,tsx}` 
- Cross-platform rules apply to `packages/app/**/*.{ts,tsx}` and `packages/ui/**/*.{ts,tsx}`

### Framework-Specific Scoping
- Tamagui UI rules target `packages/ui/**/*.{ts,tsx}` and `**/components/**/*.{ts,tsx}`
- Solito navigation rules apply to `**/navigation/**/*.{ts,tsx}` and `**/screens/**/*.{ts,tsx}`
- Expo rules are scoped to `apps/mobile/**/*.{ts,tsx}` and `**/*.native.{ts,tsx}`
- Next.js rules apply to `apps/web/**/*.{ts,tsx}` and take precedence for web-specific code

### Backend and API Rules
- Supabase Edge Functions: `supabase/functions/**/*.ts`
- API integration packages: `packages/api/**/*.{ts,tsx}`
- Database migrations: `supabase/migrations/**/*.sql`

### Testing Rules
- Unit/Integration tests: `**/*.{test,spec}.{ts,tsx}` (Vitest)
- Component tests: `**/*.{test,spec}.{ts,tsx}` with React Testing Library
- E2E Native: `e2e/**/*.{test,spec}.{ts,js}` (Detox)
- E2E Web: `tests/**/*.{test,spec}.{ts,js}` (Playwright)

### State Management Scoping
- Zustand stores: `**/stores/**/*.{ts,tsx}` and `**/*store*.{ts,tsx}`
- TanStack Query: `**/hooks/**/*.{ts,tsx}` and `**/*query*.{ts,tsx}`
- API layer: `packages/api/**/*.{ts,tsx}`

When adding new rules, always:
- Include frontmatter with `description`, `globs`, and `alwaysApply: true`
- Use specific globs that align with monorepo structure
- Consider platform-specific variations (.native.tsx)
- Exclude conflicting patterns with `!pattern` when necessary
- Prioritize cross-platform compatibility

## Canonical Task Lists
- Master task index: `docs/TASKS.md`
- Feature-scoped task lists: `docs/tasks/feature-name.md`
- Platform-scoped lists: `docs/tasks/web.md`, `docs/tasks/native.md`