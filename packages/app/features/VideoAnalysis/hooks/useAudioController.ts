import { log } from '@my/logging'
import { startTransition, useCallback, useEffect, useRef, useState } from 'react'

import { useFeedbackAudioStore } from '../stores/feedbackAudio'

/**
 * Snapshot of the audio playback controller consumed by `VideoPlayerSection`
 * and the feedback coordinator. Mirrors the original `useAudioController`
 * shape so existing consumers keep working while we route all writes through
 * the feedback audio store.
 *
 * @remarks
 * Values that change every 250ms (`currentTime`) are still exposed, but the
 * hook throttles React updates and relies on refs for precision. Consumers
 * should call `seekTo` / `reset` rather than mutating state directly.
 */
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

/**
 * Optional lifecycle callbacks for `useAudioController`.
 *
 * - `onNaturalEnd` fires only when audio reaches the end without manual stop.
 *   The feedback coordinator uses this to resume video playback.
 */
export interface UseAudioControllerCallbacks {
  onNaturalEnd?: () => void
}

/**
 * Core audio playback hook that proxies all imperative updates to the
 * `useFeedbackAudioStore` while keeping React renders minimal.
 *
 * ## Responsibilities
 * - Synchronise active audio metadata when the Supabase feedback selection changes.
 * - Keep precise playback state in refs to avoid 4 fps render storms.
 * - Expose the legacy `AudioControllerState` API for components/tests.
 * - Invoke optional callbacks on natural end to unblock video playback.
 *
 * ## Performance Notes
 * - Progress events update React state only on significant deltas (>0.5s) or
 *   when crossing zero, preventing continuous parent renders.
 * - Most mutations flow through Zustand actions (`useFeedbackAudioStore`) so
 *   other subscribers (e.g. overlay UI) receive updates without new hook
 *   instances.
 *
 * ## Lazy Initialization (Module 3)
 * - When `lazy=true`, all 14 useEffects are registered but do not execute logic
 * - Effects remain no-ops until `lazy` becomes `false` (via re-render)
 * - This defers effect execution until first audio playback is needed
 * - Expected mount time reduction: ~50-100ms
 *
 * @param audioUrl - Resolved feedback audio URL or `null` to clear playback.
 * @param callbacks - Optional lifecycle callbacks (e.g. natural end hook).
 * @param lazy - If `true`, effects are registered but do not execute until `lazy` becomes `false`.
 * @returns Stable controller state and handlers for audio playback.
 */
export function useAudioController(
  audioUrl: string | null,
  callbacks: UseAudioControllerCallbacks = {},
  lazy = false
): AudioControllerState {
  const [isPlaying, setIsPlaying] = useState(false)
  const [, setCurrentTime] = useState(0)
  const [, setDuration] = useState(0)
  const [, setIsLoaded] = useState(false)
  const [seekTime, setSeekTime] = useState<number | null>(null)

  const currentTimeRef = useRef(0)
  const durationRef = useRef(0)
  const isLoadedRef = useRef(false)
  const seekTimeRef = useRef<number | null>(null)
  const hasPlaybackStartedRef = useRef(false)

  const previousAudioUrlRef = useRef<string | null>(null)

  // Reset state when audio URL changes
  useEffect(() => {
    if (lazy) return // Skip effect execution when lazy
    if (audioUrl !== previousAudioUrlRef.current) {
      // log.debug('useAudioController', 'Audio URL changed, updating state', {
      //   previousUrl: previousAudioUrlRef.current,
      //   newUrl: audioUrl,
      //   preserveIsPlaying: audioUrl !== null,
      // })

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
  }, [audioUrl, lazy])

  const isPlayingRef = useRef(isPlaying)
  useEffect(() => {
    if (lazy) return // Skip effect execution when lazy
    isPlayingRef.current = isPlaying
  }, [isPlaying, lazy])

  const callbacksRef = useRef<UseAudioControllerCallbacks>(callbacks)
  useEffect(() => {
    if (lazy) return // Skip effect execution when lazy
    callbacksRef.current = callbacks
  }, [callbacks, lazy])

  // PERF FIX: Remove isPlaying from deps to prevent callback recreation on every play/pause toggle
  // Read from ref instead for logging; only recreate when audioUrl changes (legitimate new audio source)
  const setIsPlayingCallback = useCallback(
    (playing: boolean) => {
      log.debug(
        'useAudioController.setIsPlaying',
        `Setting playback state ${isPlayingRef.current} → ${playing}`,
        {
          audioUrl: audioUrl ? `${audioUrl.substring(0, 50)}...` : null,
        }
      )
      setIsPlaying(playing)
    },
    [audioUrl]
  )

  const togglePlayback = useCallback(() => {
    const newPlayingState = !isPlaying
    // log.debug('useAudioController', 'Toggling playback', { newPlayingState })
    setIsPlaying(newPlayingState)
  }, [isPlaying])

  const handleLoad = useCallback((data: { duration: number }) => {
    const { duration: newDuration } = data
    // log.debug('useAudioController', 'Audio loaded', {
    //   duration: newDuration,
    // })

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
        const prevCurrentTime = currentTimeRef.current
        currentTimeRef.current = newCurrentTime

        // Only update state when currentTime crosses 0 or changes significantly (> 0.5s)
        // This prevents re-renders every 250ms while still allowing effects to detect important changes
        const crossedZero =
          (prevCurrentTime > 0 && newCurrentTime === 0) ||
          (prevCurrentTime === 0 && newCurrentTime > 0)
        const significantChange = Math.abs(newCurrentTime - prevCurrentTime) > 0.5

        if (crossedZero || significantChange) {
          setCurrentTime(newCurrentTime)
        }

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
        'useAudioController.handleEnd',
        '🚫 Premature end detected - forcing stop',
        logContext
      )
      hasPlaybackStartedRef.current = false
      setIsPlaying(false)
      // CRITICAL FIX: Update store when playback ends
      useFeedbackAudioStore.getState().setIsPlaying(false)
      currentTimeRef.current = 0
      setCurrentTime(0)
      return
    }

    log.debug('useAudioController.handleEnd', '✓ Audio playback ended naturally', logContext)

    hasPlaybackStartedRef.current = false
    setIsPlaying(false)
    // Update store's isPlaying - cleanup effect will check currentTime === 0 to distinguish natural end from manual pause
    useFeedbackAudioStore.getState().setIsPlaying(false)
    currentTimeRef.current = 0
    setCurrentTime(0)
    callbacksRef.current.onNaturalEnd?.()
  }, [])

  const handleError = useCallback((error: any) => {
    log.error('useAudioController', 'Audio playback error', { error })
    setIsPlaying(false)
    // CRITICAL FIX: Update store on error
    useFeedbackAudioStore.getState().setIsPlaying(false)
    setIsLoaded(false)
    isLoadedRef.current = false
    hasPlaybackStartedRef.current = false
  }, [])

  const handleSeekComplete = useCallback(() => {
    // log.debug('useAudioController', 'Seek completed')
    setSeekTime(null)
    seekTimeRef.current = null
    hasPlaybackStartedRef.current = true
  }, [])

  const seekTo = useCallback(
    (time: number) => {
      if (typeof time === 'number' && !Number.isNaN(time)) {
        // Gate seek calls to prevent redundant state updates
        if (seekTime === time) {
          // log.debug('useAudioController', 'Seek already at target time, skipping', { time })
          return
        }
        // log.debug('useAudioController', 'Seeking to time', { time, previousSeekTime: seekTime })
        setSeekTime(time)
        seekTimeRef.current = time
      } else {
        log.warn('useAudioController', 'Invalid seek time', { time })
      }
    },
    [seekTime]
  )

  const reset = useCallback(() => {
    // log.debug('useAudioController', 'Resetting audio controller state')
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

  // Maintain stable controller reference across renders to prevent downstream effects (setController) from thrashing
  const setIsPlayingRef = useRef(setIsPlayingCallback)
  const togglePlaybackRef = useRef(togglePlayback)
  const handleLoadRef = useRef(handleLoad)
  const handleProgressRef = useRef(handleProgress)
  const handleEndRef = useRef(handleEnd)
  const handleErrorRef = useRef(handleError)
  const handleSeekCompleteRef = useRef(handleSeekComplete)
  const seekToRef = useRef(seekTo)
  const resetRef = useRef(reset)

  // Module 4: Batch Effect Registration
  // Combine all ref synchronizations into a single effect to reduce mount overhead
  useEffect(() => {
    if (lazy) return // Skip effect execution when lazy

    setIsPlayingRef.current = setIsPlayingCallback
    togglePlaybackRef.current = togglePlayback
    handleLoadRef.current = handleLoad
    handleProgressRef.current = handleProgress
    handleEndRef.current = handleEnd
    handleErrorRef.current = handleError
    handleSeekCompleteRef.current = handleSeekComplete
    seekToRef.current = seekTo
    resetRef.current = reset
  }, [
    lazy,
    setIsPlayingCallback,
    togglePlayback,
    handleLoad,
    handleProgress,
    handleEnd,
    handleError,
    handleSeekComplete,
    seekTo,
    reset,
  ])

  // Keep stable ref with getters for backwards compatibility
  const controllerRef = useRef<AudioControllerState | null>(null)
  if (!controllerRef.current) {
    const controller: Partial<AudioControllerState> = {}
    Object.defineProperties(controller, {
      isPlaying: {
        get: () => isPlayingRef.current,
      },
      currentTime: {
        get: () => currentTimeRef.current,
      },
      duration: {
        get: () => durationRef.current,
      },
      isLoaded: {
        get: () => isLoadedRef.current,
      },
      seekTime: {
        get: () => seekTimeRef.current,
      },
    })

    controller.setIsPlaying = (playing: boolean) => setIsPlayingRef.current(playing)
    controller.togglePlayback = () => togglePlaybackRef.current()
    controller.handleLoad = (data) => handleLoadRef.current(data)
    controller.handleProgress = (data) => handleProgressRef.current(data)
    controller.handleEnd = () => handleEndRef.current()
    controller.handleError = (error) => handleErrorRef.current(error)
    controller.handleSeekComplete = () => handleSeekCompleteRef.current()
    controller.seekTo = (time) => seekToRef.current(time)
    controller.reset = () => resetRef.current()

    controllerRef.current = controller as AudioControllerState
  }

  useEffect(() => {
    if (lazy) return // Skip effect execution when lazy
    return () => {
      controllerRef.current?.reset()
    }
  }, [lazy])

  return controllerRef.current
}
