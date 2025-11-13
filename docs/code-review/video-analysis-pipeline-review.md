# Video Analysis Pipeline Code Review

**Date:** 2025-01-XX  
**Scope:** Video upload → analysis → feedback availability pipeline (App + API)  
**Reviewer:** AI Assistant

## Executive Summary

The pipeline implements a server-driven architecture where video uploads automatically trigger analysis via database triggers. The client subscribes to realtime updates through Supabase Realtime subscriptions. The design is solid but has several areas requiring attention: error handling gaps, missing accessibility features, and potential race conditions in subscription management.

---

## 1. Data Flow Analysis

### Pipeline Overview

```
1. Client Upload
   └─> videoUploadAndAnalysis.ts::startUploadAndAnalysis()
       ├─> Compression (optional)
       ├─> uploadVideo() → Supabase Storage
       └─> DB trigger: enqueue_analysis_job_on_upload_complete()
           └─> Creates analysis_jobs record (status='queued')

2. Backend Processing (Auto-triggered)
   └─> DB webhook → ai-analyze-video Edge Function
       └─> processAIPipeline()
           ├─> Video Analysis (Gemini)
           ├─> Store feedback items (analysis_feedback table)
           ├─> SSML generation (async worker)
           └─> TTS audio generation (async worker)

3. Client Subscription
   └─> useAnalysisState() hook
       ├─> analysisSubscription.ts → subscribes to analysis_jobs
       ├─> feedbackStatus.ts → subscribes to analysis_feedback
       └─> Real-time updates via Supabase Realtime
```

### New Patterns Identified

**Pattern 1: Server-Driven Analysis Kickoff**
- **Location:** `supabase/migrations/20250926120229_initial_baseline.sql:200-232`
- **Pattern:** Database trigger automatically creates `analysis_jobs` when `video_recordings.upload_status` changes to `'completed'`
- **Why:** Eliminates client-side race conditions and ensures analysis always starts after successful upload
- **Risk:** If webhook fails, job remains `'queued'` indefinitely (no retry mechanism visible)

**Pattern 2: Dual Subscription Strategy**
- **Location:** `analysisSubscription.ts:298-383`
- **Pattern:** Supports both `analysisJobId` and `recordingId` subscription keys
- **Why:** Flexible - can subscribe before job exists (via recordingId) or after (via jobId)
- **Risk:** Complex subscription lifecycle management (see issues below)

**Pattern 3: Content-Based Memoization**
- **Location:** `useAnalysisState.ts:463-490`
- **Pattern:** Signature-based comparison to stabilize feedback items array reference
- **Why:** Prevents unnecessary re-renders when object references change but content is identical
- **Risk:** Signature generation could miss edge cases (e.g., text changes beyond first 20 chars)

**Pattern 4: 3-Tier Thumbnail Caching**
- **Location:** `analysisSubscription.ts:439-499`, `analysisStatus.ts:359-429`
- **Pattern:** Disk cache → Cloud URL → Metadata fallback
- **Why:** Optimizes thumbnail loading performance
- **Risk:** Cache invalidation not handled when thumbnails are updated

---

## 2. Infrastructure Impact

### Database Changes

**Migration:** `20250926120229_initial_baseline.sql`
- ✅ **Trigger:** `enqueue_analysis_job_on_upload_complete()` - Auto-creates analysis jobs
- ✅ **Function:** `webhook_analysis_kickoff()` - Callable from Edge Functions
- ⚠️ **Missing:** No migration rollback strategy documented
- ⚠️ **Missing:** No index on `analysis_jobs.video_recording_id` for subscription lookups (check if exists)

**Recommendation:** Verify index exists:
```sql
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_video_recording_id 
ON analysis_jobs(video_recording_id);
```

### Edge Function Changes

**Function:** `ai-analyze-video`
- ✅ **Routes:** `/`, `/status`, `/tts`, `/webhook`, `/health`
- ⚠️ **Missing:** Rate limiting on `/webhook` endpoint (could be abused)
- ⚠️ **Missing:** Request size limits for video uploads
- ✅ **Auth:** JWT validation in `handleStartAnalysis.ts:27-44`

**Recommendation:** Add rate limiting middleware for webhook endpoint.

### Storage Impact

- ✅ **Buckets:** `raw` (videos), `processed` (audio), `thumbnails` (images)
- ✅ **RLS Policies:** Present for authenticated users
- ⚠️ **Missing:** Lifecycle policies for old videos (storage costs will grow)

---

## 3. Empty, Loading, Error, and Offline States

### Empty States

✅ **Upload:** Handled via `UploadProgressStore` - shows pending tasks  
✅ **Analysis:** `useAnalysisState.ts:162-229` - `phase: 'uploading'` → `'analyzing'` → `'generating-feedback'`  
⚠️ **Missing:** Empty state UI when no feedback items exist after analysis completes

### Loading States

✅ **Upload Progress:** Real-time via `uploadProgressStore` with percentage  
✅ **Analysis Progress:** Via `analysisSubscription` store with `progress_percentage`  
✅ **Feedback Progress:** Calculated in `useAnalysisState.ts:152-160` (completed/total)  
⚠️ **Issue:** Progress can go backwards if feedback items are added/removed during processing

### Error States

✅ **Upload Errors:** `uploadProgressStore.setUploadStatus(taskId, 'failed', error)`  
✅ **Analysis Errors:** `analysisStatus.status === 'failed'` → `phase: 'error'`  
✅ **Feedback Errors:** `feedback.hasFailures` → `phase: 'error'`  
⚠️ **Missing:** Retry UI for failed analysis jobs (only upload has retry)  
⚠️ **Missing:** Partial failure handling (some feedback items fail, others succeed)

**Location:** `useAnalysisState.ts:173-201` - Error phase determination

### Offline States

✅ **Offline Queue:** `packages/api/src/services/offlineService.ts` exists  
⚠️ **Issue:** Offline queue only handles uploads, not analysis job creation  
⚠️ **Missing:** Analysis subscription doesn't handle offline → online transition gracefully

**Recommendation:** Add offline detection and queue analysis job creation when connection restored.

---

## 4. Accessibility (A11y) Review

### Keyboard Navigation

❌ **Missing:** Keyboard shortcuts for video playback controls  
❌ **Missing:** Focus management when feedback bubbles appear  
❌ **Missing:** Tab order not documented for video analysis screen

### Focus Management

❌ **Missing:** Focus trap in error modals  
❌ **Missing:** Focus restoration after error dismissal  
⚠️ **Issue:** Video player controls may not be keyboard accessible (needs verification)

### ARIA Roles

❌ **Missing:** `role="progressbar"` on upload/analysis progress indicators  
❌ **Missing:** `aria-live="polite"` for real-time status updates  
❌ **Missing:** `aria-label` on video controls buttons

**Location:** `VideoControls.tsx` - Needs ARIA attributes

### Color Contrast

⚠️ **Unknown:** Progress bar colors not verified for WCAG AA compliance  
⚠️ **Unknown:** Error message text contrast not verified

**Recommendation:** Run automated a11y audit (axe-core, Lighthouse) on video analysis screen.

---

## 5. API Backwards Compatibility

### Public API Changes

**Edge Function:** `ai-analyze-video`
- ✅ **Endpoint:** `POST /ai-analyze-video` - No breaking changes detected
- ✅ **Request Schema:** `VideoProcessingRequest` - Extensible (optional fields)
- ⚠️ **Missing:** API versioning (no `/v1/` prefix)

**Client API:** `@my/api`
- ✅ **Functions:** `uploadVideo()`, `subscribeToAnalysisJob()` - No signature changes
- ⚠️ **Internal:** `analysisService.ts` - Some functions are internal but exported

**Recommendation:** Add API versioning before public release:
```
POST /v1/ai-analyze-video
GET /v1/ai-analyze-video/status
```

### Database Schema Changes

✅ **Backwards Compatible:** New columns are nullable or have defaults  
⚠️ **Risk:** `analysis_feedback` table structure changed (normalized schema) - ensure migrations are applied

---

## 6. Dependencies Review

### New Dependencies

✅ **No new heavy dependencies added**  
✅ **Existing:** Zustand, TanStack Query, Supabase - all justified

### Potential Inlining Opportunities

⚠️ **Consider:** `immer` middleware for Zustand - adds ~3KB, but simplifies immutable updates  
✅ **Keep:** Zustand is battle-tested and provides subscription primitives

**Verdict:** Dependencies are appropriate for MVP. No changes needed.

---

## 7. Testing Coverage

### Existing Tests

⚠️ **Missing:** Integration tests for upload → analysis → feedback pipeline  
⚠️ **Missing:** Tests for subscription lifecycle (subscribe → update → unsubscribe)  
⚠️ **Missing:** Tests for error recovery (failed upload → retry → success)

### Critical Flows Needing Tests

1. **Upload → Analysis Trigger**
   - Test: Upload completes → trigger fires → job created
   - Location: `videoUploadAndAnalysis.ts:254-417`
   - Priority: **HIGH** (core flow)

2. **Subscription Race Conditions**
   - Test: Subscribe before job exists → job created → updates received
   - Location: `analysisSubscription.ts:343-380`
   - Priority: **HIGH** (user-facing bug risk)

3. **Feedback Status Updates**
   - Test: Feedback items created → SSML processing → TTS processing → status updates
   - Location: `feedbackStatus.ts:470-673`
   - Priority: **MEDIUM** (async worker flow)

4. **Error Recovery**
   - Test: Analysis fails → error state shown → retry works
   - Location: `useAnalysisState.ts:173-201`
   - Priority: **MEDIUM** (UX critical)

**Recommendation:** Add E2E test in `e2e/` directory:
```typescript
test('video upload triggers analysis and feedback generation', async () => {
  // 1. Upload video
  // 2. Wait for analysis job creation
  // 3. Verify feedback items appear
  // 4. Verify audio status updates
});
```

---

## 8. Schema Changes & Migrations

### Database Migrations

✅ **Migration:** `20250926120229_initial_baseline.sql` - Comprehensive baseline  
⚠️ **Missing:** Migration rollback scripts  
⚠️ **Missing:** Data migration for existing `analysis_feedback` records (if schema changed)

### Schema Changes Summary

**New Tables:**
- `analysis_jobs` - Job queue (already existed, enhanced)
- `analysis_feedback` - Normalized feedback items (already existed, enhanced)
- `analyses` - Analysis metadata with title (new)

**New Columns:**
- `video_recordings.thumbnail_url` - Cloud CDN URL
- `analyses.title` - AI-generated title

**Recommendation:** Verify migration can be applied to production without downtime (use `IF NOT EXISTS` clauses).

---

## 9. Security Review

### Authentication & Authorization

✅ **Edge Functions:** JWT validation in `handleStartAnalysis.ts:27-44`  
✅ **RLS Policies:** Present for storage buckets  
⚠️ **Missing:** RLS policy verification for `analysis_jobs` table (users should only see their own jobs)

**Check Required:**
```sql
-- Verify RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'analysis_jobs';

-- Verify policy exists
SELECT * FROM pg_policies WHERE tablename = 'analysis_jobs';
```

### Input Validation

✅ **Request Parsing:** `parseVideoProcessingRequest()` in `handleStartAnalysis.ts`  
⚠️ **Missing:** File size limits enforced (could allow large uploads to exhaust storage)

**Recommendation:** Add max file size check:
```typescript
const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500MB
if (file.size > MAX_VIDEO_SIZE) {
  return createErrorResponse('File too large', 400);
}
```

### Secrets Management

✅ **Environment Variables:** Used via `Deno.env.get()`  
⚠️ **Missing:** Validation that required env vars are present at startup

**Recommendation:** Add startup validation:
```typescript
const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
for (const key of requiredEnvVars) {
  if (!Deno.env.get(key)) {
    throw new Error(`Missing required env var: ${key}`);
  }
}
```

---

## 10. Feature Flags

✅ **Existing:** `useMockData` flag in stores  
⚠️ **Missing:** Feature flag for new analysis pipeline (no gradual rollout mechanism)

**Recommendation:** Add feature flag for analysis auto-trigger:
```typescript
if (featureFlags.autoTriggerAnalysis) {
  // Use trigger-based flow
} else {
  // Use client-triggered flow (legacy)
}
```

---

## 11. Internationalization (i18n)

❌ **Missing:** All user-facing strings are hardcoded in English  
❌ **Missing:** Error messages not localized  
❌ **Missing:** Analysis phase labels not localized

**Location:** `useAnalysisState.ts:162-229` - Phase determination returns English strings

**Recommendation:** Extract strings to i18n files:
```typescript
const phases = {
  uploading: t('analysis.phase.uploading'),
  analyzing: t('analysis.phase.analyzing'),
  // ...
};
```

---

## 12. Caching Strategy

### Client-Side Caching

✅ **TanStack Query:** Used for analysis history with `staleTime`  
✅ **Zustand Stores:** In-memory cache for active analysis state  
✅ **Thumbnail Cache:** 3-tier disk cache strategy  
⚠️ **Missing:** Cache invalidation strategy when analysis is re-run

### Server-Side Caching

⚠️ **Missing:** CDN caching for video thumbnails (currently direct storage URLs)  
⚠️ **Missing:** Edge caching for analysis status endpoints

**Recommendation:** Add CDN caching headers for thumbnails:
```typescript
// In uploadVideoThumbnail()
headers: {
  'Cache-Control': 'public, max-age=31536000, immutable'
}
```

---

## 13. Logging & Observability

### Client Logging

✅ **Structured Logging:** `@my/logging` package used throughout  
✅ **Log Levels:** `info`, `warn`, `error` appropriately used  
⚠️ **Missing:** Correlation IDs to trace request across client → Edge Function → DB

### Backend Logging

✅ **Edge Function Logging:** `createLogger()` in `ai-analyze-video/index.ts`  
✅ **Progress Logging:** Analysis progress logged at key milestones  
⚠️ **Missing:** Structured logging format (JSON) for log aggregation

**Recommendation:** Add correlation ID to all log entries:
```typescript
const correlationId = crypto.randomUUID();
logger.info('Analysis started', { correlationId, analysisId });
```

### Critical Logging Gaps

❌ **Missing:** Log when subscription fails to connect  
❌ **Missing:** Log when analysis job remains queued > 5 minutes  
❌ **Missing:** Log when feedback items fail to generate audio

**Location:** `analysisSubscription.ts:789-810` - Error handler should log more context

---

## 14. Critical Issues & Recommendations

### High Priority

1. **Subscription Race Condition**
   - **Issue:** Subscribing via `recordingId` before job exists can miss initial updates
   - **Location:** `analysisSubscription.ts:343-380`
   - **Fix:** Add backfill check with retry logic (partially implemented, needs improvement)

2. **Missing Error Recovery UI**
   - **Issue:** Failed analysis jobs have no retry button
   - **Location:** `useAnalysisState.ts:183-190`
   - **Fix:** Add retry action that calls Edge Function to restart analysis

3. **RLS Policy Verification**
   - **Issue:** Unclear if `analysis_jobs` table has RLS enabled
   - **Fix:** Verify and add policies if missing

### Medium Priority

4. **Offline Support Gaps**
   - **Issue:** Analysis job creation not queued when offline
   - **Fix:** Extend offline queue to handle analysis job creation

5. **Accessibility Gaps**
   - **Issue:** Video controls not keyboard accessible
   - **Fix:** Add ARIA attributes and keyboard handlers

6. **API Versioning**
   - **Issue:** No version prefix on Edge Function routes
   - **Fix:** Add `/v1/` prefix before public release

### Low Priority

7. **Cache Invalidation**
   - **Issue:** Thumbnail cache not invalidated on update
   - **Fix:** Add cache versioning or TTL

8. **Logging Enhancement**
   - **Issue:** Missing correlation IDs
   - **Fix:** Add UUID to all log entries

---

## 15. Test Recommendations

### Unit Tests Needed

```typescript
// packages/app/features/VideoAnalysis/__tests__/analysisSubscription.test.ts
describe('AnalysisSubscriptionStore', () => {
  it('should handle subscription before job exists', async () => {
    // Subscribe via recordingId
    // Verify backfill check runs
    // Verify updates received when job created
  });
  
  it('should retry failed subscriptions', async () => {
    // Simulate subscription failure
    // Verify retry logic with exponential backoff
  });
});
```

### Integration Tests Needed

```typescript
// e2e/video-analysis-pipeline.e2e.ts
test('complete pipeline: upload → analysis → feedback', async () => {
  // 1. Upload video
  // 2. Wait for analysis job
  // 3. Verify feedback items appear
  // 4. Verify audio generation completes
});
```

### E2E Tests Needed

```typescript
// e2e/analysis-error-recovery.e2e.ts
test('analysis failure shows error and allows retry', async () => {
  // 1. Trigger analysis failure (mock)
  // 2. Verify error state shown
  // 3. Click retry
  // 4. Verify analysis restarts
});
```

---

## Summary

### Strengths

✅ Server-driven architecture eliminates client-side race conditions  
✅ Comprehensive realtime subscription system  
✅ Good separation of concerns (stores, hooks, services)  
✅ Structured logging throughout

### Weaknesses

❌ Missing accessibility features (keyboard nav, ARIA)  
❌ Incomplete error recovery UI  
❌ Offline support gaps  
❌ Missing integration tests for critical flows

### Action Items

1. **Immediate:** Verify RLS policies on `analysis_jobs` table
2. **This Sprint:** Add retry UI for failed analysis jobs
3. **Next Sprint:** Add integration tests for upload → analysis pipeline
4. **Before Launch:** Complete accessibility audit and fixes

---

**Review Status:** ✅ Complete  
**Next Steps:** Address high-priority issues, then proceed with medium-priority improvements.

