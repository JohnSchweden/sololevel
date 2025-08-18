# Cursor Guidelines (Monorepo Tech Stack)

See also: [instructions.md](./instructions.md) for rule precedence, scoping, and file globs.

Tech stack: **Tamagui, Solito, Expo, Zustand, Next.js, Supabase, Yarn, TypeScript, Turborepo, Metro, Zod, TanStack Query**

---

## Planner Mode

1. Review scope across `apps/` and `packages/` in the Turborepo (check for cross-platform impact: web, native, shared packages).
2. Ask 4–6 clarifying questions before proposing changes.
3. Draft a plan → get approval → implement in phases (UI → state → API → types/schemas).
4. After each phase, summarize what was done and outline next steps.

---

## Debugger Mode

1. List 5–7 possible sources (UI, navigation, state, queries, API, build tooling, schema) → narrow to top 1–2.
2. Add targeted logs (console, Zustand snapshots, TanStack query lifecycle, Zod validation errors).
3. Collect logs: `getConsoleLogs`, `getConsoleErrors`, `getNetworkLogs`, `getNetworkErrors`.
4. Check Supabase Edge/DB logs when needed.
5. Provide analysis + next log/trace suggestions if root cause is unclear.
6. Clean up temporary debugging artifacts (logs, test hooks, debug flags) after fix.

---

## Stack-Specific Debugging

### Expo / Metro

* `expo start --clear`
* Device logs: `npx react-native log-ios` / `npx react-native log-android`
* Use `Platform.OS` logs for iOS vs Android issues

### Next.js

* Check API routes separately from React components
* Debug SSR/SSG/hydration differences

### Zustand

* Add middleware for state change logs
* Log store snapshots to debug mutations

### Supabase

* Use Supabase dashboard for Edge + DB logs
* Test RLS with different auth states
* Log realtime subscription lifecycle

### Tamagui

* Log current theme + tokens
* Check style compilation/debug props

### Solito

* Log route params across Next + Expo
* Validate navigation stack consistency

### Zod

* Use `safeParse` and log validation errors

### TanStack Query

* Log query/mutation lifecycle (`onSuccess`, `onError`)
* Inspect caching and retries

### Tooling

* Yarn: `yarn why <package>` for dependency issues
* Turborepo: run builds with `--filter`
* TypeScript: `tsc --noEmit` across repo

---

## PRD Analysis Mode

Use this section to break down product requirements into a technical plan before starting work.

* **Parse Requirements:** Extract functional, technical, and design requirements from the PRD.
* **Cross-Platform Impact:** Identify web vs. native differences and shared component needs.
* **Data Flow Mapping:** Map user flows to state management (Zustand) and API calls (TanStack Query + Supabase).
* **Component Architecture:** Plan Tamagui component hierarchy and reusability across platforms.
* **Migration Strategy:** Break the PRD into phases aligned with the monorepo structure.
* **Success Criteria:** Define testable acceptance criteria for each requirement.
* **Risk Assessment:** Identify potential blockers (platform limitations, API constraints, performance).

### PRD Validation Checklist

Use this checklist to ensure all requirements have been fully analyzed before beginning development.

[ ] Requirements mapped to specific apps/packages
[ ] Cross-platform considerations documented
[ ] API/schema changes identified (Supabase, Zod)
[ ] UI/UX consistency plan (Tamagui themes)
[ ] Performance implications assessed
[ ] Testing strategy defined

---

## GitHub Integration Mode

Follow these guidelines for all Git and GitHub workflows to ensure a consistent and efficient development process.

### Pre-Development

* **Branch Strategy:** Create feature branches following the convention `feature/PRD-123-description`.
* **Issue Linking:** Reference GitHub issues in commits and PRs.
* **Label Management:** Apply appropriate labels (e.g., `platform`, `component`, `priority`).

### During Development

* **Commit Standards:**
    * Conventional commits: `feat(web):`, `fix(native):`, `chore(shared):`
    * Reference issues: `Closes #123` or `Fixes #456`
    * Scope to specific packages: `apps/web`, `packages/ui`, etc.
* **PR Workflow:**
    * Use Draft PRs for work-in-progress.
    * Request reviews from relevant team members.
    * Link to related PRDs/issues.
    * Include testing instructions.
    * Document breaking changes.
* **CI/CD Awareness:**
    * Check Turborepo cache hits/misses.
    * Monitor build times across apps.
    * Validate cross-platform builds (web + native).

### Post-Development

* **Documentation Updates:** Update READMEs, changelogs, and package docs.
* **Release Planning:** Coordinate releases across apps (web deploy, app store).
* **Issue Cleanup:** Close related issues and update project boards.

### Emergency Hotfixes

* Create a hotfix branch from `main`.
* Keep changes to a minimal scope.
* Fast-track the review process.
* Coordinate immediate deployment.