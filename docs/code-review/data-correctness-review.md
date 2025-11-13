# Video Analysis Pipeline: Data Correctness Review

**Reviewer:** Senior Data Layer Engineer  
**Date:** 2024  
**Scope:** Upload → Analysis → Feedback availability pipeline  
**Tone:** Brutal but constructive

---

## Executive Summary

Your video analysis pipeline is a **race condition festival** with **stale cache guaranteed**. You've built a Rube Goldberg machine that syncs state between 5 Zustand stores, TanStack Query cache, Supabase Realtime subscriptions, and polling queries. The result: **inconsistent data, duplicate requests, and cache invalidation that invalidates nothing**.

**Critical Issues:**
1. **No abort controllers** — requests can't be cancelled when components unmount
2. **Polling + subscriptions** run simultaneously on same queries — guaranteed race conditions
3. **Dual-state synchronization** (Zustand + TanStack Query) creates drift
4. **Cache invalidation violates React boundaries** — updates during render cycles
5. **Query key inconsistencies** — same data cached under 3 different keys

---

## 1. Stale/Inconsistent Cache Entries

### 🔴 CRITICAL: Multiple Query Keys for Same Entity

**Location:** `packages/app/hooks/useAnalysis.ts:26-32`

```typescript
export const analysisKeys = {
  all: ['analysis'] as const,
  jobs: () => [...analysisKeys.all, 'jobs'] as const,
  job: (id: number) => [...analysisKeys.jobs(), id] as const,
  jobByVideo: (videoId: number) => [...analysisKeys.all, 'by-video', videoId] as const,
  stats: () => [...analysisKeys.all, 'stats'] as const,
}
```

**Problem:**
Same `AnalysisJob` is cached under:
- `['analysis', 'jobs', jobId]`
- `['analysis', 'by-video', videoId]`

When you update one, you MUST update both. You do this in some places (`useAnalysis.ts:109-110`), but **subscriptions only update one** (`useAnalysisRealtime.ts:26`). Result: **guaranteed stale data**.

**Also broken:**
- `useAnalysisState.ts:358` uses `['analysis', 'uuid', jobId]` — different key structure
- `analysisSubscription.ts:407` uses hardcoded `['history', 'completed']` — doesn't match any key factory

**Fix:**
```typescript
// Single source of truth for job updates
const updateJobInCache = (job: AnalysisJob) => {
  queryClient.setQueryData(analysisKeys.job(job.id), job)
  queryClient.setQueryData(analysisKeys.jobByVideo(job.video_recording_id), job)
}

// Use in ALL subscription callbacks
subscribeToAnalysisJob(id, (updatedJob) => {
  updateJobInCache(updatedJob) // Not just one key
  // ...
})
```

---

### 🔴 CRITICAL: Cache Staleness in `useAnalysisState`

**Location:** `packages/app/features/VideoAnalysis/hooks/useAnalysisState.ts:380-445`

**Problem:**
You fetch UUID from `getAnalysisIdForJobId()` in a `useEffect` with **no cancellation**. If the component unmounts or `analysisJobId` changes, the promise continues. The `cancelled` flag prevents state updates, but **the promise still resolves**, wasting network.

**Worse:** You cache UUID in TanStack Query (`queryClient.setQueryData(['analysis', 'uuid', jobId], uuid)`) but the query key **doesn't match any queryFn**. If another component uses `useQuery(['analysis', 'uuid', jobId], ...)`, it won't see your cached value because **you're bypassing the query system**.

**Fix:**
```typescript
useEffect(() => {
  const effectiveJobId = analysisJobId ?? analysisJob?.id ?? null
  if (!effectiveJobId) {
    setAnalysisUuid(null)
    return
  }

  // Check cache first
  const cached = queryClient.getQueryData<string>(analysisKeys.uuid(effectiveJobId))
  if (cached) {
    setAnalysisUuid(cached)
    return
  }

  // Use proper query with abort signal
  const abortController = new AbortController()
  
  const resolveUuid = async () => {
    try {
      const uuid = await getAnalysisIdForJobId(effectiveJobId, {
        signal: abortController.signal
      })
      
      if (!abortController.signal.aborted && uuid) {
        // Update via queryClient, not direct setQueryData
        queryClient.setQueryData(analysisKeys.uuid(effectiveJobId), uuid)
        setUuid(effectiveJobId, uuid)
        setAnalysisUuid(uuid)
      }
    } catch (error) {
      if (error.name !== 'AbortError' && !abortController.signal.aborted) {
        log.error('useAnalysisState', 'Failed to resolve UUID', { error })
        setAnalysisUuid(null)
      }
    }
  }

  void resolveUuid()
  
  return () => {
    abortController.abort()
  }
}, [analysisJobId, analysisJob?.id])
```

---

### 🟡 MEDIUM: Subscription Updates Don't Invalidate Lists

**Location:** `packages/app/hooks/useAnalysisRealtime.ts:18-31`

**Problem:**
When a subscription receives an update, you call `invalidateQueries` with **hardcoded string keys** (`['analysis-history']`, `['analysis-stats']`). These don't match your `analysisKeys` factory.

**Also broken:** You invalidate on **every update**, even progress-only updates that don't affect list/summary queries. This causes **unnecessary refetches**.

**Fix:**
```typescript
const handleAnalysisUpdate = useCallback((payload: any) => {
  const updatedJob = payload.new as AnalysisJob
  
  // Update all cache entries for this job
  updateJobInCache(updatedJob)
  
  // Only invalidate lists if status/structural change
  const prevJob = queryClient.getQueryData<AnalysisJob>(analysisKeys.job(updatedJob.id))
  const statusChanged = prevJob?.status !== updatedJob.status
  const progressOnly = prevJob?.status === updatedJob.status && 
                       prevJob?.progress_percentage !== updatedJob.progress_percentage
  
  if (statusChanged) {
    queryClient.invalidateQueries({ queryKey: analysisKeys.jobs() })
    queryClient.invalidateQueries({ queryKey: analysisKeys.stats() })
  } else if (!progressOnly) {
    // Structural change (results, etc.) — use optimistic update
    queryClient.setQueryData(analysisKeys.jobs(), (old: AnalysisJob[] | undefined) => {
      if (!old) return old
      return old.map(job => job.id === updatedJob.id ? updatedJob : job)
    })
  }
}, [queryClient])
```

---

## 2. Race Conditions in Async Operations

### 🔴 CRITICAL: Polling + Subscription on Same Query

**Location:** `packages/app/hooks/useAnalysis.ts:313-334`

**Problem:**
`useAnalysisJobPolling` polls every 2-5 seconds while `useAnalysisJobSubscription` updates the cache via Realtime. **These race each other**:

1. Poll fires → fetches job → updates cache
2. Realtime fires → updates cache with newer data
3. Poll resolves → **overwrites newer Realtime data** with stale poll result

**You have no request deduplication.** If polling takes 1s and Realtime fires 3 times during that window, you get 4 cache updates in random order.

**Fix:**
```typescript
export function useAnalysisJobPolling(id: number, enabled = true) {
  const queryClient = useQueryClient()
  
  return useQuery({
    queryKey: analysisKeys.job(id),
    queryFn: async () => {
      // Abort if subscription already updated more recently
      const cached = queryClient.getQueryData<AnalysisJob>(analysisKeys.job(id))
      const cachedUpdatedAt = cached?.updated_at
      
      const job = await getAnalysisJob(id)
      
      // Only use poll result if it's newer than cache
      if (cachedUpdatedAt && job?.updated_at) {
        const cachedTime = new Date(cachedUpdatedAt).getTime()
        const pollTime = new Date(job.updated_at).getTime()
        if (pollTime <= cachedTime) {
          // Subscription already has newer data, return cache
          return cached
        }
      }
      
      return job
    },
    enabled: enabled && !!id,
    // Disable polling if subscription is active (detect via store)
    refetchInterval: (query) => {
      const hasActiveSubscription = useAnalysisSubscriptionStore
        .getState()
        .subscriptions.has(`job:${id}`)
      
      if (hasActiveSubscription) {
        return false // Let Realtime handle updates
      }
      
      const data = query.state.data
      if (!data || data.status === 'completed' || data.status === 'failed') {
        return false
      }
      return data.status === 'processing' ? 2000 : 5000
    },
  })
}
```

**Better fix:** **Don't poll if subscription exists.** Use polling as fallback only.

---

### 🔴 CRITICAL: No Abort Controllers Anywhere

**Location:** Every async operation in `packages/app`

**Problem:**
- `getAnalysisIdForJobId()` — no abort signal
- `fetchHistoricalAnalysisData()` — no abort signal
- `subscribeToAnalysisFeedbacks()` — subscription cleanup exists, but fetch on mount has no abort
- All `useQuery` hooks — TanStack Query handles this, but your manual fetches don't

**Impact:**
- Component unmounts → requests continue → state updates on unmounted component
- Memory leaks from unresolved promises
- Wasted network bandwidth

**Fix Pattern:**
```typescript
// In hooks with async operations
useEffect(() => {
  const abortController = new AbortController()
  
  const fetchData = async () => {
    try {
      const data = await apiCall({ signal: abortController.signal })
      if (!abortController.signal.aborted) {
        setData(data)
      }
    } catch (error) {
      if (error.name !== 'AbortError' && !abortController.signal.aborted) {
        setError(error)
      }
    }
  }
  
  void fetchData()
  
  return () => {
    abortController.abort()
  }
}, [dependencies])
```

**Required changes:**
1. `analysisService.ts:538` — add `signal` parameter to `getAnalysisIdForJobId`
2. `useAnalysisState.ts:413` — pass abort signal to UUID fetch
3. `useFeedbackStatusIntegration.ts:507` — abort initial feedback fetch
4. All manual `fetch()` calls — add abort signal

---

### 🟡 MEDIUM: Duplicate Subscription Attempts

**Location:** `packages/app/features/VideoAnalysis/stores/analysisSubscription.ts:88-154`

**Problem:**
`subscribe()` checks if subscription exists, but **between the check and the actual subscription setup, another call can slip through**. You set status to `'pending'` but don't prevent concurrent calls.

**Fix:**
```typescript
subscribe: async (_key, options) => {
  const subscriptionKey = buildSubscriptionKey(options)
  if (!subscriptionKey) return

  const state = get()
  const existing = state.subscriptions.get(subscriptionKey)

  // Guard: if already active/pending, return existing promise
  if (existing && (existing.status === 'pending' || existing.status === 'active')) {
    return
  }

  // Set pending immediately to prevent concurrent calls
  set((draft) => {
    const current = draft.subscriptions.get(subscriptionKey)
    draft.subscriptions.set(subscriptionKey, {
      ...current,
      status: 'pending',
    })
  })

  try {
    const unsubscribe = await createSubscription(subscriptionKey, options, get, set)
    
    set((draft) => {
      const current = draft.subscriptions.get(subscriptionKey)
      if (current) {
        current.status = 'active'
        current.subscription = unsubscribe
        current.retryAttempts = 0
      }
    })
  } catch (error) {
    set((draft) => {
      const current = draft.subscriptions.get(subscriptionKey)
      if (current) {
        current.status = 'failed'
        current.lastError = error instanceof Error ? error.message : String(error)
      }
    })
    throw error
  }
}
```

**Also needed:** Store subscription promise in state to dedupe concurrent calls.

---

### 🟡 MEDIUM: Feedback Subscription Race on Mount

**Location:** `packages/app/features/VideoAnalysis/stores/feedbackStatus.ts:471-556`

**Problem:**
`subscribeToAnalysisFeedbacks()` fetches existing feedbacks **then** sets up Realtime. If feedbacks are inserted between fetch and subscription setup, you miss them. Backend creates feedbacks immediately after analysis completes, so this window exists.

**Fix:**
```typescript
subscribeToAnalysisFeedbacks: async (analysisId) => {
  // ... guard checks ...

  // Fetch existing feedbacks FIRST
  const existingFeedbacks = await fetchExistingFeedbacks(analysisId)
  
  // Add to store
  existingFeedbacks.forEach(feedback => {
    get().addFeedback(feedback)
  })

  // Set up subscription with backfill check
  const channel = supabase
    .channel(`analysis_feedback:${analysisId}`)
    .on('postgres_changes', { /* ... */ }, (payload) => {
      // Handle updates
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        // Double-check: fetch again after subscription to catch missed inserts
        const missedFeedbacks = await fetchExistingFeedbacks(analysisId)
        const existingIds = new Set(get().getFeedbacksByAnalysisId(analysisId).map(f => f.id))
        
        missedFeedbacks
          .filter(f => !existingIds.has(f.id))
          .forEach(feedback => get().addFeedback(feedback))
      }
    })
  
  // ...
}
```

---

## 3. State Synchronization Issues

### 🔴 CRITICAL: Zustand + TanStack Query Dual Write

**Location:** Multiple files

**Problem:**
You write to **both** Zustand stores AND TanStack Query cache. They can drift:

1. `analysisSubscription.ts:580` — writes to Zustand store
2. `useAnalysisRealtime.ts:23` — writes to Zustand store
3. `useAnalysisRealtime.ts:26` — writes to TanStack Query cache
4. `useAnalysis.ts:259` — writes to TanStack Query cache via subscription

**No single source of truth.** Components reading from Zustand see one state, components reading from TanStack Query see another.

**Example drift:**
```typescript
// Component A subscribes to Zustand
const job = useAnalysisStatusStore(state => state.jobs.get(jobId))

// Component B uses TanStack Query
const { data: job } = useAnalysisJob(jobId)

// Realtime update comes in:
// 1. Zustand updates → Component A re-renders with new data
// 2. TanStack Query updates → Component B re-renders with new data
// 3. Polling resolves → TanStack Query overwrites with stale data
// 4. Component B now shows stale data while Component A shows fresh data
```

**Fix Strategy:**
**Option A:** TanStack Query as single source, Zustand as derived (read-only)
```typescript
// Zustand only reads from TanStack Query
const job = useAnalysisStatusStore(state => {
  const cached = queryClient.getQueryData<AnalysisJob>(analysisKeys.job(jobId))
  return cached ?? null
})
```

**Option B:** Zustand as single source, TanStack Query as cache layer
```typescript
// TanStack Query reads from Zustand on cache miss
const { data: job } = useQuery({
  queryKey: analysisKeys.job(id),
  queryFn: () => {
    const cached = queryClient.getQueryData<AnalysisJob>(analysisKeys.job(id))
    if (cached) return cached
    
    // Fallback to Zustand
    return useAnalysisStatusStore.getState().jobs.get(id) ?? getAnalysisJob(id)
  }
})
```

**Option C (Recommended):** **Eliminate Zustand for server state.** Use TanStack Query only. Zustand for UI-only state (playback, animations).

---

### 🟡 MEDIUM: UUID Cache in Two Places

**Location:** `useAnalysisState.ts:358-421` + `videoHistory.ts`

**Problem:**
UUID is cached in:
1. TanStack Query: `['analysis', 'uuid', jobId]`
2. Zustand `useVideoHistoryStore`: `getUuid(jobId)`

Both get updated, but **no sync guarantee**. If one fails to update, you have inconsistent UUID lookups.

**Fix:**
Use TanStack Query as single source. Zustand can read from it:

```typescript
const getUuid = (jobId: number): string | null => {
  // Read from TanStack Query first
  const cached = queryClient.getQueryData<string>(analysisKeys.uuid(jobId))
  if (cached) return cached
  
  // Fallback to Zustand (for persistence across app restarts)
  return useVideoHistoryStore.getState().getUuid(jobId) ?? null
}
```

---

## 4. Cache Boundary Violations

### 🔴 CRITICAL: Updates During Render

**Location:** `packages/app/features/VideoAnalysis/stores/analysisStatus.ts:284-496`

**Problem:**
`setJobResults()` calls `setTimeout(() => { ... }, 0)` to "defer" updates, but **this still runs during React render cycle** (just on next tick). You're updating Zustand store during render, which triggers subscriptions that cause re-renders.

**Worse:** The `setTimeout` callback has **no cleanup**. If component unmounts, the timeout still fires and updates state.

**Fix:**
```typescript
setJobResults: (jobId, results, poseData) => {
  // Update Zustand synchronously (this is fine, Zustand handles batching)
  get().updateJob(jobId, {
    status: 'completed',
    progress_percentage: 100,
    processing_completed_at: new Date().toISOString(),
    results,
    pose_data: poseData,
  })

  // Schedule async cache update OUTSIDE render cycle
  queueMicrotask(() => {
    try {
      const job = get().jobs.get(jobId)
      if (!job) return

      // Update video history cache (non-blocking)
      const historyStore = useVideoHistoryStore.getState()
      // ... rest of cache update logic ...
    } catch (error) {
      log.error('analysisStatus', 'Failed to write to video history cache', { error })
    }
  })
}
```

**Better:** Use `useEffect` in component to update cache after Zustand update propagates.

---

### 🟡 MEDIUM: Selector Side Effects

**Location:** `packages/app/features/VideoAnalysis/stores/analysisSubscription.ts:407-556`

**Problem:**
`handleTitleUpdate()` calls `setTimeout(async () => { ... }, 0)` which updates Zustand store. This is called from a **subscription callback**, which may fire during render (if subscription is set up synchronously).

**Fix:**
```typescript
function handleTitleUpdate(/* ... */) {
  // Don't use setTimeout — use proper async scheduling
  Promise.resolve().then(async () => {
    // This runs in next microtask, after render completes
    try {
      const historyStore = useVideoHistoryStore.getState()
      // ... update logic ...
    } catch (error) {
      log.warn('AnalysisSubscriptionStore', 'Error updating cache with title', { error })
    }
  })
}
```

---

### 🟡 MEDIUM: Query Invalidation in Subscription Callbacks

**Location:** `packages/app/hooks/useAnalysisRealtime.ts:29-30`

**Problem:**
`invalidateQueries()` is called **synchronously** in a subscription callback. This can trigger refetches during render if the subscription fires synchronously.

**Fix:**
```typescript
const handleAnalysisUpdate = useCallback((payload: any) => {
  const updatedJob = payload.new as AnalysisJob
  
  // Update cache synchronously (safe)
  updateJobInCache(updatedJob)
  
  // Schedule invalidation for after render
  queueMicrotask(() => {
    const currentJob = queryClient.getQueryData<AnalysisJob>(analysisKeys.job(updatedJob.id))
    if (currentJob?.status !== updatedJob.status) {
      queryClient.invalidateQueries({ queryKey: analysisKeys.jobs() })
      queryClient.invalidateQueries({ queryKey: analysisKeys.stats() })
    }
  })
}, [queryClient])
```

---

## 5. Concrete Fixes Ranked by Severity

### P0 — Data Loss/Corruption

1. **Fix dual-write Zustand + TanStack Query**
   - **Impact:** Components show different data
   - **Effort:** High (requires architectural decision)
   - **Fix:** Choose single source of truth (recommend TanStack Query only)

2. **Add abort controllers to all async operations**
   - **Impact:** Memory leaks, state updates on unmounted components
   - **Effort:** Medium (mechanical changes)
   - **Fix:** Add `signal` parameter to all async functions, use in `useEffect` cleanup

3. **Fix query key consistency**
   - **Impact:** Stale cache entries
   - **Effort:** Low (update all cache writes to use helper)
   - **Fix:** Create `updateJobInCache()` helper, use everywhere

### P1 — Race Conditions

4. **Disable polling when subscription active**
   - **Impact:** Poll overwrites Realtime updates
   - **Effort:** Low (add guard check)
   - **Fix:** Check subscription status in `refetchInterval`

5. **Deduplicate subscription attempts**
   - **Impact:** Duplicate subscriptions waste resources
   - **Effort:** Low (add promise caching)
   - **Fix:** Store subscription promise in state, return existing if pending

6. **Fix feedback subscription backfill**
   - **Impact:** Missed feedback items on mount
   - **Effort:** Low (add double-check after subscription)
   - **Fix:** Re-fetch after subscription confirms

### P2 — Performance/Optimization

7. **Conditional invalidation (status changes only)**
   - **Impact:** Unnecessary refetches on progress updates
   - **Effort:** Low (add status check)
   - **Fix:** Only invalidate if status/structural change

8. **Move cache updates out of render cycle**
   - **Impact:** Re-render cascades
   - **Effort:** Medium (refactor setTimeout to queueMicrotask/useEffect)
   - **Fix:** Use `queueMicrotask` or move to component `useEffect`

---

## 6. Anti-Patterns You're Using

### ❌ "Let's add another store to fix state sync"

You have **5 Zustand stores** for analysis state:
1. `analysisStatus` — job tracking
2. `analysisSubscription` — subscription state
3. `feedbackStatus` — feedback tracking
4. `videoHistory` — cache persistence
5. `uploadProgress` — upload state

**Each store syncs with TanStack Query separately.** This is **not solving the problem**, it's **multiplying it**.

**Fix:** Consolidate. Use TanStack Query for server state, Zustand for UI-only state (playback, animations, form state).

---

### ❌ "setTimeout(0) fixes everything"

You use `setTimeout(() => { ... }, 0)` in **8 places** to "defer" updates. This doesn't fix render boundary violations — it just delays them.

**Fix:** Use `queueMicrotask()` for immediate post-render work, or `useEffect` for component-scoped updates.

---

### ❌ "Invalidate everything on every update"

You call `invalidateQueries({ queryKey: ['analysis-history'] })` on **every** subscription update, even progress-only updates. This causes **unnecessary refetches** of list queries.

**Fix:** Invalidate only on structural changes (status, results), use optimistic updates for progress.

---

## Summary

Your pipeline has **solid architecture** (Zustand + TanStack Query + Realtime), but **poor execution** (no abort controllers, dual writes, cache key inconsistencies, render boundary violations).

**Priority fixes:**
1. Choose single source of truth (TanStack Query recommended)
2. Add abort controllers everywhere
3. Fix query key consistency
4. Disable polling when subscriptions active

**Estimated effort:** 2-3 days for P0 fixes, 1 week for full cleanup.

**Risk if not fixed:** Users will see stale data, duplicate requests waste bandwidth, memory leaks cause app crashes on low-end devices.

