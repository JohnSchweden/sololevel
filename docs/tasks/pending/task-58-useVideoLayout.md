# Task 58: (Optional) Consolidate Native Hooks → useVideoLayout

**Effort:** 1 day | **Priority:** P2 (Optional Enhancement) | **Depends on:** Task 57  
**User Story:** N/A (Architectural consolidation - native gestures/animations)  
**Parent Task:** Task 53

**STATUS:** ⏸️ **WAITING** (Depends on Task 57, Optional)

## Objective

Consolidate 2 native-only hooks (useGestureController, useAnimationController) into single `useVideoLayout` hook (native only) to simplify gesture and animation coordination.

## Current State

- ❌ 2 hooks: useGestureController (450 LOC), useAnimationController (150 LOC)
- ❌ Gesture and animation logic tightly coupled
- ❌ Circular dependency (gesture needs animation refs, animation depends on gesture events)
- ✅ Native-only (no web implementation needed)
- ✅ Reanimated worklets for smooth 60fps animations
- ✅ YouTube-style gesture patterns (pan to seek, swipe panels)

## Problem

- Gesture requires animation refs for smooth transitions
- Animation depends on gesture events for state updates
- Circular dependency between hooks makes testing complex
- Large hooks (450 + 150 = 600 LOC) could be split differently

## Implementation Strategy

### Module 1: Create useVideoLayout Interface (Native Only)
**Summary:** Define TypeScript interfaces for unified native layout hook.

**File to Create:** `packages/app/features/VideoAnalysis/hooks/useVideoLayout.types.ts`

**Tasks:**
- [ ] Define `UseVideoLayoutReturn` interface
- [ ] Define `UseVideoLayoutOptions` interface
- [ ] Define gesture state interfaces
- [ ] Define animation shared values interfaces
- [ ] Export all interfaces

**Interface:**
```typescript
import type { SharedValue } from 'react-native-reanimated'
import type { PanGesture } from 'react-native-gesture-handler'

export interface UseVideoLayoutReturn {
  // Gesture
  panGesture: PanGesture
  feedbackScrollEnabled: boolean
  blockFeedbackScrollCompletely: boolean
  isPullingToRevealJS: boolean
  onFeedbackScrollY: (scrollY: number) => void
  onFeedbackMomentumScrollEnd: () => void
  
  // Animation
  scrollY: SharedValue<number>
  feedbackContentOffsetY: SharedValue<number>
  scrollRef: React.RefObject<Animated.ScrollView>
  collapseProgress: SharedValue<number>
}

export interface UseVideoLayoutOptions {
  videoPlayer?: {
    isPlaying: boolean
    seek: (time: number) => void
    getCurrentTime: () => number
  }
  feedbackPanel?: {
    panelFraction: number
  }
}
```

**Acceptance Criteria:**
- [ ] Types follow Reanimated patterns
- [ ] Gesture and animation types included
- [ ] `yarn type-check` passes

### Module 2: Consolidate Animation Controller
**Summary:** Integrate useAnimationController logic (shared values, scroll refs).

**File to Create:** `packages/app/features/VideoAnalysis/hooks/useVideoLayout.ts`

**Tasks:**
- [ ] Create hook skeleton (native only - add Platform check)
- [ ] Create shared values (scrollY, feedbackContentOffsetY, collapseProgress)
- [ ] Create scroll ref
- [ ] Calculate collapseProgress from scrollY
- [ ] Use useDerivedValue for derived calculations
- [ ] Return animation values

**Acceptance Criteria:**
- [ ] Shared values created correctly
- [ ] Collapse progress calculated
- [ ] Animation runs at 60fps on UI thread

### Module 3: Integrate Gesture Controller
**Summary:** Add useGestureController logic (pan gesture, scroll delegation).

**File to Modify:** `packages/app/features/VideoAnalysis/hooks/useVideoLayout.ts`

**Tasks:**
- [ ] Create pan gesture with Gesture.Pan()
- [ ] Implement onBegin (lock scroll)
- [ ] Implement onUpdate (update scrollY, calculate velocity)
- [ ] Implement onEnd (momentum, snap, fling)
- [ ] Add feedback scroll delegation logic
- [ ] Add conflict detection (pan vs scroll)
- [ ] Implement isPullingToReveal logic
- [ ] Handle blockFeedbackScrollCompletely state

**Acceptance Criteria:**
- [ ] Pan gesture functional
- [ ] YouTube-style gesture behavior
- [ ] Scroll delegation works
- [ ] Conflict detection prevents issues

### Module 4: Implement Gesture-Animation Coordination
**Summary:** Connect gesture events to animation shared values.

**File to Modify:** `packages/app/features/VideoAnalysis/hooks/useVideoLayout.ts`

**Tasks:**
- [ ] Update scrollY shared value on gesture
- [ ] Trigger animations on gesture end
- [ ] Use runOnUI for UI thread updates
- [ ] Sync JS state with shared values
- [ ] Handle panel expansion/collapse animations

**Acceptance Criteria:**
- [ ] Gestures trigger animations smoothly
- [ ] No jank or dropped frames
- [ ] Shared values sync correctly

### Module 5: Add Video Seek Integration (Optional)
**Summary:** Integrate video seeking with gesture (if needed).

**File to Modify:** `packages/app/features/VideoAnalysis/hooks/useVideoLayout.ts`

**Tasks:**
- [ ] Accept videoPlayer option (from useVideoPlayer)
- [ ] Add horizontal pan for video seek
- [ ] Show seek preview during gesture
- [ ] Commit seek on gesture end
- [ ] Handle seek cancellation

**Acceptance Criteria:**
- [ ] Video seek via gesture works (if implemented)
- [ ] Seek preview shows correctly
- [ ] Gesture cancellation works

### Module 6: Create Comprehensive Tests
**Summary:** Test integrated hook with 1:2 coverage ratio.

**File to Create:** `packages/app/features/VideoAnalysis/hooks/useVideoLayout.test.ts`

**Tasks:**
- [ ] Test animation values (scrollY, collapseProgress)
- [ ] Test gesture creation and configuration
- [ ] Test scroll delegation logic
- [ ] Test conflict detection
- [ ] Test panel expansion/collapse
- [ ] Test isPullingToReveal state
- [ ] Mock Reanimated shared values
- [ ] Mock GestureHandler

**Acceptance Criteria:**
- [ ] Test coverage ≥ 1:2 ratio
- [ ] All tests use AAA pattern with comments
- [ ] `yarn workspace @my/app test useVideoLayout.test.ts` passes
- [ ] Mocks handle Reanimated correctly

### Module 7: Update VideoAnalysisScreen (Native Only)
**Summary:** Replace 2 hooks with single useVideoLayout hook.

**File to Modify:** `packages/app/features/VideoAnalysis/VideoAnalysisScreen.tsx`

**Tasks:**
- [ ] Import useVideoLayout (native only)
- [ ] Replace useGestureController and useAnimationController calls
- [ ] Pass options (videoPlayer, feedbackPanel)
- [ ] Update prop composition (gesture, animation objects)
- [ ] Verify no functionality lost

**Acceptance Criteria:**
- [ ] VideoAnalysisScreen uses single useVideoLayout hook (native)
- [ ] Web build unaffected (no web implementation)
- [ ] All gesture/animation features work
- [ ] Component lines reduced
- [ ] `yarn workspace @my/app test VideoAnalysisScreen.test.tsx` passes

### Module 8: Remove Old Hooks
**Summary:** Delete consolidated hooks and update exports.

**Files to Delete:**
- `packages/app/features/VideoAnalysis/hooks/useGestureController.ts`
- `packages/app/features/VideoAnalysis/hooks/useGestureController.test.ts`
- `packages/app/features/VideoAnalysis/hooks/useAnimationController.ts`
- `packages/app/features/VideoAnalysis/hooks/useAnimationController.test.ts`
- `packages/app/features/VideoAnalysis/hooks/useGestureConflictDetector.ts` (if absorbed)

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
1. Run tests: `yarn workspace @my/app test useVideoLayout.test.ts`
2. Type check: `yarn workspace @my/app type-check`
3. Lint: `yarn workspace @my/app lint`
4. Manual testing: Test gestures, animations, panel expansion (native only)

## Success Validation

- [ ] Single hook replaces 2 hooks (2 → 1 = 50% reduction, native only)
- [ ] Test coverage ≥ 1:2 ratio
- [ ] `yarn workspace @my/app test useVideoLayout.test.ts` passes
- [ ] VideoAnalysisScreen updated to use new hook
- [ ] Old hooks removed from codebase
- [ ] `yarn type-check` passes (0 errors)
- [ ] `yarn lint` passes (0 errors)
- [ ] Manual testing confirms no regressions (native)
- [ ] Web build unaffected

## Notes

**Optional Task:** This task is optional and can be skipped if:
- Gesture and animation hooks work well separately
- Time constraints don't allow for consolidation
- Risk of breaking gesture behavior is too high

The main benefit is reducing hook count and simplifying the circular dependency. If skipped, Task 53 still achieves 75% hook reduction (13 → 4 hooks instead of 13 → 3).

## References

- Current hooks:
  - `packages/app/features/VideoAnalysis/hooks/useGestureController.ts` (450 LOC)
  - `packages/app/features/VideoAnalysis/hooks/useAnimationController.ts` (150 LOC)
- Reanimated docs: https://docs.swmansion.com/react-native-reanimated/
- Gesture Handler docs: https://docs.swmansion.com/react-native-gesture-handler/
- Simplification proposal: `docs/spec/video-analysis-simplification-proposal.md`

