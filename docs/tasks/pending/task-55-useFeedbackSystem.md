# Task 55: Rationalize Feedback Hooks → Cohesive Feedback System

**Effort:** 1-2 days | **Priority:** P1 (Technical Debt) | **Depends on:** Task 54  
**User Story:** N/A (Architectural refinement - feedback system)  
**Parent Task:** Task 53

**STATUS:** 🟢 **READY TO START** (Task 54 complete)

## Objective

Reduce feedback hook sprawl without creating a monolithic hook. Merge tightly-related audio concerns, tighten panel/coordinator boundaries, and expose an optional facade for ergonomic consumption.

## Current State

- ❌ 4 hooks: `useFeedbackCoordinator`, `useFeedbackAudioSource`, `useAudioController`, `useFeedbackPanel`
- ❌ Audio source + playback split despite being coupled (URL lifecycle ↔ playback lifecycle)
- ❌ Panel state exposes low-level setters that bleed into coordinator responsibilities
- ⚠️ Coordinator owns both orchestration and persistence hand-offs; selection/bubble handled via internal sub-hooks (`useFeedbackSelection`, `useBubbleController`)
- ✅ Existing unit tests for all four hooks

## Problems Identified

- **Concern leakage:** Audio source selection, playback transport, and overlay timing live in separate hooks yet always update together
- **UI orchestration conflation:** Panel exposes selection setters that coordinator rewraps, leading to redundant state writes and double subscriptions
- **Difficult testing:** Verifying end-to-end feedback flow requires mocking four hooks plus Zustand stores
- **Facade missing:** Screen wiring re-composes the same object shape every render, adding unnecessary memo layers

## Target Architecture

```
useFeedbackAudio      // NEW: merges source + transport
useFeedbackPanel      // Trimmed to UI-only responsibilities
useFeedbackCoordinator// Focused orchestration + store side-effects
useFeedbackSystem     // OPTIONAL: thin facade composing the three hooks
```

- Audio concerns live together; coordinator receives a single, memoized transport API
- Panel handles UI-only state (fraction, tab, overlay preference) and emits declarative events
- Coordinator focuses on playback-driven orchestration, persists into Zustand, and mediates bubble timing
- Optional `useFeedbackSystem` returns a stable object for screen wiring without burying logic in a god-hook

## Implementation Strategy

### Module 1: Establish Shared Types
**Summary:** Create explicit types for audio transport, panel state, coordinator contracts, and the optional facade.

**File to Create:** `packages/app/features/VideoAnalysis/hooks/useFeedbackSystem.types.ts`

**Tasks:**
- [ ] Define `FeedbackAudioState`, `FeedbackAudioTransport`, and error signature types
- [ ] Define `FeedbackPanelState` and event handler contracts
- [ ] Define `FeedbackCoordinatorState` (highlight, overlay, bubble)
- [ ] Define `UseFeedbackSystemReturn` and `UseFeedbackSystemOptions`
- [ ] Export all types via named exports

**Acceptance Criteria:**
- [ ] Types mirror existing behaviour (no accidental feature drops)
- [ ] optional facade types reference the individual hook contracts
- [ ] `yarn type-check` passes

### Module 2: Introduce `useFeedbackAudio`
**Summary:** Merge `useFeedbackAudioSource` + `useAudioController` into a cohesive audio hook.

**File to Create:** `packages/app/features/VideoAnalysis/hooks/useFeedbackAudio.ts`

**Tasks:**
- [ ] Fetch and cache audio URLs per feedback id
- [ ] Track per-item fetch errors and retries
- [ ] Expose transport API (`play`, `pause`, `seek`, `setActive`)
- [ ] Synchronize transport state with video playback (pause when video plays, etc.)
- [ ] Return memoized `FeedbackAudioState` + `FeedbackAudioTransport`

**Acceptance Criteria:**
- [ ] Audio continues to auto-play on highlight selection
- [ ] Video playback resumes control on departure
- [ ] Retry + error dismissal supported
- [ ] `useFeedbackAudio.test.ts` achieves ≥ 1:2 test ratio

### Module 3: Refine `useFeedbackPanel`
**Summary:** Limit panel responsibilities to UI layout while emitting declarative events.

**File to Modify:** `packages/app/features/VideoAnalysis/hooks/useFeedbackPanel.ts`

**Tasks:**
- [ ] Remove imperative setters for coordinator state (highlight, bubble)
- [ ] Manage `panelFraction`, `activeTab`, and overlay preference locally
- [ ] Emit typed callbacks (`onTabChange`, `onCollapse`, `onRequestOverlay`)
- [ ] Ensure Tamagui animations remain unaffected

**Acceptance Criteria:**
- [ ] Panel tests updated to assert event emissions instead of state mutation side-effects
- [ ] Hook exposes minimal stable surface (`state`, `handlers`)
- [ ] Consumers can derive selection from coordinator result instead of panel state

### Module 4: Slim `useFeedbackCoordinator`
**Summary:** Concentrate coordinator on orchestration + persistence side-effects.

**File to Modify:** `packages/app/features/VideoAnalysis/hooks/useFeedbackCoordinator.ts`

**Tasks:**
- [ ] Consume `FeedbackAudioTransport` + `FeedbackPanelState`
- [ ] Continue leveraging `useFeedbackSelection` and `useBubbleController` internally
- [ ] Update Zustand writes to use typed `batchUpdate` helpers
- [ ] Ensure overlay visibility derives solely from coordinator state
- [ ] Provide declarative handlers (`onFeedbackTap`, `onVideoProgress`, `onAudioEnd`)

**Acceptance Criteria:**
- [ ] Coordinator exposes no panel-style setters
- [ ] Bubble + overlay lifecycle unchanged (verified via tests)
- [ ] Store subscriptions remain granular

### Module 5: Optional `useFeedbackSystem` Facade
**Summary:** Provide a thin facade for screens wanting a single import.

**File to Create:** `packages/app/features/VideoAnalysis/hooks/useFeedbackSystem.ts`

**Tasks:**
- [ ] Compose panel, audio, and coordinator hooks
- [ ] Return a memoized object shaped for `VideoAnalysisScreen`
- [ ] Re-expose individual hook contracts to support direct consumption when needed
- [ ] Avoid embedding logic beyond data shaping

**Acceptance Criteria:**
- [ ] Facade re-exports stable `handlers`, `panel`, `audio`, `coordinator` contracts
- [ ] No circular dependencies introduced
- [ ] Hook remains trivial (≤ 60 LOC)

### Module 6: Test Suite Updates
**Summary:** Update and add tests covering the new contracts.

**Files:**
- `packages/app/features/VideoAnalysis/hooks/useFeedbackAudio.test.ts`
- `packages/app/features/VideoAnalysis/hooks/useFeedbackPanel.test.ts`
- `packages/app/features/VideoAnalysis/hooks/useFeedbackCoordinator.test.ts`
- `packages/app/features/VideoAnalysis/hooks/useFeedbackSystem.test.ts`

**Tasks:**
- [ ] Cover audio transport orchestration (auto-play, pause on video play)
- [ ] Validate panel emits events rather than mutating coordinator state
- [ ] Verify coordinator orchestrates highlights, bubble, overlay using new contracts
- [ ] Cover facade wiring smoke test (inputs → merged output)

**Acceptance Criteria:**
- [ ] Each test file respects AAA pattern and ≤ 1:2 ratio
- [ ] `yarn workspace @my/app test useFeedback*.test.ts` passes

### Module 7: Screen Integration
**Summary:** Update `VideoAnalysisScreen` wiring to use new contracts.

**File to Modify:** `packages/app/features/VideoAnalysis/VideoAnalysisScreen.tsx`

**Tasks:**
- [ ] Replace four direct hook invocations with the facade (or three explicit hooks)
- [ ] Remove redundant memo layers now provided by facade
- [ ] Ensure props passed to `VideoAnalysisLayout` stay stable
- [ ] Re-run existing screen tests & adjust mocks

**Acceptance Criteria:**
- [ ] Screen maintains behaviour parity (manual + auto highlight, overlay timing)
- [ ] `VideoAnalysisScreen.test.tsx` updated and passing
- [ ] LOC reduction measured and documented in status update

### Module 8: Clean-Up & Exports
**Summary:** Remove superseded hooks and update barrel exports.

**Files:**
- Delete `useFeedbackAudioSource.ts`
- Delete `useAudioController.ts`
- Update `index.ts` exports within `hooks/`

**Tasks:**
- [ ] Remove legacy hook files + tests
- [ ] Update package barrel exports
- [ ] Validate no consumers reference deleted hooks

**Acceptance Criteria:**
- [ ] `yarn type-check` passes
- [ ] `yarn lint` passes
- [ ] No stray imports remain

## Quality Gates

After each module:
1. Run relevant tests: `yarn workspace @my/app test useFeedback*.test.ts`
2. Type check: `yarn workspace @my/app type-check`
3. Lint: `yarn workspace @my/app lint`
4. Manual checks: ensure feedback highlight + audio overlay behave as before

## Success Validation

- [ ] Hook count reduced from 4 → 3 (75% → 25% consolidation avoided a god-hook)
- [ ] Optional facade available for ergonomic consumption without embedding logic
- [ ] Test coverage ≥ 1:2 ratio maintained across updated hooks
- [ ] `VideoAnalysisScreen` integrates via facade (or three explicit hooks) with cleaner wiring
- [ ] Redundant hook files removed; types consolidated in dedicated file
- [ ] `yarn type-check`, `yarn lint`, and `yarn workspace @my/app test useFeedback*.test.ts` all green
- [ ] Manual QA confirms no regression in audio/feedback interactions

## References

- Current hooks: `packages/app/features/VideoAnalysis/hooks/useFeedback*.ts`
- Store: `packages/app/features/VideoAnalysis/stores/feedbackCoordinatorStore.ts`
- Simplification proposal: `docs/spec/video-analysis-simplification-proposal.md`
- Architecture targets: `docs/spec/video-analysis-simplified-architecture.mermaid`

