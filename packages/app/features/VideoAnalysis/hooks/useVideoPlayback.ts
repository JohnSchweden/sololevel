import { log } from '@my/logging'
import { useCallback, useEffect, useRef, useState } from 'react'

export interface VideoPlaybackState {
  isPlaying: boolean
  currentTime: number
  duration: number
  pendingSeek: number | null
  videoEnded: boolean

  play: () => void
  pause: () => void
  replay: () => void
  seek: (time: number) => void
  handleProgress: (data: { currentTime: number }) => void
  handleLoad: (data: { duration: number }) => void
  handleEnd: () => void
  handleSeekComplete: (time: number | null) => void
  reset: () => void
}

export function useVideoPlayback(
  initialStatus: 'processing' | 'ready' | 'playing' | 'paused' = 'processing'
): VideoPlaybackState {
  const [isPlaying, setIsPlaying] = useState(initialStatus === 'playing')
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [pendingSeek, setPendingSeek] = useState<number | null>(null)
  const [videoEnded, setVideoEnded] = useState(false)

  const lastReportedProgressRef = useRef(0)

  useEffect(() => {
    if (initialStatus === 'playing') {
      setIsPlaying(true)
    }
  }, [initialStatus])

  const play = useCallback(() => {
    log.info('useVideoPlayback', 'play invoked')
    setIsPlaying(true)
    setVideoEnded(false)
  }, [])

  const pause = useCallback(() => {
    log.info('useVideoPlayback', 'pause invoked')
    setIsPlaying(false)
    setVideoEnded(false)
  }, [])

  const replay = useCallback(() => {
    log.info('useVideoPlayback', 'replay invoked')
    setPendingSeek(0)
    setVideoEnded(false)
    setIsPlaying(true)
  }, [])

  const seek = useCallback((time: number) => {
    if (Number.isNaN(time)) {
      log.warn('useVideoPlayback', 'seek ignored due to NaN time')
      return
    }

    log.info('useVideoPlayback', 'seek invoked', { time })
    setPendingSeek(time)
    setVideoEnded(false)
  }, [])

  const handleLoad = useCallback((data: { duration: number }) => {
    const { duration: loadedDuration } = data

    if (!Number.isFinite(loadedDuration) || loadedDuration <= 0) {
      log.warn('useVideoPlayback', 'Invalid video duration received', { duration: loadedDuration })
      return
    }

    log.info('useVideoPlayback', 'Video loaded', { duration: loadedDuration })
    setDuration(loadedDuration)
    setVideoEnded(false)
  }, [])

  const handleEnd = useCallback(() => {
    log.info('useVideoPlayback', 'Video end event received')
    setIsPlaying(false)
    setVideoEnded(true)
  }, [])

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

      if (Math.abs(nextTime - lastReportedProgressRef.current) < 0.01) {
        return
      }

      lastReportedProgressRef.current = nextTime
      setCurrentTime(nextTime)

      // Check if we've reached the actual end of the video
      // This handles cases where onEnd is triggered prematurely
      if (duration > 0 && nextTime >= duration - 0.05) {
        // 50ms tolerance
        log.info('useVideoPlayback', 'Progress-based end detection triggered', {
          currentTime: nextTime,
          duration,
          difference: duration - nextTime,
        })
        setIsPlaying(false)
        setVideoEnded(true)
      }
    },
    [duration]
  )

  const handleSeekComplete = useCallback(
    (time: number | null) => {
      const resolvedTime = typeof time === 'number' && Number.isFinite(time) ? time : currentTime
      setCurrentTime(resolvedTime)
      setPendingSeek(null)
      lastReportedProgressRef.current = resolvedTime

      // Check if we've sought to the end of the video
      // This handles cases where skip forward goes to the end
      if (duration > 0 && resolvedTime >= duration - 0.05) {
        // 50ms tolerance (matches handleProgress logic)
        setIsPlaying(false)
        setVideoEnded(true)
      }
    },
    [currentTime, duration]
  )

  const reset = useCallback(() => {
    log.info('useVideoPlayback', 'Resetting playback state')
    setIsPlaying(false)
    setCurrentTime(0)
    setDuration(0)
    setPendingSeek(null)
    setVideoEnded(false)
  }, [])

  return {
    isPlaying,
    currentTime,
    duration,
    pendingSeek,
    videoEnded,
    play,
    pause,
    replay,
    seek,
    handleProgress,
    handleLoad,
    handleEnd,
    handleSeekComplete,
    reset,
  }
}
