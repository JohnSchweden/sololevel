import { log } from '@my/logging'
import { useCallback, useEffect, useMemo, useRef } from 'react'

import { useVideoPlayerStore } from '../stores'
import { useFeedbackAudioStore } from '../stores/feedbackAudio'
import { useFeedbackCoordinatorStore } from '../stores/feedbackCoordinatorStore'
import type { FeedbackPanelItem } from '../types'
import type { AudioControllerState } from './useAudioController'
import { useBubbleController } from './useBubbleController'
import { useFeedbackSelection } from './useFeedbackSelection'
import type { VideoPlaybackState } from './useVideoPlayer.types'

export interface FeedbackCoordinatorState {
  highlightedFeedbackId: string | null
  isCoachSpeaking: boolean

  bubbleState: {
    currentBubbleIndex: number | null
    bubbleVisible: boolean
  }

  overlayVisible: boolean
  activeAudio: { id: string; url: string } | null

  // Check if there's pending feedback (for video playback decisions)
  pendingFeedbackId: string | null

  onProgressTrigger: (timeSeconds: number) => void
  onUserTapFeedback: (item: FeedbackPanelItem) => void
  onPlay: () => void
  onPause: () => void

  onPanelCollapse: () => void
  onAudioOverlayClose: () => void
  onAudioOverlayInactivity: () => void
  onAudioOverlayInteraction: () => void
  onPlayPendingFeedback: (feedbackId: string) => void
  onAudioNaturalEnd: () => void
}

export interface UseFeedbackCoordinatorParams {
  feedbackItems: FeedbackPanelItem[]
  audioController: AudioControllerState
  videoPlayback: Omit<VideoPlaybackState, 'currentTime' | 'duration' | 'isPlaying'> & {
    videoEnded: boolean
  }
}

/**
 * Orchestrates feedback selection, bubble timing, and audio playback for the video analysis
 * screen.
 *
 * The hook intentionally keeps all mutable state inside refs or external stores so the
 * parent screen never re-renders during high-frequency playback events. Recent test
 * additions assert this contract explicitly:
 *
 * - `VideoAnalysisScreen.test.tsx` expects the returned callbacks to stay referentially
 *   stable while reactive store data changes.
 * - The same suite verifies that `onBubbleTimerElapsed` **must not** route through the
 *   audio cleanup path; bubble expiry should hide UI while letting audio finish
 *   naturally.
 *
 * @remarks
 * Updates to this module should be accompanied by the regression tests under
 * `VideoAnalysisScreen.test.tsx` and `VideoPlayerSection.test.tsx`, which encode the
 * stability guarantees this coordinator must uphold.
 *
 * **Data Flow Diagram with Imperative Seek:**
 * ```
 *                            INPUT
 *                              |
 *        ┌─────────────────────┼─────────────────────┐
 *        |                     |                     |
 *   Progress Event      User Tap Feedback      Playback Event
 *   (250ms intervals)        (onUserTapFeedback)   (play/pause)
 *        |                     |                     |
 *        └─────────────────────┼─────────────────────┘
 *                              ↓
 *                   COORDINATOR LOGIC LAYER
 *                              |
 *        ┌─────────────────────┼─────────────────────┐
 *        |                     |                     |
 *   Check Bubble         Select & Highlight    Resume/Pause Audio
 *   Timing               Feedback Item         & Update Store
 *        |                     |                     |
 *        │          ┌──────────▼─────────────┐       |
 *        │          │   Seek Handler Split   │       |
 *        │          │  (< 1ms latency)       │       |
 *        │          └──────────┬─────────────┘       |
 *        │                     |                     |
 *        │          ┌──────────▼─────────────┐       |
 *        │          │ Immediate (ref-based)  │       │
 *        │          │ videoPlayer.seekDirect │       │
 *        │          │ ← Native seek <16ms    │       │
 *        │          └──────────┬─────────────┘       |
 *        │                     |                     |
 *        │          ┌──────────▼─────────────┐       |
 *        │          │ Async (store sync)     │       │
 *        │          │ onSeek(time)           │       │
 *        │          │ ← Progress bar sync    │       │
 *        │          └──────────┬─────────────┘       |
 *        └─────────────────────┼─────────────────────┘
 *                              ↓
 *                        ZUSTAND STORES
 *                              |
 *        ┌─────────────────────┼─────────────────────┐
 *        |                     |                     |
 *   FeedbackCoordinator    FeedbackAudio        VideoPlayer
 *   Store                  Store                Store
 *   (highlights, bubbles)  (activeAudio)        (isPlaying, seekImmediate)
 *        |                     |                     |
 *        └─────────────────────┼─────────────────────┘
 *                              ↓
 *                      SUBSCRIBED COMPONENTS
 *                              |
 *        ┌─────────────────────┼─────────────────────┐
 *        |                     |                     |
 *   FeedbackSection       VideoPlayerSection    Audio Overlay
 *   (render bubbles)      (show highlights)     (render audio UI)
 *        |                     |                     |
 *        └─────────────────────┼─────────────────────┘
 *                              ↓
 *                            OUTPUT
 * ```
 *
 * **PERFORMANCE OPTIMIZATION: Imperative Seek Bypass**
 * ```ts
 * // Old flow (200ms latency): Tap → setState → React render → prop update → native seek
 * // New flow (<16ms latency): Tap → ref-based seek → done
 * const seekImmediateFn = useVideoPlayerStore.getState().seekImmediate
 * if (seekImmediateFn) seekImmediateFn(seekTime) // <16ms, bypasses React render
 * ```
 * VideoPlayerSection registers `seekImmediate` in store on mount. Coordinator reads it imperatively
 * (no subscription) and calls it directly. This is split from store sync (`onSeek`) which happens async.
 *
 * **NO REACT STATE:** All state lives in Zustand stores. This hook:
 * - Reads store values imperatively via `getState()` (no subscriptions, no re-renders)
 * - Dispatches to store via action callbacks
 * - Manages timers/refs for side effects
 * - Uses internal refs for staging state (pendingFeedbackId)
 *
 * **Ref-Based State:**
 * - `pendingFeedbackIdRef` - Stages feedback ID before dispatching to selection
 * - `currentVideoTimeRef` - Tracks video position for bubble logic
 * - `isPlayingRef` - Tracks playback state to avoid stale closures
 * - `completedFeedbackRef` - Tracks completed feedback items to prevent re-triggering
 *
 * **Imperative Store Reads:**
 * ```ts
 * const activeAudioDuration = useFeedbackAudioStore.getState().activeAudio ? 0 : audioController.duration
 * const seekImmediateFn = useVideoPlayerStore.getState().seekImmediate // No subscription
 * useFeedbackCoordinatorStore.getState().batchUpdate({ ... })
 * ```
 *
 * **Returns:** Stable object with callbacks + deprecated state values (for backward compat)
 * - `onProgressTrigger` - Called on video progress event (250ms intervals)
 * - `onUserTapFeedback` - Called when user taps feedback item (triggers seekImmediate if available)
 * - `onAudioOverlayClose` - Called when audio overlay is dismissed
 * - etc.
 *
 * **Parent Caller:** VideoAnalysisScreen (only calls it for callbacks, not state)
 * **Subscribers:** FeedbackSection, VideoPlayerSection (subscribe to store directly)
 * **Imperative Reads:** VideoPlayerStore.seekImmediate (for low-latency feedback seek)
 *
 * @param feedbackItems - Array of feedback items to coordinate
 * @param audioController - Audio playback interface (mostly unused; duration read from store)
 * @param videoPlayback - Video playback interface (seek, videoEnded)
 * @returns Callbacks for feedback coordination and deprecated state values
 */
export function useFeedbackCoordinator({
  feedbackItems,
  audioController,
  videoPlayback,
}: UseFeedbackCoordinatorParams): FeedbackCoordinatorState {
  // PERFORMANCE FIX: Use ref instead of useState for pendingFeedbackId
  // Problem: setState on selection caused useFeedbackCoordinator to re-render,
  // which caused VideoAnalysisScreen to re-render (as seen in WDYR: "useState result changed").
  // Solution: Use ref - coordinator can still read and write without triggering renders.
  // Impact: Eliminates re-renders when user taps feedback item.
  const pendingFeedbackIdRef = useRef<string | null>(null)

  // Audio state is read imperatively with getState() to avoid parent re-renders

  /**
   * PERFORMANCE FIX: Use ref instead of state for currentVideoTime
   *
   * Problem: currentVideoTime was setState on every progress event (250ms), causing
   * useFeedbackCoordinator to re-render, which caused VideoAnalysisScreen to re-render,
   * which created new playback object, which triggered phantom pendingSeek changes.
   *
   * Solution: Use ref - useBubbleController can still read latest value, but no re-renders.
   *
   * Impact: Eliminates 100% of progress-triggered re-renders (4 renders/sec → 0).
   */
  const currentVideoTimeRef = useRef(0)

  // Track completed feedback items: Map<feedbackId, completedAtTimestampMs>
  // Prevents re-triggering until video moves significantly past completion point
  const completedFeedbackRef = useRef<Map<string, number>>(new Map())

  // Track audioController in ref to avoid stale closures in handlePlay
  const audioControllerRef = useRef(audioController)
  useEffect(() => {
    audioControllerRef.current = audioController
  }, [audioController])

  // Track latest isPlaying value to avoid stale closures
  const isPlayingRef = useRef(useVideoPlayerStore.getState().isPlaying)
  useEffect(() => {
    const unsubscribe = useVideoPlayerStore.subscribe((state) => {
      isPlayingRef.current = state.isPlaying
    })
    return () => {
      unsubscribe()
    }
  }, [])

  const selection = useFeedbackSelection(audioController, videoPlayback)

  const bubbleFeedbackItems = useMemo(
    () => feedbackItems.filter((item) => item.type === 'suggestion'),
    [feedbackItems]
  )

  const bubbleIndexById = useMemo(() => {
    const map = new Map<string, number>()
    for (let i = 0; i < bubbleFeedbackItems.length; i += 1) {
      map.set(bubbleFeedbackItems[i].id, i)
    }
    return map
  }, [bubbleFeedbackItems])

  // PERF FIX: Read activeAudio duration directly from store to avoid screen-level subscription
  const audioStoreSnapshot = useFeedbackAudioStore.getState()
  const activeAudioDuration = audioStoreSnapshot.activeAudio
    ? (audioStoreSnapshot.controller?.duration ?? 0) // Use actual duration when audio is active
    : 0 // No duration when no active audio

  const bubbleController = useBubbleController(
    bubbleFeedbackItems,
    currentVideoTimeRef.current, // Read from ref - no subscription, no re-renders
    isPlayingRef.current, // Read from ref - no subscription, no re-renders
    useFeedbackAudioStore.getState().audioUrls,
    activeAudioDuration,
    {
      onBubbleShow: ({ item, displayDurationMs }) => {
        const hasAudioUrl = Boolean(useFeedbackAudioStore.getState().audioUrls[item.id])

        // log.info('useFeedbackCoordinator', 'Bubble show event received', {
        //   index,
        //   feedbackId: item.id,
        //   timestamp: item.timestamp,
        //   displayDurationMs,
        // })

        log.debug('useFeedbackCoordinator.onBubbleShow', '🎵 Triggering audio playback', {
          feedbackId: item.id,
          timestamp: item.timestamp,
          hasAudioUrl,
          displayDurationMs,
          activeAudioId: useFeedbackAudioStore.getState().activeAudio?.id ?? null,
        })
        selection.highlightAutoFeedback(item, {
          seek: false,
          playAudio: true,
          autoDurationMs: hasAudioUrl ? undefined : displayDurationMs,
        })
      },
      onBubbleHide: ({ item, reason }) => {
        // log.info('useFeedbackCoordinator', 'Bubble hide event received', {
        //   feedbackId: item?.id ?? null,
        //   highlightedId: selection.highlightedFeedbackId,
        //   reason,
        // })

        log.debug('useFeedbackCoordinator.onBubbleHide', '💬 Bubble hide triggered', {
          feedbackId: item?.id ?? null,
          reason,
          highlightedFeedbackId: useFeedbackCoordinatorStore.getState().highlightedFeedbackId,
          activeAudioId: useFeedbackAudioStore.getState().activeAudio?.id ?? null,
          audioIsPlaying: useFeedbackAudioStore.getState().isPlaying,
        })

        if (!item) {
          log.debug('useFeedbackCoordinator.onBubbleHide', '🛑 Clearing highlight - no item', {
            reason: `bubble-hide-${reason ?? 'unknown'}`,
          })
          selection.clearHighlight({
            reason: `bubble-hide-${reason ?? 'unknown'}`,
            sources: ['auto'],
          })
          return
        }

        log.debug('useFeedbackCoordinator.onBubbleHide', '🛑 Clearing highlight for item', {
          feedbackId: item.id,
          reason: `bubble-hide-${reason ?? 'unknown'}`,
        })
        selection.clearHighlight({
          matchId: item.id,
          sources: ['auto'],
          reason: `bubble-hide-${reason ?? 'unknown'}`,
        })
      },
      onBubbleTimerUpdate: ({ item, displayDurationMs, reason }) => {
        if (!item || reason === 'initial') {
          return
        }

        // log.info('useFeedbackCoordinator', 'Bubble timer anchored to playback', {
        //   feedbackId: item.id,
        //   displayDurationMs,
        //   reason,
        // })

        selection.highlightAutoFeedback(item, {
          seek: false,
          playAudio: false,
          autoDurationMs: displayDurationMs,
        })
      },
      onBubbleTimerElapsed: ({ item }) => {
        if (!item) {
          log.debug('useFeedbackCoordinator.onBubbleTimerElapsed', '⏭️ No item - returning false')
          return false
        }

        // Check if this feedback has audio available (regardless of current playback state)
        const hasAudioForFeedback = Boolean(useFeedbackAudioStore.getState().audioUrls[item.id])

        log.debug(
          'useFeedbackCoordinator.onBubbleTimerElapsed',
          '⏲️ Timer elapsed - checking conditions',
          {
            feedbackId: item.id,
            hasAudioForFeedback,
            highlightedFeedbackId: useFeedbackCoordinatorStore.getState().highlightedFeedbackId,
            bubbleVisible: useFeedbackCoordinatorStore.getState().bubbleState.bubbleVisible,
          }
        )

        // If feedback has audio, let audio control the bubble lifecycle - don't hide on timer
        if (hasAudioForFeedback) {
          log.debug(
            'useFeedbackCoordinator.onBubbleTimerElapsed',
            '⏲️ Bubble timer elapsed but feedback has audio - deferring hide until audio ends',
            {
              feedbackId: item.id,
              hasAudioForFeedback,
            }
          )
          /**
           * If feedback has audio, the bubble should follow audio lifecycle, not timer.
           * Returning `true` tells `useBubbleController` that the coordinator handled the
           * elapsed event. This keeps the bubble visible until audio naturally ends.
           */
          return true
        }

        // TIMER LOGIC: Fallback only when no audio exists
        const audioState = useFeedbackAudioStore.getState()
        const activeAudioId = audioState.activeAudio?.id ?? null
        const audioStillPlaying =
          audioState.isPlaying && activeAudioId !== null && activeAudioId === item.id

        log.debug(
          'useFeedbackCoordinator.onBubbleTimerElapsed',
          '⏱️ Bubble timer elapsed - hiding bubble (no audio available for feedback)',
          {
            feedbackId: item.id,
            hasAudioForFeedback,
            activeAudioId,
            audioStillPlaying,
            reason: 'no audio available, using timer fallback',
          }
        )

        // Return false/undefined to let bubble controller handle hiding automatically.
        // No audio available for this feedback, so use timer as fallback.
        return false
      },
    }
  )

  const { currentBubbleIndex, bubbleVisible, showBubble, hideBubble } = bubbleController

  const pendingItemRef = useRef<FeedbackPanelItem | null>(null)
  const cleanupPerformedRef = useRef(false)

  const bubbleControllerRef = useRef(bubbleController)
  useEffect(() => {
    bubbleControllerRef.current = bubbleController
  }, [bubbleController])

  const handleProgressTrigger = useCallback(
    (timeSeconds: number) => {
      // PERFORMANCE: Update ref instead of state - no re-renders
      const currentTimeMs = timeSeconds * 1000
      const previousTimeMs = currentVideoTimeRef.current * 1000
      const timeDelta = currentTimeMs - previousTimeMs
      const isBackwardSeek = timeDelta < 0
      // Forward seek detection: jumps > 500ms (2x normal progress interval of 250ms)
      const isForwardSeek = timeDelta > 500

      // SEEKING DETECTION: If we've seeked backwards, clear all completions
      // This prevents stale completions from blocking triggers after seeks
      if (isBackwardSeek && completedFeedbackRef.current.size > 0) {
        log.debug(
          'useFeedbackCoordinator.handleProgressTrigger',
          '⏪ Backwards seek detected - clearing all completions',
          {
            previousTimeMs,
            currentTimeMs,
            seekDistance: Math.abs(timeDelta),
            completedMapSize: completedFeedbackRef.current.size,
          }
        )
        completedFeedbackRef.current.clear()
      }

      // FORWARD SEEK DETECTION: Mark skipped feedbacks as completed to prevent auto-trigger
      // When user seeks forward (e.g., 0s → 5.6s), mark all feedbacks in skipped range as completed
      // This prevents them from triggering when playback continues
      if (isForwardSeek) {
        const skippedFeedbacks = bubbleFeedbackItems.filter(
          (item) => item.timestamp > previousTimeMs && item.timestamp < currentTimeMs
        )

        if (skippedFeedbacks.length > 0) {
          log.debug(
            'useFeedbackCoordinator.handleProgressTrigger',
            '⏩ Forward seek detected - marking skipped feedbacks as completed',
            {
              previousTimeMs,
              currentTimeMs,
              seekDistance: timeDelta,
              skippedCount: skippedFeedbacks.length,
              skippedFeedbackIds: skippedFeedbacks.map((f) => f.id),
            }
          )

          skippedFeedbacks.forEach((item) => {
            // Mark as completed at current time (not at their timestamp)
            // This prevents them from re-triggering
            completedFeedbackRef.current.set(item.id, currentTimeMs)
          })
        }
      }

      currentVideoTimeRef.current = timeSeconds

      // Use ref to get latest isPlaying value (avoids stale closure)
      const currentIsPlaying = isPlayingRef.current

      // Do not trigger bubbles/highlights while paused or when a pending tap exists
      if (!currentIsPlaying || pendingFeedbackIdRef.current) {
        log.debug(
          'useFeedbackCoordinator.handleProgressTrigger',
          '⏸️ Skipping - paused or pending tap',
          {
            timeSeconds,
            isPlaying: currentIsPlaying,
            videoPlaybackIsPlaying: currentIsPlaying,
            pendingFeedbackId: pendingFeedbackIdRef.current,
          }
        )
        return
      }

      // Clean up old completed feedback entries (older than 10 seconds)
      completedFeedbackRef.current.forEach((completedAt, feedbackId, map) => {
        if (currentTimeMs > completedAt + 10000) {
          map.delete(feedbackId)
          log.debug(
            'useFeedbackCoordinator.handleProgressTrigger',
            '🗑️ Cleaned up old completed entry',
            {
              feedbackId,
              completedAt,
              currentTimeMs,
              age: currentTimeMs - completedAt,
            }
          )
        }
      })

      log.debug('useFeedbackCoordinator.handleProgressTrigger', '🔍 Checking for bubble trigger', {
        timeSeconds,
        currentTimeMs,
        completedEntries: Array.from(completedFeedbackRef.current.entries()).map(([id, ts]) => ({
          id,
          completedAt: ts,
          age: currentTimeMs - ts,
        })),
      })

      // PURE: Find trigger candidate WITHOUT side effects
      const candidate = bubbleController.findTriggerCandidate(timeSeconds * 1000)
      if (!candidate) {
        log.debug('useFeedbackCoordinator.handleProgressTrigger', '⏭️ No bubble triggered', {
          timeSeconds,
          currentTimeMs,
        })
        return
      }

      const { item } = candidate
      log.debug(
        'useFeedbackCoordinator.handleProgressTrigger',
        '🎯 Candidate found - checking completion gate',
        {
          timeSeconds,
          currentTimeMs,
          feedbackId: item.id,
          feedbackTimestamp: item.timestamp,
          completedEntries: Array.from(completedFeedbackRef.current.entries()),
        }
      )

      // GATE: Check if this feedback was recently completed
      // Block re-triggering until completion window expires
      const completedAt = completedFeedbackRef.current.get(item.id)
      log.debug('useFeedbackCoordinator.handleProgressTrigger', '🔍 Completion gate check', {
        feedbackId: item.id,
        feedbackTimestamp: item.timestamp,
        currentTimeMs,
        completedAt,
        hasCompletedEntry: completedAt !== undefined,
        completedMapSize: completedFeedbackRef.current.size,
      })

      if (completedAt !== undefined) {
        const timeSinceCompletion = currentTimeMs - completedAt
        const completionWindowMs = 5000 // 5s window
        const shouldBlock = timeSinceCompletion < completionWindowMs

        log.debug('useFeedbackCoordinator.handleProgressTrigger', '📊 Completion window', {
          feedbackId: item.id,
          completedAt,
          timeSinceCompletion,
          completionWindowMs,
          shouldBlock,
          timeRemaining: completionWindowMs - timeSinceCompletion,
        })

        if (shouldBlock) {
          log.debug(
            'useFeedbackCoordinator.handleProgressTrigger',
            '🚫 BLOCKED by completion gate',
            {
              feedbackId: item.id,
              timeSinceCompletion,
              timeRemaining: completionWindowMs - timeSinceCompletion,
            }
          )
          return
        }
      }

      // APPROVED: Display the bubble
      log.debug('useFeedbackCoordinator.handleProgressTrigger', '✅ APPROVED - displaying bubble', {
        timeSeconds,
        itemId: item.id,
        timestamp: item.timestamp,
      })
      bubbleController.showBubble(candidate.index)
    },
    [
      bubbleFeedbackItems,
      bubbleController,
      // Note: checkAndShowBubbleAtTime removed - now handled via bubbleController.findTriggerCandidate + showBubble
      // currentVideoTime removed - now a ref, no need in deps
      // pendingFeedbackId removed - now a ref, no need in deps
      // Note: isPlaying is read via ref (isPlayingRef.current) to avoid stale closures
      // No need to include in deps - ref always has latest value
    ]
  )

  const handleUserTapFeedback = useCallback(
    (item: FeedbackPanelItem) => {
      // log.info('useFeedbackCoordinator', 'User tapped feedback', {
      //   feedbackId: item.id,
      //   timestamp: item.timestamp,
      //   isPlaying: videoPlayback.isPlaying,
      //   videoEnded: videoPlayback.videoEnded,
      //   currentTime: videoPlayback.currentTime,
      // })

      hideBubble('manual')

      // Clear old completion entries when user manually selects feedback
      // This prevents stale completions from blocking triggers after seeks
      log.debug(
        'useFeedbackCoordinator.handleUserTapFeedback',
        '🧹 Clearing old completion entries on manual tap',
        {
          feedbackId: item.id,
          completedMapSizeBefore: completedFeedbackRef.current.size,
        }
      )
      completedFeedbackRef.current.clear()

      const currentIsPlaying = isPlayingRef.current
      if (currentIsPlaying && !videoPlayback.videoEnded) {
        // Playing: seek, highlight, play, and show bubble immediately
        log.debug('useFeedbackCoordinator.onUserTapFeedback', '🎵 User tap - playing audio', {
          feedbackId: item.id,
          timestamp: item.timestamp,
          videoIsPlaying: currentIsPlaying,
          activeAudioId: useFeedbackAudioStore.getState().activeAudio?.id ?? null,
        })
        selection.selectFeedback(item, { seek: true, playAudio: true })

        const maybeIndex = bubbleIndexById.get(item.id)
        if (typeof maybeIndex === 'number') {
          showBubble(maybeIndex)
        }

        pendingItemRef.current = null
        pendingFeedbackIdRef.current = null
        pendingFeedbackIdRef.current = null
        return
      }

      // Paused/Ended: seek, highlight, mark pending, no audio/bubble yet
      selection.selectFeedback(item, { seek: true, playAudio: false })
      pendingItemRef.current = item
      pendingFeedbackIdRef.current = item.id
    },
    [
      bubbleIndexById,
      hideBubble,
      selection,
      showBubble,
      useVideoPlayerStore,
      // videoPlayback.videoEnded removed - read from ref via getter, no dependency needed
    ]
  )

  const handlePlayPendingFeedback = useCallback(
    (feedbackId: string) => {
      const item = feedbackItems.find((feedback) => feedback.id === feedbackId)
      if (!item) {
        log.warn('useFeedbackCoordinator', 'Attempted to play unknown feedback', {
          feedbackId,
        })
        return
      }

      pendingItemRef.current = null
      pendingFeedbackIdRef.current = null

      selection.selectFeedback(item, { seek: false, playAudio: true })
    },
    [feedbackItems, selection]
  )

  // Extract videoPlayback.play() to a ref to avoid depending on entire videoPlayback object
  // videoPlayback changes when currentTime changes, but play() method is stable
  const videoPlayRef = useRef(videoPlayback.play)
  useEffect(() => {
    videoPlayRef.current = videoPlayback.play
  }, [videoPlayback.play])

  const handlePlay = useCallback(() => {
    const startTime = Date.now()
    log.debug('useFeedbackCoordinator.handlePlay', '▶️ Play pressed', {
      timestamp: startTime,
      activeAudioId: useFeedbackAudioStore.getState().activeAudio?.id ?? null,
      highlightedFeedbackId: useFeedbackCoordinatorStore.getState().highlightedFeedbackId,
      bubbleVisible: useFeedbackCoordinatorStore.getState().bubbleState.bubbleVisible,
      pendingFeedbackId: pendingFeedbackIdRef.current,
      pendingItemRef: pendingItemRef.current?.id ?? null,
      audioIsPlaying: audioControllerRef.current?.isPlaying ?? false,
    })

    // Resume audio if it has activeAudio, a highlighted feedback, and is not currently playing
    // This covers two cases:
    // 1. Audio was paused mid-playback (currentTime > 0)
    // 2. Audio is loading but was set to playing state (currentTime might still be 0)
    // CRITICAL: Only resume if there's a highlighted feedback - prevents resuming audio
    // for stale activeAudio from previous feedback that has already ended
    const currentController = audioControllerRef.current
    const currentFeedbackAudio = useFeedbackAudioStore.getState()
    const highlightedFeedbackId = useFeedbackCoordinatorStore.getState().highlightedFeedbackId
    const hasActiveAudio = currentFeedbackAudio.activeAudio && currentController
    const hasHighlightedFeedback = highlightedFeedbackId !== null
    const audioMatchesHighlight =
      hasActiveAudio && hasHighlightedFeedback
        ? currentFeedbackAudio.activeAudio?.id === highlightedFeedbackId
        : false
    const audioIsNotPlaying = !currentController?.isPlaying
    const audioIsLoadingOrPaused =
      currentController &&
      (currentController.currentTime > 0 || // Audio was playing
        currentController.duration === 0 || // Audio still loading
        currentController.currentTime < currentController.duration) // Audio not at end

    const shouldResumeAudio =
      hasActiveAudio &&
      hasHighlightedFeedback &&
      audioMatchesHighlight &&
      audioIsNotPlaying &&
      audioIsLoadingOrPaused

    log.debug('useFeedbackCoordinator.handlePlay', '🔍 Audio resume conditions', {
      hasActiveAudio,
      hasHighlightedFeedback,
      audioMatchesHighlight,
      audioIsNotPlaying,
      audioIsLoadingOrPaused,
      shouldResumeAudio,
      currentTime: currentController?.currentTime ?? -1,
      duration: currentController?.duration ?? -1,
    })

    if (shouldResumeAudio) {
      log.debug('useFeedbackCoordinator.handlePlay', '🎵 Resuming audio', {
        activeAudioId: currentFeedbackAudio.activeAudio?.id ?? null,
        highlightedFeedbackId,
        audioMatchesHighlight,
        currentTime: currentController.currentTime,
        duration: currentController.duration,
        wasLoading: currentController.duration === 0,
        startTime,
      })
      useFeedbackAudioStore.getState().setIsPlaying(true)
      const endTime = Date.now()
      log.debug('useFeedbackCoordinator.handlePlay', '✓ setIsPlaying called', {
        duration: endTime - startTime,
        elapsed: endTime - startTime,
      })
    } else if (currentFeedbackAudio.activeAudio && currentController) {
      log.debug(
        'useFeedbackCoordinator.handlePlay',
        '⚠️ Audio not resumed - missing highlight, already playing, or at end',
        {
          activeAudioId: currentFeedbackAudio.activeAudio?.id ?? null,
          highlightedFeedbackId,
          hasHighlightedFeedback,
          audioMatchesHighlight,
          currentTime: currentController.currentTime,
          duration: currentController.duration,
          isPlaying: currentController.isPlaying,
        }
      )
    }

    if (!pendingFeedbackIdRef.current || !pendingItemRef.current) {
      log.debug('useFeedbackCoordinator.handlePlay', '▶️ No pending feedback - resuming video', {
        hasPendingFeedbackId: !!pendingFeedbackIdRef.current,
        hasPendingItem: !!pendingItemRef.current,
      })
      videoPlayRef.current()
      return
    }

    const item = pendingItemRef.current
    // log.info('useFeedbackCoordinator', 'Handling pending feedback on play', {
    //   feedbackId: item.id,
    //   timestamp: item.timestamp,
    // })

    log.debug(
      'useFeedbackCoordinator.handlePlay',
      '🎵 Handling pending feedback - loading and playing audio',
      {
        feedbackId: item.id,
        timestamp: item.timestamp,
        activeAudioId: currentFeedbackAudio.activeAudio?.id ?? null,
      }
    )
    // CRITICAL: Don't seek again - we're already at the right position from manual tap
    // selectFeedback will load audio URL and start playback in deferred callback
    selection.selectFeedback(item, { seek: false, playAudio: true })

    const maybeIndex = bubbleIndexById.get(item.id)
    if (typeof maybeIndex === 'number') {
      showBubble(maybeIndex)
    }

    pendingFeedbackIdRef.current = null
    pendingItemRef.current = null
    // REMOVED: Don't call setIsPlaying(true) here - audio URL not loaded yet
    // selectFeedback's deferred callback (applyHighlight line 293) will call it after URL loads
    log.debug(
      'useFeedbackCoordinator.handlePlay',
      '✓ Pending feedback handled - audio loading deferred',
      {
        feedbackId: item.id,
        bubbleIndex: bubbleIndexById.get(item.id) ?? null,
      }
    )
    // REMOVED: Don't resume video immediately - let audio control the timing
    // Video will resume when audio ends naturally via handleAudioNaturalEnd
    // DO NOT call videoPlayRef.current() here - video must stay paused during audio
  }, [bubbleIndexById, selection, showBubble])

  // Rule: After audio ends and video resumes playing, remove highlight and clear activeAudio
  useEffect(() => {
    const highlightedId = useFeedbackCoordinatorStore.getState().highlightedFeedbackId
    const videoIsPlaying = isPlayingRef.current
    const audioIsNotPlaying = !audioController.isPlaying

    log.debug(
      'useFeedbackCoordinator.audioEndVideoResume',
      '🔍 Checking audio end + video resume condition',
      {
        audioIsNotPlaying,
        highlightedFeedbackId: highlightedId,
        videoIsPlaying,
        audioCurrentTime: audioController.currentTime,
        shouldClear: audioIsNotPlaying && highlightedId && videoIsPlaying,
      }
    )

    if (audioIsNotPlaying && highlightedId && videoIsPlaying) {
      log.debug(
        'useFeedbackCoordinator.audioEndVideoResume',
        '✓ Audio ended + video resumed - clearing highlight',
        {
          highlightedId,
          audioCurrentTime: audioController.currentTime,
        }
      )
      selection.clearHighlight({ reason: 'audio-ended-video-resumed' })
      // Clear activeAudio when audio ends naturally and video resumes
      // This prevents handlePlay from trying to resume finished audio
      const audioState = useFeedbackAudioStore.getState()
      if (audioState.activeAudio && audioController.currentTime === 0) {
        log.debug('useFeedbackCoordinator.audioEndVideoResume', '✓ Clearing activeAudio', {
          activeAudioId: audioState.activeAudio?.id ?? null,
        })
        audioState.setActiveAudio(null)
      }
    }
  }, [
    audioController.isPlaying,
    audioController.currentTime,
    selection,
    // Read from store imperatively - no subscription needed
    isPlayingRef, // Use ref instead of videoPlayback.isPlaying
  ])

  // Rule: Clear activeAudio when audio ends naturally (currentTime reset to 0)
  // This handles the case where audio finishes but video isn't playing yet
  // Only clear if audio was actually playing (duration > 0 means audio was loaded and played)
  // and currentTime is 0 (indicating audio ended, not paused mid-track)
  const prevAudioPlayingRef = useRef(audioController.isPlaying)
  const prevAudioCurrentTimeRef = useRef(audioController.currentTime)
  useEffect(() => {
    const wasPlaying = prevAudioPlayingRef.current
    const wasAtNonZeroPosition = prevAudioCurrentTimeRef.current > 0
    const nowNotPlaying = !audioController.isPlaying
    const nowAtZero = audioController.currentTime === 0

    // Update refs for next comparison
    prevAudioPlayingRef.current = audioController.isPlaying
    prevAudioCurrentTimeRef.current = audioController.currentTime

    // Only clear if audio transitioned from playing to stopped AND reset to 0
    // This detects natural end (handleEnd sets currentTime=0) vs pause at start
    if (
      wasPlaying &&
      wasAtNonZeroPosition &&
      nowNotPlaying &&
      nowAtZero &&
      useFeedbackAudioStore.getState().activeAudio &&
      audioController.duration > 0
    ) {
      // Audio ended naturally (transitioned from playing to stopped with currentTime reset to 0)
      // Clear activeAudio to prevent handlePlay from trying to resume finished audio
      log.debug(
        'useFeedbackCoordinator.audioEndDetection',
        '🎵 Audio ended naturally - clearing activeAudio',
        {
          wasPlaying,
          wasAtNonZeroPosition,
          nowNotPlaying,
          nowAtZero,
          activeAudioId: useFeedbackAudioStore.getState().activeAudio?.id ?? null,
          duration: audioController.duration,
        }
      )
      useFeedbackAudioStore.getState().setActiveAudio(null)
    }
  }, [audioController.isPlaying, audioController.currentTime, audioController.duration])

  const handlePanelCollapse = useCallback(() => {
    hideBubble('manual')

    selection.clearHighlight({ reason: 'panel-collapsed' })
    selection.clearSelection()
    pendingItemRef.current = null
    pendingFeedbackIdRef.current = null
  }, [hideBubble, selection])

  /**
   * Performs cleanup for explicit audio termination events (overlay closed, inactivity,
   * manual stop). The bubble timer path intentionally skips this logic so audio can play
   * to completion – the tests assert that `onBubbleTimerElapsed` returns false and never
   * routes through here.
   */
  const handleAudioStop = useCallback(
    (reason: string) => {
      log.debug('useFeedbackCoordinator.handleAudioStop', '🛑 handleAudioStop called', {
        reason,
        selectedFeedbackId: useFeedbackCoordinatorStore.getState().selectedFeedbackId,
        highlightedFeedbackId: useFeedbackCoordinatorStore.getState().highlightedFeedbackId,
        activeAudioId: useFeedbackAudioStore.getState().activeAudio?.id ?? null,
        audioIsPlaying: useFeedbackAudioStore.getState().isPlaying,
        bubbleVisible: useFeedbackCoordinatorStore.getState().bubbleState.bubbleVisible,
      })

      // PERFORMANCE: Early exit if nothing to clean up
      // Prevents redundant store writes (false→false, null→null)
      const store = useFeedbackCoordinatorStore.getState()
      const audioStore = useFeedbackAudioStore.getState()
      const bubbleState = store.bubbleState

      const hasActiveSelection = store.selectedFeedbackId || store.highlightedFeedbackId
      const hasActiveAudio = audioStore.isPlaying || audioStore.activeAudio
      const hasActiveBubble = bubbleState.bubbleVisible

      if (!hasActiveSelection && !hasActiveAudio && !hasActiveBubble) {
        log.debug('useFeedbackCoordinator.handleAudioStop', '⏭️ Skipping cleanup - nothing active', {
          reason,
          selectedFeedbackId: store.selectedFeedbackId,
          highlightedFeedbackId: store.highlightedFeedbackId,
          isPlaying: audioStore.isPlaying,
          activeAudioId: audioStore.activeAudio?.id ?? null,
          bubbleVisible: bubbleState.bubbleVisible,
        })
        return
      }

      log.debug('useFeedbackCoordinator.handleAudioStop', '🛑 Stopping audio and cleaning up', {
        reason,
        hasActiveBubble,
        hasActiveSelection,
        hasActiveAudio,
        highlightedFeedbackId: store.highlightedFeedbackId,
        bubbleVisible: bubbleState.bubbleVisible,
        activeAudioId: audioStore.activeAudio?.id ?? null,
      })

      // SOLUTION 2: Defer feedback coordinator updates to prevent blocking progress bar
      // Progress bar shared value updates happen immediately on UI thread via runOnUI,
      // but feedback coordinator batch updates can block JS thread. Defer them to next tick.
      setTimeout(() => {
        // Use refs for all dependencies to make this callback completely stable
        // This prevents handleAudioOverlayClose/Inactivity from recreating
        if (hasActiveBubble) {
          log.debug('useFeedbackCoordinator.handleAudioStop', '✓ Hiding bubble', {
            reason,
            bubbleIndex: bubbleState.currentBubbleIndex,
          })
          bubbleControllerRef.current.hideBubble('manual')
        }
        if (hasActiveSelection) {
          log.debug(
            'useFeedbackCoordinator.handleAudioStop',
            '✓ Clearing highlight and selection',
            {
              reason,
              highlightedId: store.highlightedFeedbackId,
            }
          )
          selection.clearHighlight({ reason })
          selection.clearSelection()
        }
        if (hasActiveAudio) {
          log.debug('useFeedbackCoordinator.handleAudioStop', '✓ Stopping audio playback', {
            reason,
            activeAudioId: audioStore.activeAudio?.id ?? null,
          })
          audioStore.setIsPlaying(false)
          audioStore.setActiveAudio(null)
        }
        pendingItemRef.current = null
        pendingFeedbackIdRef.current = null
      }, 0)
    },
    [selection]
  )

  useEffect(() => {
    return () => {
      if (cleanupPerformedRef.current) {
        return
      }
      cleanupPerformedRef.current = true

      const nextBubbleController = bubbleControllerRef.current
      const nextSelection = selection
      const nextFeedbackAudio = useFeedbackAudioStore.getState()

      nextBubbleController.hideBubble('cleanup')

      nextSelection.clearHighlight({ reason: 'coordinator-unmount' })
      nextSelection.clearSelection()

      nextFeedbackAudio.setIsPlaying(false)
      nextFeedbackAudio.setActiveAudio(null)

      pendingItemRef.current = null
      pendingFeedbackIdRef.current = null
    }
  }, [])

  // Read activeAudio imperatively when needed (not at render time to avoid subscriptions)
  const overlayVisible =
    audioController.isPlaying && Boolean(useFeedbackAudioStore.getState().activeAudio)

  // Ensure bubble hides if it remains visible without active audio after render
  useEffect(() => {
    if (!useFeedbackAudioStore.getState().activeAudio && bubbleVisible) {
      hideBubble('audio-stop')
    }
  }, [bubbleVisible, hideBubble])

  // Hide bubble when audio stops
  useEffect(() => {
    let prevActiveAudio = useFeedbackAudioStore.getState().activeAudio
    return useFeedbackAudioStore.subscribe((state) => {
      const currentActiveAudio = state.activeAudio
      log.debug('useFeedbackCoordinator.audioStopBubbleHide', '🔍 Audio state change detected', {
        prevActiveAudioId: prevActiveAudio?.id ?? null,
        currentActiveAudioId: currentActiveAudio?.id ?? null,
        prevIsPlaying: useFeedbackAudioStore.getState().isPlaying, // This might be stale
        bubbleVisible: useFeedbackCoordinatorStore.getState().bubbleState.bubbleVisible,
      })

      if (prevActiveAudio && !currentActiveAudio) {
        // Audio was playing, now stopped
        log.debug(
          'useFeedbackCoordinator.audioStopBubbleHide',
          '🎵 Audio stopped - checking bubble visibility',
          {
            prevActiveAudioId: prevActiveAudio?.id ?? null,
            bubbleVisible: useFeedbackCoordinatorStore.getState().bubbleState.bubbleVisible,
            highlightedFeedbackId: useFeedbackCoordinatorStore.getState().highlightedFeedbackId,
          }
        )
        if (useFeedbackCoordinatorStore.getState().bubbleState.bubbleVisible) {
          log.debug('useFeedbackCoordinator.audioStopBubbleHide', '✓ Hiding bubble on audio stop', {
            bubbleIndex: useFeedbackCoordinatorStore.getState().bubbleState.currentBubbleIndex,
            reason: 'activeAudio cleared',
          })
          hideBubble('audio-stop')
        }
      }
      prevActiveAudio = currentActiveAudio
    })
  }, [hideBubble])

  const handleAudioNaturalEnd = useCallback(() => {
    const highlightedId = useFeedbackCoordinatorStore.getState().highlightedFeedbackId

    if (!highlightedId) {
      log.debug(
        'useFeedbackCoordinator.audioEndCleanupGuard',
        '⏭️ Natural end ignored - no highlighted feedback'
      )
      return
    }

    const audioState = useFeedbackAudioStore.getState()
    const audioControllerState = audioState.controller
    const audioDuration = audioControllerState?.duration ?? 0
    const audioCurrentTime = audioControllerState?.currentTime ?? -1
    const videoIsPlaying = isPlayingRef.current

    log.debug('useFeedbackCoordinator.audioEndCleanupGuard', '🔚 Natural audio end received', {
      highlightedId,
      audioCurrentTime,
      audioDuration,
      videoIsPlaying,
    })

    const videoTimeMs = useVideoPlayerStore.getState().displayTime * 1000
    const currentVideoTimeRefMs = currentVideoTimeRef.current * 1000
    const feedbackItem = bubbleFeedbackItems.find((item) => item.id === highlightedId)
    const completionTimestampMs = feedbackItem ? feedbackItem.timestamp : videoTimeMs

    log.debug(
      'useFeedbackCoordinator.audioEndCleanupGuard',
      '📝 Marking feedback as completed - BEFORE',
      {
        feedbackId: highlightedId,
        videoTimeMs,
        currentVideoTimeRefMs,
        feedbackItem: feedbackItem
          ? {
              id: feedbackItem.id,
              timestamp: feedbackItem.timestamp,
            }
          : null,
        completionTimestampMs,
        completedMapBefore: Array.from(completedFeedbackRef.current.entries()),
      }
    )

    completedFeedbackRef.current.set(highlightedId, completionTimestampMs)

    log.debug(
      'useFeedbackCoordinator.audioEndCleanupGuard',
      '✓ Marked feedback as completed - AFTER',
      {
        feedbackId: highlightedId,
        feedbackTimestamp: feedbackItem?.timestamp,
        videoTimeMs,
        currentVideoTimeRefMs,
        completionTimestampMs,
        completedMapAfter: Array.from(completedFeedbackRef.current.entries()),
        completedMapSize: completedFeedbackRef.current.size,
      }
    )

    selection.clearHighlight({ reason: 'audio-ended-cleanup-guard' })
    if (audioState.activeAudio) {
      log.debug('useFeedbackCoordinator.audioEndCleanupGuard', '✓ Force clearing activeAudio', {
        activeAudioId: audioState.activeAudio?.id ?? null,
      })
      audioState.setActiveAudio(null)
    }
    audioState.setIsPlaying(false)
    hideBubble('audio-stop')

    if (videoIsPlaying) {
      log.debug(
        'useFeedbackCoordinator.audioEndCleanupGuard',
        '▶️ Video already playing - no resume needed'
      )
      return
    }

    log.debug(
      'useFeedbackCoordinator.audioEndCleanupGuard',
      '▶️ Scheduling video resume after audio cleanup',
      {
        currentTime: currentVideoTimeRef.current,
      }
    )

    setTimeout(() => {
      const stillNoHighlight = !useFeedbackCoordinatorStore.getState().highlightedFeedbackId
      if (stillNoHighlight) {
        log.debug('useFeedbackCoordinator.audioEndCleanupGuard', '▶️ Executing video resume')
        videoPlayRef.current()
      } else {
        log.debug(
          'useFeedbackCoordinator.audioEndCleanupGuard',
          '⏭️ Skipping resume - new highlight appeared'
        )
      }
    }, 100)
  }, [bubbleFeedbackItems, hideBubble, selection])

  // **PERFORMANCE FIX: Sync state to Zustand store**
  // Updates store in batches when multiple values change together
  // This allows components to subscribe granularly to only the state they need
  // CRITICAL: Use getState() instead of hook selector to avoid subscribing
  // This prevents circular dependencies (hook updates store → store updates hook)
  // PERFORMANCE FIX: Selection state (highlightedFeedbackId, isCoachSpeaking) is now
  // written directly to store by useFeedbackSelection, so we only sync bubble/overlay state
  useEffect(() => {
    // Batch all state updates to prevent multiple re-renders
    // Using getState() means this hook doesn't subscribe to store changes
    useFeedbackCoordinatorStore.getState().batchUpdate({
      // Selection state is already in store (written by useFeedbackSelection)
      // Only sync bubble and overlay state here
      bubbleState: {
        currentBubbleIndex,
        bubbleVisible,
      },
      overlayVisible,
      activeAudio: (() => {
        const audioState = useFeedbackAudioStore.getState()
        return audioState.activeAudio?.id && audioState.activeAudio?.url
          ? { id: audioState.activeAudio.id, url: audioState.activeAudio.url }
          : null
      })(),
    })
  }, [
    // Selection state removed - already synced by useFeedbackSelection
    currentBubbleIndex,
    bubbleVisible,
    overlayVisible,
    // Don't include batchUpdate in deps - it's stable
  ])

  useEffect(() => {
    if (!overlayVisible) {
      return
    }

    // PERFORMANCE FIX: Read from store instead of selection object
    // Selection state is now in store, written directly by useFeedbackSelection
    const candidateId = useFeedbackCoordinatorStore.getState().highlightedFeedbackId

    if (!candidateId) {
      return
    }

    const nextBubbleIndex = bubbleIndexById.get(candidateId) ?? null

    if (nextBubbleIndex === null || (currentBubbleIndex === nextBubbleIndex && bubbleVisible)) {
      return
    }

    showBubble(nextBubbleIndex)
  }, [
    overlayVisible,
    // Read from store imperatively - no subscription needed
    bubbleIndexById,
    hideBubble,
    showBubble,
    bubbleVisible,
    currentBubbleIndex,
  ])

  // Store videoPlayback.pause in ref to prevent handlePause from recreating
  // when videoPlayback object changes (which happens when its internal state changes)
  const videoPlaybackPauseRef = useRef(videoPlayback.pause)
  useEffect(() => {
    videoPlaybackPauseRef.current = videoPlayback.pause
  }, [videoPlayback.pause])

  // Memoize pause handler to prevent recreation
  // Always call setIsPlaying(false) - harmless if already false, avoids dependency on isPlaying
  const handlePause = useCallback(() => {
    log.debug('useFeedbackCoordinator.handlePause', '⏸️ Pause pressed', {
      activeAudioId: useFeedbackAudioStore.getState().activeAudio?.id ?? null,
      highlightedFeedbackId: useFeedbackCoordinatorStore.getState().highlightedFeedbackId,
      isPlayingBefore: useFeedbackAudioStore.getState().isPlaying,
      bubbleVisible: useFeedbackCoordinatorStore.getState().bubbleState.bubbleVisible,
    })

    // When pause is pressed, pause audio feedback if playing (but don't stop/hide)
    // The bubble timer will be paused automatically when isPlaying becomes false
    useFeedbackAudioStore.getState().setIsPlaying(false)
    videoPlaybackPauseRef.current()

    log.debug('useFeedbackCoordinator.handlePause', '✓ Pause completed', {
      isPlayingAfter: useFeedbackAudioStore.getState().isPlaying,
      bubbleVisibleAfter: useFeedbackCoordinatorStore.getState().bubbleState.bubbleVisible,
    })
  }, [])

  // Memoize audio overlay handlers to prevent recreation
  const handleAudioOverlayClose = useCallback(() => {
    // log.info('useFeedbackCoordinator', 'Audio overlay closed by user')
    handleAudioStop('audio-overlay-close')
  }, [handleAudioStop])

  const handleAudioOverlayInactivity = useCallback(() => {
    // log.info('useFeedbackCoordinator', 'Audio overlay inactivity detected')
    handleAudioStop('audio-overlay-inactivity')
  }, [handleAudioStop])

  const handleAudioOverlayInteraction = useCallback(() => {
    // log.debug('useFeedbackCoordinator', 'Audio overlay interaction detected')
  }, [])

  // Memoize return value to prevent recreation on every render
  // This is critical for preventing cascading re-renders in VideoAnalysisScreen
  // Store primitive values for accurate comparison (not object references)
  const prevDepsRef = useRef<{
    selectionHighlightId: string | null
    selectionCoachSpeaking: boolean
    selectionSelectedId: string | null
    currentBubbleIndex: number | null
    bubbleVisible: boolean
    overlayVisible: boolean
    activeAudioId: string | null
    activeAudioUrl: string | null
    // Keep full objects for debug logging (but compare primitives)
    selection: any
    activeAudio: any
  }>({
    selectionHighlightId: null,
    selectionCoachSpeaking: false,
    selectionSelectedId: null,
    currentBubbleIndex: null,
    bubbleVisible: false,
    overlayVisible: false,
    activeAudioId: null,
    activeAudioUrl: null,
    selection: null,
    activeAudio: null,
  })

  // Store callbacks in refs to ensure stable references
  // These callbacks already use refs internally, so they're functionally stable
  const callbacksRef = useRef({
    onProgressTrigger: handleProgressTrigger,
    onUserTapFeedback: handleUserTapFeedback,
    onPlay: handlePlay,
    onPause: handlePause,
    onPanelCollapse: handlePanelCollapse,
    onAudioOverlayClose: handleAudioOverlayClose,
    onAudioOverlayInactivity: handleAudioOverlayInactivity,
    onAudioOverlayInteraction: handleAudioOverlayInteraction,
    onPlayPendingFeedback: handlePlayPendingFeedback,
    onAudioNaturalEnd: handleAudioNaturalEnd,
  })

  // Update ref properties (not the ref itself) to maintain stable object identity
  callbacksRef.current.onProgressTrigger = handleProgressTrigger
  callbacksRef.current.onUserTapFeedback = handleUserTapFeedback
  callbacksRef.current.onPlay = handlePlay
  callbacksRef.current.onPause = handlePause
  callbacksRef.current.onPanelCollapse = handlePanelCollapse
  callbacksRef.current.onAudioOverlayClose = handleAudioOverlayClose
  callbacksRef.current.onAudioOverlayInactivity = handleAudioOverlayInactivity
  callbacksRef.current.onAudioOverlayInteraction = handleAudioOverlayInteraction
  callbacksRef.current.onPlayPendingFeedback = handlePlayPendingFeedback
  callbacksRef.current.onAudioNaturalEnd = handleAudioNaturalEnd

  return useMemo(() => {
    // Reconstruct activeAudio from store imperatively to prevent subscriptions
    const audioState = useFeedbackAudioStore.getState()
    const reconstructedActiveAudio = audioState.activeAudio

    // PERFORMANCE FIX: Read selection state from store instead of selection object
    // Selection state is now in store, written directly by useFeedbackSelection
    const store = useFeedbackCoordinatorStore.getState()
    const storeHighlightedFeedbackId = store.highlightedFeedbackId
    const storeIsCoachSpeaking = store.isCoachSpeaking

    // Debug: track what's changing
    // Compare PRIMITIVE values, not object references, to match useMemo dependency array
    const prev = prevDepsRef.current

    // Track which dependency triggered useMemo recalculation
    const dependencyChanges: string[] = []
    if (prev.selectionHighlightId !== storeHighlightedFeedbackId) {
      dependencyChanges.push(
        `selection.highlightedFeedbackId: ${prev.selectionHighlightId} → ${storeHighlightedFeedbackId}`
      )
    }
    if (prev.selectionCoachSpeaking !== storeIsCoachSpeaking) {
      dependencyChanges.push(
        `selection.isCoachSpeaking: ${prev.selectionCoachSpeaking} → ${storeIsCoachSpeaking}`
      )
    }
    if (prev.currentBubbleIndex !== currentBubbleIndex) {
      dependencyChanges.push(
        `currentBubbleIndex: ${prev.currentBubbleIndex} → ${currentBubbleIndex}`
      )
    }
    if (prev.bubbleVisible !== bubbleVisible) {
      dependencyChanges.push(`bubbleVisible: ${prev.bubbleVisible} → ${bubbleVisible}`)
    }
    if (prev.overlayVisible !== overlayVisible) {
      dependencyChanges.push(`overlayVisible: ${prev.overlayVisible} → ${overlayVisible}`)
    }
    const currentActiveAudioId = reconstructedActiveAudio?.id ?? null
    const currentActiveAudioUrl = reconstructedActiveAudio?.url ?? null
    if (prev.activeAudioId !== currentActiveAudioId) {
      dependencyChanges.push(`activeAudioId: ${prev.activeAudioId} → ${currentActiveAudioId}`)
    }
    if (prev.activeAudioUrl !== currentActiveAudioUrl) {
      dependencyChanges.push(
        `activeAudioUrl: ${prev.activeAudioUrl !== null ? '...' : null} → ${currentActiveAudioUrl !== null ? '...' : null}`
      )
    }

    if (prev.selectionHighlightId !== null || prev.selection !== null) {
      const changed: string[] = []

      // Compare selection primitives using stored values
      if (prev.selectionHighlightId !== storeHighlightedFeedbackId) {
        changed.push('selection.highlightedFeedbackId')
      }
      if (prev.selectionCoachSpeaking !== storeIsCoachSpeaking) {
        changed.push('selection.isCoachSpeaking')
      }
      const storeSelectedFeedbackId = store.selectedFeedbackId
      if (prev.selectionSelectedId !== storeSelectedFeedbackId) {
        changed.push('selection.selectedFeedbackId')
      }
      // Only log 'selection' if actual values changed (for backward compatibility)
      if (
        prev.selectionHighlightId !== storeHighlightedFeedbackId ||
        prev.selectionCoachSpeaking !== storeIsCoachSpeaking ||
        prev.selectionSelectedId !== storeSelectedFeedbackId
      ) {
        changed.push('selection')
      }

      if (prev.currentBubbleIndex !== currentBubbleIndex) changed.push('currentBubbleIndex')
      if (prev.bubbleVisible !== bubbleVisible) changed.push('bubbleVisible')
      if (prev.overlayVisible !== overlayVisible) changed.push('overlayVisible')
      // Compare primitive values (not object references)
      const currAudioId = reconstructedActiveAudio?.id ?? null
      const currAudioUrl = reconstructedActiveAudio?.url ?? null
      if (prev.activeAudioId !== currAudioId || prev.activeAudioUrl !== currAudioUrl) {
        changed.push('activeAudio')
      }

      // Logging removed for performance
    }

    // Store primitive values for accurate comparison (not object references)
    prevDepsRef.current = {
      selectionHighlightId: storeHighlightedFeedbackId,
      selectionCoachSpeaking: storeIsCoachSpeaking,
      selectionSelectedId: store.selectedFeedbackId,
      currentBubbleIndex,
      bubbleVisible,
      overlayVisible,
      activeAudioId: reconstructedActiveAudio?.id ?? null,
      activeAudioUrl: reconstructedActiveAudio?.url ?? null,
      // Keep full objects for debug logging
      selection,
      activeAudio: reconstructedActiveAudio,
    }

    const returnedPendingFeedbackId = pendingFeedbackIdRef.current
    log.debug('useFeedbackCoordinator.return', '📤 Returning coordinator state', {
      returnedPendingFeedbackId,
      returnedHighlightedFeedbackId: storeHighlightedFeedbackId,
    })

    return {
      highlightedFeedbackId: storeHighlightedFeedbackId,
      isCoachSpeaking: storeIsCoachSpeaking,
      bubbleState: {
        currentBubbleIndex,
        bubbleVisible,
      },
      overlayVisible,
      activeAudio: reconstructedActiveAudio,
      pendingFeedbackId: returnedPendingFeedbackId,
      // Use callbacks from ref to maintain stable object identity
      onProgressTrigger: callbacksRef.current.onProgressTrigger,
      onUserTapFeedback: callbacksRef.current.onUserTapFeedback,
      onPlay: callbacksRef.current.onPlay,
      onPause: callbacksRef.current.onPause,
      onPanelCollapse: callbacksRef.current.onPanelCollapse,
      onAudioOverlayClose: callbacksRef.current.onAudioOverlayClose,
      onAudioOverlayInactivity: callbacksRef.current.onAudioOverlayInactivity,
      onAudioOverlayInteraction: callbacksRef.current.onAudioOverlayInteraction,
      onPlayPendingFeedback: callbacksRef.current.onPlayPendingFeedback,
      onAudioNaturalEnd: callbacksRef.current.onAudioNaturalEnd,
    }
  }, [
    // PERFORMANCE FIX: Read selection state from store imperatively in useMemo
    // Don't subscribe to selection object - it causes re-renders
    // Store values are read imperatively via getState() inside useMemo
    currentBubbleIndex,
    bubbleVisible,
    overlayVisible,
    // Omit callbacks from deps - they're stable via refs
  ])
}
