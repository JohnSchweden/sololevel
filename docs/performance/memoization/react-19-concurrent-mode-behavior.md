# React 19 Concurrent Mode: Understanding "MEMO BYPASSED" Errors

## Overview

In React 19 with concurrent mode, you may see "MEMO BYPASSED" errors where `arePropsEqual` returns `true` but the component still renders. **This is often expected behavior**, not a bug.

## React 19 Concurrent Rendering

### How React.memo Works in Concurrent Mode

1. **Reconciliation Phase**: React calls `arePropsEqual(prevProps, nextProps)`
   - If returns `true`, React marks component as "should skip render"
   - But concurrent mode can interrupt this decision

2. **Concurrent Interruptions**:
   - Parent component re-renders (even if props unchanged)
   - Higher priority updates arrive
   - React may decide to render anyway for consistency

3. **Bailout Mechanism**:
   - Even if component renders, React will bail out early if props are truly unchanged
   - The render function executes but React skips DOM updates

### When "MEMO BYPASSED" is Expected

**Scenario 1: Delay > 100ms**
```json
{
  "timeBetweenReturnTrueAndRender": 149,
  "likelyCause": "React.memo bypassed despite arePropsEqual returning true (React 19 concurrent mode?)"
}
```

**Explanation**: React called `arePropsEqual` during reconciliation, but a higher priority update (or parent re-render) caused React to render anyway. This is **normal** in concurrent mode.

**Action**: ✅ **No action needed** unless you see performance issues.

**Scenario 2: Parent Re-render**
```
Parent component re-renders → Child receives same props → arePropsEqual returns true → But React renders anyway
```

**Explanation**: React may render children when parent re-renders for consistency, even if props are unchanged. React will bail out during reconciliation.

**Action**: ✅ **No action needed** - React handles this efficiently.

**Scenario 3: Strict Mode (Development)**
```
React Strict Mode → Double renders for safety → arePropsEqual called twice → May see bypass
```

**Explanation**: Strict Mode intentionally double-renders components to catch side effects. This is development-only behavior.

**Action**: ✅ **No action needed** - Production builds don't have this.

### When "MEMO BYPASSED" Indicates a Bug

**Scenario 1: Delay < 100ms (Race Condition)**
```json
{
  "timeBetweenReturnTrueAndRender": 68,
  "likelyCause": "Possible race condition - props may have changed between arePropsEqual check and render"
}
```

**Explanation**: Props changed between `arePropsEqual` check and render. This indicates:
- Object being recreated in callbacks/effects
- State updates happening asynchronously
- Race condition in prop updates

**Action**: ⚠️ **Investigate** - Find where props are being recreated.

**Fix Pattern**:
```typescript
// ❌ BAD: Creates new object on every call
useEffect(() => {
  onCallback({ prop: value })
}, [value])

// ✅ GOOD: Only create when values change
const stableRef = useRef(null)
useEffect(() => {
  if (valuesChanged) {
    stableRef.current = { prop: value }
    onCallback(stableRef.current)
  }
}, [value])
```

**Scenario 2: arePropsEqual Not Called**
```json
{
  "arePropsEqualWasCalled": false,
  "likelyCause": "Parent forced re-render (arePropsEqual not called)"
}
```

**Explanation**: React didn't call `arePropsEqual` at all, meaning:
- Parent component forced re-render
- Hooks inside memoized component triggered re-render
- Component not properly memoized

**Action**: ❌ **Bug** - Fix parent re-renders or move hooks.

**Fix Pattern**:
```typescript
// ❌ BAD: Local state in memoized component
const Memoized = React.memo(() => {
  const [state, setState] = useState(null) // Forces re-render
})

// ✅ GOOD: Lift state to parent
const Parent = () => {
  const [state, setState] = useState(null)
  return <Memoized state={state} />
}
```

## Diagnostic Workflow

### Step 1: Check Timing
```json
{
  "timeBetweenReturnTrueAndRender": 149
}
```

- **> 100ms**: Expected concurrent mode behavior ✅
- **< 100ms**: Possible race condition ⚠️
- **arePropsEqual not called**: Bug ❌

### Step 2: Check Likely Cause
```json
{
  "likelyCause": "..."
}
```

- **"React 19 concurrent mode?"**: Expected behavior ✅
- **"Possible race condition"**: Investigate ⚠️
- **"Parent forced re-render"**: Bug ❌

### Step 3: Check Prop Changes
```json
{
  "changedProps": ["persistentProgressBarProps (REF)"]
}
```

If props reference changed but `arePropsEqual` returned true, there's a race condition.

### Step 4: Action Based on Findings

**Expected Behavior (> 100ms delay)**:
- ✅ No action needed
- Monitor performance metrics
- React will bail out efficiently

**Race Condition (< 100ms delay)**:
1. Find prop that changed (from logs)
2. Trace to source (where object is created)
3. Add reference stability (use refs)
4. Only create new objects when values change

**Bug (arePropsEqual not called)**:
1. Check parent component re-renders
2. Check hooks inside memoized component
3. Lift state to parent if needed
4. Ensure React.memo is properly applied

## Performance Impact

### Expected Behavior (No Action Needed)
- React bails out early during reconciliation
- No DOM updates occur
- Minimal performance impact
- This is React's optimization working correctly

### Race Condition (Needs Fix)
- Causes unnecessary reconciliation work
- May trigger child re-renders
- Can cause frame drops
- Fix by maintaining reference stability

### Bug (Needs Fix)
- Component re-renders unnecessarily
- All child components re-render
- Significant performance impact
- Fix by addressing root cause

## Best Practices

### 1. Don't Panic About "MEMO BYPASSED"
- Many are expected in React 19 concurrent mode
- Check timing before investigating
- Focus on actual performance issues

### 2. Monitor Performance Metrics
- Use React DevTools Profiler
- Check frame rates
- Look for actual performance degradation

### 3. Fix Only When Necessary
- Fix race conditions (< 100ms delay)
- Fix bugs (arePropsEqual not called)
- Ignore expected behavior (> 100ms delay)

### 4. Use Comprehensive Diagnostics
```typescript
// Track timing and causes
useRenderDiagnostics('Component', props, {
  logToConsole: __DEV__,
  logOnlyChanges: true,
})

// Check arePropsEqual behavior
// Logs show timing and likely causes
```

## Example Log Analysis

### Expected Behavior (No Action)
```json
{
  "renderCount": 4,
  "timeBetweenReturnTrueAndRender": 149,
  "likelyCause": "React.memo bypassed despite arePropsEqual returning true (React 19 concurrent mode?)",
  "arePropsEqualWasCalled": true,
  "arePropsEqualReturnedTrueBeforeThisRender": true
}
```
**Verdict**: ✅ Expected - React 19 concurrent mode behavior

### Race Condition (Investigate)
```json
{
  "renderCount": 3,
  "timeBetweenReturnTrueAndRender": 68,
  "likelyCause": "Possible race condition - props may have changed between arePropsEqual check and render",
  "changedProps": ["persistentProgressBarProps (REF)"]
}
```
**Verdict**: ⚠️ Investigate - Props changed between check and render

**Action**: Find where `persistentProgressBarProps` is created, add reference stability

### Bug (Fix)
```json
{
  "renderCount": 2,
  "arePropsEqualWasCalled": false,
  "likelyCause": "Parent forced re-render (arePropsEqual not called)"
}
```
**Verdict**: ❌ Bug - React.memo not working

**Action**: Check parent component, check hooks inside memoized component

## References

- [React 19 Concurrent Features](https://react.dev/blog/2024/04/25/react-19)
- [React.memo Documentation](https://react.dev/reference/react/memo)
- [Concurrent Rendering in React](https://react.dev/blog/2022/03/29/react-v18#what-is-concurrent-react)

---

**Key Takeaway**: Not all "MEMO BYPASSED" errors are bugs. In React 19 concurrent mode, many are expected behavior. Focus on fixing race conditions and actual bugs, not expected concurrent mode behavior.

