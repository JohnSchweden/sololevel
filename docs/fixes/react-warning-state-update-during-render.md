# Fix: React Warning - State Update During Render

## Issue
**Warning:** `Cannot update a component (HistoryProgressScreen) while rendering a different component (VideoAnalysisScreen)`

### Root Causes
The React warning was caused by **two separate issues** where Zustand store updates were happening during the render phase:

#### 1. Store Updates in Query Function
The `useHistoricalAnalysis` hook was calling Zustand store updates (`updateCache`, `addToCache`, `setLocalUri`) directly inside the TanStack Query `queryFn`. When there was cached data available, the query executed synchronously during the render phase, triggering store updates.

**Problematic Code Locations (useHistoricalAnalysis.ts):**
- **Line 133-138**: `setTimeout` wrapper around `updateCache` - still executed during query execution
- **Line 194-196**: Direct `setLocalUri` call during async query  
- **Line 213-215**: Another direct `setLocalUri` call during query

#### 2. Side Effects in Zustand Selector (The Hidden Culprit)
The `videoHistory` store's `getCached` method had **hidden side effects** that were updating the store during reads:

**Problematic Code (videoHistory.ts lines 171-192):**
```typescript
getCached: (id) => {
  // ... validation code ...
  
  // ❌ BAD: Updates store during read
  if (entry.storagePath) {
    const localUri = state.localUriIndex.get(entry.storagePath)
    if (localUri && entry.videoUri !== localUri) {
      set((draft) => {  // SIDE EFFECT!
        draftEntry.videoUri = localUri
      })
    }
  }
  
  // ❌ BAD: Updates lastAccessed during every read
  set((draft) => {  // SIDE EFFECT!
    draftEntry.lastAccessed = Date.now()
  })
  
  return entry
}
```

When `getCached(analysisId)` was called inside the query function, it triggered store updates, causing re-renders in `HistoryProgressScreen`.

## Solution

### Changes Made

#### Fix 1: Separated Data Fetching from Side Effects (useHistoricalAnalysis.ts)
- Introduced `HistoricalAnalysisData` interface to hold query results + pending cache updates
- Query function now returns data without triggering any store updates
- All store updates moved to a `useEffect` hook that runs after query completes
- Added `localUriHint` parameter to `resolveHistoricalVideoUri` for better performance

#### Fix 2: Made getCached() Read-Only (videoHistory.ts)
- Removed all `set()` calls from `getCached` method
- Made it a pure read operation with no side effects
- Moved `lastAccessed` updates to the `useEffect` in `useHistoricalAnalysis`
- Removed automatic `videoUri` refresh (now handled explicitly via `updateCache`)

### Files Modified
- `/packages/app/features/VideoAnalysis/hooks/useHistoricalAnalysis.ts`
- `/packages/app/features/VideoAnalysis/hooks/useHistoricalAnalysis.test.tsx`
- `/packages/app/features/HistoryProgress/stores/videoHistory.ts` ⭐ **KEY FIX**

## Architecture Patterns

### Anti-Pattern 1: Store Updates in Query Functions (❌)
```typescript
const query = useQuery({
  queryFn: async () => {
    const data = await fetchData()
    // BAD: Store update during query execution
    updateStore(data)
    return data
  }
})
```

### Anti-Pattern 2: Side Effects in Selectors/Getters (❌)
```typescript
getCached: (id) => {
  const entry = cache.get(id)
  // BAD: Updating store during read operation
  set((draft) => { draft.lastAccessed = Date.now() })
  return entry
}
```

### Best Practice: Separate Reads from Writes (✅)
```typescript
// Query returns data + pending updates
const query = useQuery({
  queryFn: async () => {
    const data = await fetchData()
    return { data, pendingUpdates }
  }
})

// Apply updates in useEffect after render
useEffect(() => {
  if (query.data?.pendingUpdates) {
    updateStore(query.data.pendingUpdates)
  }
}, [query.data])

// Getters are pure read operations
getCached: (id) => cache.get(id)  // No side effects!
```

## Lessons Learned

1. **Never update stores inside query functions** - They can execute synchronously during render
2. **Keep getters/selectors pure** - Read operations should never have side effects
3. **Use useEffect for side effects** - Updates should happen after render completes
4. **Hidden side effects are dangerous** - The `getCached` issue was harder to spot because it looked like a simple getter

## Verification

### Tests
```bash
yarn workspace @my/app test useHistoricalAnalysis.test.tsx
```
**Result:** ✅ All 8 tests pass

### Type Checking
```bash
yarn workspace @my/app type-check
```
**Result:** ✅ No errors

### Linting  
**Result:** ✅ No errors

## Impact
- ✅ Resolves React warning about cross-component updates
- ✅ Maintains existing functionality
- ✅ Improves code quality and predictability
- ✅ Makes store operations more explicit and testable
- ✅ No breaking changes to public API

## Related Patterns
- **Rule:** `.cursor/rules/quality/error-handling.mdc` - State management patterns
- **Rule:** `.cursor/rules/features/data-state-management.mdc` - TanStack Query best practices
- **Architectural Principle:** Separate data fetching from side effects; keep getters pure

