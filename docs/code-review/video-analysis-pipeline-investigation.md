# Video Analysis Pipeline - Critical Issues Investigation

**Date:** 2025-01-XX  
**Issues Investigated:** 3 critical issues from code review

---

## Issue 1: Subscription Race Conditions

### Problem Statement
Subscribing via `recordingId` before job exists can miss updates if the job is created between the initial backfill check and subscription setup.

### Current Implementation Analysis

**Location:** `packages/api/src/services/analysisService.ts:585-733`

The `subscribeToLatestAnalysisJobByRecordingId` function:

1. ✅ **Performs health check** (lines 596-612)
2. ✅ **Fetches initial job** via `getLatestAnalysisJobForRecordingId()` (lines 614-643)
3. ✅ **Subscribes to realtime changes** with filter `video_recording_id=eq.${recordingId}` (lines 656-711)
4. ⚠️ **Race condition window:** Between step 2 and step 3

**Race Condition Scenario:**
```
Time T0: Client subscribes via recordingId=123
Time T1: Backfill check runs → no job found (returns null)
Time T2: DB trigger fires → creates analysis_jobs record (status='queued')
Time T3: Realtime subscription established
Time T4: Job status changes to 'processing' → ✅ Subscription catches this
```

**Problem:** If job is created between T1 and T3, the initial job creation event is missed. However, subsequent updates ARE caught.

### Mitigation Mechanisms Found

**Location:** `packages/app/features/VideoAnalysis/stores/analysisSubscription.ts:783-883`

1. ✅ **Backfill check on empty result** (line 783-784)
   - When `BACKFILL_EMPTY` status is received, `scheduleBackfillCheck()` is called
   - Retries fetching job after 500ms delay (line 873)

2. ⚠️ **Single retry only** - `scheduleBackfillCheck` only runs once
   - If job still doesn't exist after 500ms, no further checks

3. ✅ **Realtime subscription catches future updates**
   - Once subscription is active, all future status changes are caught
   - Filter: `video_recording_id=eq.${recordingId}` ensures all jobs for that recording are received

### Verdict

**Status:** ⚠️ **PARTIALLY MITIGATED** - Race condition exists but impact is limited

**Why it's not critical:**
- Realtime subscription catches all updates after it's established
- Backfill check provides one retry opportunity
- Worst case: User sees "upload complete" → brief delay → analysis starts (acceptable UX)

**Why it could be improved:**
- Backfill check only runs once (500ms delay)
- If trigger is slow (>500ms), initial job creation is missed
- User might see "waiting for analysis" longer than necessary

### Recommendations

**Option 1: Multiple backfill retries (Recommended)**
```typescript
// In scheduleBackfillCheck
let retryCount = 0
const maxRetries = 5
const retryDelays = [500, 1000, 2000, 3000, 5000] // ms

const attemptBackfill = async () => {
  const job = await getLatestAnalysisJobForRecordingId(recordingId)
  if (job) {
    handleJobUpdate(key, job, set, get)
  } else if (retryCount < maxRetries) {
    retryCount++
    setTimeout(attemptBackfill, retryDelays[retryCount - 1])
  }
}
```

**Option 2: Polling fallback (More robust)**
- If subscription doesn't receive job within 2 seconds, start polling every 1s
- Stop polling once job is found or subscription receives update

**Priority:** Medium (UX improvement, not critical bug)

---

## Issue 2: Missing Error Recovery UI

### Problem Statement
Failed analysis jobs have no retry button in the UI. Users can't restart failed analyses.

### Current Implementation Analysis

**Error State Detection:**
- ✅ **Location:** `packages/app/features/VideoAnalysis/hooks/useAnalysisState.ts:183-190`
- ✅ **Error phase set correctly:** When `analysisStatus.status === 'failed'`
- ✅ **Error message passed:** `error.message` from analysis status

**Error UI Rendering:**
- ✅ **Location:** `packages/app/features/VideoAnalysis/components/VideoAnalysisLayout.web.tsx:91-96`
- ✅ **Component:** `UploadErrorState` is rendered for errors
- ⚠️ **Problem:** `UploadErrorState` is designed for upload errors, not analysis errors

**Retry Handler:**
- ✅ **Location:** `packages/app/features/VideoAnalysis/VideoAnalysisScreen.tsx:704`
- ✅ **Handler exists:** `analysisState.retry` is passed to error state
- ❌ **Implementation missing:** `useAnalysisState` doesn't export a `retry` function

**Code Evidence:**
```typescript
// VideoAnalysisScreen.tsx:704
onRetry: analysisState.retry,  // ❌ This property doesn't exist!

// useAnalysisState.ts - No retry function exported
export function useAnalysisState(...): AnalysisStateResult {
  // ... no retry function defined
}
```

### Verdict

**Status:** ❌ **CONFIRMED BUG** - Retry UI exists but handler is missing

**Impact:**
- Users see error state when analysis fails
- "Try Again" button is rendered (via `UploadErrorState`)
- Clicking button does nothing (no handler implementation)

### Root Cause

1. `UploadErrorState` component accepts `onRetry` prop ✅
2. `VideoAnalysisScreen` passes `analysisState.retry` ❌ (doesn't exist)
3. `useAnalysisState` hook doesn't provide retry function ❌

### Recommendations

**Fix 1: Add retry function to useAnalysisState**

```typescript
// In useAnalysisState.ts
export function useAnalysisState(...): AnalysisStateResult {
  // ... existing code ...
  
  const retry = useCallback(async () => {
    if (!videoRecordingId || !analysisStatus.job) {
      log.warn('useAnalysisState', 'Cannot retry - missing recordingId or job')
      return
    }
    
    // Call Edge Function to restart analysis
    const { startGeminiVideoAnalysis } = await import('@my/api')
    await startGeminiVideoAnalysis({
      videoPath: analysisStatus.job.video_recording_id, // Need to fetch storage_path
      videoSource: 'uploaded_video',
      timingParams: undefined, // Let backend compute
    })
  }, [videoRecordingId, analysisStatus.job])
  
  return {
    // ... existing properties ...
    retry, // ✅ Add retry function
  }
}
```

**Fix 2: Create dedicated AnalysisErrorState component**

```typescript
// Better: Separate component for analysis errors
export function AnalysisErrorState({
  visible,
  errorMessage,
  onRetry,
  onBack,
}: AnalysisErrorStateProps) {
  // Similar to UploadErrorState but with analysis-specific messaging
}
```

**Priority:** High (User-facing bug, blocks error recovery)

---

## Issue 3: RLS Policy Verification

### Problem Statement
Unclear if `analysis_jobs` table has proper Row Level Security (RLS) policies enabled.

### Investigation Results

**RLS Status:**
- ✅ **RLS Enabled:** `ALTER TABLE "public"."analysis_jobs" ENABLE ROW LEVEL SECURITY;`
  - **Location:** `supabase/migrations/20250926120229_initial_baseline.sql:1811`

**Policies Found:**

1. ✅ **SELECT Policy:** "Users can view their own analysis jobs"
   ```sql
   CREATE POLICY "Users can view their own analysis jobs" 
   ON "public"."analysis_jobs" 
   FOR SELECT TO "authenticated" 
   USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));
   ```
   - **Location:** Line 1790
   - **Verdict:** ✅ Correct - Users can only see their own jobs

2. ✅ **INSERT Policy:** "Users can insert their own analysis jobs"
   ```sql
   CREATE POLICY "Users can insert their own analysis jobs" 
   ON "public"."analysis_jobs" 
   FOR INSERT TO "authenticated" 
   WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));
   ```
   - **Location:** Line 1703
   - **Verdict:** ✅ Correct - Users can only create jobs for themselves

3. ✅ **UPDATE Policy:** "Users can update their own analysis jobs"
   ```sql
   CREATE POLICY "Users can update their own analysis jobs" 
   ON "public"."analysis_jobs" 
   FOR UPDATE TO "authenticated" 
   USING ((( SELECT "auth"."uid"() AS "uid") = "user_id")) 
   WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));
   ```
   - **Location:** Line 1747
   - **Verdict:** ✅ Correct - Users can only update their own jobs

4. ✅ **Service Role Policy:** "Service role can manage all analysis jobs"
   ```sql
   CREATE POLICY "Service role can manage all analysis jobs" 
   ON "public"."analysis_jobs" 
   TO "service_role" 
   USING (true) 
   WITH CHECK (true);
   ```
   - **Location:** Line 1644
   - **Verdict:** ✅ Correct - Service role (Edge Functions) can manage all jobs

5. ❌ **DELETE Policy:** **MISSING**
   - No policy found for DELETE operations
   - **Impact:** Users cannot delete their own analysis jobs (might be intentional)

### Verdict

**Status:** ✅ **RLS PROPERLY CONFIGURED** (with one minor gap)

**Summary:**
- ✅ RLS is enabled
- ✅ SELECT, INSERT, UPDATE policies are correct
- ✅ Service role has full access (needed for Edge Functions)
- ⚠️ DELETE policy is missing (might be intentional - jobs are historical records)

### Security Assessment

**SELECT Operations:**
- ✅ Users can only query their own jobs
- ✅ Verified in `getLatestAnalysisJobForRecordingId()` - adds `user_id` filter (line 521)
- ✅ Realtime subscriptions respect RLS (Supabase enforces automatically)

**INSERT Operations:**
- ✅ Users can only create jobs with their own `user_id`
- ✅ Trigger `enqueue_analysis_job_on_upload_complete()` uses `NEW.user_id` (line 215)
- ✅ Edge Functions use service role (bypasses RLS, but validates ownership)

**UPDATE Operations:**
- ✅ Users can only update their own jobs
- ✅ Edge Functions update via service role (validates ownership in code)

**Potential Security Issue:**
- ⚠️ **Edge Function validation:** `handleStartAnalysis.ts:93` checks `user_id` match
  - This is redundant (RLS would block), but good defense-in-depth
  - ✅ **Verified:** Additional check exists (lines 102-109)

### Recommendations

**Option 1: Add DELETE policy (if needed)**
```sql
CREATE POLICY "Users can delete their own analysis jobs" 
ON "public"."analysis_jobs" 
FOR DELETE TO "authenticated" 
USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));
```

**Option 2: Document that DELETE is intentionally disabled**
- Add comment in migration explaining why DELETE is not allowed
- Jobs are historical records and should be retained

**Priority:** Low (Security is sound, DELETE policy is design decision)

---

## Summary

| Issue | Status | Priority | Action Required |
|-------|--------|----------|-----------------|
| 1. Subscription Race Conditions | ⚠️ Partially Mitigated | Medium | Add multiple backfill retries |
| 2. Missing Error Recovery UI | ❌ Confirmed Bug | **High** | Implement retry function in `useAnalysisState` |
| 3. RLS Policy Verification | ✅ Properly Configured | Low | Document DELETE policy decision |

### Immediate Actions

1. **High Priority:** Implement `retry` function in `useAnalysisState` hook
2. **Medium Priority:** Add exponential backoff retries to backfill check
3. **Low Priority:** Document DELETE policy decision or add policy if needed

---

**Investigation Complete** ✅

