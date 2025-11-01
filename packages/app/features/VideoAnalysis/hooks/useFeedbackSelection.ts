//import { log } from '@my/logging'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { log } from '@my/logging'

import type { FeedbackPanelItem } from '../types'
import type { AudioControllerState } from './useAudioController'
import type { FeedbackAudioSourceState } from './useFeedbackAudioSource'
import type { VideoPlaybackState } from './useVideoPlayback'

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
  triggerCoachSpeaking: (durationMs?: number) => void
}

export function useFeedbackSelection(
  feedbackAudio: FeedbackAudioSourceState,
  audioController: AudioControllerState,
  videoPlayback: VideoPlaybackState
): FeedbackSelectionState {
  const [selectedFeedbackId, setSelectedFeedbackId] = useState<string | null>(null)
  const [highlightedFeedback, setHighlightedFeedback] = useState<{
    id: string
    source: 'user' | 'auto'
  } | null>(null)
  const [isCoachSpeaking, setIsCoachSpeaking] = useState(false)
  const coachTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Extract setIsPlaying to avoid depending on entire audioController object
  // audioController changes when isPlaying changes, but setIsPlaying is stable
  const setIsPlaying = audioController.setIsPlaying

  // Store feedbackAudio callbacks in refs to prevent callback recreation
  // feedbackAudio object recreates when audioUrls changes, but callbacks are stable
  const feedbackAudioRef = useRef(feedbackAudio)
  feedbackAudioRef.current = feedbackAudio

  // Store videoPlayback.seek in ref to prevent callback recreation
  // videoPlayback object recreates when currentTime/duration change, but seek() is stable
  const videoPlaybackSeekRef = useRef(videoPlayback.seek)
  videoPlaybackSeekRef.current = videoPlayback.seek

  const triggerCoachSpeaking = useCallback((durationMs = 3000) => {
    if (coachTimerRef.current) {
      clearTimeout(coachTimerRef.current)
      coachTimerRef.current = null
    }

    if (durationMs <= 0) {
      setIsCoachSpeaking(false)
      return
    }

    setIsCoachSpeaking(true)
    coachTimerRef.current = setTimeout(() => {
      setIsCoachSpeaking(false)
      coachTimerRef.current = null
    }, durationMs)
  }, [])

  const clearHighlightTimer = useCallback(() => {
    if (highlightTimerRef.current) {
      clearTimeout(highlightTimerRef.current)
      highlightTimerRef.current = null
    }
  }, [])

  const clearHighlight = useCallback(
    (options?: { matchId?: string; sources?: Array<'user' | 'auto'>; reason?: string }) => {
      //const { matchId, sources, reason } = options ?? {}
      const { matchId, sources } = options ?? {}

      setHighlightedFeedback((previous) => {
        if (!previous) {
          return previous
        }

        if (matchId && previous.id !== matchId) {
          return previous
        }

        if (sources && !sources.includes(previous.source)) {
          return previous
        }

        // log.info('useFeedbackSelection', 'Clearing feedback highlight', {
        //   id: previous.id,
        //   source: previous.source,
        //   reason: reason ?? null,
        // })

        clearHighlightTimer()
        return null
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

      setHighlightedFeedback((previous) => {
        if (previous?.id === item.id && previous.source === source) {
          return previous
        }

        // log.info('useFeedbackSelection', 'Feedback highlight updated', {
        //   id: item.id,
        //   source,
        // })

        return { id: item.id, source }
      })

      setSelectedFeedbackId(item.id)

      if (seek && item.timestamp) {
        const seekTime = item.timestamp / 1000
        videoPlaybackSeekRef.current(seekTime)
      }

      if (playAudio && feedbackAudioRef.current.audioUrls[item.id]) {
        feedbackAudioRef.current.selectAudio(item.id)
        setIsPlaying(true)
      }

      triggerCoachSpeaking()

      if (source === 'auto' && autoDurationMs && autoDurationMs > 0) {
        highlightTimerRef.current = setTimeout(() => {
          clearHighlight({
            matchId: item.id,
            sources: ['auto'],
            reason: 'auto-duration-elapsed',
          })
        }, autoDurationMs)
      }
    },
    [
      setIsPlaying,
      clearHighlight,
      clearHighlightTimer,
      // Omit feedbackAudio.audioUrls and feedbackAudio.selectAudio - use refs instead
      // Omit videoPlayback.seek - use ref instead
      triggerCoachSpeaking,
    ]
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
    if (selectedFeedbackId) {
      // log.info('useFeedbackSelection', 'Clearing feedback selection', { id: selectedFeedbackId })
    }

    clearHighlight({ reason: 'manual-clear' })
    setSelectedFeedbackId(null)
    feedbackAudioRef.current.clearActiveAudio()
    setIsPlaying(false)
    triggerCoachSpeaking(0)
  }, [setIsPlaying, clearHighlight, selectedFeedbackId, triggerCoachSpeaking])

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
  const prevIsPlayingRef = useRef(videoPlayback.isPlaying)
  useEffect(() => {
    const wasPlaying = prevIsPlayingRef.current
    const nowPlaying = videoPlayback.isPlaying
    prevIsPlayingRef.current = nowPlaying

    // Clear highlight timer when transitioning from playing to paused
    if (wasPlaying && !nowPlaying && highlightTimerRef.current) {
      clearHighlightTimer()
    }
  }, [videoPlayback.isPlaying, clearHighlightTimer])

  // Seek to start only when the active audio URL for the selected feedback changes.
  // Avoid re-triggering on unrelated state updates.
  const selectedAudioUrl = selectedFeedbackId
    ? feedbackAudioRef.current.audioUrls[selectedFeedbackId]
    : null

  // Store seekTo in ref to avoid recreating effect when audioController object changes
  const seekToRef = useRef(audioController.seekTo)
  seekToRef.current = audioController.seekTo

  useEffect(() => {
    if (!selectedFeedbackId) {
      return
    }

    if (!selectedAudioUrl) {
      return
    }

    // Feedback audio clips always start from the beginning (0s)
    // Use ref to avoid depending on the entire audioController object
    seekToRef.current(0)
  }, [selectedFeedbackId, selectedAudioUrl])

  // Memoize return value to prevent recreation on every render
  // This is critical for preventing cascading re-renders in VideoAnalysisScreen
  const prevDepsRef = useRef<{
    selectedFeedbackId: string | null
    isCoachSpeaking: boolean
    highlightedFeedbackId: string | null
    highlightSource: string | null
  }>({
    selectedFeedbackId: null,
    isCoachSpeaking: false,
    highlightedFeedbackId: null,
    highlightSource: null,
  })

  const lastRecalcTimeRef = useRef<number>(Date.now())

  return useMemo(() => {
    const now = Date.now()
    const timeSinceLastRecalc = now - lastRecalcTimeRef.current
    lastRecalcTimeRef.current = now

    // Debug: track what's changing
    const prev = prevDepsRef.current
    if (prev) {
      const changed: string[] = []
      if (prev.selectedFeedbackId !== selectedFeedbackId) changed.push('selectedFeedbackId')
      if (prev.isCoachSpeaking !== isCoachSpeaking) changed.push('isCoachSpeaking')
      if (prev.highlightedFeedbackId !== (highlightedFeedback?.id ?? null))
        changed.push('highlightedFeedbackId')
      if (prev.highlightSource !== (highlightedFeedback?.source ?? null))
        changed.push('highlightSource')

      if (changed.length > 0) {
        log.debug('useFeedbackSelection', '🔥 Selection recalculating', {
          changed,
          timeSinceLastRecalc,
          isRapid: timeSinceLastRecalc < 16,
          selectedFeedbackId,
          highlightedFeedbackId: highlightedFeedback?.id,
          isCoachSpeaking,
          highlightSource: highlightedFeedback?.source,
          stackTrace:
            timeSinceLastRecalc < 16
              ? new Error().stack?.split('\n').slice(1, 8).join('\n')
              : undefined,
        })
      }
    }

    prevDepsRef.current = {
      selectedFeedbackId,
      isCoachSpeaking,
      highlightedFeedbackId: highlightedFeedback?.id ?? null,
      highlightSource: highlightedFeedback?.source ?? null,
    }

    return {
      selectedFeedbackId,
      isCoachSpeaking,
      highlightedFeedbackId: highlightedFeedback?.id ?? null,
      highlightSource: highlightedFeedback?.source ?? null,
      selectFeedback,
      highlightAutoFeedback,
      clearHighlight,
      clearSelection,
      triggerCoachSpeaking,
    }
  }, [
    selectedFeedbackId,
    isCoachSpeaking,
    highlightedFeedback?.id,
    highlightedFeedback?.source,
    selectFeedback,
    highlightAutoFeedback,
    clearHighlight,
    clearSelection,
    triggerCoachSpeaking,
  ])
}
