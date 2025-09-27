# Debugging Workflow

## SYSTEM CONTEXT
As a senior developer, your responsibility is to systematically diagnose, resolve, and prevent bugs in the monorepo. Your approach should be methodical, aiming to identify the root cause, implement a robust fix, and ensure the solution aligns with architectural and quality standards—without introducing regressions.

## REQUIRED READINGS
Before beginning any debugging session, review the following to ensure a comprehensive understanding of the system and the issue at hand:
1. **`docs/spec/architecture.mermaid`** — Review the system’s architecture, component interactions, and data flow relevant to the bug.
2. **`docs/spec/TRD.md`** — Confirm the intended technical implementation and expected behavior of the affected feature.
3. **`docs/tasks/tasks.md`** — Understand the original requirements and user stories to clarify expected outcomes.
4. **Relevant error handling guidelines (`quality/error-handling.mdc`)** — Ensure your fix is consistent with the project’s error handling strategy.

## DEBUGGING WORKFLOW
Adopt the following structured process to efficiently diagnose and resolve bugs:

1. **ANALYZE & REPRODUCE**
    - Carefully read the bug report or task description.
    - Reproduce the bug reliably in your local development environment. Document the exact reproduction steps.
    - Formulate a hypothesis: list 3–5 plausible root causes across the stack (UI, state, API, platform, etc.), and prioritize the top 1–2 most likely.

2. **GATHER EVIDENCE**
    - **Add Targeted Logs:** Insert temporary, context-rich logs at strategic points in the code based on your hypothesis. Use the project’s standard logger.
    - **Collect Logs:** Use debugging tools and scripts (e.g., `getConsoleLogs`, `getNetworkLogs`) to capture runtime data.
    - **Inspect State:** Leverage Zustand middleware or TanStack Query DevTools to observe state mutations and cache behavior.
    - **Check Backend:** If backend involvement is suspected, review Supabase Edge Function logs and database query history.
    - **Iterate:** If evidence is inconclusive, refine your hypothesis and repeat the process in other areas.

3. **IMPLEMENT FIX**
    - Write the minimal code necessary to resolve the bug.
    - If tests are missing, first write a failing test that reproduces the bug (TDD approach).
    - Ensure the fix passes both the new and all existing relevant tests.

4. **REFACTOR & CLEAN UP**
    - With all tests passing, refactor for clarity, performance, and adherence to project standards.
    - **Important:** Remove all temporary debugging artifacts (e.g., `log.info` statements, debug variables, flags).
    - Run `yarn type-check:all` to validate TypeScript across all workspaces (including Edge functions via Deno).
    - Execute the full test suite for affected workspace(s). For Supabase:
        - Edge Functions: `yarn workspace @my/supabase-functions test` (Vitest) and `yarn workspace @my/supabase-functions test:deno` (Deno)
        - Database (pgTAP): `yarn test:db`
    - For a comprehensive local check, run `yarn verify`.

5. **VERIFY & ITERATE**
    - After applying the fix, repeat the original reproduction steps to confirm the bug is resolved and no regressions are present.
    - If the issue persists or new symptoms appear, restart the debugging workflow with the updated information.

## DEBUGGING TECHNIQUES BY STACK

### General
- **Error Boundaries:** Use error boundaries to catch rendering errors in components.
- **Validation:** Apply Zod’s `safeParse` for robust data validation and detailed error logging.

### Cross-Platform (Expo / Next.js)
- **Expo:** Run `yarn native --clear` to clear caches. Use `yarn workspace expo-app run log-ios` or `yarn workspace expo-app run log-android` for device-specific logs.
- **Next.js:** Isolate and debug SSR, hydration, or API route issues.
- **Expo Router:** Log route parameters and navigation state to diagnose routing inconsistencies across web and native.

### State Management (Zustand / TanStack Query)
- **Zustand:** Use `devtools` middleware to monitor state changes and store history.
- **TanStack Query:** Utilize React Query DevTools. Log `onSuccess` and `onError` hooks to trace data fetching.

### Backend (Supabase)
- Use Supabase Studio to inspect database logs and Edge Function executions.
- Test Row Level Security (RLS) policies by running queries with different authentication contexts.

## VALIDATION CHECKLIST

Before considering your fix complete, confirm that you can confidently answer "yes" to every item below:

- [ ] Have you reproduced the original issue and verified that your fix resolves it?
- [ ] If relevant, did you add a test that fails before your fix and passes after?
- [ ] Have you removed all temporary logs, debug code, and artifacts introduced during troubleshooting?
- [ ] Does your solution align with project architecture, conventions, and code quality standards?
- [ ] Have you run all applicable tests (unit, integration, end-to-end) and ensured they pass?
- [ ] Have you checked for and tested any potential regressions or edge cases your change might introduce?
- [ ] Have you passed all type checks? Did you run `yarn lint`? For edge functions, did you run `deno check` and `deno lint`?

Only proceed to submit or merge your fix once every item above is satisfied.