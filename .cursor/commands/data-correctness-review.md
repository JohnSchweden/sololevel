Act as a senior data layer engineer. Given the query hooks, cache invalidation logic, and async state updates I provide, walk through:
1. Which queries/cache entries are stale or inconsistent.
2. Race conditions in async operations (out-of-order updates, duplicate requests, missing cancellation, missing abort controllers in refs).
3. State synchronization issues (Zustand vs TanStack Query, server vs client drift).
4. Concrete fixes ranked by severity (query keys, invalidation strategy, request deduplication, abort controllers stored in refs, stale-while-revalidate patterns).
5. Cache boundary violations (updates during render, selector side effects, incorrect dependency arrays).
Use a brutal code-review tone, assume React 19 concurrent features + TanStack Query, and call out when a "fix" just adds more state instead of fixing the root cause.
