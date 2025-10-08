# Tasks

### Task 11: Eliminate useFeedbackPanel Redundancy ✅
**Effort:** 2 hours | **Priority:** Medium | **Depends on:** Task 10

@step-by-step-rule.mdc - Evaluate and potentially remove useFeedbackPanel hook if it only wraps useState with no business logic.

OBJECTIVE: Reduce abstraction overhead by eliminating hooks that don't provide value beyond useState.

CURRENT STATE:
- packages/app/features/VideoAnalysis/hooks/useFeedbackPanel.ts (78 lines)
- Only manages: panelFraction, activeTab, selectedFeedbackId
- selectedFeedbackId now redundant with useFeedbackSelection.highlightedFeedbackId
- panelFraction/activeTab are simple UI state (expand/collapse, tab switching)

DECISION CRITERIA:
IF useFeedbackPanel only does:
  - useState wrappers
  - No coordination with other hooks
  - No complex business logic
THEN: Remove it, move state directly to VideoAnalysisScreen or FeedbackSection

IF it provides:
  - Animation coordination
  - Complex panel lifecycle management
  - Multi-component synchronization
THEN: Keep it but remove selectedFeedbackId (now redundant)

SCOPE:
- OPTION A (Most Likely): Remove hook entirely
  - DELETE: packages/app/features/VideoAnalysis/hooks/useFeedbackPanel.ts
  - DELETE: packages/app/features/VideoAnalysis/hooks/useFeedbackPanel.test.ts
  - MODIFY: VideoAnalysisScreen.tsx - Replace with useState for panelFraction/activeTab
  
- OPTION B: Keep but simplify
  - REMOVE: selectedFeedbackId from interface (now handled by useFeedbackSelection)
  - KEEP: panelFraction and activeTab management
  - UPDATE: Tests to remove selectedFeedbackId coverage

ACCEPTANCE CRITERIA:
- [ ] No redundant selectedFeedbackId state
- [ ] Panel expand/collapse still works
- [ ] Tab switching still works
- [ ] No loss of animation coordination (if Option B)
- [ ] VideoAnalysisScreen.tsx cleaner, not more complex
- [ ] All existing panel behavior preserved

SUCCESS VALIDATION:
- yarn type-check passes
- Panel expands/collapses smoothly
- Tab switching works
- No state synchronization bugs

---

### Task 21: Audio/Overlay Orchestration — Single Source of Truth (Coordinator) ✅
**Effort:** 1 day | **Priority:** High | **Depends on:** None

@step-by-step-rule.mdc - Move overlay visibility/hide decisions into useFeedbackCoordinator as the single source of truth.

OBJECTIVE: Centralize audio overlay visibility and hide/show lifecycle inside coordinator so that bubbles and overlay are driven by the same playback state transitions.

SCOPE:
- MODIFY: packages/app/features/VideoAnalysis/hooks/useFeedbackCoordinator.ts
  - ADD: Derived state `overlayVisible` computed from `audioController.isPlaying` and `feedbackAudio.activeAudio`
  - ADD: Reactions to audio start/pause/end that also hide/show bubbles for synchronization
- MODIFY: packages/app/features/VideoAnalysis/VideoAnalysisScreen.tsx
  - REPLACE: `shouldShowAudioOverlay` usage with `coordinateFeedback.overlayVisible`

ACCEPTANCE CRITERIA:
- [x] Overlay visibility is controlled exclusively by coordinator
- [x] Bubble hide/show reacts in sync with overlay on play/pause/end
- [x] No duplicate overlay logic remains in screen

SUCCESS VALIDATION:
- ✅ yarn type-check passes
- ✅ yarn workspace @my/app test features/VideoAnalysis/hooks/useFeedbackCoordinator.test.ts --runTestsByPath (10/10 tests passed)
- ✅ Manual QA: pause/end/seek flows keep bubble and overlay in sync (≤50ms drift) 

FIXES APPLIED:
- Fixed perpetual bubble loop caused by activeAudioId fallback in overlay alignment effect (lines 340-369)
- Coordinator now only realigns bubble when `highlightedFeedbackId` exists, not on every audio state change
- Added test coverage for alignment scenarios: hide on overlay invisible, realign on highlight, no-op without highlight

---

### Task 22: Audio End-State Reliability — Fix handleEnd Stale Closure ✅
**Effort:** 2 hours | **Priority:** High | **Depends on:** None

@step-by-step-rule.mdc - Make useAudioController.handleEnd read fresh state so isPlaying reliably flips to false.

OBJECTIVE: Prevent stuck overlay by ensuring `handleEnd` updates `isPlaying=false` deterministically when audio ends.

SCOPE:
- MODIFY: packages/app/features/VideoAnalysis/hooks/useAudioController.ts
  - FIX: `handleEnd` uses refs or proper dependency array to avoid stale `currentTime/duration`
  - ADD: Unit tests for `handleEnd` behavior

ACCEPTANCE CRITERIA:
- [x] `isPlaying` becomes false on end in all cases (no premature-return false positives)
- [x] Unit tests cover end near 0s, with/without isLoaded, with seek

SUCCESS VALIDATION:
- ✅ yarn workspace @my/app test features/VideoAnalysis/hooks/useAudioController.test.ts --runTestsByPath (17/17 tests passed)
- ✅ yarn type-check passes

---

### Task 23: Bubble Timer Realignment — ✅ Complete (2025-10-08)
**Effort:** 1 day | **Priority:** High | **Depends on:** Task 21 (recommended), Task 22 (optional)

@step-by-step-rule.mdc - Align bubble auto-hide to audio playback lifecycle instead of showBubble timestamp.

OBJECTIVE: Start bubble timer when audio actually starts (first isPlaying=true or first onProgress), and recompute when `audioController.duration` becomes known; hide immediately on pause/end.

SCOPE:
- MODIFY: packages/app/features/VideoAnalysis/hooks/useBubbleController.ts
  - CHANGE: Timer start from `showBubble()` → first playback start signal ✅
  - ADD: Recompute/replace timer when duration transitions 0 → >0 ✅
  - ADD: Immediate hide on pause/end for sync with overlay ✅
- ADD: Unit tests for timer start/recompute/pause/end behavior ✅ (seek scenario still pending follow-up)

ACCEPTANCE CRITERIA:
- [x] No early hide when duration was unknown at bubble show
- [x] Pause/end hide bubble within ≤50ms of overlay change
- [ ] Tests cover duration update, pause after recent show, seek interactions *(seek-specific test to be added in Task 26 sync suite)*

SUCCESS VALIDATION:
- ✅ `yarn workspace @my/app test features/VideoAnalysis/hooks/useBubbleController.test.ts --runTestsByPath`
- ✅ `yarn type-check`
- ✅ `yarn lint`

---

### Task 24: AudioFeedback Demotion — Presentation-Only, Lift Inactivity Up ✅ Complete (2025-10-08)
**Effort:** 0.5 day | **Priority:** Medium | **Depends on:** Task 21

@step-by-step-rule.mdc - Remove auto-close timer side-effects from UI; emit inactivity signal instead.

OBJECTIVE: Keep `AudioFeedback` dumb. Replace internal `onClose()` timer with optional `onInactivity()` callback; coordinator decides visibility.

SCOPE:
- MODIFY: packages/ui/src/components/VideoAnalysis/AudioFeedback/AudioFeedback.tsx
  - REMOVE: Timer that calls `onClose()` directly
  - ADD: Optional `onInactivity?()` callback fired after inactivity delay
  - KEEP: Local chrome fade if desired, but not visibility decisions
- MODIFY: packages/app/features/VideoAnalysis/hooks/useFeedbackCoordinator.ts
  - HANDLE: New `onInactivity()` to hide overlay/bubble coherently (if product keeps inactivity feature)

ACCEPTANCE CRITERIA:
- [x] Component no longer controls visibility; no direct `onClose()` from timers
- [x] Coordinator handles inactivity uniformly with bubbles

SUCCESS VALIDATION:
- yarn type-check passes
- Manual QA: inactivity hides both overlay and bubble together (if enabled)

---

### Task 25: Screen Wiring Cleanup — Derive Overlay from Coordinator ✅ Complete (2025-10-08)
**Effort:** 2 hours | **Priority:** Medium | **Depends on:** Task 21, Task 24

@step-by-step-rule.mdc - Replace raw overlay derivation with coordinator-driven state.

OBJECTIVE: Ensure `VideoAnalysisScreen` only wires props and does not implement lifecycle logic.

SCOPE:
- MODIFY: packages/app/features/VideoAnalysis/VideoAnalysisScreen.tsx
  - REPLACE: `shouldShowAudioOverlay` computation with `coordinateFeedback.overlayVisible`
  - REMOVE: Any duplicate pause/end handlers affecting overlay visibility

ACCEPTANCE CRITERIA:
- [x] Screen has no overlay visibility logic
- [x] All visibility transitions happen via coordinator

SUCCESS VALIDATION:
- yarn type-check passes

---