# Re-render Detection Workflow

This guide covers systematic approaches to detecting and diagnosing unnecessary re-renders in React components, with specific notes for React Native.

## Tools Overview

### 1. React DevTools Profiler (Recommended First Step)

**Web:**
- Install React DevTools browser extension
- Open DevTools → Profiler tab
- Click record → interact with app → stop recording
- Analyze Ranked view (shows components by render time)
- Check Flamegraph (shows render tree and timing)

**Native:**
- Install [React DevTools standalone app](https://github.com/facebook/react-devtools)
- Connect to your running app (via Metro bundler)
- Use same workflow as web

**Key Metrics:**
- **Commit Time**: When React finished updating the DOM/UI
- **Render Time**: How long component took to render
- **Component Count**: How many times component rendered

### 2. why-did-you-render (Web-Focused)

**Setup:**
```typescript
// In app entry point (dev only)
import './utils/whyDidYouRender';

// Enable on specific components
Component.whyDidYouRender = true;
```

**Native Limitation:**
why-did-you-render has limited React Native support. For native components, use `useRenderDiagnostics` hook instead.

### 3. useRenderDiagnostics Hook (Cross-Platform)

**Usage:**
```tsx
import { useRenderDiagnostics } from '@app/hooks';

function MyComponent({ data, handlers, config }) {
  const diagnostics = useRenderDiagnostics('MyComponent', { data, handlers, config }, {
    logToConsole: true,
    logOnlyChanges: true,
  });
  
  // Component code...
}
```

**What It Tracks:**
- Which props changed (reference vs content)
- Render count
- Object signature comparisons

### 4. ProfilerWrapper Component (Cross-Platform)

**Usage:**
```tsx
import { ProfilerWrapper, useRenderCount } from '@ui/components/Performance';

function App() {
  return (
    <ProfilerWrapper id="VideoAnalysisLayout" logToConsole>
      <VideoAnalysisLayout {...props} />
    </ProfilerWrapper>
  );
}

// Or use hook to get render count
function MyComponent() {
  const renderCount = useRenderCount('MyComponent');
  // ...
}
```

### 5. Detection Script (Static Analysis)

**Usage:**
```bash
# Scan all packages
node scripts/ops/detect-re-renders.mjs

# Scan specific directory
node scripts/ops/detect-re-renders.mjs packages/app/features/VideoAnalysis
```

**What It Finds:**
- Inline object literals in JSX props
- Hooks returning objects without `useMemo`
- Context values without memoization
- `useEffect` dependencies with unstable references

## Step-by-Step Diagnosis Workflow

### Step 1: Identify Suspect Components

**Using React DevTools Profiler:**
1. Record a session while performing the problematic interaction
2. Check Ranked view → sort by "Time" descending
3. Look for components that:
   - Render frequently (>5 times per interaction)
   - Have high render times (>16ms)
   - Render when they shouldn't (parent didn't change)

### Step 2: Confirm with ProfilerWrapper

Wrap suspect component:
```tsx
<ProfilerWrapper id="SuspectComponent" logToConsole>
  <SuspectComponent {...props} />
</ProfilerWrapper>
```

Check console for render counts and timings.

### Step 3: Trace Prop Changes

Add `useRenderDiagnostics` to component:
```tsx
function SuspectComponent(props) {
  useRenderDiagnostics('SuspectComponent', props, {
    logToConsole: true,
  });
  // ...
}
```

This shows which props changed and whether it's reference-only or content change.

### Step 4: Trace to Source

Use Profiler Flamegraph:
1. Click on suspect component in Flamegraph
2. Trace upward to parent components
3. Identify which parent re-rendered first
4. Check that parent's props/state for unstable references

### Step 5: Run Static Analysis

```bash
node scripts/ops/detect-re-renders.mjs packages/app/features/VideoAnalysis
```

This finds common patterns that cause re-renders.

## Common Patterns & Fixes

### Pattern 1: Inline Object Literals

**Problem:**
```tsx
<ChildComponent config={{ key: 'value' }} />
```

**Fix:**
```tsx
const config = useMemo(() => ({ key: 'value' }), [deps]);
<ChildComponent config={config} />
```

### Pattern 2: Unstable Hook Returns

**Problem:**
```tsx
function useMyHook() {
  return { data, handlers }; // New object every render
}
```

**Fix:**
```tsx
function useMyHook() {
  return useMemo(() => ({ data, handlers }), [data, handlers]);
}
```

### Pattern 3: Unmemoized Context Values

**Problem:**
```tsx
<Context.Provider value={{ theme, user }}>
```

**Fix:**
```tsx
const value = useMemo(() => ({ theme, user }), [theme, user]);
<Context.Provider value={value}>
```

### Pattern 4: Unstable useEffect Dependencies

**Problem:**
```tsx
useEffect(() => {
  // ...
}, [{ key: 'value' }]); // New object every render
```

**Fix:**
```tsx
const deps = useMemo(() => ({ key: 'value' }), []);
useEffect(() => {
  // ...
}, [deps]);
```

## Platform-Specific Notes

### React Native

- Use React DevTools standalone app (not browser extension)
- `ProfilerWrapper` and `useRenderDiagnostics` work identically
- why-did-you-render has limited support → prefer `useRenderDiagnostics`
- Logs may need AsyncStorage persistence for production analysis

### Web

- Full support for all tools
- Browser DevTools Profiler is most powerful
- why-did-you-render works best here

## Example: VideoAnalysisScreen Diagnosis

**Problem:** VideoAnalysisLayout re-renders 30+ times during video playback.

**Diagnosis Steps:**

1. **ProfilerWrapper**: Confirmed 34 renders in 5 seconds
2. **useRenderDiagnostics**: Showed `feedback` prop reference changed every render
3. **Flamegraph**: Traced to `useVideoAnalysisOrchestrator` hook
4. **Source Code**: Found hook returning new object every render without `useMemo`
5. **Fix**: Memoized hook return → renders dropped to ~5

**Result:** 85% reduction in unnecessary re-renders.

## Performance Budget

**Target Metrics:**
- Components should render <5 times per user interaction
- Render time should be <16ms for smooth 60fps
- Frame drops should be <5% during animations

**When to Investigate:**
- Component renders >10 times per interaction
- Render time >30ms
- Noticeable jank during interactions
- Battery drain on mobile devices

## Next Steps

After identifying issues, see:
- `.remember/memory/self.md` for battle-tested fix patterns
- `docs/performance/memoization-verification.md` for component memoization strategies
- `docs/performance/recalculation-cascade-analysis.md` for cascade analysis
