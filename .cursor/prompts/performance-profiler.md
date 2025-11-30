# Performance Profiler Prompt

## Objective
Systematically investigate `.trace` files, heap snapshots, and source code to identify all performance bottlenecks and optimization opportunities. Generate actionable fixes with measurable impact.

---

## Phase 1: Trace File Analysis

### 1.1 Collect Trace Metadata
- **Trace duration**: Record start/end times and total runtime
- **Platform**: iOS/Android native? Web? Simulator?
- **Device specs**: CPU, RAM, OS version (if available)
- **Operation context**: What was running? (startup, screen transition, video playback, etc.)
- **Recording method**: Instruments/Xcode, Chrome DevTools, manual RN profiler

### 1.2 Parse Trace File
```
xctrace export [trace-path] --toc
xctrace export [trace-path] --xpath '//os-log-item' > logs.xml
```

Extract key events:
- **App startup**: Time to first screen render
- **Screen transitions**: Navigation push/pop timings
- **Rendering frames**: Frame rate, dropped frames, jank
- **Memory allocations**: Peak usage, leaks, churn
- **GC events**: Pause durations, frequency
- **Thread activity**: Main thread blocking, dispatch_async delays
- **Network calls**: Request/response times, payload sizes
- **File I/O**: Disk access patterns, sync blocking

### 1.3 Identify Critical Sections
- **Hot paths**: > 16ms duration (exceeds 60 FPS frame budget)
- **Stalls**: Main thread blocks > 100ms
- **Memory spikes**: Sudden allocations > 50MB
- **Repeated work**: Same operations in loops
- **Contention**: Lock waits, queue congestion

---

## Phase 2: React Native Performance Analysis

### 2.1 Render Performance (JavaScript Thread)
Check trace for:
- **Component renders**: Duration per component type
- **Reconciliation**: React tree diffing overhead
- **Layout calculations**: Yoga measurements
- **Bridge traffic**: JS → Native communication overhead
- **Animated values updates**: State churn from progress events, animated values

**Instruments to use:**
- Xcode → Profile → App Launch or System Trace
- React DevTools Profiler (web)
- Hermes debugger timeline (native)

### 2.2 Bridge Performance (JS ↔ Native)
- Count bridge message batches
- Measure serialization overhead
- Identify redundant or excessive bridge calls
- Check TurboModule (New Architecture) call latency vs. legacy bridge

### 2.3 Memory Analysis
- **Heap dumps**: Compare baseline vs. under-load
- **Allocations**: Growth over time, peak usage
- **Retained objects**: Closures, event listeners, circular refs
- **GC pressure**: Frequency, pause times
- **String interning**: Duplicate strings
- **Image caching**: Bitmap memory consumption

Check for:
```typescript
// ❌ BAD: Creates new object on every render
const handlers = { onPress: () => {} };  // New ref each render

// ✅ GOOD: Memoized callback
const onPress = useCallback(() => {}, []);
```

### 2.4 Thread Activity
- **Main thread**: Should be < 16ms per frame (60 FPS)
- **Shadow thread**: Layout calculations
- **Module loading thread**: Lazy requires
- **Network thread**: Requests/responses
- **Serial/concurrent dispatch queues**: Potential contention

---

## Phase 3: Code-Level Investigation

### 3.1 Component Render Cascades
Use React DevTools or WDYR (Why Did You Render):

```typescript
// ❌ ANTI-PATTERN: Selector returns new object every render
const setters = useStore((state) => ({
  setA: state.setA,
  setB: state.setB,  // New object → re-render even if unchanged
}))

// ✅ CORRECT: Select individual fields
const setA = useStore((state) => state.setA);
const setB = useStore((state) => state.setB);
```

Checklist:
- [ ] Are parent re-renders cascading to children unnecessarily?
- [ ] Are Zustand/Context selectors creating new objects?
- [ ] Are event handlers created inline (non-memoized)?
- [ ] Are expensive computations in render?

### 3.2 State Management Churn
- **TanStack Query flags**: `isFetching`, `dataUpdatedAt`, `isLoading` trigger re-renders on every polling tick
- **Fast-changing state**: Progress updates from video playback, animations
- **Implicit dependencies**: Closures capturing stale vars

Pattern:
```typescript
// ❌ BAD: Screen re-renders on every flag change
const analysisState = useAnalysisState();  // All flags + data
return <VideoAnalysisScreen state={analysisState} />;

// ✅ GOOD: Decouple via store, screen subscribes to meaningful data only
const feedbackItems = useAnalysisStore((s) => s.feedbackItems);
const isProcessing = useAnalysisStore((s) => s.isProcessing);
return <VideoAnalysisScreen feedbackItems={feedbackItems} isProcessing={isProcessing} />;
```

### 3.3 Expensive Operations on Main Thread
Search for:
- **Synchronous file I/O**: `readFileSync`, `writeFileSync`
- **Large computations**: Image processing, sorting huge arrays, regex matching
- **Unthrottled event handlers**: `onScroll`, `onLayout`, `onProgress`
- **Unbounded loops**: `map()`, `filter()`, `reduce()` on large datasets

Example:
```typescript
// ❌ BAD: Updates state every 250ms during video progress
const onProgress = (e: OnProgressData) => {
  setDisplayTime(e.currentTime);  // setState on main thread
};

// ✅ GOOD: Use ref + selective updates or Zustand with throttling
const displayTimeRef = useRef(0);
const onProgress = useCallback((e: OnProgressData) => {
  displayTimeRef.current = e.currentTime;
  if (shouldUpdate()) {
    setDisplayTime(e.currentTime);
  }
}, []);
```

### 3.4 Memory Leaks & Retention
Check for:
- **Event listeners** not unsubscribed: `addEventListener` without `removeEventListener`
- **Timers** not cleared: `setInterval`, `setTimeout` without `clearInterval`/`clearTimeout`
- **Subscriptions** not unsubscribed: RxJS, Apollo, custom stores
- **Circular references**: Parent → child → parent
- **Cached objects**: Maps/objects growing unbounded

Pattern:
```typescript
// ❌ BAD: Listener never removed
useEffect(() => {
  stream.subscribe((data) => setData(data));
}, []);

// ✅ GOOD: Cleanup in useEffect return
useEffect(() => {
  const subscription = stream.subscribe((data) => setData(data));
  return () => subscription.unsubscribe();
}, []);
```

### 3.5 Asset & Image Performance
- **Image sizes**: Original vs. rendered dimensions
- **Format**: WebP/AVIF for web, HEIC/JPG for native
- **Lazy loading**: Is content below fold loaded eagerly?
- **Thumbnail generation**: CPU-intensive on main thread?
- **Caching headers**: CDN cache hit rates

### 3.6 Animation Performance
- **60 FPS guarantee**: Use Reanimated shared values + `runOnUI` or native driver
- **Expensive animated values**: Parsing, interpolation
- **Gesture handling**: Large gesture handler arrays
- **Frame-by-frame updates**: `requestAnimationFrame` overhead

Pattern (Reanimated):
```typescript
// ❌ BAD: Direct write on JS thread (300ms+ delay)
sharedValue.value = newValue;

// ✅ GOOD: Use runOnUI for instant sync on UI thread
runOnUI(() => {
  'worklet';
  sharedValue.value = newValue;
})();
```

---

## Phase 4: Platform-Specific Issues

### 4.1 iOS Specific
- **Metal rendering**: GPU utilization
- **Main thread lock**: Instrument → System Trace → Main Thread
- **Memory pressure**: Can trigger app suspension
- **Reachability**: Network state changes

### 4.2 Android Specific
- **ANR (Application Not Responding)**: Main thread blocked > 5s
- **GC pauses**: Dalvik vs. ART differences
- **Jank**: Frame drops, janky scrolling
- **Battery drain**: Excessive wakeups, CPU activity

### 4.3 Web Specific
- **Bundle size**: Gzipped JS/CSS overhead
- **Time to Interactive (TTI)**: Script parsing + execution
- **Layout thrashing**: Read-write-read DOM patterns
- **Memory leaks**: Event listeners, timers in SPA navigation

---

## Phase 5: Metrics & Diagnostics

### 5.1 Baseline Measurements
Collect before fixing:
```
Metric                    | Baseline  | Target    | Unit
========================  | ========= | ========= | ======
App Startup               | XXXms     | <2500ms   | ms
Screen Transition         | XXXms     | <300ms    | ms
Video Playback FPS        | XX        | >55       | fps
Memory Peak (Startup)     | XXXMB     | <200MB    | MB
Memory Peak (Screen)      | XXXMB     | <300MB    | MB
GC Pause (60 FPS)         | XXms      | <2ms      | ms
Main Thread Utilization   | XX%       | <80%      | %
Bridge Calls/sec          | XXX       | <100      | calls/s
```

### 5.2 Trace File Inspection Commands
```bash
# Export trace to XML for parsing
xctrace export [path].trace --toc > toc.xml

# Extract specific events
xctrace export [path].trace --xpath '//cpu-core/item' > cpu.xml

# Generate HTML report
xctrace export [path].trace --output report.html

# System metrics
xctrace export [path].trace --xpath '//memory-allocations' > memory.xml
```

### 5.3 Heap Analysis
```bash
# Heap snapshot from simulator or device
# iOS: Xcode → Debug → View Memory Graph
# Android: Android Studio → Profiler → Memory

# Compare snapshots: baseline vs. under-load
# Look for:
# - Retained objects not released
# - Growing collections
# - Circular references
# - Large bitmaps
```

---

## Phase 6: Root Cause Analysis Template

For each bottleneck, document:

```markdown
### Issue: [Name]
**Location**: [File:Line] or [Component Name]
**Symptom**: [What was slow/broken in trace]
**Impact**: +XXms, +XXMB, XX% FPS drop
**Root Cause**: [Why it happens]
**Severity**: 🔴 Critical | 🟡 High | 🟢 Medium | ⚪ Low

**Evidence**:
- Trace shows: [specific finding]
- Code shows: [problematic pattern]
- Reproduction**: [steps to reproduce]

**Fix**:
```typescript
// Before
[bad code]

// After
[corrected code]
```

**Verification**:
- [ ] Baseline measurement < target
- [ ] No regressions in other metrics
- [ ] Code review approved
- [ ] Test added (if applicable)
- [ ] Performance validated in production
```

---

## Phase 7: Investigation Checklist

### Startup Performance
- [ ] Trace app launch from cold start
- [ ] Identify first-render bottleneck
- [ ] Check module loading times
- [ ] Measure font loading
- [ ] Verify lazy imports working
- [ ] Check network requests on startup

### Screen Transition
- [ ] Measure navigation push/pop time
- [ ] Check for blocking I/O
- [ ] Verify animations are smooth (60 FPS)
- [ ] Monitor memory delta before/after
- [ ] Look for stale event listeners

### Video Playback
- [ ] Trace frame-by-frame updates
- [ ] Check `onProgress` call frequency
- [ ] Measure progress bar gesture overhead
- [ ] Verify video seek latency
- [ ] Monitor memory during playback

### Data Fetching
- [ ] Measure network latency
- [ ] Check request batching
- [ ] Verify response caching
- [ ] Look for N+1 queries
- [ ] Monitor connection pooling

### Rendering & Layout
- [ ] Check for layout thrashing (repeated measurements)
- [ ] Verify FlatList optimization (keyExtractor, getItemLayout)
- [ ] Look for expensive re-renders
- [ ] Check shadow thread blocking
- [ ] Measure Yoga layout time

### Memory
- [ ] Identify peak allocation
- [ ] Check for leaks (compare snapshots)
- [ ] Verify image cache sizing
- [ ] Look for unbounded collections
- [ ] Check for retained closures

---

## Investigation Workflow

1. **Collect trace** → Reproduce slow operation, record `.trace` file
2. **Parse metadata** → Duration, device, platform, operation type
3. **Extract events** → Identify hot paths, stalls, memory spikes
4. **React analysis** → Component renders, state churn, bridge traffic
5. **Code review** → Anti-patterns, selectors, event handlers
6. **Root cause** → Single point of failure identified
7. **Fix & verify** → Measure improvement, validate no regressions
8. **Document** → Add to performance baseline, close loop

---

## Output Format

### Summary
```
Trace File: [name]
Duration: [Xms]
Critical Issues Found: [N]
Total Impact: [Xms / YMB / Z% FPS]
```

### Issues Table
```
| Severity | Location | Issue | Impact | Fix Status |
|----------|----------|-------|--------|------------|
| 🔴 | ComponentA.tsx:42 | State churn | +250ms | ✅ Fixed |
| 🟡 | useVideoPlayer.ts:15 | Unthrottled updates | +150ms | 🟡 Pending |
```

### Actionable Fixes (Prioritized by Impact)
1. [Fix A] - Expected impact: -XXms, +YY% FPS
2. [Fix B] - Expected impact: -YYms, -ZZRMB
3. [Fix C] - Expected impact: -ZZms, validate no regressions












