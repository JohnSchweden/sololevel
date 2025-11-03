# Crash Analysis: Reanimated Shadow Tree Cloning Failure

## Incident Summary

**Crash Type:** `EXC_BAD_ACCESS (SIGSEGV)` - Segmentation Fault  
**Location:** `folly::dynamic::type()` during `folly::dynamic::hash()`  
**Context:** React Native Reanimated shadow tree cloning (`cloneShadowTreeWithNewPropsRecursive`)  
**When:** Component mount (`ReanimatedMountHook::shadowTreeDidMount`)  
**Platform:** iOS Simulator (Native ARM-64)

**Incident IDs:**
- `D30DA064-8022-4A47-B26A-9D4FC01C5D2A` (2025-11-02 19:10:38)
- `94D0D97D-7D63-4ABF-A2A4-C42BA57499E6` (2025-11-02 20:28:46) - **Recurring**

**Status:** 🔴 **UNFIXED** - Same crash recurring ~1.3 hours later. Fix must be implemented immediately.

## Root Cause

The crash occurs when Reanimated attempts to clone the shadow tree for props synchronization. The failure happens in Folly's dynamic type system when trying to hash/serialize props containing **non-serializable objects with circular references**.

### Problematic Code Location

**File:** `packages/app/features/VideoAnalysis/components/VideoAnalysisLayout.native.tsx`

**Lines 618-645:** Persistent Progress Bar with gesture objects passed through state:

```typescript
{persistentProgressBarProps && (
  <Animated.View ...>
    <ProgressBar
      ...
      animatedStyle={persistentProgressBarProps.animatedStyle}
      combinedGesture={persistentProgressBarProps.combinedGesture}  // ❌ Circular refs
      mainGesture={persistentProgressBarProps.mainGesture}          // ❌ Circular refs
      ...
    />
  </Animated.View>
)}
```

**File:** `packages/ui/src/components/VideoAnalysis/VideoControls/VideoControls.tsx`

**Lines 41-52:** `PersistentProgressBarProps` interface includes gesture objects:

```typescript
export interface PersistentProgressBarProps {
  progress: number
  isScrubbing: boolean
  controlsVisible: boolean
  progressBarWidth: number
  animatedStyle: any                    // ✅ Can be serialized (Reanimated style)
  combinedGesture: any                  // ❌ GestureType with circular refs
  mainGesture: any                      // ❌ GestureType with circular refs
  onLayout: (event: any) => void
  onFallbackPress: (locationX: number) => void
  animationName?: 'quick' | 'lazy'
}
```

## Why This Crashes

1. **GestureType objects** (`react-native-gesture-handler`) contain circular references between:
   - Gesture instances
   - Event handlers
   - State callbacks
   - Native bridge references

2. **Reanimated's shadow tree cloning** needs to serialize props to pass through the JS bridge to native modules

3. **Folly's dynamic type** (`folly::dynamic`) tries to hash these objects for lookups, but encounters:
   - Invalid memory addresses from corrupted object graphs
   - Circular reference loops
   - Non-serializable native bridge objects

4. **Pointer authentication failure** (`0x0000beadd4367c70 -> 0x00003eadd4367c70`) indicates memory corruption from following invalid pointers in the circular reference graph

## Stack Trace Analysis

The crash trace shows:

```
0  folly::dynamic::type() const
1  folly::dynamic::hash() const
2  folly::detail::DynamicHasher::operator()(folly::dynamic const&)
3  std::__1::__unordered_map_hasher<folly::dynamic, ...>::operator()()
4  std::__1::unordered_map<folly::dynamic, folly::dynamic>::insert()
5  reanimated::cloneShadowTreeWithNewPropsRecursive()
```

This is a **recursive cloning attempt** where Reanimated tries to clone 55+ shadow nodes (see stack frame 31-55), and during that process attempts to serialize gesture objects stored in `persistentProgressBarProps`.

## Solutions

### Solution 1: Don't Store Gesture Objects in State (Recommended)

**Problem:** `persistentProgressBarProps` is stored in React state, which gets cloned by Reanimated.

**Fix:** Store gesture objects in refs, not state. Only store serializable primitives in state.

```typescript
// ❌ WRONG - Storing gesture objects in state
const [persistentProgressBarProps, setPersistentProgressBarProps] = useState<...>(null)

// ✅ CORRECT - Store gestures in ref, serialize props before state
const gestureRefsRef = useRef<{
  combinedGesture: GestureType | null
  mainGesture: GestureType | null
}>({ combinedGesture: null, mainGesture: null })

const [persistentProgressBarProps, setPersistentProgressBarProps] = useState<{
  progress: number
  isScrubbing: boolean
  controlsVisible: boolean
  progressBarWidth: number
  animatedStyle: AnimatedStyle<ViewStyle>
  // ❌ Remove: combinedGesture, mainGesture from state
  onLayout: (event: any) => void
  onFallbackPress: (locationX: number) => void
} | null>(null)
```

Then pass gestures directly from ref when rendering:

```typescript
<ProgressBar
  {...persistentProgressBarProps}
  combinedGesture={gestureRefsRef.current.combinedGesture!}
  mainGesture={gestureRefsRef.current.mainGesture!}
/>
```

### Solution 2: Extract Gestures at Render Time

**Alternative:** Don't pass gesture objects through the callback. Instead, have `VideoControls` render the persistent progress bar directly, or use a context to share gesture instances.

### Solution 3: Use Gesture References Instead of Instances

**Pattern:** Create gesture instances at the layout level and pass them via props (not state):

```typescript
// In VideoAnalysisLayout, create gestures once
const persistentProgressBarGestures = useMemo(() => {
  // Create gestures here, not in VideoControls
  return {
    combined: Gesture.Race(...),
    main: Gesture.Pan(...)
  }
}, [])

// Pass gestures directly to VideoControls, not through callback
<VideoPlayerSection
  persistentProgressBarGestures={persistentProgressBarGestures}
  ...
/>
```

## Verification Steps

1. **Reproduce:** 
   - Navigate to VideoAnalysis screen
   - Trigger persistent progress bar to appear (should happen during video playback)
   - Monitor for crash during mount/remount

2. **Test Fix:**
   - Remove gesture objects from `PersistentProgressBarProps` state
   - Store gestures in refs
   - Verify no crashes during shadow tree cloning

3. **Prevent Regression:**
   - Add type check: GestureType should never be in React state
   - Add lint rule: `no-gesture-in-state`
   - Document: Only serializable primitives in state when components use Reanimated

## Related Issues

- Similar crashes can occur with:
  - Function closures with circular refs
  - Event handlers stored in state
  - Native module references (camera, audio, etc.)
  - React refs passed through state

## Prevention Guidelines

**Rule:** When using Reanimated with `Animated.View/ScrollView`, ensure all props passed to these components are:
- ✅ Primitives (string, number, boolean)
- ✅ Serializable objects (plain objects, arrays)
- ✅ Reanimated types (SharedValue, AnimatedStyle)
- ❌ NOT: GestureType, function closures, refs, native objects

## References

- Reanimated Shadow Tree Cloning: `reanimated::cloneShadowTreeWithNewPropsRecursive`
- Folly Dynamic Types: `folly::dynamic` serialization
- React Native Gesture Handler: GestureType circular references

## Action Required

**CRITICAL:** This crash is recurring. The same bug manifests multiple times:
- Both crashes occur in identical stack traces
- Same root cause: GestureType objects in React state
- Same location: `VideoAnalysisLayout.native.tsx` persistent progress bar

**Immediate Action:** Implement Solution 1 (move gestures from state to refs) to prevent further crashes.

