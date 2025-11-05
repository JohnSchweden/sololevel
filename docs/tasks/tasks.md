# Tasks



---


## VideoAnalysisScreen Simplification

### Task 51: Move State to Zustand Store (Single Source of Truth)
**Effort:** 1-2 days | **Priority:** P1 (Technical Debt) | **Depends on:** None
**User Story:** N/A (Technical debt reduction)

**STATUS:** 🔄 **PENDING**

**OBJECTIVE:** Eliminate dual state management (Zustand + local hooks) by moving all video/feedback state to a single Zustand store. This simplifies the architecture and removes prop drilling.

**CURRENT STATE:**
- ❌ Dual state management: Zustand store for some state (`highlightedFeedbackId`, `bubbleState`), local hooks for other state (`videoPlayback`, `audioController`)
- ❌ Prop drilling through composition layers (hook → useMemo → Screen → Layout)
- ❌ Granular Zustand subscriptions to avoid re-renders (adds overhead)
- ✅ Existing `useFeedbackCoordinatorStore` and `usePersistentProgressStore` patterns

**PROBLEM:**
- Inconsistent state management patterns (Zustand vs local hooks)
- Prop composition creates unnecessary re-render cascades
- Cognitive overhead from tracking state in multiple places
- Hard to test (need to mock both hooks and store)

**IMPACT:**
- **Maintainability:** Developers must understand both Zustand and local hook patterns
- **Performance:** Prop drilling creates unnecessary re-renders
- **Testing:** Requires mocking 14 hooks + store subscriptions
- **Debugging:** State scattered across multiple sources

**SCOPE:**

#### Module 1.1: Create Unified VideoAnalysisStore
**Summary:** Create single Zustand store for all video/feedback state.

**File to Create/Modify:** `packages/app/features/VideoAnalysis/stores/videoAnalysisStore.ts` (or extend existing)

**Tasks:**
- [ ] Define store interface with video state (isPlaying, currentTime, duration, videoEnded)
- [ ] Define store interface with feedback state (highlightedFeedbackId, bubbleState, overlayVisible)
- [ ] Define store actions (play, pause, seek, highlightFeedback, etc.)
- [ ] Implement store with immer middleware
- [ ] Add selectors for derived state (shouldPlayVideo, isCoachSpeaking, etc.)
- [ ] Create test file with store tests

**Interface:**
```typescript
interface VideoAnalysisStore {
  // Video state
  isPlaying: boolean
  currentTime: number
  duration: number
  videoEnded: boolean
  
  // Feedback state
  highlightedFeedbackId: string | null
  bubbleState: BubbleState
  overlayVisible: boolean
  activeAudio: { id: string; url: string } | null
  
  // Actions
  play: () => void
  pause: () => void
  seek: (time: number) => void
  setHighlightedFeedback: (id: string | null) => void
  // ... more actions
}
```

**Reference:** `packages/app/features/VideoAnalysis/stores/feedbackCoordinatorStore.ts`

**Acceptance Criteria:**
- [ ] Store follows existing Zustand patterns (immer, selectors)
- [ ] All video/feedback state moved to store
- [ ] Actions are stable references (no re-creation)
- [ ] Test coverage ≥ 1:2 ratio
- [ ] `yarn workspace @my/app test videoAnalysisStore.test.ts` passes

#### Module 1.2: Update Components to Use Store Directly
**Summary:** Replace prop passing with direct store subscriptions.

**File to Modify:** `packages/app/features/VideoAnalysis/VideoAnalysisScreen.tsx`

**Tasks:**
- [ ] Remove prop composition for video state (videoState, playback)
- [ ] Remove prop composition for feedback state (feedback, bubbleState, audioOverlay)
- [ ] Update VideoAnalysisLayout to read directly from store
- [ ] Update child components to subscribe directly (VideoPlayerSection, FeedbackPanel, etc.)
- [ ] Remove Zustand store getter props from VideoAnalysisScreen

**Acceptance Criteria:**
- [ ] No video/feedback state passed as props
- [ ] Components subscribe directly to store
- [ ] No prop drilling through VideoAnalysisScreen
- [ ] All existing tests pass (update mocks if needed)
- [ ] `yarn workspace @my/app test VideoAnalysisScreen.test.tsx` passes

#### Module 1.3: Remove Prop Composition useMemo Calls
**Summary:** Eliminate useMemo calls for prop composition since state is now in store.

**File to Modify:** `packages/app/features/VideoAnalysis/VideoAnalysisScreen.tsx`

**Tasks:**
- [ ] Remove `videoState` useMemo (lines 379-400)
- [ ] Remove `playback` useMemo (lines 342-355)
- [ ] Remove `feedback` useMemo (lines 307-329)
- [ ] Remove `audio` useMemo (lines 361-368)
- [ ] Remove `error` useMemo if store-based (lines 542-550)
- [ ] Update VideoAnalysisLayout props to accept store selectors instead

**Acceptance Criteria:**
- [ ] No useMemo calls for state composition
- [ ] Components read directly from store
- [ ] No performance regression (measure with React DevTools Profiler)
- [ ] All tests pass

**SUCCESS VALIDATION:**
- [ ] Single source of truth (Zustand store only)
- [ ] No prop drilling for video/feedback state
- [ ] Components subscribe directly to store
- [ ] `yarn type-check` passes (0 errors)
- [ ] `yarn lint` passes (0 errors)
- [ ] `yarn workspace @my/app test` passes (all tests)
- [ ] React DevTools Profiler shows no performance regression

**FILES TO MODIFY:**
- `packages/app/features/VideoAnalysis/VideoAnalysisScreen.tsx`
- `packages/app/features/VideoAnalysis/components/VideoAnalysisLayout.native.tsx`
- `packages/app/features/VideoAnalysis/components/VideoAnalysisLayout.web.tsx`
- `packages/app/features/VideoAnalysis/components/VideoPlayerSection.tsx`
- `packages/app/features/VideoAnalysis/components/FeedbackSection.tsx`

---

### Task 52: Consolidate Hooks (14 → 4-5 Core Hooks)
**Effort:** 2-3 days | **Priority:** P1 (Technical Debt) | **Depends on:** Task 51
**User Story:** N/A (Technical debt reduction)

**STATUS:** 🔄 **PENDING**

**OBJECTIVE:** Reduce complexity by consolidating 14 hooks into 4-5 core hooks with clear responsibilities. This simplifies testing, reduces dependency graphs, and improves maintainability.

**CURRENT STATE:**
- ❌ 14 hooks called directly in VideoAnalysisScreen
- ❌ Complex dependency graphs between hooks
- ❌ Hard to test (14 hooks to mock)
- ✅ Hooks have single responsibilities (good)

**PROBLEM:**
- Too many hooks = too many failure points
- Complex dependency graphs make debugging difficult
- Testing requires mocking 14 hooks
- Cognitive overhead from tracking hook interactions

**IMPACT:**
- **Maintainability:** Changes require understanding 14 hooks
- **Testing:** Requires mocking 14 hooks in every test
- **Debugging:** Complex dependency chains
- **Performance:** Hook overhead (14 hooks called per render)

**SCOPE:**

#### Module 2.1: Merge Video Hooks → useVideoPlayer
**Summary:** Consolidate `useVideoPlayback` + `useAudioController` + `useVideoAudioSync` → `useVideoPlayer`.

**Files to Modify:**
- `packages/app/features/VideoAnalysis/hooks/useVideoPlayback.ts`
- `packages/app/features/VideoAnalysis/hooks/useAudioController.ts`
- `packages/app/features/VideoAnalysis/hooks/useVideoAudioSync.ts`

**Tasks:**
- [ ] Create `useVideoPlayer` hook that combines video + audio playback
- [ ] Merge playback state (isPlaying, currentTime, duration)
- [ ] Merge audio state (isAudioPlaying, audioCurrentTime)
- [ ] Merge sync logic (shouldPlayVideo)
- [ ] Update tests to cover combined hook
- [ ] Remove old hooks (or mark deprecated)

**Acceptance Criteria:**
- [ ] Single hook replaces 3 hooks
- [ ] All existing functionality preserved
- [ ] Tests pass (update mocks)
- [ ] `yarn workspace @my/app test useVideoPlayer.test.ts` passes

#### Module 2.2: Merge Feedback Hooks → useFeedbackSystem
**Summary:** Consolidate feedback-related hooks → `useFeedbackSystem`.

**Files to Modify:**
- `packages/app/features/VideoAnalysis/hooks/useFeedbackCoordinator.ts`
- `packages/app/features/VideoAnalysis/hooks/useFeedbackAudioSource.ts`
- `packages/app/features/VideoAnalysis/hooks/useFeedbackSelection.ts`
- `packages/app/features/VideoAnalysis/hooks/useBubbleController.ts`

**Tasks:**
- [ ] Create `useFeedbackSystem` hook
- [ ] Merge feedback coordination logic
- [ ] Merge audio source management
- [ ] Merge selection logic
- [ ] Merge bubble controller
- [ ] Update tests
- [ ] Remove old hooks (or mark deprecated)

**Acceptance Criteria:**
- [ ] Single hook replaces 4 hooks
- [ ] All existing functionality preserved
- [ ] Tests pass (update mocks)
- [ ] `yarn workspace @my/app test useFeedbackSystem.test.ts` passes

#### Module 2.3: Keep Native-Only Hooks Separate
**Summary:** Keep gesture/animation hooks separate (native-only concerns).

**Files:** (No changes needed)
- `packages/app/features/VideoAnalysis/hooks/useGestureController.ts`
- `packages/app/features/VideoAnalysis/hooks/useAnimationController.ts`

**Rationale:** These are platform-specific (native only) and should remain separate.

**Acceptance Criteria:**
- [ ] Gesture/animation hooks remain separate
- [ ] No changes needed (already platform-specific)

#### Module 2.4: Update VideoAnalysisScreen
**Summary:** Replace 14 hook calls with 4-5 consolidated hooks.

**File to Modify:** `packages/app/features/VideoAnalysis/VideoAnalysisScreen.tsx`

**Tasks:**
- [ ] Replace 3 video hooks → `useVideoPlayer`
- [ ] Replace 4 feedback hooks → `useFeedbackSystem`
- [ ] Keep `useAnalysisState` (data fetching)
- [ ] Keep `useFeedbackPanel` (UI state)
- [ ] Keep `useHistoricalAnalysis` (data fetching)
- [ ] Keep gesture/animation hooks (native only)
- [ ] Update tests to mock new hooks

**Acceptance Criteria:**
- [ ] 14 hooks reduced to 4-5 hooks
- [ ] All functionality preserved
- [ ] Tests pass (update mocks)
- [ ] `yarn workspace @my/app test VideoAnalysisScreen.test.tsx` passes
- [ ] Component renders correctly (manual QA)

**SUCCESS VALIDATION:**
- [ ] 14 hooks → 4-5 hooks (60-70% reduction)
- [ ] All tests pass
- [ ] No functionality regression
- [ ] `yarn type-check` passes (0 errors)
- [ ] `yarn lint` passes (0 errors)
- [ ] Component renders correctly (manual QA)

**FILES TO MODIFY:**
- `packages/app/features/VideoAnalysis/VideoAnalysisScreen.tsx`
- `packages/app/features/VideoAnalysis/hooks/useVideoPlayer.ts` (new)
- `packages/app/features/VideoAnalysis/hooks/useFeedbackSystem.ts` (new)
- `packages/app/features/VideoAnalysis/VideoAnalysisScreen.test.tsx`

---

### Task 53: Remove Unnecessary Memoization & Clean Debug Code
**Effort:** 1 day | **Priority:** P2 (Code Quality) | **Depends on:** Task 51, Task 52
**User Story:** N/A (Code quality improvement)

**STATUS:** 🔄 **PENDING**

**OBJECTIVE:** Remove premature optimizations (useMemo/useCallback) and clean up debug code from production. Trust React's reconciliation, optimize only what profiling proves slow.

**CURRENT STATE:**
- ❌ 5 useMemo calls for prop composition (lines 307-550)
- ❌ 6 refs for "stable" handlers (lines 441-454) - refs updated every render
- ❌ 2 debug useEffects running in production (lines 200-242)
- ❌ 300+ lines of prop change tracking in VideoAnalysisLayout
- ✅ React DevTools Profiler available for actual performance measurement

**PROBLEM:**
- Memoization overhead without proven benefit (5 useMemo = ~5-10ms per render)
- Refs updated every render = no stability gain ("optimization theater")
- Debug code adds overhead in production
- Prop tracking code clutters layout component

**IMPACT:**
- **Performance:** Memoization overhead may exceed benefit
- **Maintainability:** Complex dependency arrays to maintain
- **Code Quality:** Debug code in production
- **Bundle Size:** Unnecessary code in production

**SCOPE:**

#### Module 3.1: Remove useMemo from Prop Composition
**Summary:** Remove useMemo calls, let React re-render naturally.

**File to Modify:** `packages/app/features/VideoAnalysis/VideoAnalysisScreen.tsx`

**Tasks:**
- [ ] Remove `feedback` useMemo (lines 307-329)
- [ ] Remove `playback` useMemo (lines 342-355)
- [ ] Remove `audio` useMemo (lines 361-368)
- [ ] Remove `videoState` useMemo (lines 379-400) - if not removed in Task 51
- [ ] Remove `error` useMemo (lines 542-550) - if not removed in Task 51
- [ ] Remove `socialCounts` useMemo (lines 290-293) - replace with constant
- [ ] Remove `handlers` useMemo (lines 461-535) - replace with direct handlers or Zustand actions

**Acceptance Criteria:**
- [ ] No useMemo calls for prop composition
- [ ] Components read directly from store or props
- [ ] React DevTools Profiler shows no performance regression
- [ ] All tests pass

#### Module 3.2: Remove Ref-Based Handler Optimization
**Summary:** Remove ref indirection for handlers - either use Zustand actions or pass handlers directly.

**File to Modify:** `packages/app/features/VideoAnalysis/VideoAnalysisScreen.tsx`

**Tasks:**
- [ ] Remove ref declarations (lines 441-446)
- [ ] Remove ref updates (lines 449-454)
- [ ] Replace ref-based handlers with Zustand actions OR direct handlers
- [ ] Use `useCallback` with proper deps if handlers needed (not refs)
- [ ] Update handlers object (lines 461-535)

**Acceptance Criteria:**
- [ ] No refs for handler stability
- [ ] Handlers use Zustand actions OR direct callbacks
- [ ] No "optimization theater"
- [ ] All tests pass

#### Module 3.3: Remove Debug Code from Production
**Summary:** Remove or gate debug useEffects behind `__DEV__` flag.

**File to Modify:** `packages/app/features/VideoAnalysis/VideoAnalysisScreen.tsx`

**Tasks:**
- [ ] Remove or gate debug useEffect (lines 200-217) - useState index tracking
- [ ] Remove or gate debug useEffect (lines 223-242) - Zustand subscription tracking
- [ ] Remove debug comments explaining "why-did-you-render" behavior
- [ ] Remove WDYR configuration (lines 612-617) or gate behind `__DEV__`

**Acceptance Criteria:**
- [ ] No debug code running in production
- [ ] Debug code gated behind `__DEV__` if needed for dev debugging
- [ ] Production bundle size reduced
- [ ] All tests pass

#### Module 3.4: Clean VideoAnalysisLayout Component
**Summary:** Remove prop change tracking code, extract to dev-only wrapper.

**File to Modify:** `packages/app/features/VideoAnalysis/components/VideoAnalysisLayout.native.tsx`

**Tasks:**
- [ ] Remove prop change tracking (lines 240-356)
- [ ] Remove render diagnostics (lines 227-230)
- [ ] Remove render count tracking (lines 233-239)
- [ ] Extract to dev-only wrapper if needed: `withRenderTracking(VideoAnalysisLayout)`
- [ ] Simplify component to presentation-only

**File to Create:** `packages/app/features/VideoAnalysis/components/VideoAnalysisLayout.dev.tsx` (if needed)

**Acceptance Criteria:**
- [ ] Layout component is presentation-only
- [ ] No prop tracking in production code
- [ ] Component simplified (700 lines → ~400 lines)
- [ ] All tests pass

**SUCCESS VALIDATION:**
- [ ] No useMemo for prop composition
- [ ] No ref-based handler optimization
- [ ] No debug code in production
- [ ] Layout component simplified
- [ ] React DevTools Profiler shows no performance regression
- [ ] `yarn type-check` passes (0 errors)
- [ ] `yarn lint` passes (0 errors)
- [ ] `yarn workspace @my/app test` passes (all tests)
- [ ] Bundle size reduced (measure before/after)

**FILES TO MODIFY:**
- `packages/app/features/VideoAnalysis/VideoAnalysisScreen.tsx`
- `packages/app/features/VideoAnalysis/components/VideoAnalysisLayout.native.tsx`
- `packages/app/features/VideoAnalysis/components/VideoAnalysisLayout.web.tsx` (if needed)

**FILES TO CREATE:**
- `packages/app/features/VideoAnalysis/components/VideoAnalysisLayout.dev.tsx` (optional, for dev-only wrapper)

---

### Task 54: Add Accessibility Improvements (Keyboard Navigation & ARIA)
**Effort:** 0.5-1 day | **Priority:** P2 (Accessibility) | **Depends on:** None
**User Story:** US-A11Y-01 (Video controls must be keyboard accessible)

**STATUS:** 🔄 **PENDING**

**OBJECTIVE:** Add keyboard navigation and ARIA labels to video controls for accessibility compliance.

**CURRENT STATE:**
- ❌ No keyboard navigation for video controls
- ❌ No ARIA labels on interactive elements
- ❌ No screen reader announcements for state changes
- ❌ No focus management during feedback interactions
- ✅ Video controls work with touch/mouse

**PROBLEM:**
- Video player is not accessible to keyboard users
- Screen readers cannot navigate or understand controls
- No focus management during interactions
- Violates WCAG 2.1 AA compliance

**IMPACT:**
- **Accessibility:** Keyboard users cannot use video player
- **Compliance:** Fails WCAG 2.1 AA requirements
- **User Experience:** Screen reader users cannot understand state changes
- **Legal:** Potential ADA compliance issues

**SCOPE:**

#### Module 4.1: Add Keyboard Navigation
**Summary:** Add keyboard shortcuts for video controls.

**Files to Modify:**
- `packages/ui/src/components/VideoAnalysis/VideoControls/VideoControls.tsx`
- `packages/app/features/VideoAnalysis/components/VideoPlayerSection.tsx`

**Tasks:**
- [ ] Add keyboard event handler for spacebar (play/pause)
- [ ] Add keyboard event handler for arrow keys (seek ±5s)
- [ ] Add keyboard event handler for 'M' (mute/unmute)
- [ ] Add keyboard event handler for 'F' (fullscreen)
- [ ] Prevent default browser behavior for video shortcuts
- [ ] Add visual feedback for keyboard interactions

**Acceptance Criteria:**
- [ ] Spacebar toggles play/pause
- [ ] Left/Right arrows seek ±5s
- [ ] Keyboard shortcuts work on web and native (if applicable)
- [ ] Tests validate keyboard interactions

#### Module 4.2: Add ARIA Labels
**Summary:** Add ARIA labels to all interactive elements.

**Files to Modify:**
- `packages/ui/src/components/VideoAnalysis/VideoControls/VideoControls.tsx`
- `packages/ui/src/components/VideoAnalysis/VideoControls/components/CenterControls.tsx`
- `packages/ui/src/components/VideoAnalysis/VideoControls/components/ProgressBar.tsx`

**Tasks:**
- [ ] Add `aria-label` to play/pause button
- [ ] Add `aria-label` to seek bar
- [ ] Add `aria-label` to time display
- [ ] Add `aria-label` to fullscreen button
- [ ] Add `role="button"` to interactive elements
- [ ] Add `aria-live` region for state announcements

**Acceptance Criteria:**
- [ ] All interactive elements have ARIA labels
- [ ] Screen reader can navigate all controls
- [ ] Labels are descriptive and clear
- [ ] Tests validate ARIA attributes

#### Module 4.3: Add Screen Reader Announcements
**Summary:** Announce state changes to screen readers.

**Files to Modify:**
- `packages/ui/src/components/VideoAnalysis/VideoControls/VideoControls.tsx`

**Tasks:**
- [ ] Add `aria-live="polite"` region for state announcements
- [ ] Announce "Playing" when video starts
- [ ] Announce "Paused" when video pauses
- [ ] Announce "Seeking to [time]" on seek
- [ ] Announce feedback highlights (if applicable)

**Acceptance Criteria:**
- [ ] State changes announced to screen readers
- [ ] Announcements are timely and clear
- [ ] Tests validate announcements

#### Module 4.4: Add Focus Management
**Summary:** Manage focus during feedback interactions.

**Files to Modify:**
- `packages/app/features/VideoAnalysis/components/FeedbackSection.tsx`
- `packages/app/features/VideoAnalysis/components/VideoPlayerSection.tsx`

**Tasks:**
- [ ] Focus feedback item when tapped/selected
- [ ] Focus video controls when panel collapses
- [ ] Trap focus in overlay modals (if any)
- [ ] Return focus after modal closes

**Acceptance Criteria:**
- [ ] Focus moves logically during interactions
- [ ] Focus trap works in modals
- [ ] Tests validate focus management

**SUCCESS VALIDATION:**
- [ ] Keyboard navigation works (space, arrows, M, F)
- [ ] All interactive elements have ARIA labels
- [ ] Screen reader announces state changes
- [ ] Focus management works correctly
- [ ] WCAG 2.1 AA compliance verified (manual audit)
- [ ] `yarn type-check` passes (0 errors)
- [ ] `yarn lint` passes (0 errors)
- [ ] `yarn workspace @my/app test` passes (all tests)

**FILES TO MODIFY:**
- `packages/ui/src/components/VideoAnalysis/VideoControls/VideoControls.tsx`
- `packages/ui/src/components/VideoAnalysis/VideoControls/components/CenterControls.tsx`
- `packages/ui/src/components/VideoAnalysis/VideoControls/components/ProgressBar.tsx`
- `packages/app/features/VideoAnalysis/components/VideoPlayerSection.tsx`
- `packages/app/features/VideoAnalysis/components/FeedbackSection.tsx`

---
