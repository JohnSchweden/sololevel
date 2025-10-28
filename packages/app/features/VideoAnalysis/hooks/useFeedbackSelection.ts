//import { log } from '@my/logging'
import { useCallback, useEffect, useRef, useState } from 'react'

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
        videoPlayback.seek(seekTime)
      }

      if (playAudio && feedbackAudio.audioUrls[item.id]) {
        feedbackAudio.selectAudio(item.id)
        audioController.setIsPlaying(true)
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
      audioController,
      clearHighlight,
      clearHighlightTimer,
      feedbackAudio,
      triggerCoachSpeaking,
      videoPlayback,
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
    feedbackAudio.clearActiveAudio()
    audioController.setIsPlaying(false)
    triggerCoachSpeaking(0)
  }, [audioController, clearHighlight, feedbackAudio, selectedFeedbackId, triggerCoachSpeaking])

  useEffect(() => {
    return () => {
      if (coachTimerRef.current) {
        clearTimeout(coachTimerRef.current)
        coachTimerRef.current = null
      }
    }
  }, [])

  // Seek to start only when the active audio URL for the selected feedback changes.
  // Avoid re-triggering on unrelated state updates.
  const selectedAudioUrl = selectedFeedbackId ? feedbackAudio.audioUrls[selectedFeedbackId] : null

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
}
