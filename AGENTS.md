---
last_updated: 2025-01-27
token_budget: 1800
review_frequency: monthly
---

# Solo:Level - AI Feedback Coach App

> **🎯 Start here:** Command center for agents. Full details in `.cursor/rules/core/*.mdc`
> **New to codebase?** Read: `docs/spec/architecture.mermaid` + `docs/spec/TRD.md`

## 📋 Quick Reference

### Tech Stack
- **Frontend**: React Native (Expo) + Expo Router Web
- **UI**: Tamagui (cross-platform)
- **Backend**: Supabase (PostgreSQL, Realtime, Storage, Edge Functions)
- **State**: Zustand + TanStack Query
- **Language**: TypeScript exclusively, functional components only
- **Package Manager**: Yarn 4 workspaces + Turbo

### Common Commands
| Task | Command | Use When |
|------|---------|----------|
| Install | `yarn install --immutable` | First time setup |
| Start dev | `yarn dev` | Launch all services |
| Native | `yarn native` | Mobile development |
| Web | `yarn web` | Web development |
| Type check | `yarn type-check:ui` | After `packages/ui/**` changes |
| Lint file | `yarn biome check <file>` | Single file validation |
| Test | `yarn workspace @my/ui test <file>` | Run specific tests |

### File Locations
| Content Type | Location | Example |
|--------------|----------|---------|
| Screens | `packages/app/features/**` | `ProfileScreen.tsx` |
| Routes | `apps/{expo,web}/app/**` | `(auth)/profile.tsx` |
| UI Components | `packages/ui/components/**` | `Button.tsx` |
| API Clients | `packages/api/**` | `supabase.ts` |
| Tests | `**/*.test.ts(x)` | `Button.test.tsx` |

### Path Aliases
- `@ui/*` → `packages/ui/`
- `@app/*` → `packages/app/`
- `@api/*` → `packages/api/`
- `@config/*` → `packages/config/`
- `@logging/*` → `packages/logging/`

**Package imports:** Use `@my/ui`, `@my/app`, etc. for package-level exports  
**Full details:** See `.cursor/rules/core/monorepo-foundation.mdc`

## 🎯 Agent Cheat Sheet

### Implementing a New Feature
1. Load context: `view docs/spec/architecture.mermaid`
2. Write test first: Follow `.cursor/rules/quality/testing-unified.mdc`
3. Implement feature
4. Validate: `yarn type-check:<workspace>`
5. Test: `yarn workspace @my/<package> test <file>`
6. Self-heal: Update AGENTS.md if you learned something (see `.cursor/rules/core/scoped-agents.mdc`)

### Fixing a Bug
1. Identify workspace from file path: `packages/ui/` → workspace is `ui`
2. Make fix
3. Validate types: `yarn type-check:ui`
4. Check lint: `yarn lint:ui`
5. Run tests: `yarn workspace @my/ui test <pattern>`

### Adding Dependencies
1. Determine workspace: `packages/app/` → `@my/app`
2. Add: `yarn workspace @my/app add <package>`
3. Check peers: `yarn explain peer-requirements <hash>` (if warnings)
4. Verify: Check `package.json` uses `workspace:*` for internal deps

### Working with Supabase
````bash
yarn supabase start           # Local dev stack
yarn supabase functions serve # Edge functions
yarn supabase db push         # Deploy migrations
# NEVER run bare `supabase` — always prefix with `yarn`
````

## 🚨 Critical: Agent Behavior

### Validation Strategy

**🎯 Golden Rule:** Validate only what you changed

| Scope | Command | When |
|-------|---------|------|
| 📄 File | `yarn biome check <file>` | Quick iteration |
| 📦 Workspace | `yarn type-check:ui` | Active development |
| 🏗️ Full | `yarn type-check:all` | Pre-commit/CI only |

**Why:**
- ✅ Scoped = Fast feedback, relevant errors only
- ❌ Full = Slow, includes unrelated issues

#### After Making Changes
1. Identify workspace from file path
2. Run: `yarn type-check:<workspace>`
3. Run: `yarn biome check <directory>` or `yarn lint:<workspace>`
4. Show exact commands + full output

**❌ NEVER claim "checks passed" without running and showing output**

### File Operations
- **Delete:** Use delete tool (not create cleanup scripts)
- **Edit:** Use edit tools (not create + delete workflow)

### Verification Transparency
- **Run checks:** Execute commands, don't simulate
- **Show output:** Display complete terminal output
- **Mark unverified:** If skipped, explicitly state `**UNVERIFIED**`

## 🏗️ Architecture (Repo-Wide)

### React Native New Architecture
- **Status:** Enabled (Expo SDK 53)
- **Config:** `"newArchEnabled": true` in `apps/expo/app.json`

### Navigation Pattern (Separation of Concerns)
- **Screens** (`packages/app/features/**`): Accept callbacks only (`onBack`, `onNavigate`). Never import navigation hooks.
- **Routes** (`apps/{expo,web}/app/**`): Own navigation using Expo Router APIs. Wrap protected routes with `<AuthGate>`.

### Expo Router Notes
- **Default exports:** Only for route files in `apps/*/app/**` (exception to named exports rule)
- **Static headers:** Configure in `apps/*/app/_layout.tsx` via `<Stack.Screen options={...} />`
- **Dynamic headers:** Use `useNavigation().setOptions()` in route files

## 📚 Detailed Documentation

For comprehensive patterns:
- **Structure:** `.cursor/rules/core/monorepo-foundation.mdc`
- **Operations:** `.cursor/rules/core/development-operations.mdc`
- **TypeScript:** `.cursor/rules/core/typescript-standards.mdc`
- **Testing:** `.cursor/rules/quality/testing-unified.mdc`
- **Errors:** `.cursor/rules/quality/error-handling.mdc`
- **Performance:** `.cursor/rules/quality/performance.mdc`
- **Security:** `.cursor/rules/quality/security-best-practices.mdc`

## 🎓 Code Style Summary

### TypeScript (Full details in `core/typescript-standards.mdc`)
- Strict typing with explicit types
- SOLID principles
- JSDoc + ASCII diagrams for complex logic
- Explicit return types for exported functions
- `type` for unions; `interface` for objects
- `as const` over enums
- Named exports (except Expo Router routes)

### Testing (Full details in `quality/testing-unified.mdc`)
- Max 1:2 test-to-code ratio
- AAA pattern (Arrange-Act-Assert)
- Test user behavior, not implementation
- Jest for `@my/ui`, `@my/app`, `@my/logging`
- Vitest for `@my/api`
- `fireEvent.click()` for web; `fireEvent.press()` for native

### Implementation
- TDD methodology (Red-Green-Refactor)
- Track progress against Definition of Done
- See `commands/implement.md` for workflow

## 🔐 Core Principles
- Mobile-first, cross-platform development
- Named exports (except Expo Router routes)
- Row Level Security (RLS) for all DB access
- Path aliases over relative imports

## 🔢 Version Matrix (See `core/development-operations.mdc` for details)
| Area | Version | Source |
|------|---------|--------|
| Node | 20.x | `engines.node` |
| Yarn | 4.10.3 | `packageManager` |
| Expo SDK | 53.x | workspace `expo` |
| React Native | 0.79.x | root `react-native` |
| React | 19.x | root `react` |