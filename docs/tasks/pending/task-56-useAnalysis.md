# Task 56: Consolidate Analysis Hooks → useAnalysis

**Effort:** 1 day | **Priority:** P1 (Technical Debt) | **Depends on:** Task 55  
**User Story:** N/A (Architectural consolidation - analysis state)  
**Parent Task:** Task 53

**STATUS:** ⏸️ **WAITING** (Depends on Task 55)

## Objective

Consolidate 2 analysis hooks (useAnalysisState, useHistoricalAnalysis) into single `useAnalysis` hook that handles both history mode and live analysis modes.

## Current State

- ❌ 2 hooks: useAnalysisState, useHistoricalAnalysis
- ❌ History mode and live analysis handled separately
- ❌ Duplicate subscription and data fetching patterns
- ✅ Existing test files for both hooks
- ✅ Well-defined interfaces and phase tracking

## Problem

- Analysis logic split between history and live modes
- Duplicate state management patterns
- Mode switching requires understanding both hooks
- Historical analysis data fetched separately from live analysis

## Implementation Strategy

### Module 1: Create useAnalysis Interface
**Summary:** Define TypeScript interfaces for unified analysis hook.

**File to Create:** `packages/app/features/VideoAnalysis/hooks/useAnalysis.types.ts`

**Tasks:**
- [ ] Define `UseAnalysisReturn` interface
- [ ] Define `UseAnalysisOptions` interface
- [ ] Define `AnalysisPhase` type union
- [ ] Define `AnalysisError` interface
- [ ] Export all interfaces

**Interface:**
```typescript
export type AnalysisPhase = 
  | 'uploading'
  | 'upload-complete'
  | 'analyzing'
  | 'generating-feedback'
  | 'ready'
  | 'error'

export interface AnalysisError {
  phase: 'upload' | 'analysis' | 'feedback'
  message: string
}

export interface UseAnalysisReturn {
  // Phase and progress
  phase: AnalysisPhase
  progress: number
  isProcessing: boolean
  
  // Data
  feedbackItems: FeedbackPanelItem[]
  videoUri: string | null
  
  // Error state
  error: AnalysisError | null
  channelExhausted: boolean
  
  // Actions
  retry: () => void
}

export interface UseAnalysisOptions {
  analysisJobId?: number
  videoRecordingId?: number
  initialStatus?: 'processing' | 'ready'
  isHistoryMode?: boolean
}
```

**Acceptance Criteria:**
- [ ] Types follow existing hook patterns
- [ ] All analysis phases covered
- [ ] `yarn type-check` passes

### Module 2: Implement Core Analysis State
**Summary:** Consolidate useAnalysisState logic for live analysis tracking.

**File to Create:** `packages/app/features/VideoAnalysis/hooks/useAnalysis.ts`

**Tasks:**
- [ ] Create hook skeleton with options parameter
- [ ] Integrate useAnalysisSubscriptionStore for realtime updates
- [ ] Integrate useUploadProgressStore for upload tracking
- [ ] Integrate useFeedbackStatusIntegration for feedback tracking
- [ ] Calculate analysis phase from upload/analysis/feedback status
- [ ] Calculate progress percentage
- [ ] Determine isProcessing state
- [ ] Handle channel exhaustion (subscription failures)

**Acceptance Criteria:**
- [ ] Analysis phase calculated correctly
- [ ] Progress percentage accurate
- [ ] Realtime updates work
- [ ] Upload tracking functional

### Module 3: Integrate Historical Analysis Data
**Summary:** Add useHistoricalAnalysis logic for history mode.

**File to Modify:** `packages/app/features/VideoAnalysis/hooks/useAnalysis.ts`

**Tasks:**
- [ ] Use TanStack Query to fetch historical analysis by ID
- [ ] Map historical data to analysis return format
- [ ] Handle history mode vs live mode distinction
- [ ] Prefetch video URI from historical data
- [ ] Handle loading state for historical data
- [ ] Handle error state for historical fetch

**Acceptance Criteria:**
- [ ] History mode loads historical data
- [ ] Live mode uses realtime subscriptions
- [ ] Mode detection automatic (based on analysisJobId presence)
- [ ] Video URI resolved for both modes

### Module 4: Implement Error Handling and Retry
**Summary:** Add error detection and retry logic for all phases.

**File to Modify:** `packages/app/features/VideoAnalysis/hooks/useAnalysis.ts`

**Tasks:**
- [ ] Detect upload errors from uploadProgressStore
- [ ] Detect analysis errors from analysisSubscriptionStore
- [ ] Detect feedback errors from feedbackStatusIntegration
- [ ] Implement retry() function for failed analysis
- [ ] Clear error state on retry
- [ ] Handle channelExhausted state (subscription failures)

**Acceptance Criteria:**
- [ ] Errors detected for all phases
- [ ] Retry function works correctly
- [ ] Error messages user-friendly
- [ ] Channel exhaustion handled

### Module 5: Integrate Feedback Items
**Summary:** Consolidate feedback items from analysis state.

**File to Modify:** `packages/app/features/VideoAnalysis/hooks/useAnalysis.ts`

**Tasks:**
- [ ] Extract feedback items from feedbackStatusIntegration
- [ ] Apply mock fallback if feature flag enabled (useMockData)
- [ ] Filter and sort feedback items
- [ ] Enrich items with SSML/audio status
- [ ] Handle empty feedback state

**Acceptance Criteria:**
- [ ] Feedback items returned correctly
- [ ] Mock data used when flag enabled
- [ ] Items enriched with status
- [ ] Empty state handled

### Module 6: Optimize Subscriptions and Queries
**Summary:** Optimize realtime subscriptions and data fetching.

**File to Modify:** `packages/app/features/VideoAnalysis/hooks/useAnalysis.ts`

**Tasks:**
- [ ] Subscribe to analysis updates only when needed
- [ ] Unsubscribe on unmount or mode change
- [ ] Use TanStack Query staleTime for historical data
- [ ] Debounce frequent updates if needed
- [ ] Handle subscription reconnection on failure

**Acceptance Criteria:**
- [ ] No subscription leaks
- [ ] Efficient data fetching
- [ ] Reconnection works
- [ ] No unnecessary re-fetches

### Module 7: Create Comprehensive Tests
**Summary:** Test integrated hook with 1:2 coverage ratio.

**File to Create:** `packages/app/features/VideoAnalysis/hooks/useAnalysis.test.ts`

**Tasks:**
- [ ] Test live analysis mode (upload → analyze → feedback → ready)
- [ ] Test history mode (load historical data)
- [ ] Test phase transitions (uploading → analyzing → ready)
- [ ] Test progress calculation
- [ ] Test error detection (upload, analysis, feedback errors)
- [ ] Test retry functionality
- [ ] Test channel exhaustion handling
- [ ] Test feedback items extraction
- [ ] Test mock data fallback

**Acceptance Criteria:**
- [ ] Test coverage ≥ 1:2 ratio
- [ ] All tests use AAA pattern with comments
- [ ] `yarn workspace @my/app test useAnalysis.test.ts` passes

### Module 8: Update VideoAnalysisScreen
**Summary:** Replace 2 hooks with single useAnalysis hook.

**File to Modify:** `packages/app/features/VideoAnalysis/VideoAnalysisScreen.tsx`

**Tasks:**
- [ ] Import useAnalysis
- [ ] Replace useAnalysisState and useHistoricalAnalysis calls
- [ ] Update prop composition (analysis object)
- [ ] Update isProcessing derivation
- [ ] Verify no functionality lost

**Acceptance Criteria:**
- [ ] VideoAnalysisScreen uses single useAnalysis hook
- [ ] All analysis features work
- [ ] Component lines reduced
- [ ] `yarn workspace @my/app test VideoAnalysisScreen.test.tsx` passes

### Module 9: Remove Old Hooks
**Summary:** Delete consolidated hooks and update exports.

**Files to Delete:**
- `packages/app/features/VideoAnalysis/hooks/useAnalysisState.ts`
- `packages/app/features/VideoAnalysis/hooks/useAnalysisState.test.ts`
- `packages/app/features/VideoAnalysis/hooks/useHistoricalAnalysis.ts`
- `packages/app/features/VideoAnalysis/hooks/useHistoricalAnalysis.test.tsx`

**Tasks:**
- [ ] Delete old hook files
- [ ] Update hook exports
- [ ] Verify no remaining imports of old hooks

**Acceptance Criteria:**
- [ ] Old hooks removed from codebase
- [ ] No TypeScript errors
- [ ] `yarn type-check` passes
- [ ] `yarn lint` passes

## Quality Gates

After each module:
1. Run tests: `yarn workspace @my/app test useAnalysis.test.ts`
2. Type check: `yarn workspace @my/app type-check`
3. Lint: `yarn workspace @my/app lint`
4. Manual testing: Verify analysis phases, progress tracking, error handling

## Success Validation

- [ ] Single hook replaces 2 hooks (2 → 1 = 50% reduction)
- [ ] Test coverage ≥ 1:2 ratio
- [ ] `yarn workspace @my/app test useAnalysis.test.ts` passes
- [ ] VideoAnalysisScreen updated to use new hook
- [ ] Old hooks removed from codebase
- [ ] `yarn type-check` passes (0 errors)
- [ ] `yarn lint` passes (0 errors)
- [ ] Manual testing confirms no regressions

## References

- Current hooks: `packages/app/features/VideoAnalysis/hooks/useAnalysis*.ts`
- Stores: `packages/app/features/VideoAnalysis/stores/analysisSubscription.ts`
- Mock data: `packages/app/mocks/feedback.ts`
- Simplification proposal: `docs/spec/video-analysis-simplification-proposal.md`

