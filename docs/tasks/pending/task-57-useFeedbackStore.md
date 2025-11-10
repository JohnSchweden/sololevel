# Task 57: Merge Stores → Single useFeedbackStore

**Effort:** 1 day | **Priority:** P1 (Technical Debt) | **Depends on:** Task 56  
**User Story:** N/A (Architectural consolidation - state management)  
**Parent Task:** Task 53

**STATUS:** ⏸️ **WAITING** (Depends on Task 56)

## Objective

Merge 2 Zustand stores (useFeedbackCoordinatorStore, usePersistentProgressStore) into single `useFeedbackStore` for unified state management.

## Current State

- ❌ 2 stores: useFeedbackCoordinatorStore, usePersistentProgressStore
- ❌ Feedback state split across multiple stores
- ❌ Granular subscriptions to prevent re-renders
- ✅ Existing test files for both stores
- ✅ Immer middleware for immutable updates

## Problem

- Dual store pattern adds complexity
- State synchronization between stores
- Inconsistent subscription patterns
- More boilerplate for store management

## Implementation Strategy

### Module 1: Design Unified Store Interface
**Summary:** Define comprehensive interface for merged feedback store.

**File to Create:** `packages/app/features/VideoAnalysis/stores/feedbackStore.types.ts`

**Tasks:**
- [ ] Define `FeedbackStoreState` interface
- [ ] Define `FeedbackStoreActions` interface
- [ ] Define `FeedbackStore` as combined interface
- [ ] Document state ownership and update patterns
- [ ] Export all interfaces

**Interface:**
```typescript
export interface FeedbackStoreState {
  // Coordinator state (from useFeedbackCoordinatorStore)
  highlightedFeedbackId: string | null
  isCoachSpeaking: boolean
  bubbleState: {
    currentBubbleIndex: number | null
    bubbleVisible: boolean
  }
  overlayVisible: boolean
  activeAudio: { id: string; url: string } | null
  
  // Persistent progress state (from usePersistentProgressStore)
  persistentProgressProps: PersistentProgressBarProps | null
}

export interface FeedbackStoreActions {
  // Coordinator actions
  setHighlightedFeedbackId: (id: string | null) => void
  setIsCoachSpeaking: (speaking: boolean) => void
  setBubbleState: (state: { currentBubbleIndex: number | null; bubbleVisible: boolean }) => void
  setOverlayVisible: (visible: boolean) => void
  setActiveAudio: (audio: { id: string; url: string } | null) => void
  
  // Persistent progress actions
  setPersistentProgressProps: (props: PersistentProgressBarProps | null) => void
  
  // Batch update for multiple state changes
  batchUpdate: (updates: Partial<FeedbackStoreState>) => void
  
  // Reset all state
  reset: () => void
}

export interface FeedbackStore extends FeedbackStoreState, FeedbackStoreActions {}
```

**Acceptance Criteria:**
- [ ] Interface includes all state from both stores
- [ ] Actions cover all use cases
- [ ] `yarn type-check` passes

### Module 2: Create Unified Store Implementation
**Summary:** Implement merged store with Zustand + Immer.

**File to Create:** `packages/app/features/VideoAnalysis/stores/feedbackStore.ts`

**Tasks:**
- [ ] Create Zustand store with `subscribeWithSelector`
- [ ] Add Immer middleware for immutable updates
- [ ] Implement initial state (merge both store defaults)
- [ ] Implement all setter actions
- [ ] Implement batchUpdate for multi-property changes
- [ ] Implement reset() action
- [ ] Add logging in development mode

**Acceptance Criteria:**
- [ ] Store created with proper middleware
- [ ] All actions implemented
- [ ] Batch updates work correctly
- [ ] Reset clears all state

### Module 3: Migrate Coordinator Store Subscriptions
**Summary:** Update all useFeedbackCoordinatorStore subscriptions to use new store.

**Files to Modify:**
- `packages/app/features/VideoAnalysis/VideoAnalysisScreen.tsx`
- `packages/app/features/VideoAnalysis/components/VideoAnalysisLayout.native.tsx`
- `packages/app/features/VideoAnalysis/components/VideoAnalysisLayout.web.tsx`
- `packages/app/features/VideoAnalysis/components/VideoPlayerSection.tsx`
- `packages/app/features/VideoAnalysis/components/FeedbackSection.tsx`

**Tasks:**
- [ ] Find all `useFeedbackCoordinatorStore` imports
- [ ] Replace with `useFeedbackStore` imports
- [ ] Update selector functions (same signature)
- [ ] Verify granular subscriptions still work
- [ ] Test each component after update

**Acceptance Criteria:**
- [ ] All coordinator subscriptions migrated
- [ ] Granular selectors functional
- [ ] No re-render regressions
- [ ] Components work correctly

### Module 4: Migrate Persistent Progress Store Subscriptions
**Summary:** Update all usePersistentProgressStore subscriptions to use new store.

**Files to Modify:**
- `packages/app/features/VideoAnalysis/VideoAnalysisScreen.tsx`
- `packages/app/features/VideoAnalysis/components/VideoAnalysisLayout.native.tsx`
- `packages/ui/src/components/VideoAnalysis/VideoControls/VideoControls.tsx`

**Tasks:**
- [ ] Find all `usePersistentProgressStore` imports
- [ ] Replace with `useFeedbackStore` imports
- [ ] Update selector functions (access persistentProgressProps)
- [ ] Verify progress bar updates work
- [ ] Test progress bar visibility

**Acceptance Criteria:**
- [ ] All persistent progress subscriptions migrated
- [ ] Progress bar state functional
- [ ] No re-render regressions
- [ ] Progress bar works correctly

### Module 5: Update Hook Integrations
**Summary:** Update hooks that use stores (useFeedbackCoordinator, useFeedbackSystem).

**Files to Modify:**
- `packages/app/features/VideoAnalysis/hooks/useFeedbackCoordinator.ts` (if not yet replaced by Task 55)
- `packages/app/features/VideoAnalysis/hooks/useFeedbackSystem.ts` (from Task 55)

**Tasks:**
- [ ] Update store imports in feedback hooks
- [ ] Update store actions in hooks
- [ ] Verify hook behavior unchanged
- [ ] Test hook integration

**Acceptance Criteria:**
- [ ] Hooks use new unified store
- [ ] Hook behavior matches previous
- [ ] Store updates work correctly

### Module 6: Create Comprehensive Tests
**Summary:** Test unified store with 1:2 coverage ratio.

**File to Create:** `packages/app/features/VideoAnalysis/stores/feedbackStore.test.ts`

**Tasks:**
- [ ] Test initial state (default values)
- [ ] Test coordinator actions (setHighlightedFeedbackId, setBubbleState, etc.)
- [ ] Test persistent progress actions (setPersistentProgressProps)
- [ ] Test batchUpdate (multiple properties at once)
- [ ] Test reset (clears all state)
- [ ] Test Immer immutability
- [ ] Test subscribeWithSelector (granular subscriptions)
- [ ] Test state persistence if applicable

**Acceptance Criteria:**
- [ ] Test coverage ≥ 1:2 ratio
- [ ] All tests use AAA pattern with comments
- [ ] `yarn workspace @my/app test feedbackStore.test.ts` passes

### Module 7: Remove Old Stores
**Summary:** Delete old store files and update exports.

**Files to Delete:**
- `packages/app/features/VideoAnalysis/stores/feedbackCoordinatorStore.ts`
- `packages/app/features/VideoAnalysis/stores/feedbackCoordinatorStore.test.ts`
- `packages/app/features/VideoAnalysis/stores/persistentProgress.ts`
- `packages/app/features/VideoAnalysis/stores/persistentProgress.test.ts`

**File to Modify:**
- `packages/app/features/VideoAnalysis/stores/index.ts` (update exports)

**Tasks:**
- [ ] Delete old store files
- [ ] Update store index exports
- [ ] Verify no remaining imports of old stores
- [ ] Search codebase for any missed references

**Acceptance Criteria:**
- [ ] Old stores removed from codebase
- [ ] Store exports updated
- [ ] No TypeScript errors
- [ ] `yarn type-check` passes
- [ ] `yarn lint` passes

### Module 8: Performance Validation
**Summary:** Verify no performance regressions from store merge.

**Tasks:**
- [ ] Test granular subscriptions (components only re-render when their slice changes)
- [ ] Verify no re-render cascades
- [ ] Check React DevTools Profiler during video playback
- [ ] Verify feedback selection performance
- [ ] Test progress bar updates during gesture

**Acceptance Criteria:**
- [ ] No performance regressions
- [ ] Granular subscriptions work
- [ ] Render counts acceptable
- [ ] No unnecessary re-renders

## Quality Gates

After each module:
1. Run tests: `yarn workspace @my/app test feedbackStore.test.ts`
2. Type check: `yarn workspace @my/app type-check`
3. Lint: `yarn workspace @my/app lint`
4. Manual testing: Verify feedback features, progress bar, no regressions

## Success Validation

- [ ] Single store replaces 2 stores (2 → 1 = 50% reduction)
- [ ] All subscriptions updated across codebase
- [ ] Test coverage ≥ 1:2 ratio
- [ ] `yarn workspace @my/app test feedbackStore.test.ts` passes
- [ ] Old stores removed from codebase
- [ ] `yarn type-check` passes (0 errors)
- [ ] `yarn lint` passes (0 errors)
- [ ] React DevTools Profiler shows no performance regression
- [ ] Manual testing confirms no regressions

## References

- Current stores: 
  - `packages/app/features/VideoAnalysis/stores/feedbackCoordinatorStore.ts`
  - `packages/app/features/VideoAnalysis/stores/persistentProgress.ts`
- Zustand docs: https://docs.pmnd.rs/zustand
- Simplification proposal: `docs/spec/video-analysis-simplification-proposal.md`

