# Re-Render Analysis - October 7, 2025

## Executive Summary

Analysis of production logs reveals **4 critical performance issues** causing excessive re-renders in the VideoAnalysis feature. **AudioPlayer seeking issue has been FIXED** - other issues remain pending.

---

## Issue 1: AudioPlayer Excessive Seeking ⚠️ CRITICAL ✅ FIXED

### Validation
**Log Evidence (Lines 84-87, 123, 165, 248, etc.):**
```
DEBUG  12:28:41.185Z 🐛 [useAudioController] Seeking to time — time=0
DEBUG  12:28:41.248Z 🐛 [useAudioController] Seeking to time — time=0
DEBUG  12:28:41.287Z 🐛 [useAudioController] Seeking to time — time=0
```

**Root Cause:**
`AudioPlayer.native.tsx:84-86` calls `seekTo(0)` on every `onLoad` event:
```typescript
if (controller.seekTime === null) {
  log.debug('AudioPlayer', 'No seek time set, seeking to start after load')
  controller.seekTo(0)  // ❌ Triggers re-render
}
```

**Impact:**
- ~30 unnecessary seeks per audio playback cycle
- Each seek triggers state update → re-render cascade
- Causes jank during audio feedback playback

### Solution

```typescript
// packages/ui/src/components/VideoAnalysis/AudioPlayer/AudioPlayer.native.tsx

// Add ref to track if initial seek has been done
const hasInitializedRef = useRef(false)

onLoad={(data) => {
  log.info('AudioPlayer', 'Video component onLoad', { data, controllerState })
  controller.handleLoad(data)

  // ✅ Only seek once per audio URL change
  if (!hasInitializedRef.current && controller.seekTime === null) {
    log.debug('AudioPlayer', 'Initial seek to start')
    controller.seekTo(0)
    hasInitializedRef.current = true
  }
}}

// Reset ref when audioUrl changes
useEffect(() => {
  hasInitializedRef.current = false
}, [audioUrl])
```

**Additional Fixes Implemented:**
- **Gated seekTo calls:** `useAudioController.seekTo()` now skips if `seekTime` is already at target value
- **Reliable seek completion:** `handleSeekComplete` ensures `seekTime` is cleared consistently
- **Reduced render logging:** Moved component render logs to mount-only to prevent per-render spam

**Expected Impact:** Reduce seeks from ~30 to 1 per audio playback (97% reduction).

---

## Issue 2: Excessive Bubble Checking 🔥 HIGH PRIORITY

### Validation
**Log Evidence (Lines 13-14, 19-20, 219-220, 422-423):**
```
INFO   12:28:38.725Z ℹ️ ️ [useBubbleController] checking bubble trigger — index=0 itemId=866 
INFO   12:28:38.728Z ℹ️ ️ [useBubbleController] checking bubble trigger — index=1 itemId=867
```

**Root Cause:**
`useBubbleController.ts:188-198` logs **every check** for **every feedback item**:
```typescript
for (let index = 0; index < feedbackItemsRef.current.length; index += 1) {
  const item = feedbackItemsRef.current[index]
  // ... calculations ...
  
  log.info('useBubbleController', 'checking bubble trigger', {  // ❌ Logs even when canShow=false
    index, itemId, itemTimestamp, currentTimeMs, timeDiff,
    isNearTimestamp, bubbleVisible, currentBubbleIndex, canShow,
  })
}
```

**Impact:**
- With 2 feedback items, checking every ~1.25s = ~96 log entries per minute
- Unnecessary computation and logging overhead
- Clutters logs making debugging harder

### Solution

```typescript
// packages/app/features/VideoAnalysis/hooks/useBubbleController.ts:173-209

const checkAndShowBubbleAtTime = useCallback(
  (currentTimeMs: number) => {
    const lastCheck = lastCheckTimestampRef.current
    if (lastCheck !== null && Math.abs(currentTimeMs - lastCheck) < CHECK_THROTTLE_MS) {
      return null
    }

    lastCheckTimestampRef.current = currentTimeMs

    for (let index = 0; index < feedbackItemsRef.current.length; index += 1) {
      const item = feedbackItemsRef.current[index]
      const timeDiff = Math.abs(currentTimeMs - item.timestamp)
      const isNearTimestamp = timeDiff < TIMESTAMP_THRESHOLD_MS
      const canShow = isNearTimestamp && (!bubbleVisible || currentBubbleIndex !== index)

      // ✅ Only log when actually showing a bubble
      if (canShow) {
        log.info('useBubbleController', 'Triggering bubble show', {
          index,
          itemId: item.id,
          itemTimestamp: item.timestamp,
          currentTimeMs,
          timeDiff,
        })
        showBubble(index)
        return index
      }
    }

    return null
  },
  [bubbleVisible, currentBubbleIndex, showBubble]
)
```

**Expected Impact:** Reduce log spam by ~95%, improve performance during video playback.

---

## Issue 3: FeedbackPanel Redundant Highlight Logging 📊 MEDIUM

### Validation
**Log Evidence (Lines 62, 87, 117, 150, 177, etc.):**
```
DEBUG  12:28:41.129Z 🐛 [FeedbackPanel] Item highlighted — itemId=866 selectedFeedbackId=866
DEBUG  12:28:41.211Z 🐛 [FeedbackPanel] Item highlighted — itemId=866 selectedFeedbackId=866
DEBUG  12:28:41.273Z 🐛 [FeedbackPanel] Item highlighted — itemId=866 selectedFeedbackId=866
```

**Root Cause:**
`FeedbackPanel.tsx:338-343` logs on every render when item is highlighted:
```typescript
{sortedFeedbackItems.map((item, index) => {
  const isHighlighted = selectedFeedbackId === item.id

  if (__DEV__ && isHighlighted) {  // ❌ Logs every render
    logger.debug('FeedbackPanel', 'Item highlighted', {
      itemId: item.id,
      selectedFeedbackId,
    })
  }
```

**Impact:**
- ~15 duplicate logs per second when item is highlighted
- Indicates FeedbackPanel is re-rendering frequently
- Component should be memoized better

### Solution

```typescript
// packages/ui/src/components/VideoAnalysis/FeedbackPanel/FeedbackPanel.tsx

// Option 1: Remove redundant logging (RECOMMENDED)
// Simply delete lines 338-343 - this is debug noise, not useful information

// Option 2: Log only on change
const prevSelectedRef = useRef<string | null>(null)

useEffect(() => {
  if (selectedFeedbackId !== prevSelectedRef.current) {
    if (__DEV__ && selectedFeedbackId) {
      logger.debug('FeedbackPanel', 'Selected feedback changed', {
        previous: prevSelectedRef.current,
        current: selectedFeedbackId,
      })
    }
    prevSelectedRef.current = selectedFeedbackId
  }
}, [selectedFeedbackId])

// Then remove the inline logging from the map
```

**Expected Impact:** Eliminate ~900 redundant log entries per minute.

---

## Issue 4: AudioController State Instability 🔄 MEDIUM

### Validation
**Log Evidence (Lines 80, 184, 281):**
```
DEBUG  12:28:41.184Z 🐛 [useAudioController] Audio URL changed, updating state
DEBUG  12:28:47.437Z 🐛 [useAudioController] Audio URL changed, updating state
```

**Root Cause:**
`useAudioController.ts:35-61` resets state on URL change, but the effect dependency causes cascading updates:
```typescript
useEffect(() => {
  if (audioUrl !== previousAudioUrlRef.current) {
    // Multiple setState calls in sequence
    setCurrentTime(0)      // ❌ Triggers re-render
    setDuration(0)         // ❌ Triggers re-render
    setIsLoaded(false)     // ❌ Triggers re-render
    setSeekTime(null)      // ❌ Triggers re-render
    
    previousAudioUrlRef.current = audioUrl
  }
}, [audioUrl])
```

**Impact:**
- 4 state updates = 4 re-renders per audio URL change
- Cascades to all components consuming audioController
- Causes brief UI jank during feedback transitions

### Solution

```typescript
// packages/app/features/VideoAnalysis/hooks/useAudioController.ts:35-61

useEffect(() => {
  if (audioUrl !== previousAudioUrlRef.current) {
    log.debug('useAudioController', 'Audio URL changed, updating state', {
      previousUrl: previousAudioUrlRef.current,
      newUrl: audioUrl,
      preserveIsPlaying: audioUrl !== null,
    })

    // ✅ Batch state updates to prevent multiple re-renders
    if (audioUrl === null) {
      // Use functional updates to batch
      setIsPlaying(false)
      // Batch the rest
      React.startTransition(() => {
        setCurrentTime(0)
        setDuration(0)
        setIsLoaded(false)
        setSeekTime(null)
      })
    } else {
      // Batch state updates for URL change
      React.startTransition(() => {
        setCurrentTime(0)
        setDuration(0)
        setIsLoaded(false)
        setSeekTime(null)
      })
    }

    previousAudioUrlRef.current = audioUrl
  }
}, [audioUrl])
```

**Alternative Solution (Better):**
```typescript
// Use useReducer instead of multiple useState calls
const [audioState, dispatch] = useReducer(audioReducer, initialState)

useEffect(() => {
  if (audioUrl !== previousAudioUrlRef.current) {
    // ✅ Single state update
    dispatch({ 
      type: 'URL_CHANGED', 
      payload: { audioUrl, preserveIsPlaying: audioUrl !== null } 
    })
    previousAudioUrlRef.current = audioUrl
  }
}, [audioUrl])
```

**Expected Impact:** Reduce re-renders from 4 to 1 per audio transition.

---

## Additional Observations

### useVideoAudioSync is Working Correctly ✅
The `logOnChange` utility only logs when state **actually changes**, so the logs at lines 2-12, 30-48, etc. are legitimate state transitions, not unnecessary re-renders.

### useFeedbackCoordinator State Changes are Expected ✅
Lines 16-17, 83-84, 152, etc. show coordinator responding to legitimate events (bubble show/hide, audio play/pause). These are necessary state changes.

---

## Implementation Priority

1. **Issue 1 (AudioPlayer seeking)** ✅ **COMPLETED** - Immediate fix, highest impact
2. **Issue 2 (Bubble checking logs)** - Quick win, improves debugging
3. **Issue 3 (FeedbackPanel logging)** - Simple cleanup
4. **Issue 4 (AudioController batching)** - Refactor for stability

---

## Testing Checklist

After implementing fixes:
- [x] **AudioPlayer fix verified:** All tests pass, type-check succeeds, audio functionality intact
- [ ] Verify audio playback starts correctly
- [ ] Confirm bubbles still appear at correct timestamps
- [ ] Check feedback selection still works
- [ ] Measure log output reduction (should be ~90% less)
- [ ] Profile with React DevTools to confirm re-render reduction
- [ ] Test audio transitions between feedback items

---

## Metrics

**Before Fixes:**
- ~30 seeks per audio playback
- ~96 bubble check logs per minute
- ~900 highlight logs per minute
- 4 re-renders per audio transition

**After Fixes (Expected):**
- 1 seek per audio playback (97% reduction)
- ~5 bubble logs per minute (95% reduction)
- 0 redundant highlight logs (100% reduction)
- 1 re-render per audio transition (75% reduction)

**Total Expected Performance Improvement:** ~90% reduction in unnecessary operations
