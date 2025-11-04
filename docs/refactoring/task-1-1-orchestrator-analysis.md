# Task 1.1: Orchestrator Behavior & Dependencies Analysis

**Status:** ✅ COMPLETED  
**Date:** 2025-01-04  
**Time:** 2 hours

---

## Executive Summary

The `useVideoAnalysisOrchestrator` hook coordinates 14 separate hooks and returns a massive aggregated object with 12 property groups. Analysis reveals **no direct dependencies between individual hooks** - all coordination happens through the aggregation layer, creating unnecessary tight coupling.

**Key Finding:** Hooks are already extracted to separate files but artificially coupled through the orchestrator's aggregation pattern.

---

## Orchestrator Structure Analysis

### File Stats
- **File:** `packages/app/features/VideoAnalysis/hooks/useVideoAnalysisOrchestrator.ts`
- **LOC:** 1789 lines
- **Return Object:** 12 property groups
- **Hooks Coordinated:** 14 hooks
- **Memoization Layers:** 49 instances (useMemo + useCallback)

### The 14 Hooks (Ordered by Dependency)

1. ✅ **useStatusBar** - No dependencies
2. ✅ **useHistoricalAnalysis** - No dependencies
3. ✅ **useAnalysisState** - Depends on: historical.data
4. ✅ **useVideoPlayback** - No dependencies
5. ✅ **useVideoControls** - No dependencies
6. ✅ **useFeedbackAudioSource** - Depends on: analysisState.feedback
7. ✅ **useAudioController** - No dependencies
8. ✅ **useVideoAudioSync** - Depends on: videoPlayback, audioController
9. ✅ **useFeedbackPanel** - No dependencies
10. ⚠️ **useFeedbackCoordinator** - Depends on: video, audio, sync, feedback, panel, audioSource
11. ✅ **useAutoPlayOnReady** - Depends on: videoPlayback.play, analysisState.isReady
12. ⚠️ **useGestureController** - Depends on: videoControls, feedbackPanel, videoPlayback, coordinator.callbacks (native only)
13. ⚠️ **useAnimationController** - Depends on: gesture (native only)
14. ❌ **Orchestrator itself** - Aggregation layer that creates coupling

---

## Dependency Graph (DAG - Directed Acyclic Graph)

```
useStatusBar (no deps)

useHistoricalAnalysis (no deps)
  ↓
useAnalysisState (depends on: historical.data)
  ↓
useFeedbackAudioSource (depends on: analysisState.feedback)
  ↓
useFeedbackCoordinator (also depends on: video, audio, sync, panel)
  ↑
  └─ useVideoPlayback (no deps)
     ↓
     useAutoPlayOnReady (depends on: videoPlayback.play, analysisState.isReady)

  └─ useVideoControls (no deps)

  └─ useAudioController (no deps)
     ↓
     useVideoAudioSync (depends on: videoPlayback, audioController)

  └─ useFeedbackPanel (no deps)
     ↓
     useGestureController (depends on: videoControls, feedbackPanel, videoPlayback, coordinator.callbacks)
        ↓
        useAnimationController (depends on: gesture)
```

**Key Insight:** No circular dependencies! All hooks form a valid DAG. Safe to extract independently.

---

## Extraction Sequence (Planned for Phase 2)

### Batch 1: Independent Hooks (4 hours)
- useStatusBar
- useHistoricalAnalysis
- useVideoPlayback
- useVideoControls
- useAudioController
- useFeedbackPanel
**Risk:** ✅ ZERO (no dependencies)

### Batch 2: Single-Dependency Hooks (3 hours)
- useAnalysisState (depends on: historical.data)
- useFeedbackAudioSource (depends on: analysisState.feedback)
- useVideoAudioSync (depends on: videoPlayback, audioController)
- useAutoPlayOnReady (depends on: videoPlayback.play, analysisState.isReady)
**Risk:** ✅ LOW (simple dependencies)

### Batch 3: Complex Coordinator (4 hours)
- useFeedbackCoordinator (depends on: multiple Batch 1-2 hooks)
**Risk:** ⚠️ MEDIUM (complex, many dependencies)

### Batch 4: Native-Only (3 hours)
- useGestureController (depends on: coordinator callbacks)
- useAnimationController (depends on: gesture)
**Risk:** ⚠️ MEDIUM (platform-specific, complex)

---

## Memoization Analysis: 49 Instances

**Breakdown:**
- 20 instances: Hook result memoization
- 15 instances: Handler aggregation
- 8 instances: Pre-composed objects (audioOverlay, bubbleState)
- 6 instances: Final return aggregation

**Purpose:** Stabilize references in massive aggregated object

**Post-Refactor:** ~80-90% can be removed because:
- No aggregation layer to stabilize
- Each hook manages own state
- Component only memoizes actual performance bottlenecks

---

## VideoAnalysisLayout Props: 18 Groups

Current interface receives from orchestrator:
1. gesture (7 properties)
2. animation (7 shared values)
3. video (4 properties)
4. playback (4 properties)
5. feedback (8 properties)
6. feedbackAudioUrls (Record)
7. feedbackErrors (Record)
8. handlers (19 callbacks)
9. videoControlsRef (Ref)
10. controls (2 properties)
11. error (3 properties + callbacks)
12. audioController (complex state)
13. bubbleState (3 properties)
14. audioOverlay (5 properties)
15. coachSpeaking (boolean)
16. socialCounts (4 numbers)
17. videoUri (string)
18. persistentProgressBarProps (nullable)
19. onPersistentProgressBarPropsChange (callback)

**Analysis:** Layout receives individual hook results mixed with composed objects. Post-refactor, can pass hook results directly, reducing composition layers.

---

## Safety Validation

- ✅ No circular dependencies detected
- ✅ All 14 hooks already in separate files
- ✅ Extraction sequence is valid (DAG-based)
- ✅ No hidden orchestrator-specific logic
- ✅ Safe to proceed with incremental extraction

**Conclusion:** Ready for Phase 2 extraction.
