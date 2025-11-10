# Known Mistakes & Corrections

## Mistake: Ref-Based Handler "Optimization Theater"
**Wrong:** 
```typescript
const coordinatorRef = useRef(coordinator)
coordinatorRef.current = coordinator // Updated every render
const handlers = useMemo(() => ({
  onPlay: () => coordinatorRef.current.onPlay(),
}), []) // Empty deps = "stable"
```
**Correct:** Pass handlers directly, use Zustand actions (stable), or `useCallback` with proper deps
**Lesson:** Refs updated every render provide no stability gain. This is "optimization theater" - creates false sense of optimization. Battle-tested pattern: Imperative API + Simple State (like YouTube/Vimeo), not prop composition layers.
**When:** Ref indirection for handler stability, refs reassigned every render, empty deps with ref access

## Mistake: Premature Optimization Without Measurement
**Wrong:** Extensive memoization (5+ useMemo calls), ref-based optimizations, granular subscriptions before profiling
**Correct:** Measure first with React DevTools Profiler. Optimize only what's proven slow. Trust React reconciliation, use `React.memo` only where profiling shows issues.
**Lesson:** Premature optimization adds complexity without proven benefits. Memoization overhead (5-10ms per render) can exceed benefits. Let React re-render naturally unless profiling proves otherwise.
**When:** Multiple useMemo/useCallback chains, optimization before measurement, theoretical performance gains

## Mistake: Hook Explosion (Too Many Hooks)
**Wrong:** 10+ hooks called directly in component (videoPlayback, audioController, feedbackCoordinator, animation, gesture, etc.)
**Correct:** Consolidate into 3-4 core hooks: `useVideoPlayer` (video + playback), `useFeedbackSystem` (feedback + audio), `useVideoLayout` (gesture + animation - native only)
**Lesson:** Many hooks = many failure points, many test mocks, complex dependency graphs. Battle-tested pattern: Consolidate related functionality into cohesive hooks.
**When:** Component calls 10+ hooks, hooks are tightly coupled, similar functionality split across hooks

## Mistake: Dual State Management (Zustand + Local Hooks)
**Wrong:** Zustand store for some state (`highlightedFeedbackId`), local hooks for other state (`videoPlayback`, `audioController`)
**Correct:** Single source of truth - Zustand OR React state, not both. Components read directly from store/context, not prop drilling.
**Lesson:** Dual state management adds cognitive overhead and inconsistent patterns. Choose one approach: Zustand for global state, React state for local UI, not both for same domain.
**When:** Store for some state, hooks for related state, prop drilling through intermediaries

## Mistake: Memoizing at Consumption Instead of Source
**Wrong:** Parent memoizes nested props from unstable source: `const bubble = useMemo(() => ({ visible: orchestrated.feedback.coordinator.bubble }), [orchestrated.feedback.coordinator.bubble])`
**Correct:** Memoize at SOURCE inside hook: `return useMemo(() => ({ video, feedback, handlers }), [video, feedback, handlers])`
**Lesson:** When hook returns large object consumed by multiple components, memoize at hook level. Memoizing at consumption is futile if source creates new references. Trace re-renders to SOURCE, fix data creation not consumption.

## Mistake: Including Intentionally-Unstable Objects in useMemo Deps
**Wrong:** `return useMemo(() => ({ video, gesture, animation }), [video, gesture, animation])`
**Correct:** `return useMemo(() => ({ video, gesture, animation }), [video]) // Omit gesture/animation from deps`
**Lesson:** Omit intentionally-unstable objects from deps. Object is still passed through, but changes don't trigger parent re-renders.
**When:** Reanimated Gesture.Pan() objects, SharedValues, animation-only changes, pass-through data

## Mistake: Objects Changing Reference Without Content Change
**Wrong:** Object reference changes frequently but content is stable → memoized parent re-renders
**Correct:** Content-based memoization - compare signatures (keys for records, checked properties for objects), return cached if unchanged. Extract pass-through data, omit from main object, pass separately.
**Pattern:** Extract signature → compare with ref → return cached if same, new if changed
**When:** Reference changes, content stable, pass-through data, performance-sensitive paths

## Mistake: React.memo on Simple Components or When Props Must Change
**Wrong:** Wrapping simple components with `React.memo()` that need immediate updates, or components where props change frequently and component must re-render
**Correct:** Remove `React.memo()` for simple components (<10 children, no expensive computations), or when props change frequently and component must update (e.g., animated borders, play/pause controls)
**Lesson:** React.memo only helps when props change but component shouldn't re-render. If props change frequently and component MUST re-render, memo adds overhead without benefit. For simple components, memo can delay critical updates.
**When:** Simple components, frequent prop changes requiring UI updates, performance-critical controls

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

## Mistake: Over-Memoization of Simple Operations
**Wrong:** `const value = useMemo(() => pureFunction(input), [input])` or inline objects `useHook({ config: value })` - wrapping O(1) operations in useMemo
**Correct:** `const value = pureFunction(input)` or `const config = useMemo(() => ({ ... }), [deps]); useHook(config)` - only memoize expensive computations or objects passed to hooks that memoize based on reference
**Lesson:** Only use `useMemo` for expensive computations. Pure functions with single input, boolean checks, primitive unwrapping, and simple O(1) operations add overhead without benefit. Inline objects in hook params create new references every render.
**When:** Pure function with single input, O(1) operation, inline objects in hook params, hook memoizes based on object reference

## Mistake: Passing Zustand Store Values as Props Instead of Reading Directly
**Wrong:** Parent subscribes to store → passes value as prop to child → 2 renders (parent + child)
**Correct:** Child reads directly from store. Parent can pass setter (stable reference), but store values should be read at point of use.
**Lesson:** When using Zustand to break render cascades, the CONSUMER component must read directly from the store. Don't pass store values as props through intermediary components.
**When:** Using Zustand to break render cascades, store values used by child components, intermediary components don't need the value

## Mistake: One-shot effect guards that block data refresh
**Wrong:**
```typescript
const deferredInitRef = useRef(false)
useEffect(() => {
  if (deferredInitRef.current) return
  deferredInitRef.current = true
  const id = setTimeout(processItems, 100)
  return () => clearTimeout(id)
}, [items])
```
**Correct:**
```typescript
useEffect(() => {
  if (!items.length) return
  const id = setTimeout(processItems, 100)
  return () => clearTimeout(id)
}, [items])
```
**Lesson:** Ref-based guards that short-circuit `useEffect` prevent later dependency updates from running the effect. Use dependency-driven logic (with caches/in-flight guards per item) instead of a global “run once” flag when new data needs processing after mount.
