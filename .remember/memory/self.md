# Known Mistakes & Corrections

## Mistake: Hooks Returning Plain Objects Without Memoization
**Wrong:** Returning plain object `return { value, flag, handlers }` creates new reference every render
**Correct:** `return useMemo(() => ({ value, flag, handlers }), [value, flag, handlers])`
**Lesson:** Any hook returning an object in performance-sensitive paths MUST memoize. Object identity matters even if values are stable.
**Impact:** `useFeedbackPanel`, `useAnalysisState`, `useVideoPlayback` caused 30+ re-renders (should be ~5), 10-40 frame drops per animation.
**When:** Hook returns object, used in expensive children/animations, part of orchestrator chain, used in other hook deps.

## Mistake: Including Intentionally-Unstable Objects in useMemo Deps
**Wrong:** `return useMemo(() => ({ video, gesture, animation }), [video, gesture, animation])`
**Correct:** `return useMemo(() => ({ video, gesture, animation }), [video]) // Omit gesture/animation from deps`
**Lesson:** Omit intentionally-unstable objects from deps. Object is still passed through, but changes don't trigger parent re-renders.
**When:** Reanimated Gesture.Pan() objects, SharedValues, animation-only changes, pass-through data
**Proof:** Removing `gesture` and `animation` dropped re-renders from 30+ to ~5, eliminated frame drops.

## Mistake: Using Refs to "Stabilize" Objects That Are Already New
**Wrong:** `const ref = useRef(obj); ref.current = obj; <Component prop={ref.current} />`
**Why:** `ref.current` changes every render. React.memo compares `prevProp === nextProp` → both new → re-render. Ref identity is stable, `ref.current` is not.
**Correct:** Fix at SOURCE - memoize hook return: `return useMemo(() => ({ scrollY, collapseProgress }), [scrollY, collapseProgress])`
**Lesson:** Refs only work if you store once and keep using. If you reassign every render, you've accomplished nothing. Fix data creation, not consumption.

## Mistake: Memoizing at Consumption Instead of Source
**Wrong:** Parent memoizes nested props from unstable source: `const bubble = useMemo(() => ({ visible: orchestrated.feedback.coordinator.bubble }), [orchestrated.feedback.coordinator.bubble])`
**Correct:** Memoize at SOURCE inside hook: `return useMemo(() => ({ video, feedback, handlers }), [video, feedback, handlers])`
**Lesson:** When hook returns large object consumed by multiple components, memoize at hook level. Memoizing at consumption is futile if source creates new references. Trace re-renders to SOURCE, fix data creation not consumption.
**Proof:** Memoizing orchestrator dropped renders 130-170 → 30-36 (75%), frame drops 60-180 → 12-36 (70%).

## Mistake: Double setOptions Causing Cascading Re-renders
**Wrong:** Two `setOptions` calls: immediate with `isUserInteraction: true`, then after 200ms with `isUserInteraction: false`
**Correct:** Single `setOptions` with `isUserInteraction: true`, then `setIsUserInteraction(false)` local state only. Header manages transition internally.
**Lesson:** Avoid multiple `navigation.setOptions()` for animation state. Header receives flag once to start quick animation, manages transition internally. Eliminates entire re-render cycle.
**Proof:** Eliminated double NavigationAppHeader re-renders within 100ms (renderCount 25→30 with 56ms gap).

## Mistake: Performance-Sensitive Hooks Returning Unstable Objects
**Wrong:** `return { data, actions, nested: { prop } }` - new object every render
**Correct:** `return useMemo(() => ({ data, actions, nested: { prop } }), [data, actions, prop])`
**When:** Orchestrator/aggregator hooks returning complex objects, consumed by expensive children, in performance-sensitive screens (animations, video), aggregating multiple sub-hooks

## Mistake: Callback Invocation on Every useEffect Dependency Change
**Wrong:** Inline callbacks/gestures in effect deps → effect fires even when values unchanged → parent gets new object → re-renders
**Correct:** Use stable callbacks with `useCallback`. Track primitive values with refs, only invoke callback when values actually change.
**Lesson:** When effect calls callback with inline functions/Reanimated objects, compare primitives with refs. Effect still runs on deps, but ref checks prevent unnecessary parent re-renders.
**Proof:** Eliminated ~60% cascading re-renders (progress every ~250ms, but only triggers parent on value change).

## Mistake: Objects Changing Reference Without Content Change
**Wrong:** Object reference changes frequently but content is stable → memoized parent re-renders
**Correct:** Content-based memoization - compare signatures (keys for records, checked properties for objects), return cached if unchanged
**Pattern:** Extract signature → compare with ref → return cached if same, new if changed
**When:** Reference changes, content stable, pass-through data, performance-sensitive paths
**Proof:** Stabilizing `audioUrls`/`audioController` dropped `VideoAnalysisLayout` re-renders ~80% - only on content change, not reference change

## Mistake: Including Pass-Through Data in Main State Object
**Wrong:** Main object includes data only used by children: `const feedback = useMemo(() => ({ items, errors, audioUrls }), [...])` → parent re-renders on child-only changes
**Correct:** Extract pass-through data, omit from main object, pass separately with content-based memoization
**Lesson:** If data only passed to child and not used by parent, extract from main state, pass separately. Prevents parent re-renders while still updating child. Combine with content-based memoization.
**Proof:** Extracting `audioUrls`/`errors` from `feedback` stopped `VideoAnalysisLayout` re-renders when only these changed - ~40% reduction

## Mistake: Hooks Returning New Objects Every Render Based on Derived Values
**Wrong:** Hook returns object from primitives but creates new object every render → dependent useMemo recalculates constantly
**Correct:** Extract primitives before hook, memoize return based on primitives (not object ref), cache object with refs, use primitives in deps
**Lesson:** When hook returns object from primitive inputs: extract primitives, memoize by primitives, cache and only recreate on change, never include raw hook return in deps - use primitives
**When:** Hook returns object from primitives but new each render, used in other useMemo deps, performance-critical, third-party
**Proof:** Stabilizing `videoAudioSync` stopped constant `audioState` recalculations - now only when `isPlaying`/`isAudioActive` change, not every render

## Mistake: React.memo Blocking Critical State Updates
**Wrong:** Wrapping simple components with `React.memo()` that need to respond immediately to state changes (e.g., play/pause controls)
**Correct:** Remove `React.memo()` from components that must update immediately when props change (simple components with no expensive computations)
**Lesson:** React.memo is optimization for expensive components. For simple components that render infrequently, memo can delay critical updates during rapid state transitions. AudioPlayer must re-render instantly when `controller.isPlaying` changes.
**When:** Component has no expensive computations, must respond immediately to prop changes, used in performance-critical paths (audio/video controls)
**Proof:** AudioPlayer wrapped with `React.memo()` didn't re-render when `controller.isPlaying` changed from `true` to `false` on pause press, causing audio to keep playing

## Mistake: React.memo on Simple Components with Frequent Prop Changes
**Wrong:** `React.memo(BottomNavigation)` with `activeTab` prop that changes on every tab switch
**Correct:** Remove `React.memo()` for components with 3 buttons and 1 animated border - overhead exceeds benefit
**Lesson:** React.memo only helps when props change but component shouldn't re-render. If props change frequently (tab switches) and component MUST re-render (animated border), memo adds overhead without benefit. BottomNavigation has 3 buttons + 1 animated sliding border - not expensive enough to warrant memoization.
**When:** Component has <10 children, props change frequently, component must re-render for UI updates
**Impact:** Removed React.memo from BottomNavigation - it was allowing re-renders anyway (correctly), just adding overhead

## Mistake: Refs Updated in useEffect Read in useMemo - Stale Data Bug
**Wrong:** 
```typescript
useEffect(() => {
  ref.current = value
  prevRef.current = value
}, [value])

const memoized = useMemo(() => {
  const prev = prevRef.current  // ❌ Reads stale ref value!
  return ref.current
}, [signature])
```
**Correct:**
```typescript
const memoized = useMemo(() => {
  const prev = prevRef.current
  // Update refs BEFORE deciding what to return (synchronously during render)
  if (signatureChanged) {
    prevRef.current = signature
    ref.current = value
    return value
  }
  return prevRef.current
}, [signature, value])
```
**Lesson:** `useEffect` runs AFTER render completes. If `useMemo` reads refs that are updated in `useEffect`, it reads STALE data during render. Update refs synchronously INSIDE `useMemo` (during render), not asynchronously in `useEffect` (after render).
**When:** Stabilizing objects with signature-based memoization, refs track previous values for comparison, refs used to determine memoized return value
**Impact:** AudioPlayer received cached old controller with `isPlaying=true` instead of updated `isPlaying=false`, causing audio to keep playing after pause press

## Mistake: useMemo Without Dependency for Ref Mutation
**Wrong:**
```typescript
const audioOverlay = useMemo(() => {
  if (callbacksChanged) {
    audioOverlayRef.current = { ...audioOverlayRef.current, onClose: next }
  }
  return audioOverlayRef.current
}, [overlayVisible, activeAudioId, activeAudioUrl, stableDuration])
```
**Correct:**
```typescript
const audioOverlay = useMemo(() => {
  if (callbacksChanged) {
    audioOverlayRef.current = { ...audioOverlayRef.current, onClose: next }
  }
  return audioOverlayRef.current
}, [overlayVisible, activeAudioId, activeAudioUrl, stableDuration, callbacksChanged])
```
**Lesson:** When `useMemo` returns a cached ref, include every signal that mutates that ref in the dependency array. Otherwise React returns the previously memoized value and skips the update, even though the ref changed.

## Mistake: Inline Objects in Hook Config Parameters
**Wrong:** `usePrefetchNextVideos(..., { lookAhead: 3, concurrency: 2 })` - new object every render
**Correct:** `const config = useMemo(() => ({ lookAhead: 3, concurrency: 2 }), [deps]); usePrefetchNextVideos(..., config)`
**Lesson:** Inline object literals in function calls create new references every render. If the hook memoizes based on `config`, it recalculates unnecessarily. Always memoize objects passed as hook params when the object contains primitive values.
**When:** Hook accepts config object, hook internally memoizes based on config reference, config values are primitives
**Impact:** usePrefetchNextVideos recalculated finalConfig on every render even though values were stable, causing effect thrashing

## Mistake: Over-Memoization of Simple Pure Functions
**Wrong:** `const value = useMemo(() => pureFunction(input), [input])` - wrapping O(1) operations in useMemo
**Correct:** `const value = pureFunction(input)` - simple pure functions don't need memoization
**Lesson:** Only use `useMemo` for expensive computations. Pure functions with single input, boolean checks, primitive unwrapping, and simple O(1) operations add overhead without benefit. Extract tab from pathname: `split('/').pop()` is instant, no need for memo.
**When:** Pure function with single input, O(1) operation, boolean/null checks, primitive unwrapping
**Impact:** Removed pointless `currentTab` useMemo in `_layout.tsx` - pathname changes require recomputation anyway, memo was pure overhead

## Mistake: Passing Zustand Store Values as Props Instead of Reading Directly
**Wrong:**
```typescript
// Parent component subscribes to store
const value = useStore((state) => state.value)
// Passes as prop to child
<Child value={value} />
```
**Why:** Parent subscribes to store → re-renders when store updates → passes new prop → child re-renders. Result: 2 renders (parent + child).

**Correct:**
```typescript
// Parent does NOT subscribe (only gets setter if needed)
const setValue = useStore((state) => state.setValue)
// Child reads directly from store
function Child() {
  const value = useStore((state) => state.value) // Direct subscription
  return <div>{value}</div>
}
```
**Lesson:** When moving state to Zustand to eliminate cascading re-renders, the CONSUMER component must read directly from the store. Don't pass store values as props through intermediary components. The store setter can be passed as prop (stable reference), but store values should be read at point of use.

**When:** Using Zustand to break render cascades, store values used by child components, intermediary components don't need the value
**Impact:** Moving `persistentProgressBarProps` from prop passing to direct store read eliminated VideoAnalysisScreen re-renders when progress updates. Before: 78 renders (store update → Screen re-render → Layout re-render). After: ~10 renders (store update → Layout re-render only).
**Proof:** `changedProps` logs showed `persistentProgressBarProps` still present after moving to store, causing intermediary renders. Fix: Removed prop from VideoAnalysisScreen, VideoAnalysisLayout reads directly from store.
