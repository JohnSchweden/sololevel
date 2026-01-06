
# Pre-PR Gates (must pass 0 errors)
- TypeScript: `yarn type-check:all` → 0 errors (includes Edge via Deno)
- Tests: `yarn test:all` → all tests pass (includes Edge via Deno)
- Linting: `yarn lint:all` → 0 errors (includes Edge via Deno)
- Build: `yarn build` → success