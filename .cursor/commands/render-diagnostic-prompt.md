# Re-render Diagnostic AI Prompt Template

Use this prompt template when asking AI assistants to help diagnose re-render issues.

## Prompt Template

```
Act as a senior React performance engineer. Given the component tree, props, and profiler output below, walk through:

1. Which components are re-rendering unnecessarily
2. The exact prop/state/context changes triggering them
3. Concrete fixes ranked by impact (memoization at source, context splitting, state moves, batching)

Component Tree:
[Paste component structure - parent → child hierarchy]

Props Flow:
[Paste props being passed down, especially objects/functions]

Profiler Output:
[Paste React DevTools Profiler data or useRenderDiagnostics output]
- Render counts per component
- Render timings
- Commit phases

Known Issues from Static Analysis:
[Paste output from detect-re-renders.mjs if available]

Use a brutal code-review tone. Assume strict mode + concurrent features. Call out when a "fix" just papers over unstable identities instead of fixing at source.

Focus on:
- Tracing re-renders to their SOURCE (hook returns, context values, parent state)
- Fixing data creation, not consumption
- Content-based memoization when references change but values don't
- Removing React.memo from simple components that need immediate updates
```

## Example Usage

### Example 1: VideoAnalysisLayout Re-renders

```
Act as a senior React performance engineer. Given the component tree, props, and profiler output below:

Component Tree:
VideoAnalysisScreen
  → VideoAnalysisLayout (30+ renders)
    → VideoPlayerSection (30+ renders)
    → FeedbackSection (30+ renders)
      → FeedbackPanel (30+ renders)

Props Flow:
VideoAnalysisLayout receives:
- video: VideoState (stable)
- feedback: { items, coordinator, panel, state } (NEW OBJECT EVERY RENDER)
- gesture: Gesture.Pan() (intentionally unstable)
- animation: SharedValue (intentionally unstable)

Profiler Output:
- VideoAnalysisLayout: 34 renders in 5 seconds
- Each render ~2-5ms (acceptable)
- Cascade: feedback prop reference changes → all children re-render

Known Issues:
- useVideoAnalysisOrchestrator returns new object every render without useMemo
- feedback object includes pass-through data (audioUrls, errors) that triggers parent re-renders

Provide fixes ranked by impact, focusing on SOURCE fixes not consumption fixes.
```

### Example 2: AudioPlayer Not Responding

```
Component: AudioPlayer
Issue: Doesn't pause when controller.isPlaying changes from true → false

Props:
- controller: { isPlaying: boolean, ... } (object from useAudioController)
- Wrapped with React.memo()

Profiler Output:
- AudioPlayer renders 0 times when pause button pressed
- Parent (VideoControls) renders when button pressed

Known Pattern:
- React.memo blocking critical state updates (see .remember/memory/self.md)
- Simple component with no expensive computations

Fix: Remove React.memo from AudioPlayer - it must respond immediately to prop changes.
```

## Common Patterns to Reference

When diagnosing, reference these patterns from `.remember/memory/self.md`:

### Pattern 1: Hooks Returning Plain Objects
**Wrong:** `return { value, flag, handlers }`  
**Fix:** `return useMemo(() => ({ value, flag, handlers }), [value, flag, handlers])`

### Pattern 2: Memoizing at Consumption Instead of Source
**Wrong:** Parent memoizes nested props from unstable source  
**Fix:** Memoize at SOURCE inside hook

### Pattern 3: React.memo on Simple Components
**Wrong:** `React.memo(SimpleButton)` where button must update immediately  
**Fix:** Remove React.memo - adds overhead without benefit

### Pattern 4: Refs Updated in useEffect Read in useMemo
**Wrong:** Update refs in useEffect, read in useMemo  
**Fix:** Update refs synchronously inside useMemo

### Pattern 5: Pass-Through Data in Main State
**Wrong:** Main object includes data only used by children  
**Fix:** Extract pass-through data, pass separately

## Output Format

Provide diagnosis in this format:

```
## Diagnosis Summary
[Brief overview of root cause]

## Component Analysis
### ComponentName
- **Render Count:** X renders in Y seconds
- **Trigger:** Prop/state/context that changed
- **Root Cause:** [Hook/context/parent that creates unstable references]

## Fixes (Ranked by Impact)

### High Impact (Fix First)
1. **Memoize Hook Return**
   - File: `packages/app/hooks/useXyz.ts`
   - Change: `return useMemo(() => ({ ... }), [deps])`
   - Impact: Eliminates ~80% of re-renders

### Medium Impact
2. **Extract Pass-Through Data**
   - File: `packages/app/features/Xyz/XyzScreen.tsx`
   - Change: Extract child-only props from main state
   - Impact: ~40% reduction in parent re-renders

### Low Impact / Not Recommended
3. **Add React.memo to Children**
   - ❌ Don't do this - fixes symptom not cause
   - The parent is creating new references, memoizing children won't help
```

## Validation Checklist

After fixes are applied, verify:

- [ ] Render counts reduced (check ProfilerWrapper or useRenderCount)
- [ ] Props stabilize (check useRenderDiagnostics output)
- [ ] Frame drops eliminated (check performance metrics)
- [ ] No regressions (run existing tests)
- [ ] Fix is at SOURCE, not consumption level

