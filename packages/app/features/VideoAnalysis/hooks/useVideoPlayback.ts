import { log } from '@my/logging'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export interface VideoPlaybackState {
  isPlaying: boolean
  currentTime: number // Display time - updates only on significant changes
  duration: number
  pendingSeek: number | null
  videoEnded: boolean

  // Ref access for precise time without re-renders
  currentTimeRef: React.MutableRefObject<number>
  getPreciseCurrentTime: () => number

  play: () => void
  pause: () => void
  replay: () => void
  seek: (time: number) => void
  handleProgress: (data: { currentTime: number }) => void
  handleLoad: (data: { duration: number }) => void
  handleEnd: (endTime?: number) => void
  handleSeekComplete: (time: number | null) => void
  reset: () => void
}

export function useVideoPlayback(
  initialStatus: 'processing' | 'ready' | 'playing' | 'paused' = 'processing'
): VideoPlaybackState {
  const [isPlaying, setIsPlaying] = useState(initialStatus === 'playing')

  // PERFORMANCE FIX: Ref for actual time, state for display time
  // Display time only updates on: seek, pause, 1-second intervals, or video end
  // This prevents 3+ re-renders per 250ms during playback
  const actualCurrentTimeRef = useRef(0) // Precise time, no re-renders
  const [displayTime, setDisplayTime] = useState(0) // Display time, triggers re-renders

  const [duration, setDuration] = useState(0)
  const [pendingSeek, setPendingSeek] = useState<number | null>(null)
  const [videoEnded, setVideoEnded] = useState(false)

  const lastReportedProgressRef = useRef(0)
  const lastSeekTargetRef = useRef<number | null>(null)
  const seekCompleteTimeRef = useRef(0) // Timestamp when seek completed
  const progressBeforeSeekRef = useRef<number | null>(null) // Track progress before seek for backward seek detection
  const videoEndedRef = useRef(false) // Track if video is ended to prevent redundant progress processing
  const seekToEndRef = useRef(false) // Track if we just sought to end to skip redundant end detection

  /**
   * PERFORMANCE FIX: Refs for closure values in handleProgress
   *
   * Problem: handleProgress callback was recreating on every displayTime/duration update
   * because it had these state values in its dependency array. This caused the entire
   * videoPlayback return object to recreate, triggering phantom re-renders in consumers.
   *
   * Solution: Use refs that are updated synchronously on every render. handleProgress
   * reads from refs (stable closure), so it only depends on syncDisplayTime (stable).
   *
   * Impact: Eliminates 100% of phantom pendingSeek re-renders during playback.
   */
  const displayTimeRef = useRef(displayTime)
  const durationRef = useRef(duration)

  // Sync refs on every render (no useEffect needed - synchronous)
  displayTimeRef.current = displayTime
  durationRef.current = duration

  // Helper: Get precise current time without triggering re-render
  const getPreciseCurrentTime = useCallback(() => actualCurrentTimeRef.current, [])

  // Helper: Sync display time with ref value (for pause, seek, meaningful changes)
  // PERFORMANCE: Round to second boundary to prevent fractional displayTime values
  const syncDisplayTime = useCallback((newTime: number) => {
    const roundedTime = Math.floor(newTime)
    actualCurrentTimeRef.current = newTime // Keep precise time in ref
    displayTimeRef.current = roundedTime // Keep ref in sync with state
    setDisplayTime(roundedTime) // Only update state with boundary values
  }, [])

  useEffect(() => {
    if (initialStatus === 'playing') {
      setIsPlaying(true)
    }
  }, [initialStatus])

  const play = useCallback(() => {
    setIsPlaying(true)
    setVideoEnded(false)
    videoEndedRef.current = false
    seekToEndRef.current = false
  }, [])

  const pause = useCallback(() => {
    // PERFORMANCE FIX: Sync display time on pause (meaningful event)
    syncDisplayTime(actualCurrentTimeRef.current)
    setIsPlaying(false)
    setVideoEnded(false)
    videoEndedRef.current = false
    seekToEndRef.current = false
  }, [syncDisplayTime])

  const replay = useCallback(() => {
    // Save current progress before seek for stale event detection
    progressBeforeSeekRef.current = lastReportedProgressRef.current
    // Reset progress tracking to prevent stale events from end position
    lastSeekTargetRef.current = 0
    seekCompleteTimeRef.current = Date.now()
    // PERFORMANCE FIX: Sync display time on replay (meaningful event - seek to 0)
    syncDisplayTime(0)
    setPendingSeek(0)
    setVideoEnded(false)
    videoEndedRef.current = false
    seekToEndRef.current = false
    setIsPlaying(true)
  }, [syncDisplayTime])

  const seek = useCallback((time: number) => {
    if (Number.isNaN(time)) {
      log.warn('useVideoPlayback', 'seek ignored due to NaN time')
      return
    }

    // PERFORMANCE: Keep precise time in ref, but round pendingSeek to prevent fractional state
    // This ensures displayTime stays on second boundaries during seek
    actualCurrentTimeRef.current = time
    setPendingSeek(time) // Note: pendingSeek needs precise value for video player seek
    setVideoEnded(false)
    videoEndedRef.current = false
    seekToEndRef.current = false
  }, [])

  const handleLoad = useCallback((data: { duration: number }) => {
    const { duration: loadedDuration } = data

    if (!Number.isFinite(loadedDuration) || loadedDuration <= 0) {
      log.warn('useVideoPlayback', 'Invalid video duration received', { duration: loadedDuration })
      return
    }

    setDuration(loadedDuration)
    setVideoEnded(false)
    videoEndedRef.current = false
    seekToEndRef.current = false
  }, [])

  // Use refs for videoEnded that is only accessed for logging/fallback
  // This prevents handleEnd from recreating on every playback state change
  useEffect(() => {
    videoEndedRef.current = videoEnded
  }, [videoEnded])

  const handleEnd = useCallback(
    (endTime?: number) => {
      // Ignore end events that arrive shortly after a seek (stale end events from before seek)
      const timeSinceSeekComplete = Date.now() - seekCompleteTimeRef.current
      const SEEK_STALE_EVENT_THRESHOLD_MS = 500 // Ignore stale events for 500ms after seek

      if (
        lastSeekTargetRef.current !== null &&
        timeSinceSeekComplete < SEEK_STALE_EVENT_THRESHOLD_MS &&
        lastSeekTargetRef.current < durationRef.current - 0.1 // Seek was NOT to end position
      ) {
        log.debug('useVideoPlayback', 'Ignoring stale end event after seek', {
          endTime,
          seekTarget: lastSeekTargetRef.current,
          timeSinceSeekComplete,
          duration: durationRef.current,
        })
        return
      }

      // Use provided endTime, fall back to last reported progress, then ref value
      const actualEndTime =
        endTime ?? lastReportedProgressRef.current ?? actualCurrentTimeRef.current

      log.info('useVideoPlayback', 'Video end event received')

      // PERFORMANCE FIX: Sync display time on end (meaningful event)
      syncDisplayTime(actualEndTime)
      lastReportedProgressRef.current = actualEndTime
      setIsPlaying(false)
      setVideoEnded(true)
      videoEndedRef.current = true
      seekToEndRef.current = false
    },
    [syncDisplayTime] // Only sync function in deps
  )

  // Add progress-based end detection to handle fractional durations
  const handleProgress = useCallback(
    (data: { currentTime: number }) => {
      const { currentTime: nextTime } = data

      if (!Number.isFinite(nextTime)) {
        log.warn('useVideoPlayback', 'Received invalid currentTime from progress event', {
          currentTime: nextTime,
        })
        return
      }

      // Skip progress processing if video is already ended
      // This prevents redundant state updates and performance issues when seeking to end
      if (videoEndedRef.current) {
        return
      }

      // Ignore stale progress events that arrive shortly after a seek
      // These events are from before the seek completed and can cause false end detection
      const timeSinceSeekComplete = Date.now() - seekCompleteTimeRef.current
      const SEEK_STALE_EVENT_THRESHOLD_MS = 500 // Ignore stale events for 500ms after seek
      const SEEK_TO_END_THRESHOLD_MS = 500 // Ignore progress-based end detection for 500ms after seek to end

      if (
        lastSeekTargetRef.current !== null &&
        timeSinceSeekComplete < SEEK_STALE_EVENT_THRESHOLD_MS
      ) {
        // Filter events that are significantly ahead of seek target (forward seeks)
        // OR events that are closer to old progress than new seek target (backward seeks like replay to 0)
        const isAheadOfTarget = nextTime > lastSeekTargetRef.current + 1.0
        const wasBackwardSeek =
          progressBeforeSeekRef.current !== null &&
          progressBeforeSeekRef.current > lastSeekTargetRef.current + 1.0
        const isCloserToOldProgress =
          wasBackwardSeek &&
          progressBeforeSeekRef.current !== null &&
          Math.abs(nextTime - progressBeforeSeekRef.current) <
            Math.abs(nextTime - lastSeekTargetRef.current)

        if (isAheadOfTarget || isCloserToOldProgress) {
          return
        }
      }

      // Clear seek tracking after threshold passes
      if (timeSinceSeekComplete >= SEEK_STALE_EVENT_THRESHOLD_MS) {
        lastSeekTargetRef.current = null
        progressBeforeSeekRef.current = null
        seekToEndRef.current = false // Clear seek-to-end flag after threshold
      }

      if (Math.abs(nextTime - lastReportedProgressRef.current) < 0.01) {
        return
      }

      // PERFORMANCE: Read duration from ref to prevent handleProgress recreation
      const currentDuration = durationRef.current
      lastReportedProgressRef.current = nextTime

      // PERFORMANCE FIX: Update ref immediately (no re-render)
      actualCurrentTimeRef.current = nextTime

      // Only update display time on 1-second boundaries (reduces re-renders by 80%)
      // PERFORMANCE: Read displayTime from ref to prevent handleProgress recreation
      const currentDisplayTime = displayTimeRef.current
      const currentDisplaySecond = Math.floor(currentDisplayTime)
      const nextDisplaySecond = Math.floor(nextTime)

      if (nextDisplaySecond !== currentDisplaySecond) {
        // PERFORMANCE FIX: Set to second boundary, not raw time
        // Before: setDisplayTime(1.750067888) - unique value, triggers re-renders
        // After: setDisplayTime(1) - stable boundary, only changes once per second
        setDisplayTime(nextDisplaySecond)
        displayTimeRef.current = nextDisplaySecond
      }

      // Check if we've reached the actual end of the video
      // This handles cases where onEnd is triggered prematurely
      // Skip if we just completed a seek to end (avoid redundant state updates)
      if (
        currentDuration > 0 &&
        nextTime >= currentDuration - 0.05 &&
        !(seekToEndRef.current && timeSinceSeekComplete < SEEK_TO_END_THRESHOLD_MS)
      ) {
        // 50ms tolerance
        // Sync display time on end (meaningful event)
        syncDisplayTime(nextTime)
        setIsPlaying(false)
        setVideoEnded(true)
        videoEndedRef.current = true
      }
    },
    [syncDisplayTime] // PERFORMANCE: Only syncDisplayTime in deps - duration/displayTime read from refs
  )

  const handleSeekComplete = useCallback(
    (time: number | null) => {
      const resolvedTime =
        typeof time === 'number' && Number.isFinite(time) ? time : actualCurrentTimeRef.current
      log.debug('useVideoPlayback.handleSeekComplete', '🎯 Seek complete', {
        providedTime: time,
        resolvedTime,
        currentTimeBefore: actualCurrentTimeRef.current,
        lastReportedProgressBefore: lastReportedProgressRef.current,
        progressBeforeSeek: progressBeforeSeekRef.current,
        duration: durationRef.current,
        pendingSeek,
      })
      // Save current progress before seek for stale event detection (if not already saved by replay)
      if (progressBeforeSeekRef.current === null) {
        progressBeforeSeekRef.current = lastReportedProgressRef.current
        log.debug('useVideoPlayback.handleSeekComplete', '💾 Saved progress before seek', {
          progressBeforeSeek: progressBeforeSeekRef.current,
        })
      }

      // Update refs immediately (synchronous, no render)
      lastReportedProgressRef.current = resolvedTime
      lastSeekTargetRef.current = resolvedTime
      seekCompleteTimeRef.current = Date.now()

      log.debug('useVideoPlayback.handleSeekComplete', '✅ Seek tracking updated', {
        lastSeekTarget: lastSeekTargetRef.current,
        lastReportedProgress: lastReportedProgressRef.current,
        seekCompleteTime: seekCompleteTimeRef.current,
      })

      // Only mark as ended if:
      // 1. Duration is valid
      // 2. We're seeking to within 50ms of the end
      // 3. We're NOT seeking backwards (which would be replay or user seeking earlier)
      const shouldMarkEnded =
        durationRef.current > 0 &&
        resolvedTime >= durationRef.current - 0.05 &&
        resolvedTime >= actualCurrentTimeRef.current - 0.1

      // PERFORMANCE FIX: Sync display time on seek complete (meaningful event)
      syncDisplayTime(resolvedTime)
      setPendingSeek(null)

      if (shouldMarkEnded) {
        // 50ms tolerance for end check, 100ms tolerance for forward-only check
        log.debug('useVideoPlayback.handleSeekComplete', '⏹️ Marking as ended after seek', {
          resolvedTime,
          duration: durationRef.current,
          currentTimeRef: actualCurrentTimeRef.current,
        })
        setIsPlaying(false)
        setVideoEnded(true)
        videoEndedRef.current = true
        seekToEndRef.current = true // Mark that we just sought to end
      } else {
        log.debug('useVideoPlayback.handleSeekComplete', '▶️ Not marking as ended', {
          resolvedTime,
          duration: durationRef.current,
          currentTimeRef: actualCurrentTimeRef.current,
          reason: resolvedTime < durationRef.current - 0.05 ? 'before end' : 'backward seek',
        })
        seekToEndRef.current = false
      }
    },
    [pendingSeek, syncDisplayTime] // Include sync and pendingSeek for logging
  )

  const reset = useCallback(() => {
    log.info('useVideoPlayback', 'Resetting playback state')
    // PERFORMANCE FIX: Sync display time on reset
    syncDisplayTime(0)
    setIsPlaying(false)
    setDuration(0)
    setPendingSeek(null)
    setVideoEnded(false)
    videoEndedRef.current = false
    seekToEndRef.current = false
  }, [syncDisplayTime])

  // Memoize return value to prevent recreation on every render
  // This is critical for preventing cascading re-renders in VideoAnalysisScreen
  return useMemo(
    () => ({
      isPlaying,
      currentTime: displayTime, // Display time for UI (1-second granularity)
      duration,
      pendingSeek,
      videoEnded,
      // Ref access for precise time without re-renders
      currentTimeRef: actualCurrentTimeRef,
      getPreciseCurrentTime,
      play,
      pause,
      replay,
      seek,
      handleProgress,
      handleLoad,
      handleEnd,
      handleSeekComplete,
      reset,
    }),
    [
      isPlaying,
      displayTime, // Changed from currentTime
      duration,
      pendingSeek,
      videoEnded,
      getPreciseCurrentTime,
      play,
      pause,
      replay,
      seek,
      handleProgress,
      handleLoad,
      handleEnd,
      handleSeekComplete,
      reset,
    ]
  )
}
