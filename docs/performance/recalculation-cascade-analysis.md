# Recalculation Cascade Analysis

## The Problem

When `activeAudioId: null → 257`, we see this cascade:

1. **useFeedbackCoordinator** recalculates ✅ (Expected - `activeAudioId` changed)
   - Returns new object with `activeAudio: { id: '257', url: '...' }`
   - Other values unchanged: `highlightedFeedbackId`, `isCoachSpeaking`, `bubbleState`, etc.

2. **stableCoordinator** recalculates ✅ (Expected - `coordinatorActiveAudioId` changed)
   - Extracts primitives from coordinator
   - Reconstructs object with same structure
   - Creates NEW object reference even though most values are same

3. **feedbackState** recalculates ⚠️ (Expected - `stableCoordinator` changed)
   - Uses `stableCoordinator` as dependency
   - Creates NEW object with:
     - `coordinator: stableCoordinator` (new reference)
     - `selectedFeedbackId: stableCoordinator.highlightedFeedbackId` (same value - still null!)
     - `items`, `panel`, `state` (same values)
     - `phase`, `progress`, etc. (same values)

4. **feedback** in VideoAnalysisScreen recalculates ⚠️ (Expected - `orchestrated.feedback` changed)
   - Uses `orchestrated.feedback.selectedFeedbackId` (same value - still null!)
   - Uses `orchestrated.feedback.items` (same values)
   - Uses `orchestrated.feedback.panelFraction` (same values)
   - Creates NEW object reference even though values haven't changed

5. **VideoAnalysisLayout** re-renders ⚠️ (Expected - `feedback` prop reference changed)
   - React.memo sees `feedback` object reference changed
   - Allows re-render even though values haven't changed
   - Child components might also re-render unnecessarily

## Root Cause

**React's shallow comparison**: When props are objects, React.memo only compares object references, not values. Even if `feedback.selectedFeedbackId` hasn't changed, if the `feedback` object reference changed, React.memo allows the render.

## Architectural Solutions

### Option 1: Granular State Splitting (Recommended)

Split `feedbackState` into separate, independently memoized objects:

```typescript
// Instead of one big feedbackState object:
const feedbackState = useMemo(() => ({
  items: feedbackItems,
  coordinator: stableCoordinator,
  panel: feedbackPanel,
  state: analysisState,
  // ...
}), [...])

// Split into granular objects:
const feedbackItemsState = useMemo(() => ({
  items: feedbackItems,
  selectedFeedbackId: stableCoordinator.highlightedFeedbackId,
  // ...
}), [feedbackItems, stableCoordinator.highlightedFeedbackId])

const feedbackCoordinatorState = useMemo(() => stableCoordinator, [stableCoordinator])

const feedbackPanelState = useMemo(() => feedbackPanel, [feedbackPanel])

const feedbackAnalysisState = useMemo(() => analysisState, [analysisState])
```

Then pass only what each component needs.

### Option 2: Value-Based Memoization

Use custom comparison functions that compare values, not references:

```typescript
const VideoAnalysisLayout = memo(
  function VideoAnalysisLayout(props: VideoAnalysisLayoutProps) {
    // ...
  },
  (prevProps, nextProps) => {
    // Custom comparison: compare values, not references
    if (prevProps.feedback.selectedFeedbackId !== nextProps.feedback.selectedFeedbackId) return false
    if (prevProps.feedback.items !== nextProps.feedback.items) return false
    if (prevProps.feedback.panelFraction !== nextProps.feedback.panelFraction) return false
    // ... compare all fields
    return true // props are equal
  }
)
```

### Option 3: Accept Cascade, Optimize Components

Keep current architecture but ensure all child components use React.memo with proper comparisons. The cascade is correct behavior - when `activeAudioId` changes, the UI SHOULD update to show the audio overlay.

## Recommendation

**Option 1 (Granular State)** is best because:
- Prevents unnecessary recalculations
- Makes dependencies explicit
- Easier to optimize individual pieces
- Better for performance debugging

**Option 3** is pragmatic because:
- Current cascade is actually correct - values DID change
- React.memo should handle this if components are optimized
- Less architectural change required

## Current State

The recalculation chain is **working correctly**:
- Coordinator updates when `activeAudioId` changes ✅
- stableCoordinator updates when coordinator changes ✅
- feedbackState updates when coordinator changes ✅
- feedback prop updates when feedbackState changes ✅
- VideoAnalysisLayout re-renders when feedback prop changes ✅

The issue is that **child components might re-render unnecessarily** because they receive object props that changed reference but not values.

## Next Steps

1. Identify which components actually use `activeAudio` or `audioOverlay`
2. Ensure those components are memoized with proper comparisons
3. Consider splitting `feedbackState` into granular objects if re-renders are still excessive

