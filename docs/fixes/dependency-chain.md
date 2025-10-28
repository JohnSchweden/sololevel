# Error Log and Resolutions

## 2025-01-28: VideoControls Auto-Hide Timer Extended During Audio Playback

### Problem

Controls auto-hide timer was being repeatedly reset while audio feedback was playing, preventing controls from hiding after the expected 1-second delay.

**Expected Behavior:**
- User taps video to show controls
- If any media (video OR audio) is playing, controls should auto-hide after 1 second
- Timer should fire once and hide controls

**Actual Behavior:**
- User taps video to show controls
- Controls show correctly
- Timer starts but is repeatedly reset on every render
- Controls remain visible for the entire duration of audio playback
- Timer only fires after audio stops

### Root Cause Analysis

**Log Analysis (from terminal selection):**

```
Line 161: User taps → controls toggle to visible
Line 189-572: resetAutoHideTimer called repeatedly (every render/progress update)
  - Each call: isPlaying=true, shouldStartTimer=true
  - Timer is cleared and restarted on each call
  - Timer never completes because it's constantly being reset
```

**Architecture Issue:**

The `useControlsVisibility` hook receives `isPlaying` prop which represents **user intent to play video**, not **actual media playback state**:

1. `VideoControls` receives `isPlaying` from `useVideoPlayback.isPlaying`
2. This value represents user's play/pause intention
3. When audio plays, `useVideoAudioSync` pauses the video but `isPlaying` remains `true`
4. The hook checks: `shouldStartTimer = isPlaying && !isScrubbing && controlsVisible`
5. Since `isPlaying=true`, timer keeps restarting on every render
6. Effect dependencies cause `resetAutoHideTimer` to run repeatedly

**Code Location:**

```typescript:214:243:packages/ui/src/components/VideoAnalysis/VideoControls/hooks/useControlsVisibility.ts
    // Only start timer if:
    // 1. Video is playing
    // 2. User is not scrubbing
    // 3. Controls are currently visible
    // Note: showControls can be true or false - timer should start in both cases when playing
    // showControls true = user tapped to show controls (should auto-hide)
    // showControls false = external API showing controls (should auto-hide)
    const shouldStartTimer = isPlaying && !isScrubbing && controlsVisible
```

The issue is that `isPlaying` doesn't account for audio playback. The orchestrator already calculates:
- `isPlaying` - user intent (from `useVideoPlayback`)
- `isAudioActive` - audio playback state (from `useAudioController`)
- `shouldPlayVideo` - actual video playback (from `useVideoAudioSync`)

But `VideoControls` only receives `isPlaying`, which doesn't tell the full story.

### Solution: Fix Unstable Callback Dependencies

The root cause was an **unstable callback dependency chain**:

1. `useVideoControls` returns `setControlsVisible` which depends on `forcedVisible`
2. `forcedVisible` changes when `isPlaying` changes
3. When `isPlaying` changes, `setControlsVisible` callback is recreated
4. This causes `videoControls` object to get new identity
5. `handleControlsVisibilityChange` in orchestrator depends on `videoControls`
6. `handleControlsVisibilityChange` is recreated
7. This is passed as `onControlsVisibilityChange` to `VideoControls`
8. `useControlsVisibility`'s `resetAutoHideTimer` depended on `onControlsVisibilityChange`
9. Effect runs `resetAutoHideTimer()` whenever it changes
10. **Timer is constantly being cleared and restarted on every render!**

**Fix Applied:**

Store `onControlsVisibilityChange` in a ref to break the dependency chain:

```typescript
// Store callback in ref to avoid recreating resetAutoHideTimer when callback changes
const onControlsVisibilityChangeRef = useRef(onControlsVisibilityChange)
onControlsVisibilityChangeRef.current = onControlsVisibilityChange

const resetAutoHideTimer = useCallback(() => {
  // ... timer logic ...
  onControlsVisibilityChangeRef.current?.(false)  // Use ref instead
}, [
  isPlaying,
  isScrubbing,
  controlsVisible,
  autoHideDelayMs,
  // ❌ REMOVED: onControlsVisibilityChange
])
```

This ensures `resetAutoHideTimer` only recreates when **meaningful playback state** changes, not when parent callbacks are recreated.

**Files Modified:**
- `packages/ui/src/components/VideoAnalysis/VideoControls/hooks/useControlsVisibility.ts`

**Changes:**
1. Added ref to store `onControlsVisibilityChange`
2. Removed `onControlsVisibilityChange` from all `useCallback` dependencies
3. Used ref version (`onControlsVisibilityChangeRef.current`) in all callback bodies
4. Removed from effect dependencies where it was causing unnecessary re-runs

### Test Results

**Command:** `yarn workspace @my/ui test VideoControls.test.tsx --verbose`

**Test Suites:** 1 passed, 1 total  
**Tests:** 8 skipped, 37 passed, 45 total  
**Status:** ✅ All tests pass

Key test coverage:
- ✅ Auto-hide timer starts when video plays
- ✅ Timer stops when video pauses
- ✅ Timer cleans up on unmount
- ✅ showControls prop overrides timer
- ✅ Ref API works correctly
- ✅ Tap-to-toggle functionality
- ✅ Processing state management
- ✅ Persistent progress bar behavior

### Next Steps

1. ✅ Root cause identified - unstable callback chain
2. ✅ Fix implemented - use ref pattern for callback
3. ✅ All existing tests pass
4. ⚠️ UNVERIFIED - Need to test with actual app to verify timer behavior during audio playback
5. ⚠️ UNVERIFIED - May need to add test case specifically for audio playback scenario

### Manual Testing Checklist

- [ ] Controls hide after 1s when video is playing
- [ ] **Controls hide after 1s when audio is playing** ← Primary fix validation
- [ ] Controls hide after 1s when both video and audio are playing
- [ ] Controls don't hide when user is scrubbing
- [ ] Controls don't hide when media is paused
- [ ] Timer resets when user taps again
- [ ] Timer clears when user manually hides controls
- [ ] No excessive re-renders during audio playback

### Expected Behavior After Fix

Before this fix, the logs showed `resetAutoHideTimer` being called repeatedly:
```
Line 189-572: resetAutoHideTimer called repeatedly (every render)
```

After this fix, `resetAutoHideTimer` should only be called when:
- `isPlaying` changes
- `isScrubbing` changes  
- `controlsVisible` changes
- `autoHideDelayMs` changes
- `resetTrigger` is explicitly incremented (user tap)

The timer should complete and hide controls after 1 second, even during audio playback.

### Related Files

- `packages/ui/src/components/VideoAnalysis/VideoControls/hooks/useControlsVisibility.ts` - Timer logic (MODIFIED)
- `packages/ui/src/components/VideoAnalysis/VideoControls/VideoControls.tsx` - Component
- `packages/app/features/VideoAnalysis/hooks/useVideoAudioSync.ts` - Sync logic
- `packages/app/features/VideoAnalysis/hooks/useVideoControls.ts` - Controls state
- `packages/app/features/VideoAnalysis/hooks/useVideoAnalysisOrchestrator.ts` - Orchestrator
- `packages/app/features/VideoAnalysis/components/VideoPlayerSection.tsx` - Props passing

---

**Status:** ✅ Fix implemented, tests pass  
**Resolution:** Used ref pattern to stabilize callback dependencies and prevent timer restarts  
**Next:** Manual testing required to verify timer behavior during audio playback
