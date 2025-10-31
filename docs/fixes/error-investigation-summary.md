# React Native Crash Investigation - Segfault in Shadow Tree Cloning (UPDATE)

## Crash Summary

**Crash Type:** `EXC_BAD_ACCESS (SIGSEGV)` - Segmentation fault  
**Location:** iOS Simulator (React Native 0.79.x)  
**Date:** 2025-10-30 11:21:50 (occurred AFTER initial fix)  
**Root Cause:** Invalid memory access when cloning shadow nodes during mount - `folly::dynamic` object corruption

## Status: Partial Fix Applied, Crash Still Occurs

**Initial Fix:** Removed `DerivedValue` types (`headerHeight`, `collapseProgress`) from props - ✅ **COMPLETED**  
**Remaining Issue:** Non-serializable objects (refs, gesture handlers) still passed through props - ❌ **ACTIVE**

## Stack Trace Analysis

Identical crash pattern to previous occurrence:

```
Thread 0 Crashed:: Dispatch queue: com.apple.main-thread
0   sololevel.debug.dylib  folly::dynamic::type() const + 12
1   sololevel.debug.dylib  folly::dynamic::hash() const + 36
...
52  sololevel.debug.dylib  reanimated::ReanimatedMountHook::shadowTreeDidMount(...)
```

**Key Finding:** The crash STILL occurs when Reanimated's mount hook tries to clone shadow nodes and serialize props. Removing `DerivedValue` helped but didn't fully resolve the issue.

## Root Cause Analysis (Updated)

### Primary Issue: Non-Serializable Props in Shadow Tree

When Reanimated clones the shadow tree during mount, it attempts to serialize ALL props into `folly::dynamic` objects. The crash occurs when props contain data that cannot be properly serialized:

### Remaining Non-Serializable Props:

1. **`rootPan: GestureType`** (line 36, 46)
   - Gesture object from `react-native-gesture-handler`
   - Cannot be serialized to `folly::dynamic`
   - Used directly in `<GestureDetector gesture={gesture.rootPan}>`

2. **`rootPanRef: RefObject<any>`** (line 42, 52)
   - React ref object - non-serializable
   - Passed through props to FeedbackSection

3. **`scrollRef: AnimatedRef<Animated.ScrollView>`** (line 51, 61)
   - AnimatedRef from Reanimated - non-serializable
   - Used in `<Animated.ScrollView ref={animation.scrollRef}>`

4. **`videoControlsRef: RefObject<VideoControlsRef | null>`** (line 76, 126)
   - React ref object - non-serializable
   - Passed to VideoPlayerSection

## Affected Code Locations

### VideoAnalysisScreen.tsx (Props Aggregation)

```typescript:34:106:packages/app/features/VideoAnalysis/VideoAnalysisScreen.tsx
const layoutProps = {
  gesture: {
    rootPan: orchestrated.gesture?.rootPan ?? ({} as any),  // ⚠️ GestureType - non-serializable
    rootPanRef: orchestrated.gesture?.rootPanRef ?? { current: null },  // ⚠️ Ref - non-serializable
  },
  animation: {
    scrollRef: (orchestrated.animation?.scrollRef ?? { current: null }) as any,  // ⚠️ AnimatedRef - non-serializable
  },
  videoControlsRef: orchestrated.refs.videoControlsRef,  // ⚠️ Ref - non-serializable
  // ...
}
```

### VideoAnalysisLayout.native.tsx (Props Usage)

- Line 243: `<GestureDetector gesture={gesture.rootPan}>` - Uses gesture from props
- Line 350: `<Animated.ScrollView ref={animation.scrollRef}>` - Uses ref from props
- Line 261: `videoControlsRef={videoControlsRef}` - Passes ref through props
- Line 411: `rootPanRef={gesture.rootPanRef}` - Passes ref through props

## Fix Strategy (Revised)

### Option 1: Move Gesture Creation to Layout Component (Recommended)

Create gesture directly in `VideoAnalysisLayout` instead of passing through props:

```typescript
// In VideoAnalysisLayout.native.tsx
import { useGestureController } from '../hooks/useGestureController'
import { useAnimationController } from '../hooks/useAnimationController'

export function VideoAnalysisLayout(props: Omit<VideoAnalysisLayoutProps, 'gesture' | 'animation'>) {
  // Create gesture and animation hooks directly in layout component
  const gesture = useGestureController(
    animation.scrollY,
    animation.feedbackContentOffsetY,
    animation.scrollRef
  )
  const animation = useAnimationController()
  
  // Use gesture directly
  return (
    <GestureDetector gesture={gesture.rootPan}>
      {/* ... */}
    </GestureDetector>
  )
}
```

**Pros:**
- Refs and gestures never leave their creation scope
- No serialization issues
- Cleaner architecture

**Cons:**
- Requires refactoring VideoAnalysisScreen to not pass gesture/animation

### Option 2: Use React Context for Refs and Gestures

Create a context to share refs without passing through props:

```typescript
// Create VideoAnalysisRefsContext
const VideoAnalysisRefsContext = createContext<{
  videoControlsRef: RefObject<VideoControlsRef | null>
  scrollRef: AnimatedRef<Animated.ScrollView>
  rootPanRef: RefObject<any>
}>()

// In VideoAnalysisScreen
<VideoAnalysisRefsContext.Provider value={refs}>
  <VideoAnalysisLayout {...otherProps} />
</VideoAnalysisRefsContext.Provider>

// In VideoAnalysisLayout
const { videoControlsRef, scrollRef, rootPanRef } = useVideoAnalysisRefs()
```

**Pros:**
- Refs don't go through props
- Can still access refs where needed

**Cons:**
- More complex architecture
- Context overhead

### Option 3: Memoize Props and Prevent Reanimated Cloning

Wrap props in `React.memo` with custom comparison to prevent unnecessary cloning:

```typescript
export const VideoAnalysisLayout = React.memo(
  VideoAnalysisLayoutComponent,
  (prevProps, nextProps) => {
    // Custom comparison - exclude non-serializable props from comparison
    // This might prevent unnecessary shadow tree cloning
    return (
      prevProps.video.uri === nextProps.video.uri &&
      prevProps.feedback.items.length === nextProps.feedback.items.length
      // Don't compare refs/gestures
    )
  }
)
```

**Pros:**
- Minimal code changes
- May reduce cloning frequency

**Cons:**
- Doesn't solve root cause - props still contain non-serializable data
- Reanimated may still try to clone when props change

## Recommended Fix Implementation

**Priority 1: Move Gesture and Animation Creation to Layout Component**

1. Remove `gesture` and `animation` from `VideoAnalysisLayoutProps`
2. Import and call hooks directly in `VideoAnalysisLayout.native.tsx`
3. Update `VideoAnalysisScreen.tsx` to not pass gesture/animation props
4. Keep refs local to components that need them

**Priority 2: Remove Refs from Props**

1. Use React Context for refs that need to be shared
2. Or access refs directly where created (don't pass through props)

## Testing Plan

After fix:
1. ✅ Run app on iOS Simulator
2. ✅ Navigate to video analysis screen
3. ✅ Perform gestures to trigger shadow tree updates
4. ✅ Monitor for crashes during mount/unmount cycles
5. ✅ Test with fast gesture interactions
6. ✅ Test with rapid navigation (mount/unmount cycles)
7. ✅ Use Instruments to check for memory leaks

## Debugging Commands

```bash
# Enable React Native debug logging
export RCT_DEBUG=1

# Enable Reanimated logging
export REANIMATED_LOG_LEVEL=debug

# Run with crash reporting
yarn native --verbose
```

## References

- React Native Shadow Tree: https://github.com/facebook/react-native/blob/main/packages/react-native/React/ShadowTree/
- Reanimated Shadow Tree Cloning: https://github.com/software-mansion/react-native-reanimated/blob/main/src/reanimated2/ShadowTreeCloner.cpp
- Folly Dynamic: https://github.com/facebook/folly/blob/main/folly/dynamic.h
- React Native Props Serialization: React Native uses `folly::dynamic` for bridge communication

## Related Issues

Similar crashes reported when passing non-serializable objects through props to animated components.

## Next Steps

1. ✅ REMOVE refs and gesture objects from props
2. ✅ Move gesture/animation creation to layout component
3. ✅ Use Context or direct access for refs that need sharing
4. ✅ Test thoroughly on iOS Simulator and physical device
5. ✅ Monitor crash reports for recurrence

## Change Log

- **2025-10-30 11:14:55:** Initial crash - `DerivedValue` in props
- **2025-10-30 11:21:50:** Crash after fix - refs and gesture objects in props
- **Next:** Remove all non-serializable props
