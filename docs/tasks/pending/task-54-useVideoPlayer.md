# Task 54: Consolidate Video Hooks → useVideoPlayer

**Effort:** 1 day | **Priority:** P1 (Technical Debt) | **Depends on:** None  
**User Story:** N/A (Architectural consolidation - video playback)  
**Parent Task:** Task 53

**STATUS:** ✅ **COMPLETE** (auto-play bug fixed, normalized initialStatus documented)

## Completion Summary

- Consolidated playback/controls/audio-sync/auto-play into `useVideoPlayer`, expanded JSDoc + types with normalization guidance to prevent history-mode regressions.
- Updated `VideoAnalysisScreen` wiring and docs to normalize `initialStatus` before passing to the hook; legacy hooks retained temporarily for Module 8 validation.
- Regression suite expanded to 16 tests mirroring legacy coverage; validation commands: `yarn workspace @my/app test useVideoPlayer.test.ts`, `yarn workspace @my/app test VideoAnalysisScreen.test.tsx`, `yarn workspace @my/app type-check`.

## Objective

Consolidate 4 video-related hooks (useVideoPlayback, useVideoControls, useVideoAudioSync, useAutoPlayOnReady) into single `useVideoPlayer` hook with imperative ref API (YouTube/Vimeo pattern).

## Current State

- ❌ 4 hooks: useVideoPlayback, useVideoControls, useVideoAudioSync, useAutoPlayOnReady
- ❌ Props passed through multiple composition layers
- ❌ Tight coupling between video playback and controls visibility
- ✅ Existing test files for all 4 hooks
- ✅ Well-defined interfaces in each hook

## Problem

- Video-related logic scattered across 4 hooks
- Each hook tested separately but integration untested
- Controls visibility tied to video state creates coupling
- No imperative API - all control via props

## Implementation Strategy

### Module 1: Create useVideoPlayer Hook Interface
**Summary:** Define TypeScript interfaces for imperative API and hook return type.

**File to Create:** `packages/app/features/VideoAnalysis/hooks/useVideoPlayer.types.ts`

**Tasks:**
- [x] Define `VideoPlayerRef` interface with imperative methods
- [x] Define `UseVideoPlayerReturn` interface
- [x] Define `UseVideoPlayerOptions` interface
- [x] Export all interfaces

**Interface:**
```typescript
export interface VideoPlayerRef {
  play: () => void
  pause: () => void
  seek: (time: number) => void
  replay: () => void
  getCurrentTime: () => number
  getDuration: () => number
}

export interface UseVideoPlayerReturn {
  ref: React.RefObject<VideoPlayerRef>
  isPlaying: boolean
  currentTime: number
  duration: number
  videoEnded: boolean
  pendingSeek: number | null
  showControls: boolean
  shouldPlayVideo: boolean
  onLoad: (data: { duration: number }) => void
  onProgress: (time: number) => void
  onEnd: () => void
}

export interface UseVideoPlayerOptions {
  initialStatus?: 'processing' | 'ready' | 'playing' | 'paused'
  audioIsPlaying?: boolean
}
```

**Acceptance Criteria:**
- [x] Types follow existing hook patterns
- [x] Imperative ref API matches YouTube/Vimeo style
- [x] `yarn type-check` passes

### Module 2: Implement Core Playback Logic
**Summary:** Consolidate useVideoPlayback state and logic into useVideoPlayer.

**File to Create:** `packages/app/features/VideoAnalysis/hooks/useVideoPlayer.ts`

**Tasks:**
- [x] Create hook skeleton with options parameter
- [x] Consolidate playback state (isPlaying, currentTime, duration, videoEnded, pendingSeek)
- [x] Implement imperative ref with play/pause/seek/replay methods
- [x] Handle onLoad callback (set duration)
- [x] Handle onProgress callback (update currentTime)
- [x] Handle onEnd callback (set videoEnded)
- [x] Maintain 1-second display time intervals (not 250ms updates)

**Acceptance Criteria:**
- [x] Playback state matches useVideoPlayback behavior
- [x] Imperative methods work without re-renders
- [x] Display time updates every 1 second
- [x] Video end state handled correctly

### Module 3: Integrate Controls Visibility Logic
**Summary:** Add useVideoControls logic for auto-hide behavior.

**File to Modify:** `packages/app/features/VideoAnalysis/hooks/useVideoPlayer.ts`

**Tasks:**
- [x] Add `showControls` state
- [x] Implement auto-hide timer logic
- [x] Reset timer on user interaction (play/pause/seek)
- [x] Clear timer on unmount

**Acceptance Criteria:**
- [x] Controls auto-hide after 3 seconds of inactivity
- [x] Controls show on any playback action
- [x] No memory leaks from timers

### Module 4: Add Video-Audio Sync Logic
**Summary:** Consolidate useVideoAudioSync logic for shouldPlayVideo calculation.

**File to Modify:** `packages/app/features/VideoAnalysis/hooks/useVideoPlayer.ts`

**Tasks:**
- [x] Accept `audioIsPlaying` option
- [x] Calculate `shouldPlayVideo` (pause video when audio playing)
- [x] Update when playback state or audio state changes

**Acceptance Criteria:**
- [x] Video pauses when audio starts
- [x] Video resumes when audio stops (if was playing)
- [x] Sync logic matches useVideoAudioSync behavior

### Module 5: Integrate Auto-Play Logic
**Summary:** Move useAutoPlayOnReady logic into useVideoPlayer.

**File to Modify:** `packages/app/features/VideoAnalysis/hooks/useVideoPlayer.ts`

**Tasks:**
- [x] Accept `isProcessing` option
- [x] Auto-play when `isProcessing` changes from true → false
- [x] Only auto-play if not already playing
- [x] Use ref to call play() imperatively

**Acceptance Criteria:**
- [x] Video auto-plays when analysis completes
- [x] No auto-play if already playing
- [x] Auto-play logic matches useAutoPlayOnReady behavior

### Module 6: Create Comprehensive Tests
**Summary:** Test integrated hook with 1:2 coverage ratio.

**File to Create:** `packages/app/features/VideoAnalysis/hooks/useVideoPlayer.test.ts`

**Tasks:**
- [x] Test playback state (isPlaying, currentTime, duration, videoEnded)
- [x] Test imperative methods (play, pause, seek, replay)
- [x] Test controls visibility auto-hide
- [x] Test video-audio sync (shouldPlayVideo)
- [x] Test auto-play on ready
- [x] Test callbacks (onLoad, onProgress, onEnd)
- [x] Test edge cases (seek before load, replay when ended, etc.)

**Acceptance Criteria:**
- [x] Test coverage ≥ 1:2 ratio
- [x] All tests use AAA pattern with comments
- [x] `yarn workspace @my/app test useVideoPlayer.test.ts` passes

### Module 7: Update VideoAnalysisScreen
**Summary:** Replace 4 hooks with single useVideoPlayer hook.

**File to Modify:** `packages/app/features/VideoAnalysis/VideoAnalysisScreen.tsx`

**Tasks:**
- [x] Import useVideoPlayer
- [x] Replace useVideoPlayback, useVideoControls, useVideoAudioSync, useAutoPlayOnReady calls
- [x] Update prop composition (videoState, playback objects)
- [x] Update handlers to use imperative ref API
- [x] Verify no functionality lost

**Acceptance Criteria:**
- [x] VideoAnalysisScreen uses single useVideoPlayer hook
- [x] All video playback features work
- [x] Component lines reduced
- [x] `yarn workspace @my/app test VideoAnalysisScreen.test.tsx` passes

### Module 8: Remove Old Hooks (TODO Later)
**Summary:** Delete consolidated hooks and update exports.

**Files to Delete:**
- `packages/app/features/VideoAnalysis/hooks/useVideoPlayback.ts`
- `packages/app/features/VideoAnalysis/hooks/useVideoPlayback.test.ts`
- `packages/app/features/VideoAnalysis/hooks/useVideoControls.ts`
- `packages/app/features/VideoAnalysis/hooks/useVideoControls.test.ts`
- `packages/app/features/VideoAnalysis/hooks/useVideoAudioSync.ts`
- `packages/app/features/VideoAnalysis/hooks/useVideoAudioSync.test.ts`
- `packages/app/features/VideoAnalysis/hooks/useAutoPlayOnReady.ts`
- `packages/app/features/VideoAnalysis/hooks/useAutoPlayOnReady.test.ts`

**Tasks:**
- [ ] Delete old hook files
- [ ] Update hook exports
- [ ] Verify no remaining imports of old hooks

**Acceptance Criteria:**
- [ ] Old hooks removed from codebase
- [ ] No TypeScript errors
- [ ] `yarn type-check` passes
- [ ] `yarn lint` passes

## Quality Gates

After each module:
1. Run tests: `yarn workspace @my/app test useVideoPlayer.test.ts`
2. Type check: `yarn workspace @my/app type-check`
3. Lint: `yarn workspace @my/app lint`
4. Manual testing: Verify video playback, controls, and auto-play work

## Success Validation

- [x] Single hook replaces 4 hooks (4 → 1 = 75% reduction)
- [x] Imperative API matches YouTube/Vimeo pattern
- [x] Test coverage ≥ 1:2 ratio
- [x] `yarn workspace @my/app test useVideoPlayer.test.ts` passes
- [x] VideoAnalysisScreen updated to use new hook
- [ ] Old hooks removed from codebase
- [x] `yarn type-check` passes (0 errors)
- [x] `yarn lint` passes (0 errors)
- [ ] Manual testing confirms no regressions

## References

- Battle-tested pattern: YouTube/Vimeo imperative ref API
- Simplification proposal: `docs/spec/video-analysis-simplification-proposal.md`
- Current hooks: `packages/app/features/VideoAnalysis/hooks/useVideo*.ts`

