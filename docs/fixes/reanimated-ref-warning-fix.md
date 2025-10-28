# Reanimated Warning Fix: "Tried to modify key `current` of an object"

**Date:** 2025-10-28  
**Issue:** Reanimated warning appearing during video progress bar scrubbing  
**Status:** ✅ Resolved

## Problem

Reanimated was emitting the following warning repeatedly during gesture interactions:

```
WARN [Reanimated] Tried to modify key `current` of an object which has been already passed to a worklet.
See https://docs.swmansion.com/react-native-reanimated/docs/guides/troubleshooting#tried-to-modify-key-of-an-object-which-has-been-converted-to-a-shareable
```

## Root Cause

In `useControlsVisibility.ts`, a ref was being modified **during the render phase** (outside of `useEffect`):

```typescript
// ❌ BAD - Modifying ref during render
const onControlsVisibilityChangeRef = useRef(onControlsVisibilityChange)
onControlsVisibilityChangeRef.current = onControlsVisibilityChange  // Line 205
```

When this ref was accessed inside callbacks that were passed to Reanimated worklets via `runOnJS()`, Reanimated detected that the ref object had been modified after being captured by the worklet, triggering the warning.

## Solution

**Remove the ref entirely** and call the callback directly. Update `useCallback` dependency arrays to include the callback:

```typescript
// ❌ OLD - Using ref (causes warning)
const onControlsVisibilityChangeRef = useRef(onControlsVisibilityChange)
useEffect(() => {
  onControlsVisibilityChangeRef.current = onControlsVisibilityChange
}, [onControlsVisibilityChange])

// Inside callback:
onControlsVisibilityChangeRef.current?.(value)

// ✅ NEW - Call directly (no ref)
// Inside callback:
onControlsVisibilityChange?.(value)

// Update useCallback dependencies:
const showControlsAndResetTimer = useCallback(() => {
  setControlsVisible(true)
  onControlsVisibilityChange?.(true)
  setResetTrigger((prev) => prev + 1)
}, [onControlsVisibilityChange]) // Add to deps
```

## Files Changed

1. **`packages/ui/src/components/VideoAnalysis/VideoControls/hooks/useControlsVisibility.ts`**
   - **Removed** `onControlsVisibilityChangeRef` and its `useEffect`
   - Updated `resetAutoHideTimer` dependencies to include `onControlsVisibilityChange` (line 237)
   - Updated `showControlsAndResetTimer` dependencies to include `onControlsVisibilityChange` (line 246)
   - Updated `handlePress` dependencies to include `onControlsVisibilityChange` (line 273)
   - Updated `showControls` effect dependencies to include `onControlsVisibilityChange` (line 304)
   - All callbacks now directly call `onControlsVisibilityChange?.(value)` instead of using a ref

2. **`packages/ui/src/components/VideoAnalysis/VideoControls/VideoControls.tsx`**
   - Removed unused `useRef` import after refactoring (line 3-9)

## Verification

**Test Results:**
```bash
Command: yarn workspace @my/ui test useControlsVisibility.test.ts
Exit code: 0
Test Suites: 1 passed, 1 total
Tests: 17 passed, 17 total
```

All tests pass without modification. The refactoring maintains exact behavior while eliminating the Reanimated warning.

## Why This Works

**The Core Issue:**
When a ref object is captured by a Reanimated worklet (via `runOnJS()`), Reanimated converts it to a "shareable" object. Any subsequent modification to that ref's `.current` property—even in a `useEffect`—triggers the warning because Reanimated has already taken ownership of the object.

**The Solution:**
By **removing the ref entirely** and calling the callback directly:
1. The callback function itself changes when `onControlsVisibilityChange` prop changes
2. `useCallback` dependencies are updated to reflect this
3. Gesture handlers **will recreate** when the callback changes (but this is rare)
4. No ref objects are passed to worklets, so no "shareable" conversion occurs
5. No warning is triggered

**Trade-off:**
- ❌ Old approach: Stable callback (never recreates), but ref modification causes warning
- ✅ New approach: Callback may recreate rarely (when prop changes), but no warning

Since `onControlsVisibilityChange` prop changes infrequently (typically only on mount), the gesture recreation overhead is negligible.

## Related Documentation

- [Reanimated: Tried to modify key troubleshooting](https://docs.swmansion.com/react-native-reanimated/docs/guides/troubleshooting#tried-to-modify-key-of-an-object-which-has-been-converted-to-a-shareable)
- [React: When to use useEffect vs render phase](https://react.dev/reference/react/useEffect#usage)

## Pattern for Future Reference

**Rule:** Never use refs for callbacks that will be passed to Reanimated worklets (via `runOnJS()` or gesture handlers). Instead, include the callback in `useCallback` dependencies.

### ❌ Anti-Pattern (Causes Warning)
```typescript
// BAD: Using ref to avoid dependency
const callbackRef = useRef(callback)
useEffect(() => {
  callbackRef.current = callback // ⚠️ Triggers warning
}, [callback])

const handler = useCallback(() => {
  callbackRef.current?.() // Uses ref
}, []) // Empty deps = stable but problematic

// Pass to worklet
runOnJS(handler)()
```

### ✅ Correct Pattern
```typescript
// GOOD: Include callback in dependencies
const handler = useCallback(() => {
  callback?.() // Call directly
}, [callback]) // Include in deps

// Pass to worklet
runOnJS(handler)()
```

**When is this acceptable?**
- Callback changes infrequently (e.g., only on mount)
- Gesture recreation overhead is negligible compared to warning noise
- Eliminates Reanimated's "shareable object" conflicts

