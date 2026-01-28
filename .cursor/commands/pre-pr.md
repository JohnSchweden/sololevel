
# Pre-PR Quality Checklist

Before opening a Pull Request, you **must** verify these gates are fully green (0 errors):

**Rule:** Run commands directly — never use piping (`|`).

1. **TypeScript Strictness**
   - Run: `yarn type-check:all`
   - Requirement: No type errors (includes all workspaces and Supabase Edge/Deno)
   - ☐ All errors fixed before running lint

2. **Code Linting**
   - Run: `yarn lint:all`
   - Requirement: 0 lint errors across all packages and Edge functions
   - ☐ Fix all lint issues before running tests

3. **Tests: All Packages**
   - Run: `yarn test:all`
   - After fixing a failing test, run in this order:
     1. Single test: `yarn workspace <package> test <test-file>`
     2. Test suite: `yarn workspace <package> test`
     3. All tests: `yarn test:all`
   - Requirement: 100% pass rate (includes Edge, Deno, shared & UI)
   - ☐ Address all failing tests before building

4. **Monorepo Build**
   - Run: `yarn build`
   - Requirement: Build completes without errors in all workspaces

**Only open a PR when you meet ALL above conditions.**
