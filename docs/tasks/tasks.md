# Tasks

---

### Task 54: UI Test Migration — Phase 0 Inventory & Baseline
**Effort:** 1 day | **Priority:** P1 | **Depends on:** VideoControls native suite migration

**STATUS:** 🟢 **READY TO START**

**OBJECTIVE:** Build a full inventory of `@my/ui` component tests, document current runners/mocks, and capture baseline runtime/heap/coverage numbers before refactors begin.

**TASKS:**
- [ ] List every component + associated test file, runner (`jest`, `jest.native`, etc.), and global mock dependencies.
- [ ] Execute baseline commands with `--logHeapUsage --coverage` and store results under `reports/*-baseline.md`.
- [ ] Record flake rate by running each suite 5× sequentially (`--runInBand --silent`).
- [ ] Summarize findings + migration priorities in the shared inventory.

**QUALITY GATES:**
- Inventory reviewed/approved by UI maintainers.
- Baseline metric reports checked into `reports/` with command references.

**DONE WHEN:** Every suite has documented baseline metrics and stakeholders approve migration order.

---

### Task 55: UI Test Migration — Phase 1 Tooling Foundations
**Effort:** 1 day | **Priority:** P1 | **Depends on:** Task 54

**STATUS:** 🟢 **READY TO START**

**OBJECTIVE:** Lock down the shared battle-tested testing stack (configs, setup files, templates, documentation) for `@my/ui`.

**TASKS:**
- [ ] Finalize `jest.native.core.config.js` and any lean web config required for pure Tamagui suites.
- [ ] Harden `setup.native.core.ts` (Reanimated, gesture handler, Expo, Tamagui mocks) and provide matching web setup if needed.
- [ ] Publish AAA test templates/helpers (native + web) in `src/test-utils/`.
- [ ] Update `@testing-philosophy.mdc`, AGENTS, and migration docs with the new playbook.

**QUALITY GATES:**
- `yarn workspace @my/ui test:native:core` passes locally and on CI using the new setup.
- Documentation updates reviewed by code owners.

**DONE WHEN:** Tooling + documentation enable any suite to migrate without additional infra changes.

---

### Task 56: UI Test Migration — Phase 2 Critical Native Components
**Effort:** 3 days | **Priority:** P0 | **Depends on:** Task 55

**STATUS:** 🟢 **READY TO START**

**OBJECTIVE:** Migrate high-impact native components (VideoAnalysis ecosystem, HistoryProgress native surfaces, Camera/Recording flows) to the new testing stack with behavior-first assertions.

**TASKS:**
- [ ] Port suites to `@testing-library/react-native`, enforcing AAA (`// Arrange // Act // Assert`).
- [ ] Replace legacy mega-mocks with scoped stubs per suite (Reanimated gestures, Expo modules, sensors, Zustand stores).
- [ ] Assert user-facing behavior (press/seek, visibility toggles, accessibility labels) instead of DOM styles.
- [ ] Capture post-migration metrics (`reports/*-migration.md`) and compare vs baselines.

**QUALITY GATES:**
- Runtime and heap improvements ≥20% vs baseline (or documented rationale if not possible).
- Coverage meets/exceeds baseline numbers.
- Manual Expo sanity check confirms no regressions.

**DONE WHEN:** All critical native suites run via `test:native:core`, metrics documented, legacy tests removed.

---

### Task 57: UI Test Migration — Phase 3 Shared UI & Utilities
**Effort:** 3 days | **Priority:** P1 | **Depends on:** Task 56

**STATUS:** 🟢 **READY TO START**

**OBJECTIVE:** Migrate cross-platform Tamagui components and utility widgets to consistent AAA, behavior-driven tests.

**TASKS:**
- [ ] Determine runner (native vs web) per component based on RN primitive usage; update configs where required.
- [ ] Rewrite suites to assert user-visible behavior + accessibility (roles, labels, `testID`s).
- [ ] Localize mocks; delete unused exports from `src/test-utils/setup.ts`.
- [ ] Update docs/templates if new patterns emerge.

**QUALITY GATES:**
- No remaining references to global mega-mocks.
- Coverage maintained or improved.
- Lint checks confirm AAA comment structure where applicable.

**DONE WHEN:** Every shared UI/utility test adheres to the new conventions and legacy scaffolding is removed.

---

### Task 58: UI Test Migration — Phase 4 Cleanup & CI Hardening
**Effort:** 2 days | **Priority:** P1 | **Depends on:** Task 57

**STATUS:** 🟢 **READY TO START**

**OBJECTIVE:** Remove obsolete configs/mocks and enforce runtime/heap/coverage safeguards in CI.

**TASKS:**
- [ ] Delete legacy `jest.native.config.js`, mega-setup utilities, and redundant helpers.
- [ ] Wire `test:native:core` into CI workflows with failure thresholds (>20% runtime/heap regression, coverage drops).
- [ ] Automate metric diff reporting (e.g., compare against baselines per suite).
- [ ] Final audit + documentation summary of migration completion.

**QUALITY GATES:**
- CI runs succeed with guards active; intentional regressions require documented waivers.
- Docs/STATUS updated to reflect completion and protections in place.

**DONE WHEN:** Legacy infrastructure is gone, CI enforces the battle-tested stack, and migration documentation is complete.

---

# Task 52: Conditional Rendering Progress Bars Implementation Plan

## Objective - ✅ Complete (2025-11-07)

Replace opacity-based progress bar visibility with pure conditional rendering (mount/unmount). Progress bars operate independently of controls visibility. Use pointerEvents to prevent interactions when bars are transitioning.

## Current State Analysis

**Files Involved:**

- `packages/ui/src/components/VideoAnalysis/VideoControls/hooks/useProgressBarAnimation.ts` - Current hook (opacity-only, always renders)
- `packages/ui/src/components/VideoAnalysis/VideoControls/VideoControls.tsx` - Normal bar always rendered (line 803-836)
- `packages/app/features/VideoAnalysis/components/VideoAnalysisLayout.native.tsx` - Persistent bar rendered at layout level (line 416-446)

**Current Boundaries:**

- Normal bar: opacity 1 → 0 at `collapseProgress > 0.027` (ultra-fast fade)
- Persistent bar: opacity 0 → 1 at `collapseProgress ≥ 0.48` (cubic easing)
- Both bars always mounted, only opacity changes

## Implementation Strategy

### Phase 1: Create Visibility Hook (TDD)

**File:** `packages/ui/src/components/VideoAnalysis/VideoControls/hooks/useProgressBarVisibility.ts`

**Test Cases (RED phase):**

1. shouldRenderNormal returns true when collapseProgress <= 0.03
2. shouldRenderNormal returns false when collapseProgress > 0.03
3. shouldRenderPersistent returns false when collapseProgress < 0.45
4. shouldRenderPersistent returns true when collapseProgress >= 0.45
5. Visibility flags update when collapseProgress SharedValue changes
6. Visibility flags sync correctly with useAnimatedReaction
7. Edge case: negative collapseProgress → shouldRenderNormal = true, shouldRenderPersistent = false
8. Edge case: collapseProgress > 1 → shouldRenderNormal = false, shouldRenderPersistent = true
9. Normal bar visibility independent of showControls prop
10. Persistent bar visibility independent of showControls prop

**Hook Interface:**

```typescript
export interface UseProgressBarVisibilityReturn {
  shouldRenderNormal: boolean // JS state for conditional rendering
  shouldRenderPersistent: boolean // JS state for conditional rendering
}

export function useProgressBarVisibility(
  collapseProgressShared: SharedValue<number>
): UseProgressBarVisibilityReturn
```

**Implementation (GREEN phase):**

- Use `useDerivedValue` to compute visibility booleans on UI thread
- Use `useAnimatedReaction` to sync SharedValue → JS state
- Normal bar: render when `collapseProgress <= 0.03` (independent of showControls)
- Persistent bar: render when `collapseProgress >= 0.45` (independent of showControls)
- No opacity animations - pure mount/unmount

### Phase 2: Update VideoControls (TDD)

**File:** `packages/ui/src/components/VideoControls/VideoControls.tsx`

**Test Cases (RED phase):**

1. Normal bar renders when shouldRenderNormal = true
2. Normal bar does not render when shouldRenderNormal = false
3. Normal bar renders independently of showControls prop
4. Normal bar has pointerEvents 'auto' when rendered
5. Persistent bar props include shouldRender flag (for layout-level conditional rendering)
6. No re-renders when collapseProgress changes but visibility flags unchanged

**Changes:**

- Replace `useProgressBarAnimation` import with `useProgressBarVisibility`
- Remove `normalBarAnimatedStyle` usage (no opacity animations)
- Wrap normal ProgressBar in conditional: `{shouldRenderNormal && <ProgressBar variant="normal" {...props} />}`
- Remove `animatedStyle` prop from normal ProgressBar (no longer needed)
- Update persistent bar props to include `shouldRenderPersistent` flag
- Ensure normal bar visibility independent of `showControls` prop

### Phase 3: Update Layout-Level Persistent Bar (TDD)

**File:** `packages/app/features/VideoAnalysis/components/VideoAnalysisLayout.native.tsx`

**Test Cases (RED phase):**

1. Persistent bar renders when shouldRenderPersistent = true
2. Persistent bar does not render when shouldRenderPersistent = false
3. Persistent bar renders independently of controls visibility
4. Persistent bar has pointerEvents 'auto' when rendered

**Changes:**

- Read `shouldRenderPersistent` from persistent progress bar props
- Wrap persistent ProgressBar in conditional: `{persistentProgressBarProps?.shouldRenderPersistent && <ProgressBar ... />}`
- Remove `animatedStyle` prop usage (no opacity animations)
- Ensure persistent bar visibility independent of controls visibility

### Phase 4: Update ProgressBar Component (TDD)

**File:** `packages/ui/src/components/VideoAnalysis/VideoControls/components/ProgressBar.tsx`

**Test Cases (RED phase):**

1. ProgressBar accepts optional animatedStyle prop (backward compatibility)
2. ProgressBar applies pointerEvents 'auto' by default
3. ProgressBar respects pointerEvents prop when provided
4. No opacity animations when animatedStyle not provided

**Changes:**

- Make `animatedStyle` prop optional (for backward compatibility)
- Ensure default pointerEvents = 'auto' (no ghost interactions)
- Remove opacity-based handle animations (no longer needed)

### Phase 5: Cleanup & Remove Old Hook (TDD)

**File:** `packages/ui/src/components/VideoAnalysis/VideoControls/hooks/useProgressBarAnimation.ts`

**Actions:**

- Delete `useProgressBarAnimation.ts` and `.test.ts`
- Update all imports across codebase
- Remove from exports

**File:** `packages/ui/src/components/VideoAnalysis/VideoControls/VideoControls.test.tsx`

**Actions:**

- Remove `useProgressBarAnimation` mock
- Update tests to use `useProgressBarVisibility` mock
- Add tests for conditional rendering behavior
- Verify no re-renders during gesture when visibility unchanged

## Quality Gates - ✅ Satisfied

- Tests: `yarn workspace @my/ui test useProgressBarVisibility`, `yarn workspace @my/ui test VideoControls`, `yarn workspace @my/ui test`
- Type check: `yarn type-check`
- Lint: `yarn lint`
- Manual verification: Video controls run in Expo without Reanimated `.value` warnings or synchronous worklet errors; render diagnostics confirm conditional mount cuts redundant re-renders.

## Definition of Done - ✅ All Criteria Met

- [x] New hook `useProgressBarVisibility` created with full test coverage
- [x] VideoControls uses pure conditional rendering for normal bar (no opacity)
- [x] Normal bar visibility independent of showControls prop
- [x] Persistent bar uses conditional rendering at layout level
- [x] Persistent bar visibility independent of controls visibility
- [x] All opacity animations removed
- [x] pointerEvents 'auto' ensures no ghost interactions
- [x] Old hook `useProgressBarAnimation` removed
- [x] All existing tests pass
- [x] No TypeScript errors
- [x] No lint errors
- [x] Render count reduced significantly (verified via render diagnostics)

### Completion Notes

- `useProgressBarVisibility` now operates entirely on the UI thread via `useDerivedValue`/`useAnimatedReaction` and never reads shared values during render.
- `VideoControls`, native/web layouts, and `ProgressBar` respect the conditional mount flags without opacity hacks; pointer events stay explicit.
- Expo runtime confirms the 0.03 / 0.45 thresholds align with spec and no longer trigger Reanimated bridge warnings.

## Key Differences from Hybrid Approach

1. **No opacity animations** - Pure mount/unmount only
2. **No transition windows** - Immediate mount/unmount at boundaries (0.03 and 0.45)
3. **Independent visibility** - Progress bars not tied to controls visibility
4. **Simpler implementation** - No animated styles, just boolean flags

## Risk Mitigation

**Risk:** Abrupt mount/unmount causes visual jump

**Mitigation:** Boundaries chosen at natural transition points (0.03 and 0.45) where bars are already invisible

**Risk:** Visibility flags out of sync with SharedValue

**Mitigation:** Use `useAnimatedReaction` with proper cleanup, test sync timing

**Risk:** Breaking existing persistent bar rendering at layout level

**Mitigation:** Add `shouldRenderPersistent` flag to props, maintain backward compatibility during migration

---

## VideoAnalysisScreen Simplification

### Task 53: Simplify VideoAnalysisScreen Architecture (Battle-Tested Pattern)
**Effort:** 3-5 days | **Priority:** P1 (Technical Debt) | **Depends on:** None
**User Story:** N/A (Technical debt reduction - architectural simplification)

**STATUS:** 🟢 **READY TO START**

**OBJECTIVE:** Simplify VideoAnalysisScreen from 13 hooks + 2 stores + 612 lines to 3-4 hooks + 1 store + ~150 lines using battle-tested patterns (YouTube/Vimeo architecture). Consolidate related functionality while keeping social features as UI placeholders.

**CURRENT STATE:**
- ❌ 13 hooks called directly in component (useVideoPlayback, useVideoControls, useVideoAudioSync, useAudioController, useFeedbackAudioSource, useAnalysisState, useFeedbackPanel, useFeedbackCoordinator, useHistoricalAnalysis, useAutoPlayOnReady, useGestureController, useAnimationController, useStatusBar)
- ❌ 2 Zustand stores (useFeedbackCoordinatorStore, usePersistentProgressStore)
- ❌ 7 useMemo compositions (videoState, playback, audio, feedback, handlers, error, socialCounts)
- ✅ Active features: Feedback system, video playback
- ✅ Social features: Kept as placeholders (socialCounts, social actions, mock comments) for UI completeness
- ✅ Architecture diagram: `docs/spec/video-analysis-screen-architecture.mermaid`
- ✅ Simplification proposal: `docs/spec/video-analysis-simplification-proposal.md`

**PROBLEM:**
- Hook explosion (13 hooks) creates complex dependency graph
- Dual state management (Zustand + local hooks) adds cognitive overhead
- Prop composition layers (hook → useMemo → Screen → Layout) cause re-render cascades
- Hard to test (need to mock 13 hooks + 2 stores)
- Violates battle-tested patterns (YouTube/Vimeo use 3-4 hooks max, imperative APIs)

**IMPACT:**
- **Maintainability:** Developers must understand 13 hooks + 2 stores + 7 compositions
- **Performance:** Prop drilling and memoization overhead
- **Testing:** Requires mocking 13 hooks + 2 stores
- **Debugging:** State scattered across multiple sources
- **Onboarding:** Complex architecture discourages new contributors

**SCOPE:**

#### Phase 1: Consolidate Video Hooks → useVideoPlayer
**Summary:** Merge useVideoPlayback + useVideoControls + useVideoAudioSync into single hook with imperative API.

**File to Create:** `packages/app/features/VideoAnalysis/hooks/useVideoPlayer.ts`

**Tasks:**
- [ ] Create `useVideoPlayer` hook with imperative ref API
- [ ] Consolidate video playback state (isPlaying, currentTime, duration, videoEnded, pendingSeek)
- [ ] Consolidate controls visibility logic (showControls, auto-hide timers)
- [ ] Consolidate video-audio sync logic (shouldPlayVideo)
- [ ] Expose imperative methods: `play()`, `pause()`, `seek(time)`, `replay()`
- [ ] Move `useAutoPlayOnReady` logic into hook
- [ ] Create test file with full coverage (1:2 ratio)
- [ ] Update VideoAnalysisScreen to use new hook
- [ ] Remove old hooks: useVideoPlayback, useVideoControls, useVideoAudioSync, useAutoPlayOnReady

**Interface:**
```typescript
export interface VideoPlayerRef {
  play: () => void
  pause: () => void
  seek: (time: number) => void
  replay: () => void
  getCurrentTime: () => number
  getDuration: () => number
}

export interface UseVideoPlayerReturn {
  ref: React.RefObject<VideoPlayerRef>
  isPlaying: boolean
  currentTime: number
  duration: number
  videoEnded: boolean
  pendingSeek: number | null
  showControls: boolean
  shouldPlayVideo: boolean
  onLoad: (data: { duration: number }) => void
  onProgress: (time: number) => void
  onEnd: () => void
}
```

**Reference:** Battle-tested pattern from YouTube/Vimeo (imperative ref API)

**Acceptance Criteria:**
- [ ] Single hook replaces 4 hooks (useVideoPlayback, useVideoControls, useVideoAudioSync, useAutoPlayOnReady)
- [ ] Imperative API matches YouTube/Vimeo pattern
- [ ] Test coverage ≥ 1:2 ratio
- [ ] `yarn workspace @my/app test useVideoPlayer.test.ts` passes
- [ ] VideoAnalysisScreen updated to use new hook
- [ ] Old hooks removed from codebase

#### Phase 2: Consolidate Feedback Hooks → useFeedbackSystem
**Summary:** Merge useFeedbackCoordinator + useFeedbackAudioSource + useAudioController + useFeedbackPanel into single hook.

**File to Create:** `packages/app/features/VideoAnalysis/hooks/useFeedbackSystem.ts`

**Tasks:**
- [ ] Create `useFeedbackSystem` hook
- [ ] Consolidate feedback coordination (highlighting, bubble state, overlay)
- [ ] Consolidate audio source management (audio URLs, errors, selection)
- [ ] Consolidate audio playback control (isPlaying, currentTime, duration)
- [ ] Consolidate panel state (panelFraction, activeTab, selectedFeedbackId)
- [ ] Create test file with full coverage (1:2 ratio)
- [ ] Update VideoAnalysisScreen to use new hook
- [ ] Remove old hooks: useFeedbackCoordinator, useFeedbackAudioSource, useAudioController, useFeedbackPanel

**Interface:**
```typescript
export interface UseFeedbackSystemReturn {
  items: FeedbackPanelItem[]
  selectedId: string | null
  bubbleState: { visible: boolean; currentIndex: number | null }
  overlayVisible: boolean
  activeAudio: { id: string; url: string } | null
  panelFraction: number
  activeTab: 'feedback' | 'insights' | 'comments'
  audioUrls: Record<string, string>
  errors: Record<string, string>
  handlers: {
    onFeedbackTap: (item: FeedbackPanelItem) => void
    onPanelCollapse: () => void
    onTabChange: (tab: 'feedback' | 'insights' | 'comments') => void
    onSelectAudio: (id: string) => void
    onRetryFeedback: (id: string) => void
    onDismissError: (id: string) => void
  }
}
```

**Acceptance Criteria:**
- [ ] Single hook replaces 4 hooks
- [ ] Test coverage ≥ 1:2 ratio
- [ ] `yarn workspace @my/app test useFeedbackSystem.test.ts` passes
- [ ] VideoAnalysisScreen updated to use new hook
- [ ] Old hooks removed from codebase

#### Phase 3: Consolidate Analysis Hooks → useAnalysis
**Summary:** Merge useAnalysisState + useHistoricalAnalysis into single hook.

**File to Create:** `packages/app/features/VideoAnalysis/hooks/useAnalysis.ts`

**Tasks:**
- [ ] Create `useAnalysis` hook
- [ ] Consolidate analysis state (phase, progress, feedbackItems, error)
- [ ] Consolidate historical analysis data loading
- [ ] Handle both history mode and live analysis modes
- [ ] Create test file with full coverage (1:2 ratio)
- [ ] Update VideoAnalysisScreen to use new hook
- [ ] Remove old hooks: useAnalysisState, useHistoricalAnalysis

**Interface:**
```typescript
export interface UseAnalysisReturn {
  phase: AnalysisPhase
  progress: number
  feedbackItems: FeedbackPanelItem[]
  error: { phase: string; message: string } | null
  isProcessing: boolean
  channelExhausted: boolean
  videoUri: string | null
  retry: () => void
}
```

**Acceptance Criteria:**
- [ ] Single hook replaces 2 hooks
- [ ] Test coverage ≥ 1:2 ratio
- [ ] `yarn workspace @my/app test useAnalysis.test.ts` passes
- [ ] VideoAnalysisScreen updated to use new hook
- [ ] Old hooks removed from codebase

#### Phase 4: Merge Stores → Single useFeedbackStore
**Summary:** Merge useFeedbackCoordinatorStore + usePersistentProgressStore into single store.

**File to Modify:** `packages/app/features/VideoAnalysis/stores/feedbackStore.ts` (rename from feedbackCoordinatorStore)

**Tasks:**
- [ ] Merge feedbackCoordinatorStore state into single store
- [ ] Merge persistentProgressStore state into single store
- [ ] Update all store subscriptions across codebase
- [ ] Create test file with full coverage
- [ ] Remove old stores: feedbackCoordinatorStore, persistentProgressStore

**Interface:**
```typescript
export interface FeedbackStore {
  // Coordinator state
  highlightedFeedbackId: string | null
  isCoachSpeaking: boolean
  bubbleState: { currentBubbleIndex: number | null; bubbleVisible: boolean }
  overlayVisible: boolean
  activeAudio: { id: string; url: string } | null
  
  // Persistent progress state
  persistentProgressProps: PersistentProgressBarProps | null
  
  // Actions
  setHighlightedFeedbackId: (id: string | null) => void
  setIsCoachSpeaking: (speaking: boolean) => void
  setBubbleState: (state: BubbleState) => void
  setOverlayVisible: (visible: boolean) => void
  setActiveAudio: (audio: { id: string; url: string } | null) => void
  setPersistentProgressProps: (props: PersistentProgressBarProps | null) => void
  reset: () => void
}
```

**Acceptance Criteria:**
- [ ] Single store replaces 2 stores
- [ ] All subscriptions updated across codebase
- [ ] Test coverage maintained
- [ ] `yarn workspace @my/app test feedbackStore.test.ts` passes
- [ ] Old stores removed from codebase

#### Phase 5: Keep Social Features (No Changes)
**Summary:** Keep placeholder features (social counts, social actions, mock comments) as-is. These are intentionally kept for UI completeness and future implementation.

**Files Affected:**
- `packages/app/features/VideoAnalysis/VideoAnalysisScreen.tsx`
- `packages/app/features/VideoAnalysis/components/FeedbackSection.tsx`

**Tasks:**
- [ ] Keep `socialCounts` hardcoded object (UI placeholder)
- [ ] Keep `onShare`, `onLike`, `onComment`, `onBookmark` handlers (log placeholders)
- [ ] Keep mock comments (UI placeholder until real API)

**Acceptance Criteria:**
- [ ] Social features remain in UI (placeholders)
- [ ] Handlers remain as log placeholders
- [ ] Mock data remains for UI completeness
- [ ] All tests updated to reflect kept features

#### Phase 6: Optional - Consolidate Native Hooks → useVideoLayout
**Summary:** Merge useGestureController + useAnimationController into single native-only hook.

**File to Create:** `packages/app/features/VideoAnalysis/hooks/useVideoLayout.ts` (native only)

**Tasks:**
- [ ] Create `useVideoLayout` hook (native only)
- [ ] Consolidate gesture handling (pan, scroll, conflict detection)
- [ ] Consolidate animation values (scrollY, feedbackContentOffsetY, scrollRef)
- [ ] Create test file with full coverage
- [ ] Update VideoAnalysisScreen to use new hook
- [ ] Remove old hooks: useGestureController, useAnimationController

**Acceptance Criteria:**
- [ ] Single hook replaces 2 hooks (native only)
- [ ] Test coverage ≥ 1:2 ratio
- [ ] `yarn workspace @my/app test useVideoLayout.test.ts` passes
- [ ] VideoAnalysisScreen updated to use new hook
- [ ] Old hooks removed from codebase

**SUCCESS VALIDATION:**
- [ ] Hook count reduced from 13 → 3-4 hooks (75% reduction)
- [ ] Store count reduced from 2 → 1 store (50% reduction)
- [ ] Component lines reduced from 612 → ~150 lines (75% reduction)
- [ ] Social features kept as placeholders (intentional UI completeness)
- [ ] Imperative API pattern implemented (YouTube/Vimeo style)
- [ ] `yarn type-check` passes (0 errors)
- [ ] `yarn lint` passes (0 errors)
- [ ] `yarn workspace @my/app test` passes (all tests)
- [ ] React DevTools Profiler shows performance improvement
- [ ] Architecture diagram updated: `docs/spec/video-analysis-simplified-architecture.mermaid`

**FILES TO CREATE:**
- `packages/app/features/VideoAnalysis/hooks/useVideoPlayer.ts`
- `packages/app/features/VideoAnalysis/hooks/useVideoPlayer.test.ts`
- `packages/app/features/VideoAnalysis/hooks/useFeedbackSystem.ts`
- `packages/app/features/VideoAnalysis/hooks/useFeedbackSystem.test.ts`
- `packages/app/features/VideoAnalysis/hooks/useAnalysis.ts`
- `packages/app/features/VideoAnalysis/hooks/useAnalysis.test.ts`
- `packages/app/features/VideoAnalysis/hooks/useVideoLayout.ts` (optional, native only)
- `packages/app/features/VideoAnalysis/hooks/useVideoLayout.test.ts` (optional)

**FILES TO MODIFY:**
- `packages/app/features/VideoAnalysis/VideoAnalysisScreen.tsx`
- `packages/app/features/VideoAnalysis/components/VideoAnalysisLayout.native.tsx`
- `packages/app/features/VideoAnalysis/components/VideoAnalysisLayout.web.tsx`
- `packages/app/features/VideoAnalysis/components/FeedbackSection.tsx`
- `packages/app/features/VideoAnalysis/stores/feedbackStore.ts` (rename from feedbackCoordinatorStore)

**FILES TO DELETE:**
- `packages/app/features/VideoAnalysis/hooks/useVideoPlayback.ts`
- `packages/app/features/VideoAnalysis/hooks/useVideoControls.ts`
- `packages/app/features/VideoAnalysis/hooks/useVideoAudioSync.ts`
- `packages/app/features/VideoAnalysis/hooks/useAutoPlayOnReady.ts`
- `packages/app/features/VideoAnalysis/hooks/useFeedbackCoordinator.ts`
- `packages/app/features/VideoAnalysis/hooks/useFeedbackAudioSource.ts`
- `packages/app/features/VideoAnalysis/hooks/useAudioController.ts`
- `packages/app/features/VideoAnalysis/hooks/useFeedbackPanel.ts`
- `packages/app/features/VideoAnalysis/hooks/useAnalysisState.ts`
- `packages/app/features/VideoAnalysis/hooks/useHistoricalAnalysis.ts`
- `packages/app/features/VideoAnalysis/hooks/useGestureController.ts` (optional)
- `packages/app/features/VideoAnalysis/hooks/useAnimationController.ts` (optional)
- `packages/app/features/VideoAnalysis/stores/feedbackCoordinatorStore.ts`
- `packages/app/features/VideoAnalysis/stores/persistentProgress.ts`

**QUALITY GATES:**

After each phase:
1. Run tests: `yarn workspace @my/app test <new-hook>.test.ts`
2. Type check: `yarn workspace @my/app type-check`
3. Lint: `yarn workspace @my/app lint`
4. Verify no regressions: Manual testing of video playback and feedback features
5. Update architecture diagram if needed

**RISK MITIGATION:**

**Risk:** Breaking existing functionality during consolidation
**Mitigation:** Implement phases incrementally, maintain full test coverage, manual testing after each phase

**Risk:** Imperative API pattern unfamiliar to team
**Mitigation:** Document pattern clearly, reference YouTube/Vimeo examples, provide examples in code comments

**Risk:** Store merge causes subscription issues
**Mitigation:** Update all subscriptions in single commit, use granular selectors, test subscription behavior

**Risk:** Social features need to remain for UI completeness
**Mitigation:** Keep social features as placeholders (socialCounts, handlers, mock comments) - no changes needed in Phase 5

**REFERENCES:**
- Simplification proposal: `docs/spec/video-analysis-simplification-proposal.md`
- Simplified architecture diagram: `docs/spec/video-analysis-simplified-architecture.mermaid`
- Current architecture diagram: `docs/spec/video-analysis-screen-architecture.mermaid`

---
