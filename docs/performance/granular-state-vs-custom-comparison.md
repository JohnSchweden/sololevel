# Granular State vs Custom Comparison Functions

## Current Situation

Looking at the code:
- `VideoAnalysisScreen` already partially uses granular state: `bubbleState` and `audioOverlay` are split out and memoized separately ✅
- `feedbackState` returns one big object that recreates when ANY dependency changes ❌
- `FeedbackSection` receives individual props (not a big object) ✅
- But the `feedback` object passed to `VideoAnalysisLayout` still recreates unnecessarily ❌

## Option A: Custom Comparison Functions + React.memo

### Implementation
```typescript
export const FeedbackSection = memo(
  function FeedbackSection(props) { /* ... */ },
  (prevProps, nextProps) => {
    return (
      prevProps.panelFraction === nextProps.panelFraction &&
      prevProps.activeTab === nextProps.activeTab &&
      prevProps.feedbackItems === nextProps.feedbackItems &&
      prevProps.selectedFeedbackId === nextProps.selectedFeedbackId &&
      prevProps.currentVideoTime === nextProps.currentVideoTime &&
      prevProps.errors === nextProps.errors &&
      prevProps.audioUrls === nextProps.audioUrls &&
      // ... compare all 14+ props
    )
  }
)
```

### Pros
- ✅ Less architectural change
- ✅ Works immediately

### Cons
- ❌ **Band-aid solution** - doesn't solve root cause (object recreation)
- ❌ **Maintenance burden** - need to update comparison when props change
- ❌ **Easy to miss props** - forgot one prop = unnecessary re-renders
- ❌ **Complex for nested objects** - how to compare `errors` and `audioUrls` objects?
- ❌ **Doesn't prevent object recreation** - still creating unnecessary objects
- ❌ **Hard to debug** - when comparison fails, hard to know why

## Option B: Granular State Splitting (Recommended)

### Implementation
```typescript
// In useVideoAnalysisOrchestrator:
const feedbackItemsState = useMemo(() => ({
  items: feedbackItems,
  selectedFeedbackId: stableCoordinator.highlightedFeedbackId,
  currentTime: video.currentTime,
}), [feedbackItems, stableCoordinator.highlightedFeedbackId, video.currentTime])

const feedbackPanelState = useMemo(() => ({
  panelFraction: feedbackPanel.panelFraction,
  activeTab: feedbackPanel.activeTab,
}), [feedbackPanel.panelFraction, feedbackPanel.activeTab])

const feedbackAnalysisState = useMemo(() => ({
  phase: analysisState.phase,
  progress: analysisState.progress,
  channelExhausted: analysisState.channelExhausted,
}), [analysisState.phase, analysisState.progress, analysisState.channelExhausted])

// In VideoAnalysisScreen:
<FeedbackSection
  panelFraction={feedbackPanelState.panelFraction}
  activeTab={feedbackPanelState.activeTab}
  feedbackItems={feedbackItemsState.items}
  selectedFeedbackId={feedbackItemsState.selectedFeedbackId}
  currentVideoTime={feedbackItemsState.currentTime}
  errors={feedbackAudio.errors}
  audioUrls={feedbackAudio.audioUrls}
  // ... rest of props
/>
```

### Pros
- ✅ **Solves root cause** - prevents unnecessary object recreation
- ✅ **React.memo works naturally** - props are stable, no custom comparison needed
- ✅ **Less maintenance** - no comparison functions to update
- ✅ **More scalable** - easy to add new props without worrying about comparisons
- ✅ **Better performance** - fewer object allocations
- ✅ **Easier to debug** - clear which state object changed
- ✅ **Consistent with existing pattern** - already doing this for `bubbleState` and `audioOverlay`

### Cons
- ❌ More architectural change
- ❌ Need to refactor orchestrator return value

## Real-World Example

### Current Flow (Problem)
```
activeAudioId: null → 257

1. useFeedbackCoordinator creates NEW object
2. stableCoordinator creates NEW object  
3. feedbackState creates NEW object (even though selectedFeedbackId didn't change)
4. VideoAnalysisScreen creates NEW feedback object (even though selectedFeedbackId didn't change)
5. VideoAnalysisLayout re-renders (feedback prop reference changed)
6. FeedbackSection re-renders (even though its props haven't changed) ❌
```

### With Granular State (Solution)
```
activeAudioId: null → 257

1. useFeedbackCoordinator creates NEW object
2. stableCoordinator creates NEW object
3. feedbackItemsState does NOT recalculate (selectedFeedbackId is still null) ✅
4. feedbackPanelState does NOT recalculate (panelFraction didn't change) ✅
5. VideoAnalysisScreen passes same feedbackItemsState, feedbackPanelState ✅
6. VideoAnalysisLayout does NOT re-render (props are same) ✅
7. FeedbackSection does NOT re-render (props are same) ✅
```

## Recommendation: **Option B (Granular State)**

### Why?
1. **Already partially done** - `bubbleState` and `audioOverlay` are already split out
2. **Solves root cause** - prevents object recreation at source
3. **React.memo works naturally** - no custom comparisons needed
4. **More maintainable** - no comparison functions to keep in sync
5. **Better performance** - fewer object allocations and re-renders

### When to Use Custom Comparisons?
- For **leaf components** that receive frequently-changing props (like `VideoControls` with `currentTime`)
- When you can't change the prop structure (third-party components)
- As a **last resort** when granular state isn't feasible

### Keep React.memo?
**Yes!** Keep React.memo even with granular state:
- React.memo still prevents re-renders when props haven't changed
- With granular state, props are stable, so React.memo works better
- No custom comparison needed - default shallow comparison is sufficient

## Implementation Plan

1. **Split `feedbackState` in orchestrator**:
   - `feedbackItemsState` (items, selectedFeedbackId, currentTime)
   - `feedbackPanelState` (panelFraction, activeTab)
   - `feedbackAnalysisState` (phase, progress, channelExhausted)
   - `feedbackErrorsState` (errors, audioUrls)

2. **Update VideoAnalysisScreen**:
   - Pass granular props instead of big `feedback` object
   - Already doing this pattern for `bubbleState` and `audioOverlay`

3. **Keep React.memo**:
   - No changes needed - React.memo works naturally with stable props

4. **Optional**: Add custom comparison for `VideoControls`:
   - Only component that receives frequently-changing props (`currentTime`)
   - Compare values, not just reference

