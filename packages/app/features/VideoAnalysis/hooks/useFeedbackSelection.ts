import { useCallback, useEffect, useMemo, useRef } from 'react'

import { log } from '@my/logging'

import { useVideoPlayerStore } from '../stores'
import { useFeedbackAudioStore } from '../stores/feedbackAudio'
import { useFeedbackCoordinatorStore } from '../stores/feedbackCoordinatorStore'
import type { FeedbackPanelItem } from '../types'
import type { AudioControllerState } from './useAudioController'
import type { VideoPlaybackState } from './useVideoPlayer.types'

export interface FeedbackSelectionState {
  selectedFeedbackId: string | null
  isCoachSpeaking: boolean
  highlightedFeedbackId: string | null
  highlightSource: 'user' | 'auto' | null
  selectFeedback: (
    item: FeedbackPanelItem,
    options?: { seek?: boolean; playAudio?: boolean }
  ) => void
  highlightAutoFeedback: (
    item: FeedbackPanelItem,
    options?: { seek?: boolean; playAudio?: boolean; autoDurationMs?: number }
  ) => void
  clearHighlight: (options?: {
    matchId?: string
    sources?: Array<'user' | 'auto'>
    reason?: string
  }) => void
  clearSelection: () => void
  triggerCoachSpeaking: (durationMs?: number, options?: { activate?: boolean }) => void
}

/**
 * useFeedbackSelection - Thin Action Layer for Feedback Interactions
 *
 * **PERFORMANCE FIX:** This hook is NOT a React state container. It's an imperative
 * action dispatcher that talks directly to `useFeedbackCoordinatorStore` via `getState()`.
 *
 * **Problem Solved:** Previously held `useState` for selection, highlight, and coach-speaking.
 * Each state change forced parent re-renders (4-5 per tap). Now all state lives in Zustand.
 *
 * **Data Flow:**
 * 1. User taps feedback item
 * 2. `selectFeedback()` / `highlightAutoFeedback()` called
 * 3. Hook calls `store.batchUpdate({ ... })` (writes to Zustand)
 * 4. Zustand batches updates (single state transaction)
 * 5. Subscribed components re-render (FeedbackSection, VideoPlayerSection)
 * 6. Parent (VideoAnalysisScreen) stays dark (not subscribed)
 *
 * **Key Behaviors:**
 * - All state reads/writes use `useFeedbackCoordinatorStore.getState()`
 * - Timers and refs for side effects (coach-speaking duration, highlight clearing)
 * - Callbacks are stable (no deps on internal state)
 * - Returns stale values for backward compatibility with coordinators
 *
 * **Never Call This Directly in Components:**
 * Components should:
 * - Subscribe to store directly: `useFeedbackCoordinatorStore((state) => state.selectedFeedbackId)`
 * - Call coordinator actions: `useFeedbackCoordinator.onUserTapFeedback(item)`
 *
 * This hook is internal to the coordinator layer.
 *
 * @param audioController - Stable reference to audio playback (legacy hooks expect signature)
 * @param videoPlayback - Stable reference to video playback (for seek call)
 * @returns Callbacks for feedback selection; state values are stale (read from store instead)
 */
export function useFeedbackSelection(
  audioController: AudioControllerState,
  videoPlayback: Omit<VideoPlaybackState, 'currentTime' | 'duration' | 'isPlaying'>
): FeedbackSelectionState {
  // PERFORMANCE FIX: Don't subscribe to store - read imperatively
  // This prevents useFeedbackSelection from causing re-renders in parent components
  // Components that need selection state subscribe directly to store (FeedbackSection, VideoPlayerSection)
  // We only return values here for backward compatibility with useFeedbackCoordinator
  const coachTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // (selectAudio is invoked via useFeedbackAudioSource; no local subscription required)

  // Store videoPlayback.seek in ref to prevent callback recreation
  // videoPlayback object recreates when currentTime/duration change, but seek() is stable
  const videoPlaybackSeekRef = useRef(videoPlayback.seek)
  videoPlaybackSeekRef.current = videoPlayback.seek

  const triggerCoachSpeaking = useCallback(
    (durationMs = 3000, options?: { activate?: boolean }) => {
      const { activate = true } = options ?? {}
      // Always clear existing timer first
      if (coachTimerRef.current) {
        clearTimeout(coachTimerRef.current)
        coachTimerRef.current = null
      }

      const store = useFeedbackCoordinatorStore.getState()

      if (durationMs <= 0) {
        // Only update store if not already false (prevent redundant updates)
        if (store.isCoachSpeaking) {
          store.batchUpdate({ isCoachSpeaking: false })
        }
        return
      }

      // Only update store if not already true (prevent redundant updates)
      if (activate && !store.isCoachSpeaking) {
        store.batchUpdate({ isCoachSpeaking: true })
      }

      coachTimerRef.current = setTimeout(() => {
        // Read from store directly (not ref) to get latest state
        const currentStore = useFeedbackCoordinatorStore.getState()
        // Only update store if not already false (prevent redundant updates)
        if (currentStore.isCoachSpeaking) {
          currentStore.batchUpdate({ isCoachSpeaking: false })
        }
        coachTimerRef.current = null
      }, durationMs)
    },
    []
  )

  const clearHighlightTimer = useCallback(() => {
    if (highlightTimerRef.current) {
      clearTimeout(highlightTimerRef.current)
      highlightTimerRef.current = null
    }
  }, [])

  const clearHighlight = useCallback(
    (options?: { matchId?: string; sources?: Array<'user' | 'auto'>; reason?: string }) => {
      const { matchId, sources, reason } = options ?? {}
      const store = useFeedbackCoordinatorStore.getState()
      const currentHighlightId = store.highlightedFeedbackId
      const currentHighlightSource = store.highlightSource

      if (!currentHighlightId || !currentHighlightSource) {
        return
      }

      if (matchId && currentHighlightId !== matchId) {
        return
      }

      if (sources && !sources.includes(currentHighlightSource)) {
        return
      }

      clearHighlightTimer()

      // CRITICAL: Stop audio and clear activeAudio when highlight is cleared
      // This prevents stale audio from playing when user presses play without selecting feedback
      const audioStore = useFeedbackAudioStore.getState()
      const activeAudioMatchesHighlight = audioStore.activeAudio?.id === currentHighlightId

      if (activeAudioMatchesHighlight) {
        log.debug(
          'useFeedbackSelection.clearHighlight',
          '🛑 Stopping audio for cleared highlight',
          {
            highlightedFeedbackId: currentHighlightId,
            activeAudioId: audioStore.activeAudio?.id ?? null,
            reason,
          }
        )
        audioStore.setIsPlaying(false)
        audioStore.setActiveAudio(null)
      }

      store.batchUpdate({
        highlightedFeedbackId: null,
        highlightSource: null,
      })
    },
    [clearHighlightTimer]
  )

  const applyHighlight = useCallback(
    (
      item: FeedbackPanelItem,
      {
        source,
        seek = source === 'user',
        playAudio = source === 'user',
        autoDurationMs,
      }: {
        source: 'user' | 'auto'
        seek?: boolean
        playAudio?: boolean
        autoDurationMs?: number
      }
    ) => {
      clearHighlightTimer()

      const store = useFeedbackCoordinatorStore.getState()

      // Check if already highlighted (prevent redundant updates)
      if (store.highlightedFeedbackId === item.id && store.highlightSource === source) {
        return
      }

      // URGENT: Seek operation happens immediately (not batched)
      // User expects instant video response
      // PERFORMANCE FIX: Use seekImmediate from store if available (low-latency)
      // Falls back to regular seek for backward compatibility
      if (seek && item.timestamp) {
        const seekTime = item.timestamp / 1000
        const seekImmediateFn = useVideoPlayerStore.getState().seekImmediate
        if (seekImmediateFn) {
          // Use imperative seek for <16ms latency (no React render cycle)
          seekImmediateFn(seekTime)
        } else {
          // Fallback to standard seek (200ms latency via store)
          videoPlaybackSeekRef.current(seekTime)
        }
      }

      // SOLUTION 2: Defer batch update to prevent blocking progress bar
      // Progress bar shared value updates happen immediately on UI thread via runOnUI,
      // but feedback coordinator batch updates can block JS thread. Defer them to next tick.
      const shouldActivateCoachSpeaking = !store.isCoachSpeaking

      setTimeout(() => {
        // Batch all state updates in single store transaction
        // Zustand automatically batches, so this is a single render
        store.batchUpdate({
          highlightedFeedbackId: item.id,
          highlightSource: source,
          selectedFeedbackId: item.id,
          ...(shouldActivateCoachSpeaking ? { isCoachSpeaking: true } : {}),
        })

        // PERFORMANCE FIX: Execute audio playback immediately after batchUpdate
        // instead of deferring through RAF+setTimeout (which adds 3-second delay)
        // Audio playback is time-sensitive and should start ASAP
        const storeSnapshot = useFeedbackCoordinatorStore.getState()
        const highlightStillMatches =
          storeSnapshot.highlightedFeedbackId === item.id &&
          storeSnapshot.highlightSource === source

        if (!highlightStillMatches) {
          log.debug(
            'useFeedbackSelection.applyHighlight',
            '⏭️ Skipping audio start - highlight changed before playback',
            {
              feedbackId: item.id,
              expectedHighlightId: item.id,
              actualHighlightId: storeSnapshot.highlightedFeedbackId,
              expectedSource: source,
              actualSource: storeSnapshot.highlightSource,
              playAudioRequested: playAudio,
            }
          )
          return
        }

        const audioStore = useFeedbackAudioStore.getState()
        const urlsMap = audioStore.audioUrls

        if (playAudio && urlsMap[item.id]) {
          const audioUrl = urlsMap[item.id]
          const activeAudio = audioStore.activeAudio
          const urlToUse =
            activeAudio?.id === item.id ? `${audioUrl}#replay=${Date.now()}` : audioUrl

          log.debug('useFeedbackSelection.applyHighlight', '🎵 Playing audio for feedback', {
            feedbackId: item.id,
            hasAudioUrl: !!audioUrl,
            currentActiveAudioId: activeAudio?.id ?? null,
            willSetActiveAudio: true,
            willSetIsPlaying: true,
          })

          audioStore.setActiveAudio({ id: item.id, url: urlToUse })
          audioStore.setIsPlaying(true)
        } else {
          log.debug('useFeedbackSelection.applyHighlight', '⏸️ Audio NOT playing', {
            feedbackId: item.id,
            playAudio,
            hasUrlsMap: urlsMap ? !!urlsMap[item.id] : false,
            reason: !playAudio ? 'playAudio=false' : 'no URL in map',
          })
        }

        if (playAudio) {
          triggerCoachSpeaking(undefined, { activate: !shouldActivateCoachSpeaking })
        }

        if (source === 'auto' && autoDurationMs && autoDurationMs > 0) {
          highlightTimerRef.current = setTimeout(() => {
            clearHighlight({
              matchId: item.id,
              sources: ['auto'],
              reason: 'auto-duration-elapsed',
            })
          }, autoDurationMs)
        }
      }, 0)
    },
    [clearHighlight, clearHighlightTimer, triggerCoachSpeaking]
  )

  const selectFeedback = useCallback(
    (item: FeedbackPanelItem, options?: { seek?: boolean; playAudio?: boolean }) => {
      const { seek = true, playAudio = true } = options ?? {}

      // log.info('useFeedbackSelection', 'Feedback item selected', { id: item.id })
      applyHighlight(item, {
        source: 'user',
        seek,
        playAudio,
      })
    },
    [applyHighlight]
  )

  const highlightAutoFeedback = useCallback(
    (
      item: FeedbackPanelItem,
      options?: { seek?: boolean; playAudio?: boolean; autoDurationMs?: number }
    ) => {
      const { seek = false, playAudio = true, autoDurationMs } = options ?? {}

      applyHighlight(item, {
        source: 'auto',
        seek,
        playAudio,
        autoDurationMs,
      })
    },
    [applyHighlight]
  )

  const clearSelection = useCallback(() => {
    const store = useFeedbackCoordinatorStore.getState()
    const audioStore = useFeedbackAudioStore.getState()

    // PERFORMANCE: Early exit if nothing to clear
    // Prevents redundant store writes (null→null, false→false)
    const hasSelection = store.selectedFeedbackId !== null
    const hasActiveAudio = audioStore.isPlaying || audioStore.activeAudio !== null

    if (!hasSelection && !hasActiveAudio) {
      log.debug('useFeedbackSelection.clearSelection', '⏭️ Skipping clear - nothing selected', {
        currentSelectedFeedbackId: store.selectedFeedbackId,
        currentActiveAudioId: audioStore.activeAudio?.id ?? null,
        currentIsPlaying: audioStore.isPlaying,
      })
      return
    }

    log.debug('useFeedbackSelection.clearSelection', '🧹 Clearing selection', {
      currentSelectedFeedbackId: store.selectedFeedbackId,
      currentActiveAudioId: audioStore.activeAudio?.id ?? null,
      currentIsPlaying: audioStore.isPlaying,
      willSetActiveAudio: null,
      willSetIsPlaying: false,
    })

    // PERFORMANCE FIX: Batch all state updates in single store transaction
    // Zustand automatically batches, so this is a single render
    clearHighlight({ reason: 'manual-clear' })

    if (hasSelection) {
      store.batchUpdate({
        selectedFeedbackId: null,
      })
    }
    if (hasActiveAudio) {
      audioStore.setActiveAudio(null)
      audioStore.setIsPlaying(false)
    }
    triggerCoachSpeaking(0)
  }, [clearHighlight, triggerCoachSpeaking])

  useEffect(() => {
    return () => {
      if (coachTimerRef.current) {
        clearTimeout(coachTimerRef.current)
        coachTimerRef.current = null
      }
      if (highlightTimerRef.current) {
        clearTimeout(highlightTimerRef.current)
        highlightTimerRef.current = null
      }
    }
  }, [])

  // Pause highlight timer when video playback is paused
  // Similar to how useBubbleController pauses bubble timers when isPlaying becomes false
  // Read isPlaying from store instead of videoPlayback to avoid re-renders
  const prevIsPlayingRef = useRef(useVideoPlayerStore.getState().isPlaying)
  useEffect(() => {
    const unsubscribe = useVideoPlayerStore.subscribe((state) => {
      const wasPlaying = prevIsPlayingRef.current
      const nowPlaying = state.isPlaying
      prevIsPlayingRef.current = nowPlaying

      // Clear highlight timer when transitioning from playing to paused
      if (wasPlaying && !nowPlaying && highlightTimerRef.current) {
        clearHighlightTimer()
      }
    })
    return () => {
      unsubscribe()
    }
  }, [clearHighlightTimer]) // isPlaying read from store, no need to depend on it

  // PERFORMANCE FIX: Store selectedFeedbackId in ref, subscribe imperatively
  // Previous pattern: const selectedFeedbackId = useFeedbackCoordinatorStore((state) => state.selectedFeedbackId)
  // Problem: Hook selector triggers useSyncExternalStore re-renders → useFeedbackSelection re-renders → bubbles to parent
  // Solution: Use ref + imperative subscription (no useSyncExternalStore)
  const selectedFeedbackIdRef = useRef<string | null>(null)
  const previousSelectedIdRef = useRef<string | null>(null)

  // Store seekTo in ref to avoid recreating effect when audioController object changes
  const seekToRef = useRef(audioController.seekTo)
  seekToRef.current = audioController.seekTo

  useEffect(() => {
    // Subscribe imperatively - updates ref without triggering React renders
    // When selectedFeedbackId changes, manually trigger the seek side effect
    const unsubscribe = useFeedbackCoordinatorStore.subscribe((state) => {
      const newSelectedId = state.selectedFeedbackId
      selectedFeedbackIdRef.current = newSelectedId

      // Detect changes and trigger seek (imperative, not via effect deps)
      if (newSelectedId !== previousSelectedIdRef.current) {
        previousSelectedIdRef.current = newSelectedId

        if (!newSelectedId) {
          return
        }

        const selectedAudioUrl = useFeedbackAudioStore.getState().audioUrls[newSelectedId]
        if (!selectedAudioUrl) {
          return
        }

        // Trigger seek imperatively - no effect re-run, no re-renders
        seekToRef.current(0)
      }
    })
    return unsubscribe
  }, [])

  // Memoize return value to prevent recreation on every render
  // This is critical for preventing cascading re-renders in VideoAnalysisScreen
  // PERFORMANCE FIX: Read state imperatively from store (no subscriptions)
  // Components that need selection state subscribe directly to store
  return useMemo(() => {
    // Read from store imperatively - no subscription, no re-renders
    const storeState = useFeedbackCoordinatorStore.getState()
    return {
      selectedFeedbackId: storeState.selectedFeedbackId,
      isCoachSpeaking: storeState.isCoachSpeaking,
      highlightedFeedbackId: storeState.highlightedFeedbackId,
      highlightSource: storeState.highlightSource,
      selectFeedback,
      highlightAutoFeedback,
      clearHighlight,
      clearSelection,
      triggerCoachSpeaking,
    }
  }, [
    // Only depend on callbacks - state is read imperatively
    selectFeedback,
    highlightAutoFeedback,
    clearHighlight,
    clearSelection,
    triggerCoachSpeaking,
  ])
}
