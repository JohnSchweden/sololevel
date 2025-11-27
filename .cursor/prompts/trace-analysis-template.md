# Trace Analysis & Performance Report Template

Use this template for each performance investigation. Copy, fill, and save in `docs/performance/trace-YYYY-MM-DD.md`.

---

## Investigation Header

```
Date: YYYY-MM-DD
Investigator: [Your name]
Trace File: [filename].trace
Device: [iPhone 15 Pro | Pixel 8 | macOS | Web Safari]
OS Version: [iOS 18 | Android 15 | macOS 15]
Trace Duration: XXXms
Operation Tested: [e.g., "Video playback at 4.1s with feedback tap"]
```

---

## Executive Summary

### Key Findings
- **Primary Bottleneck**: [Component/Function Name]
- **Cause**: [Technical reason]
- **Impact**: [Specific metrics affected]
- **Fix Priority**: 🔴 Critical | 🟡 High | 🟢 Medium

### Metrics Snapshot
| Metric | Before | After | Target | Status |
|--------|--------|-------|--------|--------|
| App Startup | XXXms | YYYms | <2500ms | 🟢/🟡/🔴 |
| Screen Transition | XXms | YYms | <300ms | 🟢/🟡/🔴 |
| Memory Peak | XXXMB | YYYMMB | <300MB | 🟢/🟡/🔴 |
| FPS (Playback) | XX | YY | >55 | 🟢/🟡/🔴 |
| Main Thread Block | XXms | YYms | <16ms | 🟢/🟡/🔴 |

---

## Trace Analysis

### 1. Timeline Overview
```
Operation: [Name]
├─ Phase A: XXXms
│  ├─ Subtask 1: XXms
│  └─ Subtask 2: XXms
├─ Phase B: XXXms
│  ├─ Subtask 1: XXms
│  └─ Subtask 2: XXms
└─ Phase C: XXXms
```

### 2. Hot Paths (>16ms)
List every operation exceeding 60 FPS frame budget:

```
⏱️  250ms   ComponentA render
├─ Reconciliation: 150ms
├─ Layout (Yoga): 80ms
└─ Bridge serialization: 20ms

⏱️  180ms   useVideoPlayer state update
├─ setState call: 5ms
├─ Re-render cascade: 170ms
└─ displayTime prop chain: 5ms

⏱️  95ms    onProgress event handler
├─ Progress calculation: 20ms
├─ State update: 5ms
└─ Re-render: 70ms
```

### 3. Memory Profile
```
Timeline:
├─ Baseline: XXX MB (before operation)
├─ Peak: YYY MB (during operation) — spike of +ZZ MB
├─ After GC: XXX MB (cleanup)
└─ Post-operation: XXX MB (no leak detected | ⚠️ LEAK SUSPECTED)

Allocations by Type:
├─ Bitmaps: XX MB
├─ Strings: XX MB
├─ Objects: XX MB
├─ Retained: XX MB (⚠️ Check for leaks)
```

### 4. Thread Activity
```
Main Thread:
├─ Active: XX%
├─ Blocked: XX%
├─ Max stall: XXms
└─ Status: ✅ Healthy | ⚠️ Occasional jank | 🔴 Blocked

Shadow Thread (Layout):
├─ Yoga measurements: XXms total
├─ Max calculation: XXms
└─ Status: ✅ Healthy | ⚠️ High load

Network Thread:
├─ Requests: N
├─ Avg latency: XXms
└─ Status: ✅ Healthy | ⚠️ Slow

Bridge Traffic:
├─ Messages/sec: XXX
├─ Serialization: XXms total
└─ Status: ✅ Light | ⚠️ Heavy
```

### 5. Frame Analysis (Video/Animation)
```
FPS Distribution:
├─ 60 FPS: XX%
├─ 45-59 FPS: XX%
├─ 30-44 FPS: XX%
└─ <30 FPS: XX% (⚠️ Visible jank)

Dropped Frames:
├─ Count: N
├─ Reason: [Rendering | Layout | GC Pause]
└─ Severity: ✅ Acceptable | 🟡 Minor stutter | 🔴 Visible jank
```

---

## Code Analysis

### 1. Component Render Cascade
```
Root Render:
├─ VideoAnalysisScreen (trigger: stateChange) → 400ms
│  ├─ VideoAnalysisLayout → 350ms
│  │  ├─ VideoPlayerSection → 150ms
│  │  │  ├─ VideoPlayer → 100ms ⚠️ HOT
│  │  │  └─ VideoControls → 50ms
│  │  ├─ FeedbackBubbles → 120ms ⚠️ HOT
│  │  └─ ProcessingIndicator → 80ms
│  └─ SidePanel → 50ms
└─ Re-render due to: [TanStack flag change | progress update | state mutation]
```

**Why it re-renders**: [Root cause explanation]

### 2. State Management Issues
```typescript
// ❌ PROBLEMATIC CODE
const analysisState = useAnalysisState();  // Returns full object
// Every TanStack Query flag change (isFetching, dataUpdatedAt) creates new object ref
// → Triggers VideoAnalysisScreen re-render
// → Component tree cascades (16+ children)
// → Memory churn (new handler/style objects per render)

// Root cause: Screen tightly coupled to query metadata
// Expected re-render frequency: 300+ times during upload
// Actual component update necessity: 2-3 times
```

### 3. Event Handler Churn
```typescript
// ❌ PROBLEMATIC
const onProgress = (e: OnProgressData) => {
  setDisplayTime(e.currentTime);  // Updates state on every event
};
// Frequency: ~4x per second (250ms interval)
// Cost per update: 150-200ms (full re-render cascade)
// Total cost: 4 updates × 150ms = 600ms per second (≈60% CPU)

// ✅ OPTIMIZED
const displayTimeRef = useRef(0);
const onProgress = useCallback((e: OnProgressData) => {
  displayTimeRef.current = e.currentTime;
  if (shouldUpdate(e.currentTime)) {
    setDisplayTime(e.currentTime);
  }
}, []);
// Frequency of setState: 1-2x per second
// Total cost: 2 updates × 20ms = 40ms per second (≈4% CPU)
// Improvement: 93% reduction
```

### 4. Memory Leak Audit
```typescript
// ❌ POTENTIAL LEAK: Event listener not removed
useEffect(() => {
  videoPlayer.current.addEventListener('progress', onProgress);
  // Missing cleanup!
}, [onProgress]);  // onProgress changes every render

// ✅ FIXED
useEffect(() => {
  const handler = (e) => setDisplayTime(e.currentTime);
  videoPlayer.current.addEventListener('progress', handler);
  return () => {
    videoPlayer.current.removeEventListener('progress', handler);
  };
}, []);
```

### 5. Selector Anti-Patterns
```typescript
// ❌ BAD: Returns new object on every render
const handlers = useStore((state) => ({
  onStart: state.onStart,
  onEnd: state.onEnd,
}));

// ✅ GOOD: Select individually
const onStart = useStore((state) => state.onStart);
const onEnd = useStore((state) => state.onEnd);
```

---

## Issues Found

### Issue #1: [Component State Churn]
**File**: `packages/app/features/VideoAnalysis/VideoAnalysisScreen.tsx:42`
**Severity**: 🔴 Critical
**Impact**: +250ms per operation, 300+ unnecessary re-renders

**Root Cause**:
Screen subscribes to full `analysisState` object from `useAnalysisState()`. TanStack Query flags (`isFetching`, `dataUpdatedAt`) change frequently during upload, creating new object reference each time → cascading re-renders.

**Trace Evidence**:
```
Time: 4100ms - User taps feedback
Time: 4105ms - analysisState flag changes (isFetching=true)
Time: 4110ms - VideoAnalysisScreen re-renders (400ms)
Time: 4115ms - analysisState flag changes (dataUpdatedAt updated)
Time: 4120ms - VideoAnalysisScreen re-renders (350ms)
... repeats 10+ times during upload
```

**Fix**:
Move `analysisState` to Zustand store. Screen subscribes only to `feedbackItems` + `phase` + `isProcessing`. Query metadata stays internal.

```typescript
// Before
const analysisState = useAnalysisState();
return <VideoAnalysisScreen state={analysisState} />;

// After
const feedbackItems = useAnalysisStore((s) => s.feedbackItems);
const isProcessing = useAnalysisStore((s) => s.isProcessing);
return <VideoAnalysisScreen feedbackItems={feedbackItems} isProcessing={isProcessing} />;
```

**Verification**:
- [ ] Measure WDYR: zero extra renders on flag changes
- [ ] Memory: -50MB peak during upload
- [ ] FPS: 55+ stable during playback
- [ ] No functional regression

---

### Issue #2: [Event Handler on Hot Path]
**File**: `packages/ui/src/components/VideoAnalysis/VideoControls/hooks/useProgressBarGesture.ts:120`
**Severity**: 🟡 High
**Impact**: +150ms per second, 4 state updates/sec unnecessary

**Root Cause**:
`onProgress` callback updates state on every progress event (250ms interval = 4x/sec). Each update triggers full render cascade (VideoAnalysisScreen → VideoPlayerSection → VideoPlayer → ProgressBar). 150ms overhead × 4 updates = 600ms wasted per second (60% CPU).

**Trace Evidence**:
```
Time: 5000ms - onProgress fires (displayTime: 5.0s)
Time: 5000ms - setState called
Time: 5150ms - Re-render complete
Time: 5250ms - onProgress fires (displayTime: 5.25s)
Time: 5250ms - setState called
Time: 5400ms - Re-render complete
... results in FPS drop to 10-15 during playback
```

**Fix**:
Use ref for real-time tracking, setState only when threshold crossed.

```typescript
// Before
const onProgress = (e: OnProgressData) => {
  setDisplayTime(e.currentTime);
};

// After
const displayTimeRef = useRef(0);
const lastUpdateRef = useRef(0);

const onProgress = useCallback((e: OnProgressData) => {
  displayTimeRef.current = e.currentTime;
  
  // Update state only if 1+ second elapsed
  if (Math.abs(e.currentTime - lastUpdateRef.current) >= 1) {
    setDisplayTime(e.currentTime);
    lastUpdateRef.current = e.currentTime;
  }
}, []);
```

**Verification**:
- [ ] FPS: 55-60 stable during playback
- [ ] Memory: no growth over 5min playback
- [ ] Progress bar smoothness: visual test on device
- [ ] Seek accuracy: manual seek still precise

---

### Issue #3: [Memory Leak: Event Listener]
**File**: `packages/app/features/VideoAnalysis/hooks/useVideoPlayer.ts:88`
**Severity**: 🟡 High
**Impact**: +50MB per 10 screen visits, app crash after ~20 visits

**Root Cause**:
`addEventListener('progress', onProgress)` without cleanup. When component unmounts, listener remains in memory. If component remounts, duplicate listener added. Memory grows unbounded.

**Trace Evidence**:
```
Visit 1: 150MB
Visit 2: 165MB (+15MB)
Visit 3: 180MB (+15MB)
...
Visit 20: 450MB (🔴 crash)
```

**Fix**:
Add cleanup function to useEffect.

```typescript
// Before
useEffect(() => {
  videoPlayer.ref.addEventListener('progress', onProgress);
}, [onProgress]);

// After
useEffect(() => {
  const handleProgress = (e: OnProgressData) => onProgress(e);
  videoPlayer.ref.addEventListener('progress', handleProgress);
  
  return () => {
    videoPlayer.ref.removeEventListener('progress', handleProgress);
  };
}, [onProgress]);
```

**Verification**:
- [ ] Heap dump before/after 10 screen visits: flat line
- [ ] No listener duplicates in memory profiler
- [ ] App stable for 30min session test

---

## Recommendations (Priority Order)

| Priority | Issue | Expected Gain | Effort | Owner |
|----------|-------|---------------|--------|-------|
| 🔴 P0 | State churn | -250ms, +200MB cleanup | 2h | [Name] |
| 🔴 P0 | Memory leak | +50MB per visit fix | 1h | [Name] |
| 🟡 P1 | Event handler | +150ms FPS gain | 1.5h | [Name] |
| 🟢 P2 | Image cache | +20MB → 5MB | 2h | [Name] |

---

## Testing & Validation

### Before/After Comparison
```bash
# Baseline (before fixes)
yarn native
# Record trace: [trace-before.trace]

# With fixes
git apply fixes.patch
yarn native
# Record trace: [trace-after.trace]

# Compare metrics
xctrace export trace-before.trace --toc > before.xml
xctrace export trace-after.trace --toc > after.xml
# Diff the two reports
```

### Validation Checklist
- [ ] All P0 fixes implemented
- [ ] No TypeScript errors: `yarn type-check`
- [ ] No lint errors: `yarn lint`
- [ ] Tests pass: `yarn test`
- [ ] Visual regression test on device
- [ ] Production trace captures improvement
- [ ] No new memory leaks detected
- [ ] FPS stable 55+ during stress test

---

## Follow-Up

### Next Investigation
- [ ] Document in performance baseline
- [ ] Add metrics to CI monitoring
- [ ] Schedule review: [Date]
- [ ] Related traces to analyze: [List]

### Long-Term
- [ ] Set up automated performance regression detection
- [ ] Establish FPS/memory budgets
- [ ] Add perf tests to CI
- [ ] Monthly performance review cadence








