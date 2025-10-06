import { log } from '@my/logging'
import { useCallback, useEffect, useRef, useState } from 'react'

import type { FeedbackPanelItem } from '../types'
import type { AudioControllerState } from './useAudioController'
import type { FeedbackAudioSourceState } from './useFeedbackAudioSource'
import type { VideoPlaybackState } from './useVideoPlayback'

export interface FeedbackSelectionState {
  selectedFeedbackId: string | null
  isCoachSpeaking: boolean
  selectFeedback: (item: FeedbackPanelItem) => void
  clearSelection: () => void
  triggerCoachSpeaking: (durationMs?: number) => void
}

export function useFeedbackSelection(
  feedbackAudio: FeedbackAudioSourceState,
  audioController: AudioControllerState,
  videoPlayback: VideoPlaybackState
): FeedbackSelectionState {
  const [selectedFeedbackId, setSelectedFeedbackId] = useState<string | null>(null)
  const [isCoachSpeaking, setIsCoachSpeaking] = useState(false)
  const coachTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  const selectFeedback = useCallback(
    (item: FeedbackPanelItem) => {
      log.info('useFeedbackSelection', 'Feedback item selected', { id: item.id })
      setSelectedFeedbackId(item.id)

      if (item.timestamp) {
        const seekTime = item.timestamp / 1000
        videoPlayback.seek(seekTime)
      }

      if (feedbackAudio.audioUrls[item.id]) {
        feedbackAudio.selectAudio(item.id)
        audioController.setIsPlaying(true)
      }

      triggerCoachSpeaking()
    },
    [audioController, feedbackAudio, triggerCoachSpeaking, videoPlayback]
  )

  const clearSelection = useCallback(() => {
    if (selectedFeedbackId) {
      log.info('useFeedbackSelection', 'Clearing feedback selection', { id: selectedFeedbackId })
    }
    setSelectedFeedbackId(null)
    feedbackAudio.clearActiveAudio()
    audioController.setIsPlaying(false)
    triggerCoachSpeaking(0)
  }, [audioController, feedbackAudio, selectedFeedbackId, triggerCoachSpeaking])

  useEffect(() => {
    return () => {
      if (coachTimerRef.current) {
        clearTimeout(coachTimerRef.current)
        coachTimerRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (!selectedFeedbackId) {
      return
    }

    const url = feedbackAudio.audioUrls[selectedFeedbackId]
    if (!url) {
      return
    }

    audioController.seekTo(videoPlayback.currentTime)
  }, [audioController, feedbackAudio.audioUrls, selectedFeedbackId, videoPlayback.currentTime])

  return {
    selectedFeedbackId,
    isCoachSpeaking,
    selectFeedback,
    clearSelection,
    triggerCoachSpeaking,
  }
}
