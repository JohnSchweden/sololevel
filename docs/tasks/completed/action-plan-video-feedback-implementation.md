# Video Feedback Implementation Action Plan (Variant A + Variant B)

## Overview
Deliver real analysis feedback to users as soon as the first audio feedback is available, while laying a clean foundation for maintainability. This plan merges a fast path (Variant A) to ship immediate value with a follow-up refactor (Variant B) that separates data sourcing from the bubble timeline engine.

## Objectives
- Surface the first available per‑feedback audio as soon as it is generated (no need to wait for all items).
- Keep existing upload/analysis subscriptions; add minimal, typed audio URL fetching.
- Reduce coupling in `VideoAnalysisScreen` by extracting data and timeline concerns into dedicated hooks.
- Preserve strict typing, structured logging, and user‑safe error handling.

## Prerequisites
- Supabase schema with `analysis_feedback` and `analysis_audio_segments` available and RLS‑compliant.
- Realtime enabled for `public.analysis_feedback` and `public.analysis_jobs`.
- Working logger (`@my/logging`) and authenticated Supabase client via `@my/api`.
- Testing setup: Jest/Vitest; follow behavior‑focused tests and 1:2 test‑to‑code ratio.

## Implementation Tasks

### Phase 1: Immediate Value — Variant A (Ship ASAP)

#### 1. API helper for audio URL fetch (minimal)
**Files**: `packages/api/src/services/audioService.ts` (new) or `packages/api/src/services/analysisService.ts` (append)

- Export `getFirstAudioUrlForFeedback(feedbackId: number): Promise<{ ok: true; url: string } | { ok: false; error: string }>`.
- Primary path: `rpc('get_audio_segments_for_feedback', { feedback_item_id })` → pick first `audio_url`.
- Fallback: `from('analysis_audio_segments').select('audio_url').eq('feedback_id', id).order('segment_index', { ascending: true }).limit(1)`.
- Type responses using `Tables<'analysis_audio_segments'>` where relevant; no `any`.
- Log failures with correlation context; return user‑safe error strings.

**DoD**:
- Function exported and used by screen; returns first valid `audio_url` or typed error.
- RPC primary path and SQL fallback both implemented with unit tests.
- Strict TypeScript types; no `any`; logger used instead of console.

**Requirements**:
- Use authenticated `supabase` client from `@my/api`; respect RLS.
- Handle network and RPC errors gracefully; never throw raw errors to UI.
- Keep function side‑effect free (no global state).

#### 2. Wire screen effect to fetch/cache audio URL on status flip
**File**: `packages/app/features/VideoAnalysis/VideoAnalysisScreen.tsx`

- Local state: `audioUrlByFeedback: Map<number, string>` (via `useRef`) and `activeAudio: { id: number; url: string } | null`.
- Effect: watch `feedbackStatus.feedbackItems`; find earliest with `audioStatus === 'completed'` that isn’t cached → fetch URL via API helper → cache.
- If `activeAudio` is null, set it to the first successfully fetched URL. Do not auto‑switch once set.
- Backoff or mark fetch‑failed to avoid re‑spamming; allow manual retry from panel.

**DoD**:
- On first item with `audioStatus==='completed'`, URL is fetched once and cached.
- `activeAudio` set only when empty; no thrashing when subsequent items complete.
- No unhandled promise rejections; logs include feedbackId and analysisId.

**Requirements**:
- Use `useFeedbackStatusIntegration` as the status source of truth.
- Debounce repeated status flips; guard against race conditions on rapid updates.
- Never autoplay; do not change video playback state.

#### 3. Render `AudioFeedback` with real data
**File**: `packages/app/features/VideoAnalysis/VideoAnalysisScreen.tsx`

- Pass `audioUrl={activeAudio?.url ?? null}`, `isVisible={!!activeAudio}`.
- Start paused; play on user tap (autoplay restrictions per TRD).
- Manage `isPlaying/currentTime/duration` locally; `onClose` clears `activeAudio`.

**DoD**:
- `AudioFeedback` renders when a valid URL exists; hidden otherwise.
- Tap to play/pause works; closing hides and stops playback.
- Duration displayed when available; no crashes on missing metadata.

**Requirements**:
- Respect platform autoplay restrictions (start paused).
- Keep UI responsive; no blocking spinners longer than 300ms.
- Maintain accessibility labels per UI standards.

#### 4. Error handling + retry UX
**Files**: Screen + Feedback panel

- If fetch fails: record a `fetchFailed` set for feedback IDs; show inline retry in `FeedbackPanel` via existing `onRetryFeedback` or small CTA.
- Keep logs structured; surface short, user‑safe messages only.

**DoD**:
- Failed fetches are visible as retriable states; retries trigger a single re‑fetch.
- Errors logged with correlation context; no noisy repeated logs.

**Requirements**:
- No toast spam; limit to one visible error per feedback at a time.
- Don’t block other feedback audio from loading.

#### 5. Tests (keep it lean)
**Files**: `packages/api/src/services/__tests__/audioService.test.ts`, `packages/app/features/VideoAnalysis/__tests__/VideoAnalysisScreen.audio.test.tsx`

- API helper: RPC path returns first URL; fallback path returns first URL; error path returns `{ ok: false }`.
- Screen: given `feedbackItems` flip to `audioStatus: 'completed'`, effect fetches URL → `AudioFeedback` becomes visible with URL. Max 2–3 tests.

**DoD**:
- All Variant A tests pass locally and on CI; test‑to‑code ratio ≤ 1:2.

**Requirements**:
- Behavior‑focused tests; mock external deps only; avoid implementation details.

#### 6. Status/docs update
**File**: `docs/spec/status.md`

- Note: “Variant A shipped — first audio feedback surfaced immediately; screen wires `AudioFeedback` to per‑feedback URL.”

**DoD**:
- `docs/spec/status.md` updated with date, scope, and impact of Variant A.

**Requirements**:
- Keep concise; link to this plan and affected files.

---

### Phase 2: Maintainability — Variant B (Follow‑up Refactor)

#### 7. Data source hook — `useFeedbackSource`
**File**: `packages/app/features/VideoAnalysis/hooks/useFeedbackSource.ts` (new)

- Signature: `useFeedbackSource(analysisJobId?: number, isMockMode?: boolean)` → returns normalized items: `{ id: string; text: string; category: 'voice'|'posture'|'grip'|'movement'; timestampMs: number; ssmlStatus?: Status; audioStatus?: Status; audioUrl?: string }[]` + status helpers.
- Internals:
  - Subscribe with `useFeedbackStatusIntegration(analysisId)` for realtime statuses.
  - On audio status `completed`, fetch audio URL via API helper; cache per feedback id.
  - Mock mode: map local mock bubbles to same shape.
- Strict types; no `any`. Single source of truth for item mapping.

**DoD**:
- Hook returns stable, normalized items with audio URLs when available.
- Unsubscribes on unmount; no memory leaks; unit tests cover mock and DB modes.

**Requirements**:
- Avoid re‑mapping on irrelevant store changes (memoization/selectors).
- Error paths don’t break item emission; expose minimal status metadata.

#### 8. Timeline hook — `useBubbleTimeline`
**File**: `packages/app/features/VideoAnalysis/hooks/useBubbleTimeline.ts` (new)

- Inputs: `items` (from `useFeedbackSource`).
- Outputs: `{ currentBubbleIndex: number | null; bubbleVisible: boolean; onProgress(currentTimeMs: number): void; showBubble(index: number): void; hideBubble(): void }`.
- Responsibilities:
  - Compute next/eligible bubble by `timestampMs`.
  - Debounce/throttle progress; handle seeking; dedupe same index; hide/show sequencing.
  - Pure, testable logic; no network/side effects.

**DoD**:
- Deterministic timing behavior in unit tests (advance timers/time travel).
- Proper dedupe on same index; correct behavior on seek forward/back.

**Requirements**:
- Pure function semantics for core logic; no reliance on Date.now in behaviors under test.
- Configurable timing constants for tests.

#### 9. Screen refactor to consume hooks
**File**: `packages/app/features/VideoAnalysis/VideoAnalysisScreen.tsx`

- Replace screen‑level time math with `useBubbleTimeline(items)`: call `onProgress(currentTime*1000)` in `onProgress` handler.
- Render bubbles from `items[currentBubbleIndex]` only.
- Keep existing job/upload subscriptions and panel behaviors.

**DoD**:
- Screen compiles and runs with hooks; no regression in UX.
- Bubble behavior matches or improves current behavior under tests.

**Requirements**:
- Preserve logging breadcrumbs; keep `AppHeader`/controls wiring intact.
- Avoid prop drilling explosions; keep ref usage minimal and typed.

#### 10. Tests for hooks
**Files**: `packages/app/features/VideoAnalysis/hooks/__tests__/useFeedbackSource.test.ts`, `useBubbleTimeline.test.ts`

- `useFeedbackSource`: mock vs DB modes; audio status flip leads to URL cached; items stable ordering.
- `useBubbleTimeline`: progress/seek dedupe; shows only eligible bubble; throttle behavior around edges.

**DoD**:
- Hook tests pass consistently (no flakiness); ≤ 3 tests per hook initially.

**Requirements**:
- Use existing testing environment and mock patterns; parameterize with `test.each` where helpful.

#### 11. Documentation
**Files**: `docs/spec/TRD.md` (if needed), `docs/spec/status.md`

- Document the new hooks as the preferred consumption API for feedback data + timeline.

**DoD**:
- TRD/status updated to reference new hooks and responsibilities split.

**Requirements**:
- Keep docs brief; link to source files and tests.

---

## Implementation Sequence

### Week 1: Variant A (Immediate)
1. API helper for audio URLs
2. Screen effect + caching
3. Render `AudioFeedback`
4. Error handling + minimal tests
5. Status/docs update

### Week 2: Variant B (Refactor)
6. Implement `useFeedbackSource`
7. Implement `useBubbleTimeline`
8. Screen refactor to consume hooks
9. Hook/unit tests and minor UI polish
10. Status/docs update

## Success Criteria
- First audio feedback becomes playable as soon as its status completes (no waiting for others).
- No regressions in upload/analysis progress UX.
- Variant B reduces `VideoAnalysisScreen` complexity; unit tests cover hooks behavior.
- Typed, user‑safe error handling; structured logs without leaking provider details.

## Risk Mitigation
- Network flakiness for audio URL fetch → backoff + manual retry CTA; cache successes.
- Realtime gaps → continue to render mock bubbles until DB items arrive; then switch seamlessly.
- Refactor risk (Variant B) → maintain API‑compat output from new hooks; add tests before replacing screen logic.

## Dependencies
- `@my/api` Supabase client and types
- `@my/logging` structured logger
- Supabase Realtime on `analysis_feedback` and `analysis_jobs`

## Rollback Plan
- Variant A: remove screen effect and helper calls; keep existing mock rendering.
- Variant B: revert to Variant A wiring; the hooks are additive and can be unused.

## Monitoring
- Log: audio fetch successes/failures per feedback id; timing from status flip to playable.
- Track: number of completed feedbacks with audio vs played by user.

## Future Enhancements
- Preload strategy for upcoming audio segments to reduce start latency.
- Multi‑segment audio concatenation if needed; buffering indicators.
- Per‑category sound cues and haptics on native.

---

**Document Version**: 1.0  
**Last Updated**: 2025-10-01  
**Owner**: Engineering Team  
**Status**: Planned (Variant A → Variant B)


