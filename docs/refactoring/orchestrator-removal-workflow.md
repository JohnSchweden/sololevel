# Orchestrator Removal Workflow

**Goal:** Remove `useVideoAnalysisOrchestrator` (1700 LOC, 49 memoization layers) and compose 14 hooks directly in `VideoAnalysisScreen`.

**Benefits:**
- 80-90% memoization reduction (49 → ~5-10 instances)
- Eliminates tight coupling through aggregation layer
- Improves testability (test hooks independently)
- Reduces complexity (clear dependencies vs. orchestrated mess)
- Makes hooks reusable in other screens

---

## Current Architecture Analysis

### Files Involved
1. **`VideoAnalysisScreen.tsx`** (280 LOC) - Integration layer, calls orchestrator
2. **`useVideoAnalysisOrchestrator.ts`** (1789 LOC) - God Hook with 49 memoization layers
3. **`VideoAnalysisLayout.native.tsx`** (1002 LOC) - Native layout with 18 prop groups
4. **14 Individual Hook Files** - Already extracted, but coupled through orchestrator

### Current Data Flow
```
VideoAnalysisScreen
  ↓ (passes props)
useVideoAnalysisOrchestrator (1700 LOC)
  ↓ (coordinates 14 hooks)
  ├── useHistoricalAnalysis
  ├── useAnalysisState
  ├── useVideoPlayback
  ├── useVideoControls
  ├── useFeedbackAudioSource
  ├── useAudioController
  ├── useFeedbackCoordinator
  ├── useFeedbackPanel
  ├── useVideoAudioSync
  ├── useAutoPlayOnReady
  ├── useGestureController
  ├── useAnimationController
  ├── useStatusBar
  └── [Aggregates 49 memoized objects]
  ↓ (returns massive aggregated object)
VideoAnalysisScreen
  ↓ (adds 4 more memoization layers)
VideoAnalysisLayout (18 prop groups)
```

### Target Data Flow
```
VideoAnalysisScreen
  ↓ (composes 14 hooks directly)
  ├── useHistoricalAnalysis
  ├── useAnalysisState  
  ├── useVideoPlayback
  ├── useVideoControls
  ├── useFeedbackAudioSource
  ├── useAudioController
  ├── useFeedbackCoordinator
  ├── useFeedbackPanel
  ├── useVideoAudioSync
  ├── useAutoPlayOnReady
  ├── useGestureController
  ├── useAnimationController
  └── useStatusBar
  ↓ (passes individual hook results)
VideoAnalysisLayout (18 prop groups)
```

---

## Phase 1: Preparation & Analysis

### Task 1.1: Document Current Orchestrator Behavior
**Type:** Documentation  
**Dependencies:** None  
**Can Execute in Parallel:** Yes  
**Estimated Time:** 2 hours

**Objective:** Create comprehensive documentation of orchestrator's current behavior for validation.

**Actions:**
1. Read `useVideoAnalysisOrchestrator.ts` (lines 1-1789)
2. Document all 14 hooks and their interdependencies
3. Document all 49 memoization layers and their purposes
4. Map data flow from props → hooks → return value
5. Identify which hooks depend on each other
6. Create dependency graph (Mermaid diagram)

**Deliverables:**
- `docs/refactoring/orchestrator-analysis.md` - Full behavior documentation
- `docs/refactoring/orchestrator-dependencies.mermaid` - Dependency graph
- List of hooks that can be composed independently
- List of hooks that need coordination (via context/events)

**Validation:**
- Documentation reviewed by team
- Dependency graph matches actual code

---

### Task 1.2: Audit Memoization Usage
**Type:** Analysis  
**Dependencies:** None  
**Can Execute in Parallel:** Yes  
**Estimated Time:** 2 hours

**Objective:** Identify which memoization is necessary vs. compensating for orchestrator complexity.

**Actions:**
1. List all 49 `useMemo`/`useCallback` instances in orchestrator
2. For each instance, document:
   - What it's memoizing
   - Why it exists (performance vs. prop stability)
   - Whether it's needed after refactoring
3. Categorize memoization:
   - **Keep**: Actually prevents expensive re-computation
   - **Move to component**: Needed for prop stability in layout
   - **Remove**: Compensating for orchestrator aggregation

**Deliverables:**
- `docs/refactoring/memoization-audit.md` - Detailed audit
- Spreadsheet: Memoization instances with keep/move/remove decisions
- Estimated reduction (target: 80-90%)

**Validation:**
- All 49 instances categorized
- Decisions justified with reasons

---

### Task 1.3: Analyze VideoAnalysisLayout Props
**Type:** Analysis  
**Dependencies:** None  
**Can Execute in Parallel:** Yes  
**Estimated Time:** 1 hour

**Objective:** Understand how layout consumes orchestrator props to plan prop refactoring.

**Actions:**
1. Read `VideoAnalysisLayout.native.tsx` (lines 54-220) - prop interface
2. Document all 18 prop groups layout expects
3. Map each prop to its source hook in orchestrator
4. Identify opportunities to simplify prop interface
5. Check if any props can be merged or eliminated

**Deliverables:**
- `docs/refactoring/layout-props-analysis.md` - Prop mapping documentation
- Table: Layout prop → Source hook → Simplification opportunity

**Validation:**
- All 18 prop groups documented
- Each prop mapped to source

---

### Task 1.4: Create Test Coverage Baseline
**Type:** Testing  
**Dependencies:** None  
**Can Execute in Parallel:** Yes  
**Estimated Time:** 1 hour

**Objective:** Establish baseline test coverage to validate refactoring doesn't break functionality.

**Actions:**
1. Run existing tests: `yarn workspace @my/app test VideoAnalysisScreen`
2. Document current test coverage:
   - Which hooks have tests
   - Which integration scenarios are tested
   - What's missing
3. Identify gaps in test coverage
4. Create list of tests to add before refactoring

**Deliverables:**
- `docs/refactoring/test-baseline.md` - Current coverage report
- List of tests to add before starting refactoring
- Baseline metrics (pass/fail counts)

**Validation:**
- All existing tests documented
- Baseline metrics captured

---

## Phase 2: Incremental Hook Extraction

### Task 2.1: Extract Independent Hooks (Batch 1)
**Type:** Refactoring  
**Dependencies:** Tasks 1.1, 1.2, 1.3, 1.4  
**Can Execute in Parallel:** No (foundational)  
**Estimated Time:** 4 hours

**Objective:** Extract 3 most independent hooks from orchestrator to VideoAnalysisScreen.

**Target Hooks:**
1. `useStatusBar` - No dependencies
2. `useHistoricalAnalysis` - Only depends on analysisJobId prop
3. `useAnalysisState` - Depends on historical data

**Actions:**
1. In `VideoAnalysisScreen.tsx`:
   - Import the 3 hooks directly
   - Call hooks with appropriate parameters
   - Store results in local variables (not orchestrator)
2. Keep orchestrator running in parallel (gradual migration)
3. Add feature flag to switch between orchestrator and direct composition
4. Update tests to validate both paths work identically
5. Remove extracted hooks' logic from orchestrator (comment out for now)

**Code Changes:**
```typescript
// VideoAnalysisScreen.tsx
export function VideoAnalysisScreen(props: VideoAnalysisScreenProps) {
  const { analysisJobId, videoRecordingId, videoUri, initialStatus, onBack } = props
  
  // 🆕 Direct hook composition (Batch 1 - Independent hooks)
  if (USE_DIRECT_COMPOSITION) {
    useStatusBar(true, 'fade')
    const historical = useHistoricalAnalysis(analysisJobId ?? null)
    const analysisState = useAnalysisState({
      analysisJobId,
      videoRecordingId,
      initialStatus,
      historicalData: historical.data,
      isHistoryMode: !!analysisJobId,
    })
    
    // TODO: Extract remaining 11 hooks in subsequent batches
  }
  
  // 🔧 Keep orchestrator for comparison
  const orchestrated = useVideoAnalysisOrchestrator(props)
  
  // Use orchestrated for now, switch after validation
  return <VideoAnalysisLayout {...(USE_DIRECT_COMPOSITION ? /* TBD */ : orchestrated)} />
}
```

**Deliverables:**
- Updated `VideoAnalysisScreen.tsx` with direct hook calls
- Feature flag: `USE_DIRECT_COMPOSITION`
- Tests pass with both orchestrator and direct composition

**Validation:**
- `yarn workspace @my/app test` passes
- Manual QA: Both paths produce identical behavior
- No performance regression

---

### Task 2.2: Extract Video Playback Hooks (Batch 2)
**Type:** Refactoring  
**Dependencies:** Task 2.1  
**Can Execute in Parallel:** No (depends on Batch 1)  
**Estimated Time:** 3 hours

**Objective:** Extract video playback-related hooks.

**Target Hooks:**
1. `useVideoPlayback` - Core video state
2. `useVideoControls` - Controls visibility
3. `useAutoPlayOnReady` - Auto-play behavior

**Actions:**
1. Extract hooks to VideoAnalysisScreen
2. Wire up dependencies (e.g., `useAutoPlayOnReady` needs `useVideoPlayback` result)
3. Update feature flag path to use extracted hooks
4. Test both paths

**Code Changes:**
```typescript
// VideoAnalysisScreen.tsx (continued)
if (USE_DIRECT_COMPOSITION) {
  // Batch 1 (from Task 2.1)
  useStatusBar(true, 'fade')
  const historical = useHistoricalAnalysis(analysisJobId ?? null)
  const analysisState = useAnalysisState(...)
  
  // 🆕 Batch 2 - Video playback hooks
  const videoPlayback = useVideoPlayback({
    uri: videoUri,
    historicalUri: historical.videoUri,
    posterUri: historical.posterUri,
    isHistoryMode: !!analysisJobId,
  })
  
  const videoControls = useVideoControls({
    onControlsVisibilityChange: props.onControlsVisibilityChange,
  })
  
  useAutoPlayOnReady({
    isReady: analysisState.isReady,
    initialStatus,
    play: videoPlayback.play,
  })
  
  // TODO: Extract remaining 8 hooks
}
```

**Deliverables:**
- 6 hooks now composed directly
- Tests pass for direct composition path
- Orchestrator still works as fallback

**Validation:**
- Video playback works identically in both paths
- Controls visibility behavior unchanged
- Auto-play triggers correctly

---

### Task 2.3: Extract Audio System Hooks (Batch 3)
**Type:** Refactoring  
**Dependencies:** Task 2.2  
**Can Execute in Parallel:** No (depends on Batch 2)  
**Estimated Time:** 4 hours

**Objective:** Extract audio-related hooks.

**Target Hooks:**
1. `useFeedbackAudioSource` - Resolves audio URLs
2. `useAudioController` - Audio playback control
3. `useVideoAudioSync` - Syncs video/audio playback

**Actions:**
1. Extract hooks to VideoAnalysisScreen
2. Wire up dependencies (sync needs both video and audio controllers)
3. Handle audio URL resolution errors
4. Update feature flag path

**Code Changes:**
```typescript
// VideoAnalysisScreen.tsx (continued)
if (USE_DIRECT_COMPOSITION) {
  // Batches 1-2 (from previous tasks)
  // ...
  
  // 🆕 Batch 3 - Audio system hooks
  const audioSource = useFeedbackAudioSource({
    feedback: analysisState.feedback,
    analysisJobId,
  })
  
  const audioController = useAudioController()
  
  const audioSync = useVideoAudioSync({
    videoPlayback,
    audioController,
    isPlaying: videoPlayback.isPlaying,
  })
  
  // TODO: Extract remaining 5 hooks
}
```

**Deliverables:**
- 9 hooks now composed directly
- Audio playback works with direct composition
- Sync behavior validated

**Validation:**
- Audio feedback plays correctly
- Video/audio sync works
- Error handling unchanged

---

### Task 2.4: Extract Feedback System Hooks (Batch 4)
**Type:** Refactoring  
**Dependencies:** Task 2.3  
**Can Execute in Parallel:** No (depends on Batch 3)  
**Estimated Time:** 4 hours

**Objective:** Extract feedback panel-related hooks.

**Target Hooks:**
1. `useFeedbackPanel` - Panel state (expanded/collapsed)
2. `useFeedbackCoordinator` - Coordinates feedback with video/audio

**Actions:**
1. Extract hooks to VideoAnalysisScreen
2. Wire up complex dependencies (coordinator needs video, audio, panel state)
3. Handle feedback item selection
4. Update feature flag path

**Code Changes:**
```typescript
// VideoAnalysisScreen.tsx (continued)
if (USE_DIRECT_COMPOSITION) {
  // Batches 1-3 (from previous tasks)
  // ...
  
  // 🆕 Batch 4 - Feedback system hooks
  const feedbackPanel = useFeedbackPanel({
    initialFraction: 0.5,
  })
  
  const feedbackCoordinator = useFeedbackCoordinator({
    videoPlayback,
    audioController,
    feedbackPanel,
    feedbackItems: analysisState.feedback,
    audioSource,
    videoAudioSync: audioSync,
  })
  
  // TODO: Extract remaining 3 hooks (native-only)
}
```

**Deliverables:**
- 11 hooks now composed directly
- Feedback panel behavior works
- Coordinator logic validated

**Validation:**
- Feedback panel expands/collapses correctly
- Feedback items sync with video playback
- Audio overlay shows/hides correctly

---

### Task 2.5: Extract Native-Only Hooks (Batch 5)
**Type:** Refactoring  
**Dependencies:** Task 2.4  
**Can Execute in Parallel:** No (depends on Batch 4)  
**Estimated Time:** 3 hours

**Objective:** Extract platform-specific hooks (native only).

**Target Hooks:**
1. `useGestureController` - YouTube-style gestures
2. `useAnimationController` - Mode-based animations

**Actions:**
1. Extract hooks with Platform.OS checks
2. Handle web platform (return undefined/null)
3. Wire up gesture/animation dependencies
4. Complete direct composition path

**Code Changes:**
```typescript
// VideoAnalysisScreen.tsx (continued)
if (USE_DIRECT_COMPOSITION) {
  // Batches 1-4 (from previous tasks)
  // ...
  
  // 🆕 Batch 5 - Native-only hooks
  const gesture = useGestureController({
    enabled: Platform.OS !== 'web',
    videoControls,
    feedbackPanel,
    onFeedbackScrollY: feedbackCoordinator.onFeedbackScrollY,
    onFeedbackMomentumScrollEnd: feedbackCoordinator.onFeedbackMomentumScrollEnd,
  })
  
  const animation = useAnimationController({
    enabled: Platform.OS !== 'web',
    gesture,
  })
  
  // ✅ All 14 hooks now composed directly!
}
```

**Deliverables:**
- All 14 hooks now composed in VideoAnalysisScreen
- Direct composition path complete
- Orchestrator still available as fallback

**Validation:**
- Gestures work on native (swipe, tap, pull-to-reveal)
- Animations smooth on native
- Web platform unaffected

---

## Phase 3: Props Restructuring

### Task 3.1: Simplify VideoAnalysisLayout Props Interface
**Type:** Refactoring  
**Dependencies:** Task 2.5  
**Can Execute in Parallel:** No (needs all hooks extracted)  
**Estimated Time:** 4 hours

**Objective:** Restructure how props are passed to VideoAnalysisLayout.

**Current Problem:**
- VideoAnalysisScreen creates 4 memoized objects (`feedback`, `handlers`, `error`, `socialCounts`)
- These add memoization layers on top of orchestrator's 49 layers
- Props interface has 18 separate groups

**Target Solution:**
- Pass hook results directly to layout
- Reduce memoization to only what's necessary
- Simplify prop interface where possible

**Actions:**
1. Analyze which props can be passed directly vs. need composition
2. Identify props that can be merged (e.g., video + playback)
3. Update VideoAnalysisLayout prop interface
4. Remove unnecessary memoization from VideoAnalysisScreen
5. Test prop stability with React DevTools Profiler

**Code Changes:**
```typescript
// VideoAnalysisScreen.tsx (direct composition path)
return (
  <VideoAnalysisLayout
    // Direct hook results (already stable)
    video={videoPlayback}
    playback={videoPlayback} // Same hook result
    audio={{ controller: audioController, source: audioSource, sync: audioSync }}
    controls={videoControls}
    gesture={gesture}
    animation={animation}
    
    // Composed props (minimal memoization)
    feedback={{
      items: analysisState.feedback,
      panelFraction: feedbackPanel.fraction,
      activeTab: feedbackPanel.activeTab,
      selectedFeedbackId: feedbackCoordinator.selectedId,
      currentTime: videoPlayback.currentTime, // Primitive value
      phase: analysisState.phase,
      progress: analysisState.progress,
      channelExhausted: analysisState.channelExhausted,
    }}
    
    // Handler composition (stable callbacks from hooks)
    handlers={useMemo(() => ({
      onPlay: videoPlayback.play,
      onPause: videoPlayback.pause,
      // ... other handlers from hooks
    }), [/* minimal deps */])}
    
    // Other props
    videoUri={videoPlayback.uri}
    audioController={audioController}
    bubbleState={feedbackCoordinator.bubbleState}
    audioOverlay={feedbackCoordinator.audioOverlay}
    coachSpeaking={feedbackCoordinator.isCoachSpeaking}
    socialCounts={SOCIAL_COUNTS} // Static constant
    persistentProgressBarProps={persistentProgressBarProps}
    onPersistentProgressBarPropsChange={handlePersistentProgressBarPropsChange}
  />
)
```

**Deliverables:**
- Simplified prop composition
- Memoization reduced from 4 layers to 1-2 layers
- Layout prop interface documented

**Validation:**
- React DevTools Profiler shows minimal re-renders
- No prop stability issues
- Performance same or better

---

### Task 3.2: Remove Orchestrator Memoization
**Type:** Code Deletion  
**Dependencies:** Task 3.1  
**Can Execute in Parallel:** No (needs props restructured)  
**Estimated Time:** 2 hours

**Objective:** Delete unnecessary memoization from orchestrator (or delete orchestrator entirely).

**Actions:**
1. Review memoization audit from Task 1.2
2. For each of 49 memoization instances:
   - If marked "Remove": Delete it
   - If marked "Move to component": Move to VideoAnalysisScreen
   - If marked "Keep": Leave in hook (if keeping orchestrator as option)
3. Test direct composition path without orchestrator
4. Validate performance unchanged

**Deliverables:**
- Orchestrator memoization reduced (or orchestrator deleted)
- 80-90% memoization reduction achieved (49 → ~5-10)
- Performance metrics validated

**Validation:**
- `yarn workspace @my/app test` passes
- Manual QA shows no regressions
- React DevTools Profiler shows similar re-render counts

---

## Phase 4: Cleanup & Optimization

### Task 4.1: Delete Orchestrator File
**Type:** Code Deletion  
**Dependencies:** Tasks 2.5, 3.1, 3.2  
**Can Execute in Parallel:** No (final step)  
**Estimated Time:** 1 hour

**Objective:** Delete `useVideoAnalysisOrchestrator.ts` and remove feature flag.

**Actions:**
1. Ensure all tests pass with direct composition
2. Remove feature flag `USE_DIRECT_COMPOSITION`
3. Delete `useVideoAnalysisOrchestrator.ts` (1789 LOC)
4. Update imports in VideoAnalysisScreen
5. Remove any remaining orchestrator references

**Code Changes:**
```typescript
// VideoAnalysisScreen.tsx (final)
export function VideoAnalysisScreen(props: VideoAnalysisScreenProps) {
  const { analysisJobId, videoRecordingId, videoUri, initialStatus, onBack } = props
  
  // Direct hook composition (no orchestrator)
  useStatusBar(true, 'fade')
  const historical = useHistoricalAnalysis(analysisJobId ?? null)
  const analysisState = useAnalysisState(...)
  const videoPlayback = useVideoPlayback(...)
  const videoControls = useVideoControls(...)
  useAutoPlayOnReady(...)
  const audioSource = useFeedbackAudioSource(...)
  const audioController = useAudioController()
  const audioSync = useVideoAudioSync(...)
  const feedbackPanel = useFeedbackPanel(...)
  const feedbackCoordinator = useFeedbackCoordinator(...)
  const gesture = useGestureController(...)
  const animation = useAnimationController(...)
  
  // Compose props for layout
  return <VideoAnalysisLayout {...props} />
}
```

**Deliverables:**
- Orchestrator file deleted
- Feature flag removed
- All references cleaned up

**Validation:**
- `yarn type-check` passes (0 errors)
- `yarn lint` passes (0 errors)
- `yarn workspace @my/app test` passes (all tests)
- Manual QA confirms no regressions

---

### Task 4.2: Update Architecture Documentation
**Type:** Documentation  
**Dependencies:** Task 4.1  
**Can Execute in Parallel:** Yes (after orchestrator deleted)  
**Estimated Time:** 2 hours

**Objective:** Update all architecture documentation to reflect new hook composition pattern.

**Actions:**
1. Update `docs/spec/architecture.mermaid` with new data flow
2. Update `docs/spec/TRD.md` with hook composition patterns
3. Update `docs/performance/react-memoization-architecture.md` with reduced memoization strategy
4. Create ADR (Architecture Decision Record) for orchestrator removal
5. Update component JSDoc comments

**Deliverables:**
- Updated architecture diagrams
- ADR: `docs/architecture/decisions/005-remove-orchestrator-pattern.md`
- Updated technical specs
- Component documentation updated

**Validation:**
- Documentation reviewed by team
- Architecture diagrams match code

---

### Task 4.3: Add Integration Tests
**Type:** Testing  
**Dependencies:** Task 4.1  
**Can Execute in Parallel:** Yes (after orchestrator deleted)  
**Estimated Time:** 3 hours

**Objective:** Add tests for direct hook composition patterns.

**Actions:**
1. Add test for VideoAnalysisScreen with direct composition
2. Test hook interaction scenarios:
   - Video playback triggers audio sync
   - Feedback coordinator responds to video events
   - Gesture controller updates panel state
3. Test error scenarios:
   - Historical analysis fails
   - Audio source errors
   - Video playback errors
4. Validate test coverage meets standards (1:2 test-to-code ratio)

**Deliverables:**
- Integration tests for direct composition
- Test coverage report
- All tests passing

**Validation:**
- `yarn workspace @my/app test VideoAnalysisScreen` passes
- Coverage increased vs. baseline (Task 1.4)

---

### Task 4.4: Performance Validation
**Type:** Testing  
**Dependencies:** Task 4.1  
**Can Execute in Parallel:** Yes (after orchestrator deleted)  
**Estimated Time:** 2 hours

**Objective:** Validate performance improvements from removing orchestrator.

**Actions:**
1. Run React DevTools Profiler on VideoAnalysisScreen
2. Count re-renders during typical user interactions:
   - Video playback
   - Feedback item selection
   - Panel expand/collapse
   - Audio overlay show/hide
3. Compare re-render counts to baseline (with orchestrator)
4. Measure memory usage (before/after)
5. Document performance metrics

**Deliverables:**
- Performance report with metrics
- Re-render count comparison table
- Memory usage comparison
- Screenshots from React DevTools Profiler

**Validation:**
- Re-render counts same or better vs. orchestrator
- No performance regressions
- Memory usage reduced (less memoized objects)

---

## Phase 5: Advanced Optimization (Optional)

### Task 5.1: Implement Context for Cross-Cutting Concerns
**Type:** Enhancement  
**Dependencies:** Task 4.1  
**Can Execute in Parallel:** Yes (after orchestrator deleted)  
**Estimated Time:** 4 hours

**Objective:** Add React Context for data needed by multiple hooks to avoid prop drilling.

**Actions:**
1. Identify data needed by multiple hooks:
   - Video playback state (used by sync, coordinator, controls)
   - Feedback items (used by panel, coordinator, audio source)
2. Create context providers:
   - `VideoContext` for playback state
   - `FeedbackContext` for feedback items
3. Update hooks to consume contexts
4. Optimize context updates (prevent unnecessary re-renders)
5. Test context integration

**Code Changes:**
```typescript
// VideoContext.tsx
export const VideoContext = createContext<VideoPlaybackState | null>(null)

export function VideoProvider({ children, uri }: { children: ReactNode; uri: string }) {
  const state = useVideoPlayback(uri)
  return <VideoContext.Provider value={state}>{children}</VideoContext.Provider>
}

// VideoAnalysisScreen.tsx
export function VideoAnalysisScreen(props: VideoAnalysisScreenProps) {
  return (
    <VideoProvider uri={videoUri}>
      <FeedbackProvider items={feedbackItems}>
        <VideoAnalysisScreenContent {...props} />
      </FeedbackProvider>
    </VideoProvider>
  )
}
```

**Deliverables:**
- Context providers created
- Hooks updated to consume contexts
- Tests validate context integration

**Validation:**
- No prop drilling required
- Context updates optimized
- No performance regression

---

### Task 5.2: Implement Event Bus for Hook Coordination
**Type:** Enhancement  
**Dependencies:** Task 5.1  
**Can Execute in Parallel:** Yes (can be done without context)  
**Estimated Time:** 4 hours

**Objective:** Add event bus for hooks to communicate without direct dependencies.

**Actions:**
1. Create simple pub/sub event bus (< 50 LOC)
2. Define domain events:
   - `video:play`, `video:pause`, `video:seek`, `video:end`
   - `feedback:select`, `feedback:expand`, `feedback:collapse`
   - `audio:play`, `audio:pause`, `audio:error`
3. Update hooks to emit/listen to events
4. Add event logging for debugging
5. Test event flow

**Code Changes:**
```typescript
// eventBus.ts
class EventBus {
  private listeners: Map<string, Set<Function>> = new Map()
  
  emit(event: string, data: any) {
    this.listeners.get(event)?.forEach(listener => listener(data))
  }
  
  on(event: string, listener: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(listener)
  }
  
  off(event: string, listener: Function) {
    this.listeners.get(event)?.delete(listener)
  }
}

export const eventBus = new EventBus()

// useVideoPlayback.ts
const play = useCallback(() => {
  // ... play logic
  eventBus.emit('video:play', { currentTime })
}, [])

// useFeedbackCoordinator.ts
useEffect(() => {
  const handler = (event: { currentTime: number }) => {
    syncFeedback(event.currentTime)
  }
  eventBus.on('video:play', handler)
  return () => eventBus.off('video:play', handler)
}, [])
```

**Deliverables:**
- Event bus implementation
- Domain events documented
- Hooks updated to use events
- Tests validate event flow

**Validation:**
- Hooks coordinate via events (no direct coupling)
- Event system debuggable (logging works)
- No performance regression

---

## Summary: Task Dependencies & Parallelization

### Phase 1 (Preparation) - **All tasks can run in parallel**
- Task 1.1: Document orchestrator behavior
- Task 1.2: Audit memoization usage
- Task 1.3: Analyze layout props
- Task 1.4: Create test baseline

**Timeline:** 2 hours (if all run in parallel)

---

### Phase 2 (Incremental Extraction) - **Must run sequentially**
- Task 2.1: Extract Batch 1 (independent hooks) → **4 hours**
- Task 2.2: Extract Batch 2 (video playback) → **3 hours**
- Task 2.3: Extract Batch 3 (audio system) → **4 hours**
- Task 2.4: Extract Batch 4 (feedback system) → **4 hours**
- Task 2.5: Extract Batch 5 (native-only) → **3 hours**

**Timeline:** 18 hours (sequential execution required)

---

### Phase 3 (Props Restructuring) - **Must run sequentially after Phase 2**
- Task 3.1: Simplify layout props → **4 hours**
- Task 3.2: Remove orchestrator memoization → **2 hours**

**Timeline:** 6 hours

---

### Phase 4 (Cleanup) - **Task 4.1 must run first, then others can parallelize**
- Task 4.1: Delete orchestrator file → **1 hour** (must run first)
- Task 4.2: Update documentation → **2 hours** (can run in parallel)
- Task 4.3: Add integration tests → **3 hours** (can run in parallel)
- Task 4.4: Performance validation → **2 hours** (can run in parallel)

**Timeline:** 1 hour + max(2, 3, 2) = **4 hours**

---

### Phase 5 (Advanced Optimization) - **Both can run in parallel (optional)**
- Task 5.1: Implement Context → **4 hours**
- Task 5.2: Implement Event Bus → **4 hours**

**Timeline:** 4 hours (if both run in parallel)

---

## Total Timeline

- **Phase 1:** 2 hours (parallelized)
- **Phase 2:** 18 hours (sequential)
- **Phase 3:** 6 hours (sequential)
- **Phase 4:** 4 hours (partially parallelized)
- **Phase 5 (Optional):** 4 hours (parallelized)

**Total (excluding Phase 5):** **30 hours** (~4 days)  
**Total (including Phase 5):** **34 hours** (~4.5 days)

---

## Risk Mitigation

### High-Risk Tasks
1. **Task 2.4** (Extract feedback coordinator) - Complex dependencies
2. **Task 3.1** (Simplify layout props) - High chance of breaking layout

### Mitigation Strategies
1. **Feature Flag:** Keep orchestrator as fallback during Phases 2-3
2. **Gradual Migration:** Extract hooks in small batches, test after each
3. **Test Coverage:** Add tests before refactoring (Task 1.4)
4. **Performance Monitoring:** Use React DevTools Profiler throughout
5. **Rollback Plan:** Git commits after each task, can revert if needed

---

## Success Criteria

### Functionality
- ✅ All existing features work identically
- ✅ All tests pass (`yarn workspace @my/app test`)
- ✅ No TypeScript errors (`yarn type-check`)
- ✅ No lint errors (`yarn lint`)
- ✅ Manual QA confirms no regressions

### Performance
- ✅ Memoization reduced by 80-90% (49 → ~5-10 instances)
- ✅ Re-render counts same or better
- ✅ Memory usage reduced
- ✅ No performance regressions in React DevTools Profiler

### Code Quality
- ✅ Orchestrator file deleted (1789 LOC removed)
- ✅ VideoAnalysisScreen composition clear and maintainable (~200 LOC)
- ✅ Hooks testable independently
- ✅ Architecture documentation updated

---

## Next Steps After Completion

1. **Monitor Production:** Watch for performance issues after deployment
2. **Reusability:** Consider reusing extracted hooks in other screens
3. **Context/Events:** If prop drilling becomes painful, implement Phase 5
4. **Performance:** Continuously profile with React DevTools
5. **Documentation:** Keep architecture docs updated as hooks evolve

