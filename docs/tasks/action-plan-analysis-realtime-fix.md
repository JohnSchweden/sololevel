## Action Plan — Analysis Realtime Subscription, Backfill, and Render Stability

### Overview
Fix missing `analysisJobId` propagation and noisy subscriptions by tightening the subscription lifecycle, adding deterministic backfill, and reducing render churn. Ship minimal, surgical changes first; refactor later.

### Symptoms
- Duplicate logs: "Setting up analysis job subscription by recording ID" printed twice → multiple listeners.
- Excessive re-renders: renderCount spikes (~11) for a simple flow.
- `analysisJobId` remains undefined despite backend completion; no payload logs seen.

### Confirmed Backend State
- Upload, trigger, job creation, and completion verified server-side.
- Realtime enabled and table triggers firing.

### Objectives (Fix-Now)
- Only one subscription per `recordingId` or `jobId` with proper cleanup.
- Deterministic backfill: fetch latest job immediately before listening for changes.
- Propagate the resolved job id to all consumers via `effectiveAnalysisJobId`.
- High-signal logging for channel lifecycle and each payload.
- Reduce render churn via guarded state updates.

### Scope of Changes (Files)
- `packages/app/features/VideoAnalysis/VideoAnalysisScreen.tsx`
- `packages/api/src/services/analysisService.ts` (non-breaking, add optional diagnostics callbacks)

### Plan — Surgical Fixes
1) Single subscription with cleanup
   - Key the effect strictly by one primitive: `subscriptionKey = analysisJobId ?? derivedRecordingId ?? null`.
   - Maintain an `activeSubscriptionRef` map keyed by `recording:<id>` or `job:<id>`; refuse to create a new subscription if an identical key exists; always unsubscribe the previous key on change/unmount.
   - Guard React StrictMode double-invocation in dev by tracking the pending key and ignoring a second identical mount if cleanup hasn’t run.

2) Immediate backfill before subscribe
   - Call `getLatestAnalysisJobForRecordingId(recordingId)` immediately; if found, `setAnalysisJob(job)` and log a single backfill result.
   - Only then wire the realtime channel filtered by `video_recording_id=eq.<number>`.
   - Keep an optional `onStatus`/`onError` callback path to surface subscribe outcomes.

3) Effective analysis id
   - Compute `effectiveAnalysisJobId = props.analysisJobId ?? analysisJob?.id`.
   - Use `effectiveAnalysisJobId` for downstream hooks (e.g., `useFeedbackStatusIntegration`) and logs.
   - Log when `effectiveAnalysisJobId` transitions from undefined → concrete number.

4) Channel logging (status + payloads)
   - On subscribe: log "SUBSCRIBED" with channel name and filter.
   - On error/close: log "CHANNEL_ERROR"/"CHANNEL_CLOSED" once.
   - On payload: log one concise line per event including `{ eventType, oldId, newId, status, video_recording_id }`.

5) Render churn controls
   - Guard setters: only call `setIsProcessing`/`setIsPlaying`/`setCurrentTime` when value changes.
   - Keep effect deps minimal; derive primitives (ids, booleans) before effects.
   - Throttle/no-op repetitive layout logs.

### Detailed Steps
- VideoAnalysisScreen
  - Collapse the two subscription branches into one effect keyed by `subscriptionKey`.
  - If `analysisJobId` present → subscribe by id; else if `derivedRecordingId` present → backfill then subscribe by recording id.
  - Replace usages of the prop `analysisJobId` in child hooks with `effectiveAnalysisJobId`.

- analysisService (optional diagnostics)
  - Extend `subscribeToLatestAnalysisJobByRecordingId(recordingId, onJob, opts?)` and `subscribeToAnalysisJob(id, onJob, opts?)` to accept `{ onStatus?: (s) => void, onError?: (e) => void }` and invoke them on subscribe/error/close; do not change public behavior.

### Acceptance Criteria
- Only one "Setting up analysis job subscription by recording ID" line per mount.
- Backfill sets `analysisJob` when a job exists prior to subscribing; no realtime event required to see the id.
- `effectiveAnalysisJobId` becomes a concrete number and is used by feedback status/audio hooks.
- Logs show: SUBSCRIBED once, then one payload per server change; no duplicated listeners.
- Render count drops significantly (no double-digit churn in the same flow).

### Test Plan
- Unit (mock Supabase):
  - Subscribes once per key; duplicate effect invocation under StrictMode does not create duplicate channels.
  - Backfill-only scenario: job returned by `getLatest…` sets state without any realtime payload.
  - `effectiveAnalysisJobId` resolves from state when prop is absent.
- Integration (component):
  - Simulate upload → recordingId set → backfill returns job → UI logs effective id and auto-hides processing when job completes.
  - Verify unsubscribe on unmount and key change.
- Observability:
  - Assert presence of SUBSCRIBED and payload logs; zero CHANNEL_ERROR under nominal conditions.

### Rollout & Risk
- Low risk: additive diagnostics and subscription guards.
- Add env-guarded flag for the new subscription guard (optional) to quickly disable if needed.
- Rollback: revert the effect to previous implementation; keep diagnostics opt-in.

### DoD
- Single active subscription per key with proper cleanup.
- Backfill sets job id immediately when present.
- `effectiveAnalysisJobId` propagated and used downstream.
- Stable logs and reduced re-renders observed locally.

### Follow-up (Refactor, separate task)
- Extract `useFeedbackSource` and `useBubbleTimeline` hooks to reduce screen complexity and improve testability. This is not required to restore functionality.


