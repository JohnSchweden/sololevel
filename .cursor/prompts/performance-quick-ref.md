# Performance Investigation Quick Reference

Fast lookup guide for common patterns, tools, and fixes. Use with `.trace` files and code inspection.

---

## 🎯 Quick Diagnosis Matrix

### Symptom: App Freezes for 1-2 seconds
| Likely Cause | Check | Fix |
|--------------|-------|-----|
| State update cascade | WDYR: Are parent renders cascading? | Zustand store selectors |
| Heavy computation on main thread | Instruments: Is main thread blocked? | Move to background thread or split computation |
| GC pause | Heap dump: Any memory spike? | Reduce allocations, batch updates |
| Native module call | Trace: Bridge serialization time? | Batch calls, reduce payload size |

### Symptom: Memory grows over time
| Likely Cause | Check | Fix |
|--------------|-------|-----|
| Event listeners not removed | Heap dump: Duplicate listeners? | Add cleanup in useEffect |
| Large cached objects | Memory profiler: Retained size? | Implement size limits on cache |
| Closure capturing vars | Check: Are closures holding refs? | Use useCallback with empty deps or move outside |
| Image cache unbounded | Check: Image manager cache size? | Set maxSize limit, implement LRU |

### Symptom: FPS drops during scrolling/animation
| Likely Cause | Check | Fix |
|--------------|-------|-----|
| Renders on scroll | WDYR: Does scroll trigger renders? | Virtualize list, memoize items |
| Animated value writes on JS thread | Check: Using `sharedValue.value =`? | Use `runOnUI(() => { sharedValue.value = X })()` |
| Layout thrashing | Instruments: Repeated measurements? | Batch DOM reads/writes, use Yoga efficiently |
| Thread contention | Check: Are workers blocked? | Load balance across threads |

---

## 🔧 Common Fixes (Copy-Paste Safe)

### Fix #1: Decouple State Churn
**When**: Screen re-renders on every TanStack Query flag change
**Impact**: -200ms, -50MB memory churn

```typescript
// ❌ BEFORE
const analysisState = useAnalysisState();  // Full object, re-creates on flag changes
return <VideoAnalysisScreen state={analysisState} />;

// ✅ AFTER
// 1. Create store (one-time)
export const useAnalysisStore = create((set) => ({
  phase: 'idle',
  feedbackItems: [],
  isProcessing: false,
  error: null,
  
  updateData: (data) => set(data),
}));

// 2. Sync hook to store
function useAnalysisState() {
  const analysisQuery = useQuery({...});
  
  useEffect(() => {
    useAnalysisStore.setState({
      phase: analysisQuery.isPending ? 'processing' : 'done',
      feedbackItems: analysisQuery.data?.feedbacks || [],
      isProcessing: analysisQuery.isPending,
      error: analysisQuery.error,
    });
  }, [analysisQuery.data, analysisQuery.isPending, analysisQuery.error]);
}

// 3. Screen subscribes to store only
const feedbackItems = useAnalysisStore((s) => s.feedbackItems);
const isProcessing = useAnalysisStore((s) => s.isProcessing);
return <VideoAnalysisScreen feedbackItems={feedbackItems} isProcessing={isProcessing} />;
```

### Fix #2: Throttle Progress Updates
**When**: Video player updates state 4x/sec, causing re-render cascade
**Impact**: +150ms FPS gain, -60% CPU usage

```typescript
// ❌ BEFORE
const onProgress = (e: OnProgressData) => {
  setDisplayTime(e.currentTime);  // Every 250ms
};

// ✅ AFTER: Ref + selective setState
const displayTimeRef = useRef(0);
const lastUpdateRef = useRef(0);

const onProgress = useCallback((e: OnProgressData) => {
  displayTimeRef.current = e.currentTime;
  
  // Update state only every 1 second
  if (Math.abs(e.currentTime - lastUpdateRef.current) >= 1) {
    setDisplayTime(e.currentTime);
    lastUpdateRef.current = e.currentTime;
  }
}, []);

// If you need real-time progress bar, read ref in render
const displayTime = displayTimeRef.current || 0;
```

### Fix #3: Fix Event Listener Memory Leak
**When**: Screen visited 10+ times causes app crash
**Impact**: Eliminates memory leak, +50MB cleanup per cycle

```typescript
// ❌ BEFORE
useEffect(() => {
  videoPlayer.ref.addEventListener('progress', onProgress);
  // Missing cleanup!
}, [onProgress]);

// ✅ AFTER
useEffect(() => {
  const handler = (e: OnProgressData) => onProgress(e);
  videoPlayer.ref.addEventListener('progress', handler);
  
  return () => {
    videoPlayer.ref.removeEventListener('progress', handler);
  };
}, [onProgress]);
```

### Fix #4: Zustand Selector Anti-Pattern
**When**: useStore selector returns new object every render
**Impact**: Eliminates unnecessary re-renders, -50ms per update

```typescript
// ❌ BEFORE: New object → re-render every time
const handlers = useStore((state) => ({
  onStart: state.onStart,
  onEnd: state.onEnd,
  onUpdate: state.onUpdate,
}));

// ✅ AFTER: Select individually
const onStart = useStore((state) => state.onStart);
const onEnd = useStore((state) => state.onEnd);
const onUpdate = useStore((state) => state.onUpdate);

// Or use shallow equality
import { shallow } from 'zustand/react/shallow';
const handlers = useStore(
  (state) => ({ onStart: state.onStart, onEnd: state.onEnd }),
  shallow
);
```

### Fix #5: Reanimated Shared Value Updates
**When**: Animated value writes on JS thread take 300ms+ to flush
**Impact**: -300ms latency, <16ms instant sync

```typescript
// ❌ BEFORE: JS thread write (300ms+ delay)
sharedValue.value = newValue;

// ✅ AFTER: UI thread write (instant)
runOnUI(() => {
  'worklet';
  sharedValue.value = newValue;
})();
```

### Fix #6: Virtualize Long Lists
**When**: FlatList with 100+ items causes jank
**Impact**: +500% FPS improvement, -80% memory

```typescript
// ✅ Already optimized pattern for FlatList
<FlatList
  data={items}
  keyExtractor={(item, idx) => item.id || idx.toString()}
  renderItem={({ item }) => <ListItem item={item} />}
  getItemLayout={(data, index) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  })}
  initialNumToRender={10}
  maxToRenderPerBatch={10}
  updateCellsBatchingPeriod={50}
  removeClippedSubviews
/>
```

### Fix #7: Defer Non-Critical Prefetching
**When**: Prefetch blocks main thread on mount
**Impact**: First screen renders at 60 FPS instead of 15 FPS

```typescript
// ❌ BEFORE: Blocks main thread
useEffect(() => {
  queryClient.prefetchQuery({
    queryKey: ['videos'],
    queryFn: fetchHistoricalData,  // Heavy file I/O
  });
}, []);

// ✅ AFTER: Deferred to background
useEffect(() => {
  const timeout = setTimeout(() => {
    queryClient.prefetchQuery({
      queryKey: ['videos'],
      queryFn: fetchHistoricalData,
    });
  }, 100);
  
  return () => clearTimeout(timeout);
}, []);
```

### Fix #8: Memoize Expensive Components
**When**: Complex component re-renders on every parent update
**Impact**: -300ms per parent render cycle

```typescript
// ✅ Use React.memo for expensive components
export const ExpensiveComponent = React.memo(
  function ExpensiveComponent({ data, onPress }) {
    return (
      // Complex rendering
    );
  },
  (prevProps, nextProps) => {
    // Return true if NO re-render needed (opposite of normal)
    return prevProps.data === nextProps.data && 
           prevProps.onPress === nextProps.onPress;
  }
);

// Simpler: Use React.memo with stable props
const MyComponent = React.memo(({ id, title }) => {
  return <Text>{title}</Text>;
});

// Avoid in: non-expensive components, props that change every render
```

---

## 📊 Measurement Commands (Copy-Paste)

### Measure App Startup Time
```bash
# Cold start: kill app first
pkill -f "yarn native"

# Warm start
yarn native

# Record trace from Xcode
# Xcode → Product → Profile → System Trace
# Run app, stop trace after home screen appears

# Export metrics
xctrace export trace.trace --xpath '//launch-measurement' > startup.xml
```

### Check Memory Leaks
```bash
# Device: Xcode → Debug → View Memory Graph
# Compare snapshots:
#  1. Open screen
#  2. Interact (scroll, tap, play)
#  3. Close screen
#  4. Force GC (click GC button)
#  5. Take snapshot
#  6. Repeat 5x
# 
# If purple objects grow → memory leak
# If they stay flat → no leak
```

### Identify Hot Functions
```bash
# Instruments → Time Profiler → Record
# Run operation for 5 seconds
# Stop → Sort by time spent
# Top functions = optimization targets
```

### Check Thread Blocking
```bash
# Xcode → Instruments → System Trace
# Look for red bands on main thread
# Hover over → see what function blocked it
# If > 100ms → critical issue
```

---

## 🚀 Optimization Priority Checklist

### P0: Startup (First Paint)
- [ ] Lazy load screens that aren't critical
- [ ] Defer TanStack Query prefetch 100ms+ 
- [ ] Remove blocking I/O from mount
- [ ] Reduce bundle size (tree-shake unused)

### P1: Navigation (Screen Transitions)
- [ ] Memoize route components
- [ ] Avoid heavy computation in route handlers
- [ ] Preload assets before transition
- [ ] Use imperative seeks for low latency

### P2: Video Playback (Smooth Interaction)
- [ ] Throttle progress updates to 1x/sec
- [ ] Use Reanimated for gesture animations
- [ ] Keep progress bar UI in ref, update selectively
- [ ] Decouple video state from screen state

### P3: Data Loading (Perception of Speed)
- [ ] Implement optimistic updates (instant feedback)
- [ ] Use skeleton screens while loading
- [ ] Batch network requests
- [ ] Cache aggressively with proper invalidation

### P4: Memory (Long Sessions)
- [ ] Audit event listeners for cleanup
- [ ] Limit image cache size (implement LRU)
- [ ] Monitor for closure leaks
- [ ] Track retained object counts over time

---

## 🔍 Investigation Workflow

### Step 1: Reproduce Issue
```bash
# With profiling enabled
yarn native --profile

# Interact to reproduce slowness
# Stop after issue visible

# Save trace for analysis
```

### Step 2: Identify Bottleneck
```
Q: Is it startup, navigation, or interaction?
→ Check trace: Look at main thread timeline

Q: Is it CPU-bound or I/O-bound?
→ Check: If network traffic → I/O. If CPU spiked → CPU-bound.

Q: Is it a render cascade?
→ Check WDYR: Count renders during operation

Q: Is it a memory issue?
→ Check heap: Compare baseline vs. peak
```

### Step 3: Find Root Cause
```typescript
// Checklist:
// [ ] Is state being recreated on every render?
// [ ] Are event handlers running too frequently?
// [ ] Are event listeners being removed on unmount?
// [ ] Are large objects being passed as props?
// [ ] Are selectors returning new objects?
// [ ] Is expensive computation in render?
// [ ] Is there blocking I/O on main thread?
// [ ] Are animations using JS thread instead of UI thread?
```

### Step 4: Implement Fix
- Pick fix from "Common Fixes" section above
- Validate no TypeScript/lint errors
- Test on real device
- Compare before/after trace

### Step 5: Verify Improvement
```bash
# Baseline
yarn native
# Record trace: trace-before.trace
# Run operation, note metrics

# With fix
git apply fix.patch
yarn native
# Record trace: trace-after.trace
# Run operation, compare metrics

# Export and diff
xctrace export trace-before.trace --toc > before.xml
xctrace export trace-after.trace --toc > after.xml
```

---

## 📚 Related Documentation

- **Performance Budget**: `docs/spec/performance-budgets.md`
- **Memory Analysis**: `docs/debugging/allocations-startup-deep-analysis.md`
- **Video Playback Issues**: `docs/debugging/video-playback-tuning.md`
- **Zustand Patterns**: `.cursor/rules/features/data-state-management.mdc`
- **React Optimization**: `.cursor/rules/quality/performance.mdc`

---

## 🤔 FAQ

**Q: How do I know if my fix worked?**
A: Measure before/after using same operation on same device. Target: expected improvement from description. Validate no regressions in other metrics.

**Q: Should I memoize all components?**
A: No. Memoize only expensive components (render > 50ms) with stable props. Memoizing cheap components adds overhead.

**Q: When should I use refs vs. state?**
A: Refs for real-time values that don't need visual updates. State for values that render. Hybrid: ref for tracking, setState selectively.

**Q: Why is my list still janky after virtualization?**
A: Check: Are items expensive? Use renderToHardwareTextureAndroid (Android), or React.memo each item, or increase initialNumToRender.

**Q: How do I prevent memory leaks?**
A: 1) Always cleanup event listeners/subscriptions in useEffect return. 2) Check heap dumps for retained objects. 3) Avoid closures capturing large objects.

---

## 🛠️ Tools Pocket Reference

| Tool | Purpose | Command |
|------|---------|---------|
| Xcode Instruments | CPU/Memory/Thread profiling | `cmd+I` or Product → Profile |
| React DevTools Profiler | Render times by component | Chrome DevTools → React → Profiler |
| Why Did You Render (WDYR) | Detect unnecessary re-renders | See `wdyr.ts` configuration |
| Metro DevTools | RN bridge/memory on device | `cmd+D` → DevTools |
| Android Studio Profiler | Android-specific metrics | Tools → Profiler |
| xctrace CLI | Parse/export Xcode traces | `xctrace export trace.trace ...` |












