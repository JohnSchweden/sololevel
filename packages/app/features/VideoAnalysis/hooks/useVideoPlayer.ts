import { log } from '@my/logging'
import { useCallback, useEffect, useMemo, useRef } from 'react'

import { usePersistentProgressStore, useVideoPlayerStore } from '../stores'
import type {
  UseVideoPlayerOptions,
  UseVideoPlayerReturn,
  VideoPlayerRef,
} from './useVideoPlayer.types'

/**
 * Unified video playback controller that subsumes the responsibilities of the four legacy hooks:
 *
 * • `useVideoPlayback` → playback state machine (play/pause/seek, progress tracking, ref access)<br/>
 * • `useVideoControls` → controls visibility + auto-hide timer<br/>
 * • `useVideoAudioSync` → audio vs video gating surface<br/>
 * • `useAutoPlayOnReady` → auto-play when analysis completes or history loads ready
 *
 * Flow (render-to-render):
 *
 * ```
 *               ┌───────────────────────────────────────────────────────────────┐
 *               │             Inputs (options + callbacks)                     │
 *               │ initialStatus │ isProcessing │ audioIsPlaying │ timers       │
 *               └────────────────┬──────────────────────────────────────────────┘
 *                                │
 *        Video events ───────────┼──────►  Playback core  ──────► Derived state (isPlaying,
 *        (onLoad/onProgress/     │       (refs + state)          currentTime, pendingSeek,
 *         onSeek/onEnd)          │                                videoEnded, etc.)
 *                                │
 *                                ▼
 *                    Controls coordinator (manual/forced visibility,
 *                    auto-hide, replay button)
 *                                │
 *                                ▼
 *                    Audio sync gate (shouldPlayVideo/Audio, pause flags)
 *                                │
 *                                ▼
 *        Imperative ref  ◄───────┴──────  Stable API for `VideoPlayer` + tests
 * ```
 *
 * By consolidating the four hooks we keep the original contracts intact while guaranteeing
 * that playback, controls, audio sync, and auto-play transitions share a single source
 * of truth. Consumers (screen, coordinator, tests) still destructure the same fields,
 * but they now observe consistent timing and ref behaviour.
 *
 * ## Critical: initialStatus Semantics
 *
 * `initialStatus` represents **analysis readiness**, not raw caller intent.
 * Auto-play logic depends on seeing the normalized state:
 *
 * - **Analysis flow**: Pass `'processing'` on start → `'ready'` on completion (auto-play triggers)
 * - **History flow**: Pass `'ready'` on mount (auto-play triggers immediately)
 * - **DO normalize before passing**: `const norm = isHistoryMode ? 'ready' : initialStatus`
 * - **DO NOT pass raw prop**: Passing un-normalized `initialStatus` breaks auto-play in history mode
 * - **Values `'playing'`/`'paused'`** supported but only for direct testing; screen uses normalized form
 *
 * ## UI-thread progress synchronization
 *
 * When a `progressShared` Reanimated shared value is supplied (see {@link UseVideoPlayerOptions.progressShared}),
 * the hook writes playback progress directly to that shared value on every tick. UI surfaces that read the shared
 * value via Reanimated worklets (e.g., persistent progress bar) stay in perfect lockstep with the video without waiting
 * for React commits. Consumers who do not care about UI-thread animation can omit the option and rely on store state.
 *
 * @param options - Previous hook inputs merged into a single configuration object.
 * @param options.initialStatus - Normalized analysis state. Pass normalized readiness ('processing'→'ready' or 'ready' on start).
 * @param options.isProcessing - Whether analysis is in-flight (for transition detection).
 * @param options.audioIsPlaying - Whether feedback audio active (for video gating).
 * @param options.autoHideDurationMs - Controls auto-hide timeout (ms).
 * @param options.progressShared - Optional Reanimated shared value (0-100). When provided the hook writes playback progress
 * directly to the shared value so UI-thread animations can consume it without React involvement.
 * @returns All playback/control/sync fields plus the imperative ref used by `VideoPlayer`.
 */
export function useVideoPlayer(options: UseVideoPlayerOptions = {}): UseVideoPlayerReturn {
  const {
    initialStatus = 'processing',
    isProcessing = false,
    audioIsPlaying = false,
    autoHideDurationMs = 3000,
    progressShared,
  } = options

  /**
   * PERFORMANCE FIX: Replace useState with Zustand store to eliminate render cascades
   *
   * Previous: 5 useState hooks → 16+ re-renders per second during playback
   * Current: Zustand store → components subscribe granularly, no cascade renders
   *
   * Store actions (write-only, no re-renders from calling these):
   */
  const setIsPlaying = useVideoPlayerStore((state) => state.setIsPlaying)
  const setDisplayTime = useVideoPlayerStore((state) => state.setDisplayTime)
  const setDuration = useVideoPlayerStore((state) => state.setDuration)
  const setPendingSeek = useVideoPlayerStore((state) => state.setPendingSeek)
  const setVideoEnded = useVideoPlayerStore((state) => state.setVideoEnded)
  const setManualControlsVisible = useVideoPlayerStore((state) => state.setManualControlsVisible)
  const setStoreControlsVisible = useVideoPlayerStore((state) => state.setControlsVisible)

  /**
   * Playback core (legacy `useVideoPlayback`)
   *
   * - Tracks canonical playback state (`isPlaying`, `videoEnded`, `pendingSeek`)
   * - Splits precise time vs display time (refs vs state) to avoid render storms
   * - Keeps per-seek bookkeeping for stale event filtering
   *
   * PERFORMANCE: Read from store only for derived computations in this hook
   * Consumers will subscribe directly to prevent intermediary re-renders
   */
  // Store reads - keep only stable subscriptions that don't change frequently
  // Noisy ones (displayTime, duration) moved to children to avoid screen re-renders
  const isPlaying = useVideoPlayerStore((state) => state.isPlaying)
  const pendingSeek = useVideoPlayerStore((state) => state.pendingSeek)
  const videoEnded = useVideoPlayerStore((state) => state.videoEnded)

  // Getters for noisy values - children subscribe directly to avoid re-renders
  const getDisplayTime = useCallback(() => useVideoPlayerStore.getState().displayTime, [])
  const getDuration = useCallback(() => useVideoPlayerStore.getState().duration, [])

  const actualCurrentTimeRef = useRef(0)
  const displayTimeRef = useRef(0)
  const durationRef = useRef(0)
  const lastReportedProgressRef = useRef(0)
  const lastSeekTargetRef = useRef<number | null>(null)
  const seekCompleteTimeRef = useRef(0)
  const progressBeforeSeekRef = useRef<number | null>(null)
  const videoEndedRef = useRef(false)
  const seekToEndRef = useRef(false)

  const updateProgressShared = useCallback(
    (time: number, durationOverride?: number) => {
      if (!progressShared) {
        return
      }

      const rawDuration =
        typeof durationOverride === 'number' && Number.isFinite(durationOverride)
          ? durationOverride
          : durationRef.current
      const clampedDuration = rawDuration > 0 ? rawDuration : 0
      const percent =
        clampedDuration > 0 ? Math.max(0, Math.min(100, (time / clampedDuration) * 100)) : 0

      progressShared.value = percent
    },
    [progressShared]
  )

  /**
   * Controls visibility (legacy `useVideoControls`)
   *
   * - `manualVisible` captures explicit user toggles
   * - Forced visibility covers processing, pause, or ended states
   * - Auto-hide timer matches previous 3s inactivity behaviour
   */
  const hasUserInteractedRef = useRef(false)
  const storeManualVisible = useVideoPlayerStore((state) => state.manualControlsVisible ?? false)
  const hideControlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const forcedVisibleRef = useRef(false)

  const prevProcessingRef = useRef(isProcessing)
  const hasAutoPlayedRef = useRef(false)

  // Sync refs on every render for stable closures
  displayTimeRef.current = getDisplayTime()
  durationRef.current = getDuration()

  const clearHideTimeout = useCallback(() => {
    if (hideControlsTimeoutRef.current) {
      clearTimeout(hideControlsTimeoutRef.current)
      hideControlsTimeoutRef.current = null
    }
  }, [])

  useEffect(() => clearHideTimeout, [clearHideTimeout])

  const scheduleHide = useCallback(() => {
    clearHideTimeout()

    if (forcedVisibleRef.current) {
      return
    }

    hideControlsTimeoutRef.current = setTimeout(() => {
      setManualControlsVisible(false)
    }, autoHideDurationMs)
  }, [autoHideDurationMs, clearHideTimeout, setManualControlsVisible])

  const setControlsVisible = useCallback(
    (visible: boolean) => {
      if (visible) {
        hasUserInteractedRef.current = true
        setManualControlsVisible(true)
        scheduleHide()
        return
      }

      if (forcedVisibleRef.current) {
        return
      }

      clearHideTimeout()
      setManualControlsVisible(false)
    },
    [clearHideTimeout, scheduleHide, setManualControlsVisible]
  )

  useEffect(() => {
    if (storeManualVisible) {
      hasUserInteractedRef.current = true
    }
  }, [storeManualVisible])

  const forcedVisible = useMemo(() => {
    if (videoEnded) {
      return true
    }

    if (!hasUserInteractedRef.current) {
      return false
    }

    return isProcessing || !isPlaying
  }, [isProcessing, isPlaying, videoEnded])

  forcedVisibleRef.current = forcedVisible

  useEffect(() => {
    if (forcedVisible) {
      clearHideTimeout()
      setManualControlsVisible(true) // Force controls visible when video ends or processing
    }
  }, [forcedVisible, clearHideTimeout, setManualControlsVisible])

  // Update computed controlsVisible whenever forced or manual visibility changes
  useEffect(() => {
    const computedVisible = forcedVisible || Boolean(storeManualVisible)
    setStoreControlsVisible(computedVisible)
  }, [forcedVisible, storeManualVisible, setStoreControlsVisible])

  useEffect(() => {
    if (storeManualVisible && isPlaying && !forcedVisibleRef.current) {
      scheduleHide()
      return () => {
        clearHideTimeout()
      }
    }

    return undefined
  }, [storeManualVisible, isPlaying, scheduleHide, clearHideTimeout])

  const getPreciseCurrentTime = useCallback(() => actualCurrentTimeRef.current, [])

  const syncDisplayTime = useCallback(
    (newTime: number) => {
      actualCurrentTimeRef.current = newTime

      displayTimeRef.current = newTime // Store precise time, not rounded

      log.debug('useVideoPlayer.syncDisplayTime', 'Updating store with precise time', { newTime })
      // Always update store with precise time for smooth progress
      setDisplayTime(newTime)
      updateProgressShared(newTime)
      usePersistentProgressStore.getState().updateTime(newTime, durationRef.current)
    },
    [setDisplayTime, updateProgressShared]
  )

  /**
   * Imperative surface (`VideoPlayerRef` parity). Downstream consumers expect these
   * methods to mirror the legacy hook behaviour, including timer resets and ref updates.
   */
  const play = useCallback(() => {
    setIsPlaying(true)
    setVideoEnded(false)
    videoEndedRef.current = false
    seekToEndRef.current = false

    if (hasUserInteractedRef.current && !forcedVisibleRef.current) {
      scheduleHide()
    }
  }, [scheduleHide, setIsPlaying, setVideoEnded])

  const pause = useCallback(() => {
    syncDisplayTime(actualCurrentTimeRef.current)
    setIsPlaying(false)
    setVideoEnded(false)
    videoEndedRef.current = false
    seekToEndRef.current = false
    clearHideTimeout()
  }, [syncDisplayTime, clearHideTimeout, setIsPlaying, setVideoEnded])

  const replay = useCallback(() => {
    // Clear all seek tracking to allow fresh progress events
    progressBeforeSeekRef.current = null
    lastSeekTargetRef.current = null
    seekCompleteTimeRef.current = 0

    syncDisplayTime(0)
    setPendingSeek(0)
    setVideoEnded(false)
    videoEndedRef.current = false
    seekToEndRef.current = false
    setIsPlaying(true)
    scheduleHide()
  }, [syncDisplayTime, scheduleHide, setIsPlaying, setPendingSeek, setVideoEnded])

  const seek = useCallback(
    (time: number) => {
      if (Number.isNaN(time)) {
        log.warn('useVideoPlayer', 'Seek ignored due to NaN time')
        return
      }

      actualCurrentTimeRef.current = time
      setPendingSeek(time)
      setVideoEnded(false)
      videoEndedRef.current = false
      seekToEndRef.current = false
      hasUserInteractedRef.current = true
      setManualControlsVisible(true)
      scheduleHide()
    },
    [scheduleHide, setManualControlsVisible, setPendingSeek, setVideoEnded]
  )

  const handleLoad = useCallback(
    (data: { duration: number }) => {
      const { duration: loadedDuration } = data

      if (!Number.isFinite(loadedDuration) || loadedDuration <= 0) {
        log.warn('useVideoPlayer', 'Invalid video duration received', { duration: loadedDuration })
        return
      }

      setDuration(loadedDuration)
      updateProgressShared(0, loadedDuration)
      usePersistentProgressStore.getState().updateTime(0, loadedDuration)
      setVideoEnded(false)
      videoEndedRef.current = false
      seekToEndRef.current = false
    },
    [setDuration, setVideoEnded, updateProgressShared]
  )

  useEffect(() => {
    videoEndedRef.current = videoEnded
  }, [videoEnded])

  const handleEnd = useCallback(
    (endTime?: number) => {
      const timeSinceSeekComplete = Date.now() - seekCompleteTimeRef.current
      const SEEK_STALE_EVENT_THRESHOLD_MS = 500

      if (
        lastSeekTargetRef.current !== null &&
        timeSinceSeekComplete < SEEK_STALE_EVENT_THRESHOLD_MS &&
        lastSeekTargetRef.current < durationRef.current - 0.1
      ) {
        log.debug('useVideoPlayer', 'Ignoring stale end event after seek', {
          endTime,
          seekTarget: lastSeekTargetRef.current,
          timeSinceSeekComplete,
          duration: durationRef.current,
        })
        return false
      }

      const actualEndTime =
        endTime ?? lastReportedProgressRef.current ?? actualCurrentTimeRef.current

      log.info('useVideoPlayer', 'Video end event received')

      syncDisplayTime(actualEndTime)
      lastReportedProgressRef.current = actualEndTime
      setIsPlaying(false)
      setVideoEnded(true)
      videoEndedRef.current = true
      seekToEndRef.current = false
      clearHideTimeout()
      return true
    },
    [clearHideTimeout, syncDisplayTime, setIsPlaying, setVideoEnded]
  )

  /**
   * Playback event pipeline (legacy `useVideoPlayback` handlers).
   * Defensive guards stay intact while we limit state updates to meaningful boundaries.
   */
  const handleProgress = useCallback(
    (currentTime: number) => {
      if (!Number.isFinite(currentTime)) {
        log.warn('useVideoPlayer', 'Received invalid currentTime from progress event', {
          currentTime,
        })
        return
      }

      if (videoEndedRef.current) {
        return
      }

      const timeSinceSeekComplete = Date.now() - seekCompleteTimeRef.current
      const SEEK_STALE_EVENT_THRESHOLD_MS = 500
      const SEEK_TO_END_THRESHOLD_MS = 500

      if (
        lastSeekTargetRef.current !== null &&
        timeSinceSeekComplete < SEEK_STALE_EVENT_THRESHOLD_MS
      ) {
        const isAheadOfTarget = currentTime > lastSeekTargetRef.current + 1.0
        const wasBackwardSeek =
          progressBeforeSeekRef.current !== null &&
          progressBeforeSeekRef.current > lastSeekTargetRef.current + 1.0
        const isCloserToOldProgress =
          wasBackwardSeek &&
          progressBeforeSeekRef.current !== null &&
          Math.abs(currentTime - progressBeforeSeekRef.current) <
            Math.abs(currentTime - lastSeekTargetRef.current)

        if (isAheadOfTarget || isCloserToOldProgress) {
          return
        }
      }

      if (timeSinceSeekComplete >= SEEK_STALE_EVENT_THRESHOLD_MS) {
        lastSeekTargetRef.current = null
        progressBeforeSeekRef.current = null
        seekToEndRef.current = false
      }

      if (Math.abs(currentTime - lastReportedProgressRef.current) < 0.01) {
        return
      }

      const currentDuration = durationRef.current
      lastReportedProgressRef.current = currentTime
      actualCurrentTimeRef.current = currentTime

      // Update store with precise time for smooth progress bars
      // VideoPlayer.native already throttles to 16ms, no need to throttle again here
      displayTimeRef.current = currentTime
      setDisplayTime(currentTime)

      if (
        currentDuration > 0 &&
        currentTime >= currentDuration - 0.05 &&
        !(seekToEndRef.current && timeSinceSeekComplete < SEEK_TO_END_THRESHOLD_MS)
      ) {
        syncDisplayTime(currentTime)
        setIsPlaying(false)
        setVideoEnded(true)
        videoEndedRef.current = true
      }
    },
    [setDisplayTime, setIsPlaying, setVideoEnded, syncDisplayTime]
  )

  const handleSeekComplete = useCallback(
    (time: number | null) => {
      const resolvedTime =
        typeof time === 'number' && Number.isFinite(time) ? time : actualCurrentTimeRef.current

      if (progressBeforeSeekRef.current === null) {
        progressBeforeSeekRef.current = lastReportedProgressRef.current
      }

      lastReportedProgressRef.current = resolvedTime
      lastSeekTargetRef.current = resolvedTime
      seekCompleteTimeRef.current = Date.now()

      const shouldMarkEnded =
        durationRef.current > 0 &&
        resolvedTime >= durationRef.current - 0.05 &&
        resolvedTime >= actualCurrentTimeRef.current - 0.1

      syncDisplayTime(resolvedTime)
      setPendingSeek(null)

      if (shouldMarkEnded) {
        setIsPlaying(false)
        setVideoEnded(true)
        videoEndedRef.current = true
        seekToEndRef.current = true
      } else {
        seekToEndRef.current = false
      }
    },
    [setIsPlaying, setPendingSeek, setVideoEnded, syncDisplayTime]
  )

  const reset = useCallback(() => {
    log.info('useVideoPlayer', 'Resetting playback state')
    syncDisplayTime(0)
    updateProgressShared(0)
    usePersistentProgressStore.getState().updateTime(0, durationRef.current)
    setIsPlaying(false)
    setDuration(0)
    setPendingSeek(null)
    setVideoEnded(false)
    videoEndedRef.current = false
    seekToEndRef.current = false
  }, [
    setDuration,
    setIsPlaying,
    setPendingSeek,
    setVideoEnded,
    syncDisplayTime,
    updateProgressShared,
  ])

  useEffect(() => {
    const wasProcessing = prevProcessingRef.current
    const nowProcessing = isProcessing
    const shouldAutoPlayOnTransition = wasProcessing && !nowProcessing && !hasAutoPlayedRef.current

    if (shouldAutoPlayOnTransition && !isPlaying) {
      play()
      hasAutoPlayedRef.current = true
    }

    prevProcessingRef.current = nowProcessing
  }, [initialStatus, isProcessing, isPlaying, play])

  /**
   * Audio gating (legacy `useVideoAudioSync`).
   * Maintains the same derived booleans so audio overlay + layout continue to behave.
   */
  const shouldPlayVideo = isPlaying && !audioIsPlaying
  const shouldPlayAudio = audioIsPlaying
  const isVideoPausedForAudio = audioIsPlaying

  const forcedControlsVisible = forcedVisible || Boolean(storeManualVisible)
  const showReplayButton = videoEnded

  const ref = useRef<VideoPlayerRef | null>(null)

  if (!ref.current) {
    ref.current = {
      play: () => play(),
      pause: () => pause(),
      seek: (time: number) => seek(time),
      replay: () => replay(),
      getCurrentTime: () => getPreciseCurrentTime(),
      getDuration: () => durationRef.current,
    }
  } else {
    ref.current.play = play
    ref.current.pause = pause
    ref.current.seek = seek
    ref.current.replay = replay
    ref.current.getCurrentTime = getPreciseCurrentTime
    ref.current.getDuration = () => durationRef.current
  }

  // Cleanup timers on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (hideControlsTimeoutRef.current) {
        clearTimeout(hideControlsTimeoutRef.current)
        hideControlsTimeoutRef.current = null
      }
    }
  }, [])

  return {
    ref,
    isPlaying,
    duration: 0, // Removed - consumers should read from store directly to prevent re-renders
    videoEnded,
    pendingSeek,
    currentTimeRef: actualCurrentTimeRef,
    getPreciseCurrentTime,
    reset,
    showControls: forcedControlsVisible,
    showReplayButton,
    shouldPlayVideo,
    shouldPlayAudio,
    isVideoPausedForAudio,
    play,
    pause,
    replay,
    seek,
    onLoad: handleLoad,
    onProgress: handleProgress,
    onEnd: handleEnd,
    onSeekComplete: handleSeekComplete,
    handleLoad: handleLoad,
    handleProgress: handleProgress,
    handleEnd: handleEnd,
    handleSeekComplete: handleSeekComplete,
    setControlsVisible,
  }
}
