# Animation Performance Investigation

**Date:** 2025-01-27  
**Issue:** Frame drop warnings and rapid re-renders detected after adding performance tracking hooks

## Findings

### 1. Tracking Issue: False Positives ⚠️

**Problem:** `VideoAnalysisLayout` frame drop detection was always active when `panelFraction > 0` (panel visible), even when no animations were running.

**Evidence:**
- Frame drops accumulating continuously: 82 → 94 → 99 → 102 → ... → 197
- Panel fraction is constant (0.4 = `EXPANDED_FRACTION`), never changes
- Frame drops tracked even when user is idle (no gestures, no animations)

**Root Cause:**
```typescript
// BEFORE (incorrect):
useFrameDropDetection({
  isActive: feedback.panelFraction > 0, // Always true when panel visible
  ...
})
```

**Fix:**
```typescript
// AFTER (correct):
const isAnimating = !gesture.feedbackScrollEnabled || gesture.blockFeedbackScrollCompletely
useFrameDropDetection({
  isActive: isAnimating, // Only true during actual animations
  ...
})
```

**Status:** ✅ Fixed - Now only tracks during actual gesture animations

---

### 2. Real Issue: Rapid Re-Renders 🚨

**Problem:** `VideoAnalysisLayout` is re-rendering faster than 60fps (< 16ms between renders) with NO prop changes.

**Evidence from logs:**
```
DEBUG  useRenderProfile.VideoAnalysisLayout 🔄 Component re-rendered
{
  "renderCount": 64,
  "timeSinceLastRender": 7,  // < 16ms = faster than 60fps!
  "changedProps": []          // NO PROPS CHANGED!
}
```

**Occurrences:**
- Lines 58, 60, 62, 90, 92, 94: Multiple rapid re-renders (6-9ms intervals)
- `changedProps: []` in all cases - no actual prop changes triggering renders

**Impact:**
- Excessive React reconciliation
- Potential cause of frame drops (197 frames dropped)
- Unnecessary component tree updates
- Performance degradation

**Possible Causes:**
1. SharedValue changes causing re-renders (unlikely - SharedValues don't trigger React renders)
2. Context updates from gesture controller
3. State updates from hooks (useState/useRef creating new references)
4. Parent component re-renders cascading down
5. `useRenderProfile` hook itself causing issues (meta tracking)

**Investigation Needed:**
- [ ] Check if `VideoAnalysisContext` is updating frequently
- [ ] Verify gesture controller state updates aren't triggering renders
- [ ] Check parent `VideoAnalysisScreen` re-render frequency
- [ ] Profile React DevTools to identify render source
- [ ] Consider memoizing VideoAnalysisLayout props more aggressively

**Status:** 🚧 **Needs Investigation** - Real performance issue

---

### 3. Frame Drops: Real vs Tracking

**VideoAnalysisLayout Frame Drops (82-197):**
- **Tracking Issue:** ✅ Fixed - was tracking when not animating
- **Real Drops:** 🚨 Likely real - accumulating to 197 frames suggests actual performance degradation
- **Possible Cause:** Rapid re-renders (see #2)

**FeedbackBubbles Frame Drops (6-38):**
- **Status:** ✅ Normal - Only tracking during actual animations
- **Level:** Acceptable (< 40 frames dropped)
- **Pattern:** Drops increase as animation continues (expected)

---

### 4. Feedback Panel Tracking

**Status:** ✅ Working correctly
- LayoutAnimation completion tracking
- Frame drops only during flex changes
- Render profiling showing normal intervals (286ms)

---

## Recommendations

### Immediate Actions
1. ✅ **DONE:** Fix frame drop tracking to only activate during animations
2. 🚧 **TODO:** Investigate rapid re-renders in VideoAnalysisLayout
3. 🚧 **TODO:** Profile React DevTools to find render source

### Long-Term
1. Add React.memo optimization to VideoAnalysisLayout
2. Investigate Context updates frequency
3. Consider virtualization for feedback items if list grows large
4. Add performance budgets for re-render frequency

## Next Steps

1. **Investigate rapid re-renders:**
   - Add React DevTools Profiler
   - Check VideoAnalysisContext update frequency
   - Verify gesture controller callbacks aren't creating new function references
   - Profile parent component re-renders

2. **Verify fix:**
   - Test frame drop tracking now only triggers during gestures
   - Confirm frame drops reduce when not animating
   - Monitor for any regression in tracking accuracy

3. **Performance Budget:**
   - Target: < 5 frame drops per gesture
   - Target: Re-renders every 16ms+ (60fps)
   - Alert on: > 20 frame drops or < 10ms re-render intervals
