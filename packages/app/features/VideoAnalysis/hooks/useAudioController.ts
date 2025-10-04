import { log } from '@my/logging'
import { useCallback, useEffect, useRef, useState } from 'react'

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

  const previousAudioUrlRef = useRef<string | null>(null)

  // Reset state when audio URL changes
  useEffect(() => {
    if (audioUrl !== previousAudioUrlRef.current) {
      log.debug('useAudioController', 'Audio URL changed, resetting state', {
        previousUrl: previousAudioUrlRef.current,
        newUrl: audioUrl,
      })
      reset()
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
    log.debug('useAudioController', 'Audio loaded', { duration: newDuration })

    if (typeof newDuration === 'number' && !Number.isNaN(newDuration)) {
      setDuration(newDuration)
      setIsLoaded(true)
    } else {
      log.warn('useAudioController', 'Invalid duration received', { duration: newDuration })
    }
  }, [])

  const handleProgress = useCallback(
    (data: { currentTime: number; playableDuration?: number; seekableDuration?: number }) => {
      const { currentTime: newCurrentTime } = data

      if (typeof newCurrentTime === 'number' && !Number.isNaN(newCurrentTime)) {
        setCurrentTime(newCurrentTime)
      } else {
        log.warn('useAudioController', 'Invalid currentTime received', {
          currentTime: newCurrentTime,
        })
        setCurrentTime(0)
      }
    },
    []
  )

  const handleEnd = useCallback(() => {
    log.debug('useAudioController', 'Audio playback ended')
    setIsPlaying(false)
    setCurrentTime(0)
  }, [])

  const handleError = useCallback((error: any) => {
    log.error('useAudioController', 'Audio playback error', { error })
    setIsPlaying(false)
    setIsLoaded(false)
  }, [])

  const handleSeekComplete = useCallback(() => {
    log.debug('useAudioController', 'Seek completed')
    setSeekTime(null)
  }, [])

  const seekTo = useCallback((time: number) => {
    if (typeof time === 'number' && !Number.isNaN(time)) {
      log.debug('useAudioController', 'Seeking to time', { time })
      setSeekTime(time)
    } else {
      log.warn('useAudioController', 'Invalid seek time', { time })
    }
  }, [])

  const reset = useCallback(() => {
    log.debug('useAudioController', 'Resetting audio controller state')
    setIsPlaying(false)
    setCurrentTime(0)
    setDuration(0)
    setIsLoaded(false)
    setSeekTime(null)
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
