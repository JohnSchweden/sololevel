# React Performance Debugging Quick Reference

## Quick Diagnostic Checklist

### 1. Identify the Symptom
- [ ] Component re-rendering too frequently?
- [ ] "MEMO BYPASSED" errors in logs?
- [ ] Frame drops during interactions?
- [ ] Props changing when they shouldn't?

### 2. Check Logs
```bash
# Look for these patterns in logs:
grep "MEMO BYPASSED" logs.txt
grep "Render #" logs.txt
grep "Props changed" logs.txt
grep "arePropsEqual.*RETURNING TRUE" logs.txt
```

### 3. Trace the Issue

**Step 1**: Check which prop changed
```typescript
// In component logs, look for:
changedProps: ["propName (REF)"]
```

**Step 2**: Find where prop is created
```typescript
// Search codebase for prop creation:
grep -r "propName.*=" src/
```

**Step 3**: Check if reference stability is maintained
```typescript
// Should see:
const stableRef = useRef(null)
if (valuesChanged) {
  stableRef.current = newObject
}
```

### 4. Apply Fix Pattern

**Pattern A: Object Creation in Callback**
```typescript
// ❌ BAD
useEffect(() => {
  onCallback({ prop: value })
}, [value])

// ✅ GOOD
const stableRef = useRef(null)
useEffect(() => {
  if (valueChanged) {
    stableRef.current = { prop: value }
    onCallback(stableRef.current)
  }
}, [value])
```

**Pattern B: Race Condition with setState**
```typescript
// ❌ BAD
const handleChange = useCallback((newValue) => {
  setState(newValue) // Always creates new reference
}, [])

// ✅ GOOD
const stableRef = useRef(null)
const handleChange = useCallback((newValue) => {
  if (contentUnchanged(newValue, stableRef.current)) return
  stableRef.current = newValue
  setState(newValue)
}, [])
```

**Pattern C: Downstream Memoization**
```typescript
// ❌ BAD: Trying to fix downstream
const memoized = useMemo(() => unstableObject, [unstableObject])

// ✅ GOOD: Fix at source
// In the component that creates unstableObject:
const stableRef = useRef(null)
if (valuesChanged) {
  stableRef.current = newObject
}
```

---

## Common Issues & Quick Fixes

### Issue: "MEMO BYPASSED" Error

**Symptoms**:
```
ERROR ⛔ [Component] 🚨 MEMO BYPASSED - arePropsEqual returned true but component still rendered!
```

**First: Check if this is expected behavior**

Look at the log details:
```json
{
  "timeBetweenReturnTrueAndRender": 149,
  "likelyCause": "..."
}
```

**Decision Tree**:
- **Delay > 100ms**: Likely React 19 concurrent mode - **Expected behavior** ✅
  - Component renders but React bails out early if props unchanged
  - No action needed unless performance issue
- **Delay < 100ms**: Possible race condition - **Investigate** ⚠️
  - Check if props changed between `arePropsEqual` and render
  - Look for object creation in callbacks/effects
- **arePropsEqual not called**: Parent forcing re-render - **Bug** ❌
  - Check parent component re-renders
  - Check hooks inside memoized component

**If Bug: Quick Fix**:
1. Find the prop that changed (check logs)
2. Find where it's created (search codebase)
3. Add reference stability:
```typescript
const stableRef = useRef(null)
if (valuesChanged) {
  stableRef.current = newObject
  onCallback(stableRef.current)
}
```

**Files to Check**:
- `VideoControls.tsx` - Persistent progress bar props
- `useVideoAnalysisOrchestrator.ts` - Orchestrated objects
- `VideoAnalysisScreen.tsx` - Composed props

### Issue: Excessive Re-renders

**Symptoms**: Component renders on every parent render

**Quick Fix**:
1. Check if `React.memo` is applied
2. Check if `arePropsEqual` is implemented
3. Verify props are stable references

**Files to Check**:
- `VideoAnalysisLayout.native.tsx` - Memo implementation
- `VideoAnalysisScreen.tsx` - Prop composition

### Issue: Props Reference Changing

**Symptoms**: `arePropsEqual` returns false even when values are same

**Quick Fix**:
1. Check dependency arrays - use primitives only
2. Check if objects are recreated unnecessarily
3. Move memoization to source

**Files to Check**:
- All `useMemo` hooks - dependency arrays
- All `useCallback` hooks - dependency arrays

---

## Diagnostic Commands

### Enable Diagnostics
```typescript
// In component
useRenderDiagnostics('ComponentName', props, {
  logToConsole: __DEV__,
  logOnlyChanges: true,
})
```

### Check Global Tracking
```typescript
// In browser console
global.__videoAnalysisLayoutTracking
```

### Log Prop Changes
```typescript
useLogOnChange('key', state, 'scope', 'State changed')
```

---

## Architecture Decision Tree

```
Is component re-rendering too much?
├─ Yes → Check React.memo applied?
│  ├─ No → Apply React.memo
│  └─ Yes → Check arePropsEqual implemented?
│     ├─ No → Implement arePropsEqual
│     └─ Yes → Check props stability
│        ├─ Unstable → Find source
│        │  └─ Add reference stability at source
│        └─ Stable → Check parent re-renders
│           └─ Memoize parent props
│
└─ No → Check for "MEMO BYPASSED" errors?
   ├─ Yes → Check prop that changed
   │  └─ Find source, add reference stability
   └─ No → Performance is good ✅
```

---

## File Locations Reference

| Issue Type | File to Check |
|------------|---------------|
| Persistent progress bar props | `VideoControls.tsx` (lines 433-618) |
| Orchestrated objects | `useVideoAnalysisOrchestrator.ts` (lines 1535-1595) |
| Composed props | `VideoAnalysisScreen.tsx` (lines 205-313) |
| Memo implementation | `VideoAnalysisLayout.native.tsx` (lines 244-355) |
| Diagnostic tools | `useRenderDiagnostics.ts`, `logger.ts` |

---

## Quick Reference: Patterns

### ✅ Stable Object Creation
```typescript
const stableRef = useRef(null)
const valuesChanged = /* compare primitives */
if (valuesChanged) {
  stableRef.current = { /* ... */ }
  onCallback(stableRef.current)
}
```

### ✅ Primitive Dependencies
```typescript
useMemo(() => ({ /* ... */ }), [
  primitive1,  // ✅
  primitive2,  // ✅
  // object1,  // ❌ Use ref instead
])
```

### ✅ Content-Based Comparison
```typescript
const contentUnchanged =
  prev.prop1 === next.prop1 &&
  prev.prop2 === next.prop2 &&
  prev.prop3 === next.prop3

if (contentUnchanged) return // Don't setState
```

---

**Related Documentation**: `docs/performance/react-memoization-architecture.md`

