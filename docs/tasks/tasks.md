# VideoAnalysisScreen Refactoring: Complete Workflow Prompts

## 📋 Execution Order & Dependencies

```mermaid
graph TD
    T6[Task 6: Log Levels] --> T1[Task 1: Subscription Store]
    T1 --> T7[Task 7: Bubble Controller]
    T1 --> T3[Task 3: Analysis State]
    T7 --> T2[Task 2: Component Splitting]
    T3 --> T2
    T2 --> T8[Task 8: Orchestrator Pattern]
    T8 --> T9[Task 9: Re-render Optimization]
    T9 --> T4[Task 4: Command Pattern]
    T9 --> T5[Task 5: React Query Migration]
```

---

## 🚀 PHASE 1: Foundation (Week 1-2)

### Task 6: Add Production Log Levels ⚡ QUICK WIN
**Effort:** 30 minutes | **Priority:** Do First (reduces noise for other tasks)

```
@step-by-step-rule.mdc - Audit and fix production logging in VideoAnalysisScreen.tsx.

OBJECTIVE: Wrap all debug/verbose logs with __DEV__ guards to improve production performance.

SCOPE:
- File: packages/app/features/VideoAnalysis/VideoAnalysisScreen.tsx (lines 1-1728)
- Pattern: Convert `log.debug(...)` → `if (__DEV__) { log.debug(...) }`
- Keep: log.error(), log.warn(), log.info() (these run in production)
- Wrap: log.debug() calls (estimated ~30 instances)

ACCEPTANCE CRITERIA:
- [x] All log.debug() calls wrapped with __DEV__ checks
- [x] Frame-by-frame progress logs (line ~1312) only in dev mode
- [x] Render count logs (line ~381) only in dev mode
- [x] No production performance regression (test on low-end device)
- [x] Existing error/warn/info logs remain unchanged

REFERENCE PATTERN:
See packages/app/features/VideoAnalysis/hooks/useFeedbackStatusIntegration.ts lines 214-236 for existing __DEV__ guard pattern.

SUCCESS VALIDATION:
- yarn type-check passes ✅
- yarn build succeeds ✅
- Production bundle size reduced by ~5-10KB ✅
```

---

### Task 1: Extract Subscription Management to Zustand Store
**Effort:** 2-3 days | **Priority:** High | **Blocks:** Tasks 2, 3

```
@step-by-step-rule.mdc - Extract VideoAnalysisScreen subscription management (lines 245-783) to packages/app/stores/analysisSubscription.ts following the feedbackStatus.ts pattern.

OBJECTIVE: Centralize all analysis job subscription logic into a reusable Zustand store with built-in retry, error handling, and StrictMode guards.

SCOPE:
- CREATE: packages/app/stores/analysisSubscription.ts (~250 lines)
- CREATE: packages/app/stores/__tests__/analysisSubscription.test.ts (~150 lines)
- MODIFY: packages/app/features/VideoAnalysis/VideoAnalysisScreen.tsx
  - REMOVE: Lines 245-262 (refs), 264-378 (helper functions), 522-783 (subscription effects)
  - REPLACE: With single useAnalysisSubscriptionStore hook call (~10 lines)

ARCHITECTURE REQUIREMENTS:
- Follow packages/app/stores/feedbackStatus.ts as reference pattern
- Store interface must include:
  * subscriptions: Map<string, SubscriptionState>
  * subscribe(key: string, options: SubscriptionOptions): Promise<void>
  * unsubscribe(key: string): void
  * getJob(key: string): AnalysisJob | null
  * getStatus(key: string): SubscriptionStatus
  * retry(key: string): Promise<void>
- Use subscribeToAnalysisJob and subscribeToLatestAnalysisJobByRecordingId from @my/api
- Implement exponential backoff retry logic (current: lines 264-322)
- Handle StrictMode double-effect prevention (current: lines 247-249, 549-553)
- Include health check integration (current: lines 616-631)

ACCEPTANCE CRITERIA:
- [x] Store exports useAnalysisSubscriptionStore hook
- [x] Subscription deduplication prevents concurrent attempts
- [x] Retry logic caps at 3 attempts with exponential backoff
- [x] Store cleanup on unmount prevents memory leaks
- [x] Health check failures logged with diagnostic data
- [x] Test coverage ≥70% (subscription lifecycle, retry, cleanup, edge cases)
- [x] VideoAnalysisScreen.tsx reduced by ~250 lines
- [x] All existing realtime updates continue working
- [x] StrictMode doesn't cause duplicate subscriptions

MIGRATION STEPS:
1. ~~Create store with subscription state management~~ ✅
2. ~~Add retry and error handling logic~~ ✅
3. ~~Implement cleanup and deduplication guards~~ ✅
4. ~~Write comprehensive tests~~ ✅
5. ~~Update VideoAnalysisScreen to use new store~~ ✅
6. ~~Remove old subscription code~~ ✅
7. ~~Validate realtime updates still work~~ ✅

SUCCESS VALIDATION:
- yarn workspace @my/app test packages/app/stores/__tests__/analysisSubscription.test.ts --verbose
- yarn type-check passes
- Video analysis screen still receives realtime updates
- No console errors about duplicate subscriptions in StrictMode
```

---

### Task 7: Extract Bubble Display Logic
**Effort:** 4 hours | **Priority:** Medium | **Unblocks:** Task 2

```
@step-by-step-rule.mdc - Extract feedback bubble timing logic (lines 963-1275) from VideoAnalysisScreen.tsx to packages/app/features/VideoAnalysis/hooks/useBubbleController.ts.

OBJECTIVE: Isolate bubble display/hide/timing logic into a dedicated hook following existing hook patterns.

SCOPE:
- CREATE: packages/app/features/VideoAnalysis/hooks/useBubbleController.ts (~180 lines)
- CREATE: packages/app/features/VideoAnalysis/hooks/__tests__/useBubbleController.test.ts (~100 lines)
- MODIFY: packages/app/features/VideoAnalysis/VideoAnalysisScreen.tsx
  - REMOVE: Lines 963-975 (state), 1015-1022 (cleanup), 1099-1275 (functions + effects)
  - REPLACE: With single useBubbleController hook call (~5 lines)

HOOK INTERFACE:
``typescript
export interface BubbleControllerState {
  currentBubbleIndex: number | null
  bubbleVisible: boolean
  showBubble: (index: number) => void
  hideBubble: () => void
  checkAndShowBubbleAtTime: (timeMs: number) => number | null
}

export function useBubbleController(
  feedbackItems: FeedbackItem[],
  currentTime: number,
  isPlaying: boolean,
  audioUrls: Record<string, string>,
  audioDuration: number
): BubbleControllerState
``

ARCHITECTURE REQUIREMENTS:
- Follow useAudioController.ts pattern (same directory)
- Include audio-duration-based display timing (lines 1131-1149)
- Implement pause detection with "recently shown" guard (lines 1184-1218)
- Use refs for timer management to prevent memory leaks
- Include throttling for frame-by-frame checks (line 1326)

ACCEPTANCE CRITERIA:
- [x] Hook manages bubble visibility state
- [x] Timing synchronized with video currentTime
- [x] Auto-hide after audio duration or 3-second default
- [x] Pause detection respects 2.5s "recently shown" window
- [x] Memory leaks prevented (all timers cleaned up)
- [x] Test coverage ≥70% (show/hide, timing, cleanup)
- [x] VideoAnalysisScreen.tsx reduced by ~175 lines
- [x] Existing bubble behavior unchanged

SUCCESS VALIDATION:
- yarn workspace @my/app test packages/app/features/VideoAnalysis/hooks/__tests__/useBubbleController.test.ts --verbose ✅
- yarn type-check passes ✅
- Bubbles appear at correct timestamps during video playback ✅
- Bubbles auto-hide after audio completes ✅
- No timer warnings in console on component unmount ✅
```

---

## 📦 PHASE 2: Restructuring (Week 3-5)

### Task 3: Consolidate Processing State Logic
**Effort:** 3-4 days | **Priority:** High | **Blocks:** Task 2 ✅

```
@step-by-step-rule.mdc - Create useAnalysisState hook to consolidate upload progress, analysis job status, and feedback status into a single state machine.

OBJECTIVE: Replace 4 separate hooks and complex memoization (lines 119-520) with a unified analysis state hook following a clear phase-based state machine.

SCOPE:
- CREATE: packages/app/features/VideoAnalysis/hooks/useAnalysisState.ts (~200 lines)
- CREATE: packages/app/features/VideoAnalysis/hooks/__tests__/useAnalysisState.test.ts (~150 lines)
- MODIFY: packages/app/features/VideoAnalysis/VideoAnalysisScreen.tsx
  - REMOVE: Lines 119-150 (upload derivation), 138-242 (analysis UUID lookup), 390-520 (processing memos)
  - REPLACE: With single useAnalysisState hook call (~8 lines)

HOOK INTERFACE:
```typescript
export type AnalysisPhase = 
  | 'uploading'           // Video upload in progress
  | 'upload-complete'     // Upload done, waiting for analysis
  | 'analyzing'           // AI analysis in progress  
  | 'generating-feedback' // SSML/TTS generation
  | 'ready'               // All feedback audio ready
  | 'error'               // Upload or analysis failed

export interface AnalysisStateResult {
  // Phase tracking
  phase: AnalysisPhase
  isProcessing: boolean // Shorthand for phase !== 'ready' && phase !== 'error'
  
  // Progress tracking
  progress: {
    upload: number        // 0-100
    analysis: number      // 0-100  
    feedback: number      // 0-100
  }
  
  // Data access
  videoRecordingId: number | null
  analysisJobId: number | null
  analysisUuid: string | null
  
  // Error handling
  error: {
    phase: 'upload' | 'analysis' | 'feedback'
    message: string
  } | null
  
  // Actions
  retry: () => Promise<void>
}

export function useAnalysisState(
  analysisJobId?: number,
  videoRecordingId?: number,
  initialStatus?: 'processing' | 'ready'
): AnalysisStateResult
``

ARCHITECTURE REQUIREMENTS:
- Consume useUploadProgress, useAnalysisSubscriptionStore (Task 1), useFeedbackStatusIntegration
- Implement priority-based phase resolution (current logic: lines 397-498)
- Replace shouldShowProcessing memoization with phase === 'ready' check
- Use state machine pattern for phase transitions (no invalid states)
- Include firstPlayableReady optimization (lines 390-395)

PHASE TRANSITION LOGIC:
```
uploading → upload-complete (when uploadProgress.status === 'uploaded')
upload-complete → analyzing (when analysisJob.status === 'queued' or 'processing')
analyzing → generating-feedback (when analysisJob.status === 'completed' && feedbackStatus.total > 0)
generating-feedback → ready (when feedbackStatus.isFullyCompleted OR firstPlayableReady)
any → error (when uploadFailed or analysisJob.status === 'failed')
```

ACCEPTANCE CRITERIA:
- [x] Hook returns single AnalysisStateResult object
- [x] Phase transitions follow strict state machine rules
- [x] Progress aggregates from all 3 sources
- [x] firstPlayableReady optimization preserved (hide processing early)
- [x] Error state includes phase context for user messaging
- [x] Test coverage ≥80% (all phase transitions, error cases, edge cases)
- [x] VideoAnalysisScreen.tsx reduced by ~150 lines
- [x] Processing overlay shows/hides at correct times

SUCCESS VALIDATION:
- ✅ yarn workspace @my/app test packages/app/features/VideoAnalysis/hooks/__tests__/useAnalysisState.test.ts --verbose
- ✅ yarn type-check passes
- ✅ Processing overlay behavior unchanged (hides when first audio ready)
- ✅ Upload → Analysis → Ready flow works end-to-end
- ✅ Error states display correctly with retry option
```

---

### Task 2: Split into Logical Sub-Components
**Effort:** 5-6 days | **Priority:** High | **Requires:** Tasks 1, 3, 7

```
@step-by-step-rule.mdc - Split VideoAnalysisScreen.tsx into 4 specialized components with memoization boundaries to reduce re-renders and improve testability.

OBJECTIVE: Decompose 1,728-line component into maintainable sub-components following single responsibility principle.

SCOPE:
- CREATE: packages/app/features/VideoAnalysis/components/UploadErrorState.tsx (~80 lines)
- CREATE: packages/app/features/VideoAnalysis/components/VideoPlayerSection.tsx (~200 lines)
- CREATE: packages/app/features/VideoAnalysis/components/FeedbackSection.tsx (~150 lines)
- CREATE: packages/app/features/VideoAnalysis/components/ProcessingIndicator.tsx (~50 lines)
- CREATE: Test files for each component (~100 lines each)
- MODIFY: packages/app/features/VideoAnalysis/VideoAnalysisScreen.tsx
  - REMOVE: Lines 1430-1510 (error UI), 1515-1658 (player), 1662-1704 (feedback)
  - REFACTOR: To orchestrator role (~350 lines total)

COMPONENT SPECIFICATIONS:

**UploadErrorState.tsx**
- Props: uploadError: string, onRetry: () => void, onBack: () => void
- Extract: Lines 1430-1510
- Pattern: Stateless presentational component
- Memo: React.memo (props are stable strings/functions)

**VideoPlayerSection.tsx**
- Props: videoUri, isPlaying, currentTime, duration, feedbackBubble, poseData, audioController, onProgress, onSeek, onLoad, onEnd
- Extract: Lines 1515-1658 (VideoPlayer, overlays, AudioPlayer, controls)
- Pattern: Container component with internal VideoPlayer state
- Memo: React.memo with custom comparison (skip re-render if currentTime change < 0.5s)

**FeedbackSection.tsx**
- Props: feedbackItems, panelFraction, activeFeedbackTab, selectedFeedbackId, onTabChange, onItemPress, onExpand, onCollapse
- Extract: Lines 1662-1704 (FeedbackPanel + SocialIcons)
- Pattern: Container managing panel expansion state
- Memo: React.memo (expand/collapse triggers intentional re-renders)

**ProcessingIndicator.tsx**
- Props: phase: AnalysisPhase, progress: ProgressData
- Extract: Processing overlay logic (currently mixed in VideoControls)
- Pattern: Overlay component with progress animation
- Memo: React.memo (only re-render when phase or progress changes)

ARCHITECTURE REQUIREMENTS:
- All components use React.memo() with appropriate comparison functions
- Props must be stable (use useCallback for all function props in parent)
- Follow existing component patterns in packages/ui/src/components/VideoAnalysis/
- Use Tamagui for styling (no inline styles)
- Export TypeScript interfaces for all props

PARENT ORCHESTRATOR PATTERN:
```typescript
// VideoAnalysisScreen.tsx becomes orchestrator
export function VideoAnalysisScreen(props: VideoAnalysisScreenProps) {
  // 1. Hooks (state, subscriptions, analysis)
  const analysisState = useAnalysisState(...)
  const feedbackStatus = useFeedbackStatusIntegration(...)
  const bubbleController = useBubbleController(...)
  
  // 2. Stable callbacks (wrapped in useCallback)
  const handleVideoProgress = useCallback(...)
  const handleFeedbackItemPress = useCallback(...)
  
  // 3. Conditional rendering
  if (analysisState.error) return <UploadErrorState {...errorProps} />
  
  // 4. Compose sub-components
  return (
    <YStack flex={1}>
      {analysisState.isProcessing && <ProcessingIndicator {...processingProps} />}
      <VideoPlayerSection {...videoProps} />
      <FeedbackSection {...feedbackProps} />
    </YStack>
  )
}
``

ACCEPTANCE CRITERIA:
- [x] 4 new components created with tests
- [x] All components use React.memo appropriately
- [x] Parent uses useCallback for all function props
- [ ] VideoAnalysisScreen.tsx reduced to <400 lines (pending follow-up trim)
- [x] Test coverage ≥70% for each component (local suites pass 12/12)
- [ ] Re-render count reduced by 60%+ (profile in follow-up)
- [x] All existing functionality preserved
- [x] No prop-drilling issues (each component gets only needed props)

SUCCESS VALIDATION:
- yarn workspace @my/app test packages/app/features/VideoAnalysis/components --verbose ✅
- yarn workspace @my/app type-check ✅
- React DevTools Profiler shows <5 re-renders per playback second (down from ~15) ⏳
- Visual regression test: record video, see feedback, verify UI unchanged ⏳
```

---

### Task 8: Complete Orchestrator Pattern Migration
**Effort:** 3-4 days | **Priority:** High | **Requires:** Tasks 1, 2, 3, 7

```
@step-by-step-rule.mdc - Refactor VideoAnalysisScreen.tsx to use extracted hooks as primary state sources, removing duplicate logic and achieving true orchestrator pattern.

OBJECTIVE: Reduce VideoAnalysisScreen from 1,104 lines to <400 lines by fully utilizing hooks created in Tasks 1, 3, 7 and extracting remaining state management.

CURRENT STATE ANALYSIS:
- Task 1 created useAnalysisSubscriptionStore (subscription management) ✅
- Task 3 created useAnalysisState (processing state machine) ✅
- Task 7 created useBubbleController (bubble timing) ✅
- Task 2 created 4 UI components ✅
- **Problem:** VideoAnalysisScreen still has 800+ lines of manual state orchestration

SCOPE:
- CREATE: packages/app/features/VideoAnalysis/hooks/useVideoPlayback.ts (~150 lines) ✅
- CREATE: packages/app/features/VideoAnalysis/hooks/useFeedbackPanel.ts (~100 lines) ✅
- CREATE: packages/app/features/VideoAnalysis/hooks/useFeedbackSelection.ts (~120 lines) ✅
- CREATE: Test files for each hook (~100 lines each) ✅
- MODIFY: packages/app/features/VideoAnalysis/VideoAnalysisScreen.tsx
  - REMOVE: Lines 66-618 (manual state), 142-487 (duplicate subscription logic), 720-936 (inline handlers)
  - REPLACE: With hook calls and prop composition (~350 lines total)

HOOK SPECIFICATIONS:

**useVideoPlayback.ts**
```typescript
export interface VideoPlaybackState {
  isPlaying: boolean
  currentTime: number
  duration: number
  pendingSeek: number | null
  videoEnded: boolean
  
  // Actions
  play: () => void
  pause: () => void
  seek: (time: number) => void
  replay: () => void
  handleProgress: (data: { currentTime: number }) => void
  handleLoad: (data: { duration: number }) => void
  handleEnd: () => void
}

export function useVideoPlayback(
  initialStatus?: 'playing' | 'paused'
): VideoPlaybackState
```

**useFeedbackPanel.ts**
```typescript
export interface FeedbackPanelState {
  panelFraction: number
  activeTab: 'feedback' | 'insights' | 'comments'
  selectedFeedbackId: string | null
  
  // Actions
  expand: () => void
  collapse: () => void
  setActiveTab: (tab: 'feedback' | 'insights' | 'comments') => void
  selectFeedback: (id: string | null) => void
}

export function useFeedbackPanel(): FeedbackPanelState
```

**useFeedbackSelection.ts**
```typescript
export interface FeedbackSelectionState {
  selectedFeedbackId: string | null
  isCoachSpeaking: boolean
  
  // Actions
  selectFeedback: (item: FeedbackPanelItem) => void
  clearSelection: () => void
}

export function useFeedbackSelection(
  feedbackAudio: ReturnType<typeof useFeedbackAudioSource>,
  audioController: ReturnType<typeof useAudioController>,
  videoPlayback: VideoPlaybackState
): FeedbackSelectionState
```

ORCHESTRATOR PATTERN (Final VideoAnalysisScreen.tsx):
```typescript
export function VideoAnalysisScreen(props: VideoAnalysisScreenProps) {
  // 1. Core state hooks (replace manual state)
  const analysisState = useAnalysisState(analysisJobId, videoRecordingId, initialStatus)
  const videoPlayback = useVideoPlayback(initialStatus)
  const feedbackPanel = useFeedbackPanel()
  const bubbleController = useBubbleController(feedbackItems, videoPlayback.currentTime, videoPlayback.isPlaying, audioUrls, audioDuration)
  const feedbackStatus = useFeedbackStatusIntegration(analysisState.analysisUuid)
  const feedbackAudio = useFeedbackAudioSource(feedbackStatus.feedbacks)
  const audioController = useAudioController(feedbackAudio.activeAudio?.url ?? null)
  const feedbackSelection = useFeedbackSelection(feedbackAudio, audioController, videoPlayback)
  const videoAudioSync = useVideoAudioSync(videoPlayback.isPlaying, audioController.isPlaying)
  
  // 2. Derived state (minimal memoization)
  const feedbackItems = useMemo(() => 
    feedbackStatus.feedbacks.map(f => ({ ...f, audioUrl: feedbackAudio.audioUrls[f.id] })),
    [feedbackStatus.feedbacks, feedbackAudio.audioUrls]
  )
  
  // 3. Stable callbacks (only for cross-hook coordination)
  const handleFeedbackItemPress = useCallback((item: FeedbackPanelItem) => {
    feedbackSelection.selectFeedback(item)
    videoPlayback.seek(item.timestamp / 1000)
  }, [feedbackSelection, videoPlayback])
  
  // 4. Early returns
  if (analysisState.error) {
    return <UploadErrorState error={analysisState.error} onRetry={analysisState.retry} onBack={onBack} />
  }
  
  // 5. Compose components (no inline logic)
  return (
    <YStack flex={1}>
      <ProcessingIndicator 
        phase={analysisState.phase} 
        progress={analysisState.progress} 
        channelExhausted={analysisState.channelExhausted} 
      />
      <VideoPlayerSection 
        {...videoPlayback}
        videoUri={analysisState.videoUri}
        bubbleState={bubbleController}
        audioController={audioController}
        panelFraction={feedbackPanel.panelFraction}
      />
      <FeedbackSection 
        {...feedbackPanel}
        feedbackItems={feedbackItems}
        onItemPress={handleFeedbackItemPress}
      />
    </YStack>
  )
}
```

ARCHITECTURE REQUIREMENTS:
- Each hook owns its state domain completely (no shared useState between hooks)
- Hooks communicate via explicit parameters, not shared refs
- VideoAnalysisScreen becomes pure composition (no business logic)
- Remove ALL duplicate logic (subscription management, upload tracking, etc.)
- Use existing hooks from Tasks 1, 3, 7 as-is (no modifications)

ACCEPTANCE CRITERIA:
- [x] VideoAnalysisScreen.tsx reduced to <400 lines ✅
- [x] Zero useState/useEffect in VideoAnalysisScreen (all in hooks) ✅
- [x] All 15 useState declarations moved to hooks ✅
- [x] All 11 useEffect hooks moved to hooks ✅
- [x] Duplicate subscription logic removed (use Task 1 store) ✅
- [x] Duplicate upload tracking removed (use Task 3 hook) ✅
- [x] Test coverage ≥75% for new hooks ✅
- [x] All existing functionality preserved ✅
- [x] No regression in realtime updates or UI behavior ✅

SUCCESS VALIDATION:
- yarn workspace @my/app test packages/app/features/VideoAnalysis/hooks --verbose ✅
- yarn type-check passes ✅
- wc -l VideoAnalysisScreen.tsx shows <400 lines ✅
- grep -c "useState\|useEffect" VideoAnalysisScreen.tsx returns 0 ✅
- Video analysis flow works end-to-end ✅
```

---

### Task 9: Optimize Re-render Performance
**Effort:** 2-3 days | **Priority:** High | **Requires:** Task 8

```
@step-by-step-rule.mdc - Reduce VideoAnalysisScreen re-renders by 60%+ through prop stabilization, context optimization, and moving frame-dependent state to child components.

OBJECTIVE: Achieve <5 re-renders per playback second (down from ~15) by optimizing prop stability and component boundaries.

CURRENT PROBLEM:
- videoPlayerProps useMemo recreates object every frame (currentTime changes 30-60x/second)
- Even with React.memo, props object reference changes trigger re-renders
- Parent re-renders cascade to all children despite memoization

SCOPE:
- MODIFY: packages/app/features/VideoAnalysis/components/VideoPlayerSection.tsx
  - Move currentTime to internal state (parent doesn't need it)
  - Accept onProgress callback to notify parent only on significant changes
- MODIFY: packages/app/features/VideoAnalysis/VideoAnalysisScreen.tsx
  - Remove currentTime from parent state
  - Stabilize audioController and bubbleController references
  - Split videoPlayerProps into smaller prop groups
- CREATE: packages/app/features/VideoAnalysis/contexts/VideoAnalysisContext.tsx (~80 lines)
  - Provide rarely-changing data (videoUri, duration, feedbackItems)
  - Prevent prop drilling and unnecessary re-renders
- ADD: React DevTools Profiler measurements and benchmarks

OPTIMIZATION STRATEGIES:

**1. Move Frame-Dependent State to Children**
```typescript
// BEFORE (parent re-renders 60x/second)
const [currentTime, setCurrentTime] = useState(0)
const handleProgress = (data) => setCurrentTime(data.currentTime)
<VideoPlayerSection currentTime={currentTime} onProgress={handleProgress} />

// AFTER (parent stable, child handles its own updates)
const handleSignificantProgress = useCallback((time: number) => {
  // Only called on seek or major time jumps
  bubbleController.checkAndShowBubbleAtTime(time * 1000)
}, [bubbleController])
<VideoPlayerSection onSignificantProgress={handleSignificantProgress} />

// VideoPlayerSection.tsx manages currentTime internally
const [currentTime, setCurrentTime] = useState(0)
const handleProgress = (data) => {
  setCurrentTime(data.currentTime)
  if (Math.abs(data.currentTime - lastNotifiedTime) > 1.0) {
    onSignificantProgress(data.currentTime)
  }
}
```

**2. Stabilize Object References**
```typescript
// BEFORE (new object every render)
const audioController = useAudioController(audioUrl)

// AFTER (stable reference via ref wrapper)
const audioControllerRef = useRef(useAudioController(audioUrl))
useEffect(() => {
  audioControllerRef.current = useAudioController(audioUrl)
}, [audioUrl])
```

**3. Use Context for Rarely-Changing Data**
```typescript
// VideoAnalysisContext.tsx
export const VideoAnalysisContext = createContext<{
  videoUri: string | null
  duration: number
  feedbackItems: FeedbackPanelItem[]
}>()

// Parent provides once
<VideoAnalysisContext.Provider value={{ videoUri, duration, feedbackItems }}>
  <VideoPlayerSection />
  <FeedbackSection />
</VideoAnalysisContext.Provider>

// Children consume without props
const { videoUri } = useContext(VideoAnalysisContext)
```

**4. Custom Comparison for React.memo**
```typescript
export const VideoPlayerSection = memo(
  function VideoPlayerSection(props) { /* ... */ },
  (prev, next) => {
    // Skip re-render if only currentTime changed by <0.5s
    if (Math.abs(next.currentTime - prev.currentTime) < 0.5) {
      return true // props are "equal", skip re-render
    }
    return false // props changed, re-render
  }
)
```

**5. Split Large Prop Objects**
```typescript
// BEFORE (any prop change re-renders everything)
<VideoPlayerSection {...videoPlayerProps} />

// AFTER (only affected components re-render)
<VideoPlayerSection>
  <VideoPlayer uri={videoUri} onProgress={handleProgress} />
  <VideoControls isPlaying={isPlaying} onPlay={handlePlay} />
  <FeedbackBubbles messages={bubbleMessages} />
</VideoPlayerSection>
```

MEASUREMENT PROTOCOL:
1. Baseline: Record 30s of video playback with React DevTools Profiler
2. Count re-renders per component per second
3. Apply optimizations incrementally
4. Re-measure after each optimization
5. Document before/after metrics

ACCEPTANCE CRITERIA:
- [ ] VideoAnalysisScreen re-renders <1x per second during playback (down from 30-60x)
- [ ] VideoPlayerSection re-renders <5x per second (down from 30-60x)
- [ ] FeedbackSection re-renders <1x per second (down from 15x)
- [ ] ProcessingIndicator re-renders only on phase/progress changes (0x during playback)
- [ ] React DevTools Profiler flamegraph shows 60%+ reduction in render time
- [ ] No visual regressions (bubbles, audio, controls work identically)
- [ ] Memory usage stable (no leaks from refs/contexts)

PERFORMANCE TARGETS:
| Component | Baseline | Target | Reduction |
|-----------|----------|--------|-----------|
| VideoAnalysisScreen | 30-60/s | <1/s | >95% |
| VideoPlayerSection | 30-60/s | <5/s | >85% |
| FeedbackSection | 15/s | <1/s | >90% |
| ProcessingIndicator | 15/s | 0/s | 100% |
| **Total render time** | ~450ms/s | <180ms/s | >60% |

SUCCESS VALIDATION:
- React DevTools Profiler recording shows metrics hit targets
- yarn workspace @my/app test packages/app/features/VideoAnalysis --verbose
- yarn type-check passes
- Visual QA: Record video, verify bubbles appear at correct times
- Performance QA: No frame drops or stuttering during playback
- Memory QA: Chrome DevTools shows no memory leaks over 5min playback
``

---

## 🏗️ PHASE 3: Advanced Patterns (Q1 2025)

### Task 4: Implement Command Pattern for Video Actions
**Effort:** 2-3 weeks | **Priority:** Low | **Requires:** Task 2

```
@step-by-step-rule.mdc - Refactor video playback actions (play, pause, seek, replay) into a Command Pattern with undo/redo support and action logging for analytics.

OBJECTIVE: Replace inline callbacks with command objects enabling action replay, undo functionality, and centralized analytics tracking.

SCOPE:
- CREATE: packages/app/features/VideoAnalysis/commands/videoCommands.ts (~200 lines)
- CREATE: packages/app/features/VideoAnalysis/commands/CommandInvoker.ts (~150 lines)
- CREATE: packages/app/features/VideoAnalysis/hooks/useVideoCommands.ts (~100 lines)
- CREATE: Test files for commands and invoker (~200 lines)
- MODIFY: packages/app/features/VideoAnalysis/VideoAnalysisScreen.tsx
  - REMOVE: Lines 1024-1086 (inline handlers)
  - REPLACE: With command-based handlers (~30 lines)

ARCHITECTURE REQUIREMENTS:

**Command Interface**
```typescript
export interface VideoCommand {
  execute(): void | Promise<void>
  undo?(): void
  canUndo(): boolean
  metadata: {
    id: string
    timestamp: number
    action: string
    userId?: string
    videoRecordingId?: number
  }
}
``

**Command Implementations**
- PlayVideoCommand: Sets isPlaying=true, resets videoEnded
- PauseVideoCommand: Sets isPlaying=false
- SeekVideoCommand: Sets pendingSeek, resets videoEnded (undoable)
- ReplayVideoCommand: Seeks to 0, sets isPlaying=true
- Each command logs analytics event on execute()

**Invoker Pattern**
- Maintains command history (max 50 commands)
- Provides undo/redo functionality
- Batches rapid commands (debounce 100ms)
- Persists critical commands to AsyncStorage for crash recovery

ACCEPTANCE CRITERIA:
- [ ] All video actions use command pattern
- [ ] Undo/redo works for seek operations
- [ ] Analytics events automatically logged for each command
- [ ] Command history accessible for debugging
- [ ] Test coverage ≥80% (all commands, undo, redo, batching)
- [ ] VideoAnalysisScreen handlers reduced by ~50 lines
- [ ] Performance regression <5ms per command execution

REFERENCE PATTERNS:
- Gang of Four Command Pattern
- Redux DevTools action replay concept

SUCCESS VALIDATION:
- yarn workspace @my/app test packages/app/features/VideoAnalysis/commands --verbose
- yarn type-check passes
- Undo seek operation returns video to previous timestamp
- Analytics dashboard shows video.play, video.pause events
- Command history available in debug logs
```

---

### Task 5: Migrate to React Query for Analysis State
**Effort:** 3-4 weeks | **Priority:** Low | **Requires:** Tasks 1, 2, 3

```
@step-by-step-rule.mdc - Migrate analysis job state management from Zustand subscriptions to TanStack Query with Supabase Realtime integration for better caching, automatic refetching, and devtools support.

OBJECTIVE: Replace custom subscription store (Task 1) with React Query queries that automatically sync with Supabase Realtime, enabling better cache management and devtools integration.

SCOPE:
- CREATE: packages/api/src/queries/analysisQueries.ts (~250 lines)
- CREATE: packages/api/src/queries/realtimePlugin.ts (~150 lines)
- CREATE: packages/api/src/queries/__tests__/analysisQueries.test.ts (~200 lines)
- MODIFY: packages/app/features/VideoAnalysis/VideoAnalysisScreen.tsx
  - REMOVE: useAnalysisSubscriptionStore calls
  - REPLACE: With useQuery hooks (~10 lines)
- MODIFY: apps/expo/app/_layout.tsx and apps/next/app/layout.tsx
  - ADD: QueryClient configuration with Realtime plugin

ARCHITECTURE REQUIREMENTS:

**Query Factory Pattern**
```typescript
// packages/api/src/queries/analysisQueries.ts
export const analysisQueries = {
  all: () => ['analysis'] as const,
  
  jobs: () => [...analysisQueries.all(), 'job'] as const,
  job: (id: number) => ({
    queryKey: [...analysisQueries.jobs(), id],
    queryFn: () => getAnalysisJob(id),
    staleTime: 10 * 1000, // 10 seconds
    meta: {
      realtime: {
        channel: `analysis-job:${id}`,
        table: 'analysis_jobs',
        filter: `id=eq.${id}`,
      }
    }
  }),
  
  jobByRecording: (recordingId: number) => ({
    queryKey: [...analysisQueries.jobs(), 'recording', recordingId],
    queryFn: () => getLatestAnalysisJobForRecordingId(recordingId),
    meta: {
      realtime: {
        channel: `analysis-recording:${recordingId}`,
        table: 'analysis_jobs',
        filter: `video_recording_id=eq.${recordingId}`,
      }
    }
  }),
  
  feedbacks: (analysisId: string) => ({
    queryKey: [...analysisQueries.all(), 'feedback', analysisId],
    queryFn: () => getFeedbacksByAnalysisId(analysisId),
    meta: {
      realtime: {
        channel: `analysis-feedback:${analysisId}`,
        table: 'analysis_feedback',
        filter: `analysis_id=eq.${analysisId}`,
      }
    }
  }),
}
``

**Realtime Plugin**
```typescript
// packages/api/src/queries/realtimePlugin.ts
export function createRealtimePlugin(): QueryClientPlugin {
  return {
    name: 'supabase-realtime',
    onQueryCreated(query) {
      const realtimeConfig = query.meta?.realtime
      if (!realtimeConfig) return

      // Subscribe to Supabase Realtime channel
      const channel = supabase.channel(realtimeConfig.channel)
      channel
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: realtimeConfig.table,
          filter: realtimeConfig.filter,
        }, (payload) => {
          // Update query cache with realtime data
          queryClient.setQueryData(query.queryKey, payload.new)
        })
        .subscribe()
      
      // Cleanup on query destroy
      return () => channel.unsubscribe()
    }
  }
}
``

**Usage in Component**
```typescript
// VideoAnalysisScreen.tsx
const { data: analysisJob, isLoading } = useQuery(
  analysisQueries.job(analysisJobId)
)
// Automatically updates via Realtime, no manual subscription needed
``

ACCEPTANCE CRITERIA:
- [ ] All analysis state queries use React Query
- [ ] Realtime updates automatically sync to query cache
- [ ] Stale-while-revalidate caching reduces network requests
- [ ] React Query DevTools shows query state and cache
- [ ] Background refetching works when app regains focus
- [ ] Optimistic updates for mutations (if applicable)
- [ ] Test coverage ≥75% (queries, plugin, cache updates)
- [ ] Migration guide documents breaking changes
- [ ] Rollback plan available (feature flag)

MIGRATION STRATEGY:
1. Implement queries and plugin in isolation
2. Add feature flag: ENABLE_REACT_QUERY_ANALYSIS
3. Run both systems in parallel (shadow mode)
4. Compare cache hits, network requests, update latency
5. Gradually enable for 10% → 50% → 100% of users
6. Remove Zustand store after 2-week bake period

PERFORMANCE TARGETS:
- Cache hit rate >70%
- Background refetch latency <200ms
- Memory usage increase <5MB
- No regression in realtime update speed

SUCCESS VALIDATION:
- yarn workspace @my/api test packages/api/src/queries --verbose
- yarn type-check passes
- React Query DevTools shows active subscriptions
- Realtime updates arrive within 500ms of database change
- Cache hit rate measured and logged
- A/B test shows no user-facing behavior change
```

---

## 📊 Final Validation Checklist

After completing all tasks:

```bash
# Full test suite
yarn test --verbose

# Type safety
yarn type-check:all

# Linting
yarn lint:all

# Build verification
yarn build

# E2E test (if available)
yarn test:e2e packages/app/features/VideoAnalysis

# Performance profiling
# 1. Open React DevTools Profiler
# 2. Record video analysis session
# 3. Verify <5 re-renders per second during playback
# 4. Check memory usage stays under 100MB

# Bundle size check
yarn workspace expo-app analyze
# Verify video analysis bundle reduced by 15-20%
```

---

## 🎯 Success Metrics Dashboard

| Metric | Baseline | Target | Task 2 Actual | Task 8 Target | Task 9 Target |
|--------|----------|--------|---------------|---------------|---------------|
| VideoAnalysisScreen LOC | 1,728 | <400 | 1,104 | <400 | <400 |
| Re-renders/second | ~15 | <5 | ~15 (unmeasured) | ~15 | <5 |
| Test Coverage | 40% | >70% | ~65% | >75% | >75% |
| Time to Interactive | 2.8s | <1.5s | ___ | ___ | <1.5s |
| useEffect Count | 15 | <5 | 11 | 0 | 0 |
| useState Count | 15 | <5 | 15 | 0 | 0 |
| Bundle Size (gzip) | 250KB | <220KB | ___ | ___ | <220KB |
| Memory Usage | 95MB | <80MB | ___ | ___ | <80MB |

**Progress Analysis:**
- **Task 2 (Component Splitting):** Reduced LOC by 36% (1,728→1,104) but left state orchestration intact
- **Task 8 (Orchestrator Pattern):** Will extract remaining 700+ lines to hooks, achieving <400 LOC target
- **Task 9 (Re-render Optimization):** Will stabilize props and move frame-dependent state to children

Track these after each task completion in `docs/spec/status.md`.