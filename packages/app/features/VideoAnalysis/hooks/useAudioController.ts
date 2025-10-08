import { log } from '@my/logging'
import { startTransition, useCallback, useEffect, useRef, useState } from 'react'

export interface AudioControllerState {
  isPlaying: boolean
  currentTime: number
  duration: number
  isLoaded: boolean
  seekTime: number | null
  setIsPlaying: (playing: boolean) => void
  togglePlayback: () => void
  handleLoad: (data: { duration: number }) => void
  handleProgress: (data: {
    currentTime: number
    playableDuration?: number
    seekableDuration?: number
  }) => void
  handleEnd: () => void
  handleError: (error: any) => void
  handleSeekComplete: () => void
  seekTo: (time: number) => void
  reset: () => void
}

export function useAudioController(audioUrl: string | null): AudioControllerState {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isLoaded, setIsLoaded] = useState(false)
  const [seekTime, setSeekTime] = useState<number | null>(null)

  const currentTimeRef = useRef(0)
  const durationRef = useRef(0)
  const isLoadedRef = useRef(false)
  const seekTimeRef = useRef<number | null>(null)
  const hasPlaybackStartedRef = useRef(false)

  const previousAudioUrlRef = useRef<string | null>(null)

  // Reset state when audio URL changes
  useEffect(() => {
    if (audioUrl !== previousAudioUrlRef.current) {
      log.debug('useAudioController', 'Audio URL changed, updating state', {
        previousUrl: previousAudioUrlRef.current,
        newUrl: audioUrl,
        preserveIsPlaying: audioUrl !== null,
      })

      // Batch non-urgent state updates to minimize re-renders
      if (audioUrl === null) {
        // Full reset when clearing audio
        setIsPlaying(false)
        currentTimeRef.current = 0
        durationRef.current = 0
        isLoadedRef.current = false
        seekTimeRef.current = null
        hasPlaybackStartedRef.current = false
        startTransition(() => {
          setCurrentTime(0)
          setDuration(0)
          setIsLoaded(false)
          setSeekTime(null)
        })
      } else {
        // Reset playback-related state when URL changes
        currentTimeRef.current = 0
        durationRef.current = 0
        isLoadedRef.current = false
        seekTimeRef.current = null
        hasPlaybackStartedRef.current = false
        startTransition(() => {
          setCurrentTime(0)
          setDuration(0)
          setIsLoaded(false)
          setSeekTime(null)
        })
      }

      previousAudioUrlRef.current = audioUrl
    }
  }, [audioUrl])

  const setIsPlayingCallback = useCallback((playing: boolean) => {
    log.debug('useAudioController', 'Setting playback state', { playing })
    setIsPlaying(playing)
  }, [])

  const togglePlayback = useCallback(() => {
    const newPlayingState = !isPlaying
    log.debug('useAudioController', 'Toggling playback', { newPlayingState })
    setIsPlaying(newPlayingState)
  }, [isPlaying])

  const handleLoad = useCallback((data: { duration: number }) => {
    const { duration: newDuration } = data
    log.debug('useAudioController', 'Audio loaded', {
      duration: newDuration,
    })

    if (typeof newDuration === 'number' && !Number.isNaN(newDuration)) {
      setDuration(newDuration)
      durationRef.current = newDuration
      setIsLoaded(true)
      isLoadedRef.current = true
    } else {
      log.warn('useAudioController', 'Invalid duration received', { duration: `${newDuration}s` })
    }
  }, [])

  const handleProgress = useCallback(
    (data: { currentTime: number; playableDuration?: number; seekableDuration?: number }) => {
      const { currentTime: newCurrentTime } = data

      if (typeof newCurrentTime === 'number' && !Number.isNaN(newCurrentTime)) {
        currentTimeRef.current = newCurrentTime
        setCurrentTime(newCurrentTime)
        if (!hasPlaybackStartedRef.current && newCurrentTime >= 0.01) {
          hasPlaybackStartedRef.current = true
        }
      } else {
        log.warn('useAudioController', 'Invalid currentTime received', {
          currentTime: `${newCurrentTime}s`,
        })
        currentTimeRef.current = 0
        setCurrentTime(0)
      }
    },
    []
  )

  const handleEnd = useCallback(() => {
    const latestCurrentTime = currentTimeRef.current
    const latestDuration = durationRef.current
    const latestIsLoaded = isLoadedRef.current
    const latestSeekTime = seekTimeRef.current
    const hadPlaybackProgress = hasPlaybackStartedRef.current || latestCurrentTime >= 0.01
    const suspectedPrematureEnd = !hadPlaybackProgress && latestDuration > 0.5

    const logContext = {
      currentTime: latestCurrentTime,
      duration: latestDuration,
      isLoaded: latestIsLoaded,
      seekTime: latestSeekTime,
      hadPlaybackProgress,
    }

    if (suspectedPrematureEnd) {
      log.debug(
        'useAudioController',
        'Received end event before meaningful playback progress; forcing stop to avoid stuck overlay',
        logContext
      )
      hasPlaybackStartedRef.current = false
      setIsPlaying(false)
      currentTimeRef.current = 0
      setCurrentTime(0)
      return
    }

    log.debug('useAudioController', 'Audio playback ended', logContext)

    hasPlaybackStartedRef.current = false
    setIsPlaying(false)
    currentTimeRef.current = 0
    setCurrentTime(0)
  }, [])

  const handleError = useCallback((error: any) => {
    log.error('useAudioController', 'Audio playback error', { error })
    setIsPlaying(false)
    setIsLoaded(false)
    isLoadedRef.current = false
    hasPlaybackStartedRef.current = false
  }, [])

  const handleSeekComplete = useCallback(() => {
    log.debug('useAudioController', 'Seek completed')
    setSeekTime(null)
    seekTimeRef.current = null
    hasPlaybackStartedRef.current = true
  }, [])

  const seekTo = useCallback(
    (time: number) => {
      if (typeof time === 'number' && !Number.isNaN(time)) {
        // Gate seek calls to prevent redundant state updates
        if (seekTime === time) {
          log.debug('useAudioController', 'Seek already at target time, skipping', { time })
          return
        }
        log.debug('useAudioController', 'Seeking to time', { time, previousSeekTime: seekTime })
        setSeekTime(time)
        seekTimeRef.current = time
      } else {
        log.warn('useAudioController', 'Invalid seek time', { time })
      }
    },
    [seekTime]
  )

  const reset = useCallback(() => {
    log.debug('useAudioController', 'Resetting audio controller state')
    setIsPlaying(false)
    setCurrentTime(0)
    setDuration(0)
    setIsLoaded(false)
    setSeekTime(null)
    currentTimeRef.current = 0
    durationRef.current = 0
    isLoadedRef.current = false
    seekTimeRef.current = null
    hasPlaybackStartedRef.current = false
  }, [])

  return {
    isPlaying,
    currentTime,
    duration,
    isLoaded,
    seekTime,
    setIsPlaying: setIsPlayingCallback,
    togglePlayback,
    handleLoad,
    handleProgress,
    handleEnd,
    handleError,
    handleSeekComplete,
    seekTo,
    reset,
  }
}
