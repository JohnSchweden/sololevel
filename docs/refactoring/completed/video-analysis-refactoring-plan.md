# VideoAnalysisScreen Refactoring Plan

## Overview

**Component:** `packages/app/features/VideoAnalysis/VideoAnalysisScreen.tsx`  
**Current Size:** 1,131 lines  
**Target Size:** ≤200 lines (83% reduction)  
**Effort:** 15.5 hours (sequential) | 11-12 hours (with parallelization)  
**Status:** Phase 1 (Analysis) Complete ✅

---

## Problem Statement

VideoAnalysisScreen has grown to 1,131 lines, violating the Single Responsibility Principle and making it difficult to:
- Test individual features in isolation
- Understand the component's responsibilities
- Maintain platform-specific code
- Onboard new developers

**Key Issues:**
1. **Size:** 1,131 lines (exceeds 300-500 line recommendation by 226-377%)
2. **Complexity:** Manages 14 hooks, gesture logic, animations, and UI layout
3. **Platform Branching:** Native (847-1039) vs Web (1042-1129) render trees mixed
4. **Gesture Coupling:** 230 lines of gesture worklets embedded in component
5. **Testing:** Requires mocking 14 hooks to test component behavior

---

## Goals

### Primary Goals
1. ✅ **Reduce component size** from 1,131 → ≤200 lines (83% reduction)
2. ✅ **Improve testability** by isolating gesture, animation, and orchestration logic
3. ✅ **Separate platform code** into `.native.tsx` and `.web.tsx` files
4. ✅ **Maintain behavior** - zero functional regressions
5. ✅ **Maintain performance** - no degradation in gesture response or animation smoothness

### Secondary Goals
1. ✅ **Reduce web bundle size** by excluding native gesture/animation code (~300 lines)
2. ✅ **Improve developer experience** with clear module boundaries
3. ✅ **Document architecture** for future development
4. ✅ **Establish patterns** for other complex components

---

## Refactoring Strategy

### Approach: Incremental Extraction
Extract code in dependency order to minimize breaking changes:
1. **Phase 1:** Analyze dependencies and platform code (this document)
2. **Phase 2:** Extract gesture and animation logic (no component changes yet)
3. **Phase 3:** Extract platform layouts (component uses new hooks)
4. **Phase 4:** Create orchestrator and refactor main component
5. **Phase 5:** Validate performance and update documentation

### Principles
- ✅ **One responsibility per module** - Each extracted hook/component has single purpose
- ✅ **Unidirectional data flow** - Props → Orchestrator → Layout → Components
- ✅ **Platform separation** - Native and web code in separate files
- ✅ **Test coverage maintained** - ≥ 1:2 test-to-code ratio
- ✅ **No behavioral changes** - Refactoring only, no feature work

---

## Phase Breakdown

### Phase 1: Analysis & Preparation ✅ COMPLETE
**Effort:** 2 hours  
**Status:** ✅ Complete  
**Deliverables:**
- ✅ `docs/refactoring/video-analysis-dependencies.mermaid` - Dependency graph
- ✅ `docs/refactoring/video-analysis-platform-analysis.md` - Platform code analysis
- ✅ `docs/refactoring/video-analysis-refactoring-plan.md` - This document

**Key Findings:**
- 14 hooks with clear dependency hierarchy
- No circular dependencies
- 57% shared code, 35% native-only, 8% web-only
- Gesture logic (230 lines) and animation logic (70 lines) can be extracted cleanly
- Platform render trees (190 lines native, 90 lines web) are independent

---

### Phase 2: Extract Gesture & Animation Logic
**Effort:** 4 hours  
**Status:** 🟡 Pending (blocked by Phase 1 completion)  
**Dependencies:** Phase 1 ✅

#### Module 2.1: useGestureController Hook
**File:** `packages/app/features/VideoAnalysis/hooks/useGestureController.ts`  
**Lines Extracted:** 353-582 (~230 lines)

**Responsibilities:**
- YouTube-style gesture delegation
- Touch area detection (video vs feedback)
- Velocity-based swipe detection
- Scroll blocking coordination
- Pull-to-reveal gesture

**Interface:**
```typescript
interface UseGestureControllerReturn {
  rootPan: GestureType
  feedbackScrollEnabled: boolean
  blockFeedbackScrollCompletely: boolean
  isPullingToRevealJS: boolean
  onFeedbackScrollY: (scrollY: number) => void
  onFeedbackMomentumScrollEnd: () => void
}

function useGestureController(
  scrollY: SharedValue<number>,
  feedbackContentOffsetY: SharedValue<number>,
  scrollRef: AnimatedRef<Animated.ScrollView>
): UseGestureControllerReturn
```

**Test Coverage:**
- Touch in video area → immediate activation
- Touch in feedback area → direction-dependent activation
- Fast swipe detection → video mode change
- Slow swipe detection → feedback scroll
- Pull-to-reveal → expand beyond max
- Scroll blocking toggle → prevent conflicts

**Success Criteria:**
- [ ] Hook extracted with zero coupling to VideoAnalysisScreen
- [ ] All gesture logic functional and tested
- [ ] Test coverage ≥ 1:2 ratio (max 115 lines of test code)
- [ ] `yarn type-check` passes
- [ ] VideoAnalysisScreen imports and uses hook successfully

---

#### Module 2.2: useAnimationController Hook
**File:** `packages/app/features/VideoAnalysis/hooks/useAnimationController.ts`  
**Lines Extracted:** 584-651 (~70 lines)

**Responsibilities:**
- Mode-based video height transitions
- Collapse progress calculation
- Pull-to-reveal expansion
- Animated styles generation

**Interface:**
```typescript
interface UseAnimationControllerReturn {
  scrollY: SharedValue<number>
  headerHeight: DerivedValue<number>
  collapseProgress: DerivedValue<number>
  headerStyle: AnimatedStyleProp<ViewStyle>
  feedbackSectionStyle: AnimatedStyleProp<ViewStyle>
  pullIndicatorStyle: AnimatedStyleProp<ViewStyle>
  scrollRef: AnimatedRef<Animated.ScrollView>
  feedbackContentOffsetY: SharedValue<number>
}

function useAnimationController(): UseAnimationControllerReturn
```

**Test Coverage:**
- Header height at scroll position 0 (max mode)
- Header height at MODE_SCROLL_POSITIONS.normal (normal mode)
- Header height at MODE_SCROLL_POSITIONS.min (min mode)
- Pull-to-reveal expansion (negative scroll)
- Collapse progress interpolation (0 → 0.5 → 1)

**Success Criteria:**
- [ ] Animation calculations isolated and pure
- [ ] No coupling to gesture logic
- [ ] Test coverage validates all interpolation ranges
- [ ] `yarn workspace @my/app test useAnimationController.test.ts` passes
- [ ] VideoAnalysisScreen uses hook without behavioral changes

---

### Phase 3: Extract Platform-Specific Layouts
**Effort:** 3 hours  
**Status:** 🟡 Pending (blocked by Phase 2 completion)  
**Dependencies:** Phase 2 (Modules 2.1, 2.2)

#### Module 3.1: VideoAnalysisLayout.native.tsx
**File:** `packages/app/features/VideoAnalysis/components/VideoAnalysisLayout.native.tsx`  
**Lines Extracted:** 847-1039 (~190 lines)

**Responsibilities:**
- Native UI structure with gesture integration
- GestureHandlerRootView wrapper
- Animated view hierarchy
- Absolute positioning layout

**Interface:**
```typescript
interface VideoAnalysisLayoutProps {
  gesture: ReturnType<typeof useGestureController>
  animation: ReturnType<typeof useAnimationController>
  video: { uri, posterUri, isReady, isProcessing }
  playback: { isPlaying, videoEnded, pendingSeek, shouldPlayVideo }
  feedback: { items, panelFraction, activeTab, selectedFeedbackId, currentTime }
  handlers: { onPlay, onPause, onSeek, onFeedbackItemPress, ... }
  videoControlsRef: RefObject<VideoControlsRef>
  rootPanRef: RefObject<any>
  controls: { showControls, onControlsVisibilityChange }
  error: { visible, message, onRetry, onBack }
}
```

**Success Criteria:**
- [ ] Native layout fully self-contained
- [ ] Gesture and animation integration working
- [ ] All event handlers wired through props
- [ ] Test coverage validates rendering and prop wiring
- [ ] `yarn workspace @my/app test VideoAnalysisLayout.test.tsx` passes

---

#### Module 3.2: VideoAnalysisLayout.web.tsx
**File:** `packages/app/features/VideoAnalysis/components/VideoAnalysisLayout.web.tsx`  
**Lines Extracted:** 1042-1129 (~90 lines)

**Responsibilities:**
- Web UI structure (simplified)
- Flex-based layout
- No gesture/animation dependencies

**Interface:** Same as Module 3.1 (gesture/animation props ignored)

**Success Criteria:**
- [ ] Web layout fully self-contained
- [ ] No gesture/animation dependencies
- [ ] All event handlers wired through props
- [ ] Bundler resolves `.web.tsx` correctly
- [ ] Test coverage validates web-specific rendering

---

### Phase 4: Extract Orchestration Logic
**Effort:** 4.5 hours  
**Status:** 🟡 Pending (blocked by Phase 3 completion)  
**Dependencies:** Phase 3 (Modules 3.1, 3.2)

#### Module 4.1: useVideoAnalysisOrchestrator Hook
**File:** `packages/app/features/VideoAnalysis/hooks/useVideoAnalysisOrchestrator.ts`  
**Lines:** ~150 lines (new)

**Responsibilities:**
- Aggregate 14 hooks into single orchestrator
- Organize return value into logical groups
- Wire up cross-hook dependencies
- Handle platform-specific hooks (native only)

**Hooks Orchestrated:**
1. useHistoricalAnalysis
2. useAnalysisState
3. useVideoPlayback
4. useVideoControls
5. useFeedbackAudioSource
6. useAudioController
7. useFeedbackCoordinator
8. useFeedbackPanel
9. useVideoAudioSync
10. useAutoPlayOnReady
11. useGestureController (native only)
12. useAnimationController (native only)
13. useStatusBar
14. Context value aggregation

**Interface:**
```typescript
interface VideoAnalysisOrchestratorReturn {
  video: { uri, posterUri, isReady, isProcessing, currentTime, duration, ended }
  playback: { isPlaying, pendingSeek, shouldPlayVideo, play, pause, replay, seek }
  audio: { controller, source, sync }
  feedback: { items, coordinator, panel, state }
  gesture?: ReturnType<typeof useGestureController> // native only
  animation?: ReturnType<typeof useAnimationController> // native only
  controls: { showControls, videoControlsRef, onControlsVisibilityChange }
  error: { visible, message }
  handlers: { onPlay, onPause, onSeek, ..., onFeedbackScrollY }
  contextValue: VideoAnalysisContextValue
  refs: { videoControlsRef, rootPanRef }
}

function useVideoAnalysisOrchestrator(
  props: VideoAnalysisScreenProps
): VideoAnalysisOrchestratorReturn
```

**Success Criteria:**
- [ ] All hook coordination logic isolated
- [ ] Return value organized into logical groups
- [ ] Platform-specific logic handled correctly
- [ ] Test coverage validates orchestration patterns
- [ ] `yarn workspace @my/app test useVideoAnalysisOrchestrator.test.ts` passes

---

#### Module 4.2: Refactor Main Component
**File:** `packages/app/features/VideoAnalysis/VideoAnalysisScreen.tsx`  
**Lines:** 1,131 → ≤200 lines

**Target Structure:**
```typescript
export function VideoAnalysisScreen(props: VideoAnalysisScreenProps) {
  const orchestrated = useVideoAnalysisOrchestrator(props)
  
  if (Platform.OS !== 'web') {
    return <VideoAnalysisLayoutNative {...orchestrated} />
  }
  return <VideoAnalysisLayoutWeb {...orchestrated} />
}
```

**Success Criteria:**
- [ ] VideoAnalysisScreen reduced to ≤200 lines
- [ ] All hook coordination removed
- [ ] Platform selection logic clear and testable
- [ ] All existing tests pass with updated mocks
- [ ] `yarn workspace @my/app test VideoAnalysisScreen.test.tsx` passes
- [ ] Storybook stories render correctly

---

### Phase 5: Validation & Documentation
**Effort:** 2 hours  
**Status:** 🟡 Pending (blocked by Phase 4 completion)  
**Dependencies:** Phase 4 (Modules 4.1, 4.2)

#### Module 5.1: Performance Validation
**Tasks:**
- [ ] Profile gesture response time (< 16ms target)
- [ ] Validate animation frame rate (60fps on low-end Android)
- [ ] Test on iOS Simulator, Android emulator, physical device
- [ ] Compare before/after metrics (mount time, time-to-first-frame)
- [ ] Verify web bundle size reduction

**Success Criteria:**
- [ ] Gesture response time ≤ 16ms (60fps)
- [ ] Animation transitions smooth (60fps, no dropped frames)
- [ ] No performance regression vs baseline
- [ ] Web bundle size reduced (gesture code excluded)
- [ ] Performance metrics documented

---

#### Module 5.2: Documentation Updates
**Files:**
- [ ] `packages/app/features/VideoAnalysis/README.md` (new)
- [ ] `docs/spec/architecture.mermaid` (update)
- [ ] `docs/spec/status.md` (update)
- [ ] `docs/refactoring/video-analysis-refactoring-report.md` (new)

**Success Criteria:**
- [ ] Feature README created with architecture overview
- [ ] architecture.mermaid updated with new module structure
- [ ] Refactoring completion report documents changes and metrics
- [ ] status.md updated to reflect completion

---

## Task Tracking

| Phase | Task | Effort | Status | Blocking |
|-------|------|--------|--------|----------|
| 1 | Analysis & Preparation | 2h | ✅ Complete | - |
| 2.1 | useGestureController | 2h | 🟡 Pending | Phase 1 |
| 2.2 | useAnimationController | 2h | 🟡 Pending | Phase 2.1 |
| 3.1 | Layout.native.tsx | 2h | 🟡 Pending | Phase 2 |
| 3.2 | Layout.web.tsx | 1h | 🟡 Pending | Phase 2 |
| 4.1 | useVideoAnalysisOrchestrator | 3h | 🟡 Pending | Phase 3 |
| 4.2 | Refactor Main Component | 1.5h | 🟡 Pending | Phase 4.1 |
| 5.1 | Performance Validation | 1h | 🟡 Pending | Phase 4 |
| 5.2 | Documentation Updates | 1h | 🟡 Pending | Phase 4 |

**Total Effort:** 15.5 hours (sequential)  
**With Parallelization:** 11-12 hours (Phase 3.1/3.2 parallel, Phase 5.1/5.2 parallel)

---

## Risk Assessment

### High Risk
**None identified** - Incremental approach minimizes risk

### Medium Risk
1. **Performance Regression**
   - **Mitigation:** Profile before/after, validate on multiple devices
   - **Rollback:** Keep original component until validation complete

2. **Test Brittleness**
   - **Mitigation:** Focus tests on behavior, not implementation
   - **Rollback:** Adjust test mocks if needed

### Low Risk
1. **Bundle Size Increase**
   - **Mitigation:** Verify web bundle excludes native code
   - **Impact:** Minimal (expect reduction, not increase)

2. **Developer Confusion**
   - **Mitigation:** Comprehensive documentation and README
   - **Impact:** Temporary learning curve

---

## Success Metrics

### Quantitative Metrics
- [x] **Lines of Code:** 1,131 → ≤200 (83% reduction) ✅ Target defined
- [ ] **Modules Created:** 5 hooks + 2 layout components
- [ ] **Test Coverage:** Maintained at ≥ 1:2 ratio
- [ ] **Performance:** No regressions (gesture < 16ms, animation 60fps)
- [ ] **Web Bundle Size:** Reduced by ~300 lines (gesture/animation excluded)

### Qualitative Metrics
- [ ] **Testability:** Can test gesture, animation, orchestration independently
- [ ] **Maintainability:** Clear module boundaries, single responsibility
- [ ] **Developer Experience:** Easier onboarding, clear architecture
- [ ] **Platform Parity:** Native and web code clearly separated

---

## Rollback Plan

### If Performance Degrades
1. Revert to original component
2. Profile to identify bottleneck
3. Fix bottleneck in extracted module
4. Re-apply refactoring

### If Tests Fail
1. Identify failing test scenarios
2. Update test mocks to match new structure
3. Verify behavioral equivalence
4. Re-run tests

### If Bundle Size Increases
1. Analyze bundle with `yarn build:web --analyze`
2. Verify Metro resolves `.web.tsx` correctly
3. Check for accidental native imports in web code
4. Fix import issues

---

## Post-Refactoring Maintenance

### Code Ownership
- **VideoAnalysisScreen.tsx:** Integration layer (minimal changes expected)
- **useVideoAnalysisOrchestrator:** Hook coordination (changes when adding hooks)
- **useGestureController:** Gesture logic (changes for gesture features)
- **useAnimationController:** Animation logic (changes for animation features)
- **VideoAnalysisLayout.{native,web}:** Platform layouts (changes for UI features)

### Adding New Features
1. **New Hook:** Add to orchestrator, wire into return value
2. **New Gesture:** Modify useGestureController
3. **New Animation:** Modify useAnimationController
4. **New UI Element:** Add to appropriate layout component

### Testing Strategy
- **Unit Tests:** Test hooks in isolation
- **Integration Tests:** Test orchestrator coordination
- **Component Tests:** Test layout prop wiring
- **E2E Tests:** Test full user flows (unchanged)

---

## Appendix: File Structure

### Before Refactoring
```
packages/app/features/VideoAnalysis/
├── VideoAnalysisScreen.tsx (1,131 lines)
├── VideoAnalysisScreen.test.tsx
├── components/
│   ├── FeedbackSection.tsx
│   ├── VideoPlayerSection.tsx
│   ├── ProcessingIndicator.tsx
│   └── UploadErrorState.tsx
├── hooks/
│   ├── useAnalysisState.ts
│   ├── useVideoPlayback.ts
│   ├── useFeedbackCoordinator.ts
│   └── ... (8 more hooks)
└── contexts/
    └── VideoAnalysisContext.tsx
```

### After Refactoring
```
packages/app/features/VideoAnalysis/
├── VideoAnalysisScreen.tsx (≤200 lines) ← REFACTORED
├── VideoAnalysisScreen.test.tsx ← UPDATED
├── README.md ← NEW
├── components/
│   ├── FeedbackSection.tsx
│   ├── VideoPlayerSection.tsx
│   ├── ProcessingIndicator.tsx
│   ├── UploadErrorState.tsx
│   ├── VideoAnalysisLayout.native.tsx ← NEW
│   ├── VideoAnalysisLayout.web.tsx ← NEW
│   └── VideoAnalysisLayout.test.tsx ← NEW
├── hooks/
│   ├── useAnalysisState.ts
│   ├── useVideoPlayback.ts
│   ├── useFeedbackCoordinator.ts
│   ├── useGestureController.ts ← NEW (native only)
│   ├── useGestureController.test.ts ← NEW
│   ├── useAnimationController.ts ← NEW (native only)
│   ├── useAnimationController.test.ts ← NEW
│   ├── useVideoAnalysisOrchestrator.ts ← NEW
│   ├── useVideoAnalysisOrchestrator.test.ts ← NEW
│   └── ... (8 existing hooks)
└── contexts/
    └── VideoAnalysisContext.tsx
```

**New Files:** 7  
**Modified Files:** 2  
**Total Lines Added:** ~640 (extracted + tests)  
**Total Lines Removed:** ~931 (from main component)  
**Net Change:** -291 lines (better organized)

---

## Next Steps

### Immediate (Phase 2)
1. [ ] Create `useGestureController.ts` hook
2. [ ] Create `useGestureController.test.ts` tests
3. [ ] Create `useAnimationController.ts` hook
4. [ ] Create `useAnimationController.test.ts` tests
5. [ ] Update VideoAnalysisScreen to import and use new hooks
6. [ ] Verify all tests pass
7. [ ] Verify gesture behavior unchanged on device

### Follow-up (Phase 3-5)
1. [ ] Extract platform layouts
2. [ ] Create orchestrator hook
3. [ ] Refactor main component
4. [ ] Validate performance
5. [ ] Update documentation

---

**Document Status:** Phase 1 Complete ✅  
**Last Updated:** 2025-10-26  
**Next Review:** After Phase 2 completion

