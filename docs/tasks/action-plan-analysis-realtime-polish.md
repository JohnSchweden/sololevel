# Action Plan: Analysis Realtime Subscription Polish

## Context
After implementing the core realtime subscription fixes, logs reveal minor polish issues:
- Duplicate "Setting up..." logs due to log placement before guard checks
- CHANNEL_ERROR logs fire before throttle logic can suppress them
- UUID lookup fails initially because `analyses` row doesn't exist yet (timing issue with backend trigger)

## Objectives
1. Move subscription setup logs after guard checks to eliminate duplicates
2. Apply throttling to the initial CHANNEL_ERROR log, not just retries
3. Add retry logic to `getAnalysisIdForJobId` with exponential backoff
4. Surface a single warning to UI after retry exhaustion

## Scope
**In scope:**
- Log placement optimization in `VideoAnalysisScreen.tsx`
- CHANNEL_ERROR log throttling at first error, not just subsequent ones
- UUID retry logic with 3 attempts (200ms, 400ms, 800ms)
- Optional: UI warning indicator for channel exhaustion

**Out of scope:**
- Changing subscription logic (already working)
- Modifying backend trigger timing
- Changing backfill re-check mechanism

## Implementation Steps

### 1. Fix duplicate setup logs
**File:** `packages/app/features/VideoAnalysis/VideoAnalysisScreen.tsx`

**Change:** Move the "Setting up analysis job subscription by recording ID" log to *after* the `pendingKeyRef` guard check.

**Before:**
```typescript
log.info('VideoAnalysisScreen', 'Setting up analysis job subscription by recording ID', {
  recordingId,
  subscriptionKey
})

if (pendingKeyRef.current === subscriptionKey) {
  return
}
```

**After:**
```typescript
if (pendingKeyRef.current === subscriptionKey) {
  return
}

log.info('VideoAnalysisScreen', 'Setting up analysis job subscription by recording ID', {
  recordingId,
  subscriptionKey
})
```

### 2. Throttle initial CHANNEL_ERROR logs
**File:** `packages/app/features/VideoAnalysis/VideoAnalysisScreen.tsx`

**Change:** Move the streak check and throttling logic to the top of `handleChannelError`, before the first error log.

**Current issue:** Lines 39-43 show two ERROR logs before throttling kicks in.

**Fix:** The throttle check is already in place but needs to fire earlier. Ensure `lastChannelErrorTimeRef` and `channelErrorStreakRef` are checked *before* any `log.error()` calls.

### 3. Add UUID retry logic
**File:** `packages/api/src/services/analysisService.ts`

**New function:**
```typescript
export async function getAnalysisIdForJobId(
  jobId: number,
  options?: { maxRetries?: number; baseDelay?: number }
): Promise<string | null> {
  const maxRetries = options?.maxRetries ?? 3
  const baseDelay = options?.baseDelay ?? 200

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    const { data: analysis, error } = await (supabase as any)
      .from('analyses')
      .select('analyses.id, analysis_jobs!inner(user_id, status)')
      .eq('job_id', jobId)
      .eq('analysis_jobs.user_id', user.id)
      .eq('analysis_jobs.status', 'completed')
      .maybeSingle()

    if (error) {
      throw new Error(`Failed to get analysis ID for job ${jobId}: ${error.message}`)
    }

    if (analysis?.id) {
      return String(analysis.id)
    }

    // Retry with exponential backoff
    if (attempt < maxRetries) {
      const delay = baseDelay * 2 ** (attempt - 1)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  return null
}
```

**Update call site in `VideoAnalysisScreen.tsx`:**
```typescript
useEffect(() => {
  if (effectiveAnalysisJobId) {
    getAnalysisIdForJobId(effectiveAnalysisJobId, { maxRetries: 3, baseDelay: 200 })
      .then((uuid) => {
        if (uuid) {
          setAnalysisUuid(uuid)
          log.info('VideoAnalysisScreen', 'Analysis UUID resolved for feedback queries', {
            jobId: effectiveAnalysisJobId,
            analysisUuid: uuid
          })
        } else {
          log.warn('VideoAnalysisScreen', 'No analysis UUID found after retries', {
            jobId: effectiveAnalysisJobId
          })
        }
      })
      .catch((error) => {
        log.error('VideoAnalysisScreen', 'Failed to get analysis UUID', {
          jobId: effectiveAnalysisJobId,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      })
  } else {
    setAnalysisUuid(null)
  }
}, [effectiveAnalysisJobId])
```

### 4. Optional: UI warning for channel exhaustion
**File:** `packages/app/features/VideoAnalysis/VideoAnalysisScreen.tsx`

**Add state:**
```typescript
const [channelExhausted, setChannelExhausted] = useState(false)
```

**Update `handleChannelError`:**
```typescript
if (retryStateRef.current.attempts >= maxRetries) {
  log.warn('VideoAnalysisScreen', 'Channel error retry exhausted', {
    error,
    attempts: retryStateRef.current.attempts,
    maxRetries,
    subscriptionKey,
  })
  retryStateRef.current.attempts = 0
  setChannelExhausted(true) // Signal UI
  return
}
```

**Render warning in UI** (minimal, non-blocking):
```tsx
{channelExhausted && (
  <YStack position="absolute" top="$4" right="$4" padding="$2" backgroundColor="$orange9" borderRadius="$2">
    <Text color="$white" fontSize="$2">Connection unstable</Text>
  </YStack>
)}
```

## Test Plan

### Unit Tests
- Verify log order: setup log appears only after guard check passes
- Verify throttle: 3+ rapid CHANNEL_ERRORs produce max 2 error logs
- Verify UUID retry: mock `getAnalysisIdForJobId` to fail twice, succeed on third attempt

### Manual Testing
1. Run pipeline test
2. Verify logs show:
   - Single "Setting up..." log per subscription
   - Max 2 CHANNEL_ERROR logs before suppression kicks in
   - "Analysis UUID resolved" log after retries
3. Verify UI shows "Connection unstable" warning if channel exhausted

## Acceptance Criteria
- [ ] "Setting up..." log appears only once per subscription key
- [ ] CHANNEL_ERROR logs are throttled from the first occurrence
- [ ] `getAnalysisIdForJobId` retries up to 3 times before giving up
- [ ] Logs show "No analysis UUID found after retries" only if all attempts fail
- [ ] (Optional) UI shows connection warning after retry exhaustion

## Rollout
1. Implement fixes in order (logs → throttle → UUID retry → UI)
2. Run unit tests after each step
3. Run full pipeline test to verify end-to-end behavior
4. Update `docs/spec/status.md` with "Analysis Realtime Polish" completion

## Definition of Done
- [ ] All unit tests pass
- [ ] Manual pipeline test shows clean logs (max 1 setup log, max 2 CHANNEL_ERROR logs)
- [ ] UUID resolves successfully after job completes
- [ ] `docs/spec/status.md` updated
- [ ] `docs/tasks/tasks.md` updated with completion status

