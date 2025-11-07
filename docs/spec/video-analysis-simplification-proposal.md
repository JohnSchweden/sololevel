# VideoAnalysisScreen Simplification Proposal

## Current State: The Mess

**13 hooks** + **2 Zustand stores** + **7 useMemo compositions** = **612 lines** of orchestration code.

**Active Features:**
- ✅ Feedback system (items, audio playback, coordination)
- ✅ Video playback (basic play/pause/seek)

**Dummy/Placeholder:**
- ❌ Social counts (hardcoded: `{ likes: 1200, comments: 89, ... }`)
- ❌ Social actions (just `log.info()` calls)
- ❌ Comments (mock data)
- ❌ Insights tab (likely empty)

## Battle-Tested Simplification

### Pattern: YouTube/Vimeo Architecture

**Key Principles:**
1. **Imperative API** - Video player exposes ref with `.play()`, `.pause()`, `.seek()` methods
2. **3-4 Core Hooks Max** - Consolidate related functionality
3. **Single Store** - One Zustand store for global state
4. **Remove Dummy Code** - Delete placeholder features until needed

### Proposed Architecture

#### 1. Consolidate to 3 Core Hooks

**`useVideoPlayer`** (replaces 3 hooks)
```typescript
// Consolidates: useVideoPlayback + useVideoControls + useVideoAudioSync
const videoPlayerRef = useVideoPlayer({
  uri: videoUri,
  initialStatus,
  onLoad: (duration) => {},
  onProgress: (time) => {},
  onEnd: () => {},
})

// Imperative API (like YouTube)
videoPlayerRef.current.play()
videoPlayerRef.current.pause()
videoPlayerRef.current.seek(time)
```

**`useFeedbackSystem`** (replaces 4 hooks)
```typescript
// Consolidates: useFeedbackCoordinator + useFeedbackAudioSource + 
//               useAudioController + useFeedbackPanel
const feedback = useFeedbackSystem({
  feedbackItems,
  videoPlayer: videoPlayerRef,
  onFeedbackTap: (item) => {},
})

// Returns: { items, selectedId, bubbleState, overlayVisible, handlers }
```

**`useAnalysis`** (replaces 2 hooks)
```typescript
// Consolidates: useAnalysisState + useHistoricalAnalysis
const analysis = useAnalysis({
  analysisJobId,
  videoRecordingId,
})

// Returns: { phase, progress, feedbackItems, error }
```

#### 2. Single Zustand Store

**`useFeedbackStore`** (replaces 2 stores)
```typescript
// Single source of truth for feedback state
const highlightedId = useFeedbackStore(s => s.highlightedFeedbackId)
const bubbleState = useFeedbackStore(s => s.bubbleState)
const overlayVisible = useFeedbackStore(s => s.overlayVisible)
```

#### 3. Remove Dummy Code

**Delete:**
- `socialCounts` hardcoded object
- `onShare`, `onLike`, `onComment`, `onBookmark` handlers (just logs)
- Mock comments (use empty array until real API)
- `useAutoPlayOnReady` (move logic into `useVideoPlayer`)
- `useStatusBar` (move to layout component)

#### 4. Native-Only Hook (Optional)

**`useVideoLayout`** (replaces 2 hooks, native only)
```typescript
// Consolidates: useGestureController + useAnimationController
const layout = useVideoLayout({
  videoPlayer: videoPlayerRef,
  feedbackPanel: feedbackPanelRef,
})

// Returns: { gestureRef, animationRef, scrollY }
```

### Result: Simplified Component

```typescript
export function VideoAnalysisScreen(props: VideoAnalysisScreenProps) {
  // 3 core hooks (down from 13)
  const videoPlayerRef = useVideoPlayer({ uri: props.videoUri, ... })
  const analysis = useAnalysis({ analysisJobId: props.analysisJobId })
  const feedback = useFeedbackSystem({ 
    feedbackItems: analysis.feedbackItems,
    videoPlayer: videoPlayerRef 
  })

  // Native-only (optional)
  const layout = useVideoLayout({ videoPlayer: videoPlayerRef })

  // Single store subscription
  const highlightedId = useFeedbackStore(s => s.highlightedFeedbackId)

  return (
    <VideoAnalysisLayout
      videoPlayerRef={videoPlayerRef}
      feedback={feedback}
      analysis={analysis}
      layout={layout}
      onBack={props.onBack}
    />
  )
}
```

**Line Count:** ~150 lines (down from 612)

### Migration Strategy

1. **Phase 1:** Consolidate video hooks → `useVideoPlayer`
2. **Phase 2:** Consolidate feedback hooks → `useFeedbackSystem`
3. **Phase 3:** Merge stores → single `useFeedbackStore`
4. **Phase 4:** Remove dummy code (social counts, placeholder handlers)
5. **Phase 5:** Consolidate analysis hooks → `useAnalysis`

### Benefits

- ✅ **75% reduction** in hook count (13 → 3-4)
- ✅ **75% reduction** in component lines (612 → ~150)
- ✅ **Single store** instead of dual state management
- ✅ **Imperative API** matches battle-tested patterns (YouTube/Vimeo)
- ✅ **No dummy code** - only real features
- ✅ **Easier testing** - mock 3 hooks instead of 13

### Battle-Tested References

- **YouTube:** Imperative video player API (`player.play()`, `player.pause()`)
- **Vimeo:** Single store for player state, ref-based controls
- **Netflix:** 3-4 core hooks max, consolidate related functionality
- **Spotify:** Remove placeholder features, add when needed

