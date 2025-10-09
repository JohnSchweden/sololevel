import { log } from '@my/logging'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { FeedbackPanelItem } from '../types'
import type { AudioControllerState } from './useAudioController'
import { useBubbleController } from './useBubbleController'
import type { FeedbackAudioSourceState } from './useFeedbackAudioSource'
import { useFeedbackSelection } from './useFeedbackSelection'
import type { VideoPlaybackState } from './useVideoPlayback'

export interface FeedbackCoordinatorState {
  highlightedFeedbackId: string | null
  isCoachSpeaking: boolean

  bubbleState: {
    currentBubbleIndex: number | null
    bubbleVisible: boolean
  }

  overlayVisible: boolean
  activeAudio: { id: string; url: string } | null

  onProgressTrigger: (timeSeconds: number) => void
  onUserTapFeedback: (item: FeedbackPanelItem) => void
  onPlay: () => void

  onPanelCollapse: () => void
  onAudioOverlayClose: () => void
  onAudioOverlayInactivity: () => void
  onAudioOverlayInteraction: () => void
  onPlayPendingFeedback: (feedbackId: string) => void
}

export interface UseFeedbackCoordinatorParams {
  feedbackItems: FeedbackPanelItem[]
  feedbackAudio: FeedbackAudioSourceState
  audioController: AudioControllerState
  videoPlayback: VideoPlaybackState & {
    isPlaying: boolean
    videoEnded: boolean
  }
}

export function useFeedbackCoordinator({
  feedbackItems,
  feedbackAudio,
  audioController,
  videoPlayback,
}: UseFeedbackCoordinatorParams): FeedbackCoordinatorState {
  const [pendingFeedbackId, setPendingFeedbackId] = useState<string | null>(null)
  const [currentVideoTime, setCurrentVideoTime] = useState(0)

  const selection = useFeedbackSelection(feedbackAudio, audioController, videoPlayback)

  const bubbleFeedbackItems = useMemo(
    () => feedbackItems.filter((item) => item.type === 'suggestion'),
    [feedbackItems]
  )

  const bubbleIndexById = useMemo(() => {
    const map = new Map<string, number>()
    for (let i = 0; i < bubbleFeedbackItems.length; i += 1) {
      map.set(bubbleFeedbackItems[i].id, i)
    }
    return map
  }, [bubbleFeedbackItems])

  const bubbleController = useBubbleController(
    bubbleFeedbackItems,
    currentVideoTime,
    videoPlayback.isPlaying,
    feedbackAudio.audioUrls,
    audioController.duration,
    {
      onBubbleShow: ({ index, item, displayDurationMs }) => {
        const hasAudioUrl = Boolean(feedbackAudio.audioUrls[item.id])

        log.info('useFeedbackCoordinator', 'Bubble show event received', {
          index,
          feedbackId: item.id,
          timestamp: item.timestamp,
          displayDurationMs,
        })

        selection.highlightAutoFeedback(item, {
          seek: false,
          playAudio: true,
          autoDurationMs: hasAudioUrl ? undefined : displayDurationMs,
        })
      },
      onBubbleHide: ({ item, reason }) => {
        log.info('useFeedbackCoordinator', 'Bubble hide event received', {
          feedbackId: item?.id ?? null,
          highlightedId: selection.highlightedFeedbackId,
          reason,
        })

        if (!item) {
          selection.clearHighlight({
            reason: `bubble-hide-${reason ?? 'unknown'}`,
            sources: ['auto'],
          })
          return
        }

        selection.clearHighlight({
          matchId: item.id,
          sources: ['auto'],
          reason: `bubble-hide-${reason ?? 'unknown'}`,
        })
      },
      onBubbleTimerUpdate: ({ item, displayDurationMs, reason }) => {
        if (!item || reason === 'initial') {
          return
        }

        log.info('useFeedbackCoordinator', 'Bubble timer anchored to playback', {
          feedbackId: item.id,
          displayDurationMs,
          reason,
        })

        selection.highlightAutoFeedback(item, {
          seek: false,
          playAudio: false,
          autoDurationMs: displayDurationMs,
        })
      },
      onBubbleTimerElapsed: ({ item, reason }) => {
        if (!item) {
          return false
        }

        log.info('useFeedbackCoordinator', 'Bubble timer elapsed — stopping audio for sync', {
          feedbackId: item.id,
          reason,
        })

        handleAudioStop('bubble-timer-elapsed')
        return true
      },
    }
  )

  const { currentBubbleIndex, bubbleVisible, checkAndShowBubbleAtTime, showBubble, hideBubble } =
    bubbleController

  const pendingItemRef = useRef<FeedbackPanelItem | null>(null)
  const cleanupPerformedRef = useRef(false)

  const selectionRef = useRef(selection)
  useEffect(() => {
    selectionRef.current = selection
  }, [selection])

  const bubbleControllerRef = useRef(bubbleController)
  useEffect(() => {
    bubbleControllerRef.current = bubbleController
  }, [bubbleController])

  const audioControllerRef = useRef(audioController)
  useEffect(() => {
    audioControllerRef.current = audioController
  }, [audioController])

  const feedbackAudioRef = useRef(feedbackAudio)
  useEffect(() => {
    feedbackAudioRef.current = feedbackAudio
  }, [feedbackAudio])

  const handleProgressTrigger = useCallback(
    (timeSeconds: number) => {
      setCurrentVideoTime(timeSeconds)

      // Do not trigger bubbles/highlights while paused or when a pending tap exists
      if (!videoPlayback.isPlaying || pendingFeedbackId) {
        log.info('useFeedbackCoordinator', 'Progress gating active — skipping bubble check', {
          isPlaying: videoPlayback.isPlaying,
          pendingFeedbackId,
          timeSeconds,
        })
        return
      }

      const triggeredIndex = checkAndShowBubbleAtTime(timeSeconds * 1000)
      if (triggeredIndex === null) {
        return
      }

      const item = bubbleFeedbackItems[triggeredIndex]
      if (!item) {
        return
      }

      log.info('useFeedbackCoordinator', 'Progress triggered bubble check', {
        feedbackId: item.id,
        timestamp: item.timestamp,
        timeSeconds,
      })
    },
    [bubbleFeedbackItems, checkAndShowBubbleAtTime, pendingFeedbackId, videoPlayback]
  )

  const handleUserTapFeedback = useCallback(
    (item: FeedbackPanelItem) => {
      log.info('useFeedbackCoordinator', 'User tapped feedback', {
        feedbackId: item.id,
        timestamp: item.timestamp,
        isPlaying: videoPlayback.isPlaying,
        videoEnded: videoPlayback.videoEnded,
        currentTime: videoPlayback.currentTime,
      })

      hideBubble('manual')

      if (videoPlayback.isPlaying && !videoPlayback.videoEnded) {
        // Playing: seek, highlight, play, and show bubble immediately
        selection.selectFeedback(item, { seek: true, playAudio: true })

        const maybeIndex = bubbleIndexById.get(item.id)
        if (typeof maybeIndex === 'number') {
          showBubble(maybeIndex)
        }

        pendingItemRef.current = null
        setPendingFeedbackId(null)
        return
      }

      // Paused/Ended: seek, highlight, mark pending, no audio/bubble yet
      selection.selectFeedback(item, { seek: true, playAudio: false })
      pendingItemRef.current = item
      setPendingFeedbackId(item.id)
    },
    [bubbleIndexById, hideBubble, selection, showBubble, videoPlayback]
  )

  const handlePlayPendingFeedback = useCallback(
    (feedbackId: string) => {
      const item = feedbackItems.find((feedback) => feedback.id === feedbackId)
      if (!item) {
        log.warn('useFeedbackCoordinator', 'Attempted to play unknown feedback', {
          feedbackId,
        })
        return
      }

      pendingItemRef.current = null
      setPendingFeedbackId(null)

      selection.selectFeedback(item, { seek: false, playAudio: true })
    },
    [feedbackItems, selection]
  )

  const handlePlay = useCallback(() => {
    if (!pendingFeedbackId || !pendingItemRef.current) {
      log.info('useFeedbackCoordinator', 'Play pressed — no pending feedback, just play')
      videoPlayback.play()
      return
    }

    const item = pendingItemRef.current
    log.info('useFeedbackCoordinator', 'Handling pending feedback on play', {
      feedbackId: item.id,
      timestamp: item.timestamp,
    })

    selection.selectFeedback(item, { seek: true, playAudio: true })

    const maybeIndex = bubbleIndexById.get(item.id)
    if (typeof maybeIndex === 'number') {
      showBubble(maybeIndex)
    }

    setPendingFeedbackId(null)
    pendingItemRef.current = null
    videoPlayback.play()
  }, [bubbleIndexById, pendingFeedbackId, selection, showBubble, videoPlayback])

  // Diagnostics: log when video end state changes
  useEffect(() => {
    log.info('useFeedbackCoordinator', 'Video end state changed', {
      videoEnded: videoPlayback.videoEnded,
      highlightedId: selection.highlightedFeedbackId,
      pendingFeedbackId,
      bubbleVisible,
    })
  }, [bubbleVisible, pendingFeedbackId, selection.highlightedFeedbackId, videoPlayback.videoEnded])

  // Diagnostics: log when audio playback toggles
  useEffect(() => {
    log.info('useFeedbackCoordinator', 'Audio playing state changed', {
      audioPlaying: audioController.isPlaying,
      highlightedId: selection.highlightedFeedbackId,
    })
  }, [audioController.isPlaying, selection.highlightedFeedbackId])

  // Rule: After audio ends and video resumes playing, remove highlight
  useEffect(() => {
    if (!audioController.isPlaying && selection.highlightedFeedbackId && videoPlayback.isPlaying) {
      log.info('useFeedbackCoordinator', 'Clearing highlight on audio end + video resume', {
        highlightedId: selection.highlightedFeedbackId,
      })
      selection.clearHighlight({ reason: 'audio-ended-video-resumed' })
    }
  }, [
    audioController.isPlaying,
    selection,
    selection.highlightedFeedbackId,
    videoPlayback.isPlaying,
  ])

  // Diagnostics: log highlight state changes
  useEffect(() => {
    log.debug('useFeedbackCoordinator', 'Highlighted feedback state changed', {
      highlightedId: selection.highlightedFeedbackId,
      isCoachSpeaking: selection.isCoachSpeaking,
      audioPlaying: audioController.isPlaying,
      videoPlaying: videoPlayback.isPlaying,
    })
  }, [
    selection.highlightedFeedbackId,
    selection.isCoachSpeaking,
    audioController.isPlaying,
    videoPlayback.isPlaying,
  ])

  const handlePanelCollapse = useCallback(() => {
    hideBubble('manual')

    selection.clearHighlight({ reason: 'panel-collapsed' })
    selection.clearSelection()
    pendingItemRef.current = null
    setPendingFeedbackId(null)
  }, [hideBubble, selection])

  const handleAudioStop = useCallback(
    (reason: string) => {
      hideBubble('manual')

      selection.clearHighlight({ reason })
      audioController.setIsPlaying(false)
      feedbackAudio.clearActiveAudio()
      selection.clearSelection()
      pendingItemRef.current = null
      setPendingFeedbackId(null)
    },
    [audioController, feedbackAudio, hideBubble, selection]
  )

  useEffect(() => {
    return () => {
      if (cleanupPerformedRef.current) {
        return
      }
      cleanupPerformedRef.current = true

      const nextBubbleController = bubbleControllerRef.current
      const nextSelection = selectionRef.current
      const nextAudioController = audioControllerRef.current
      const nextFeedbackAudio = feedbackAudioRef.current

      nextBubbleController.hideBubble('cleanup')

      nextSelection.clearHighlight({ reason: 'coordinator-unmount' })
      nextSelection.clearSelection()

      nextAudioController.setIsPlaying(false)
      nextFeedbackAudio.clearActiveAudio()

      pendingItemRef.current = null
      setPendingFeedbackId(null)
    }
  }, [])

  const overlayVisible = audioController.isPlaying && Boolean(feedbackAudio.activeAudio)
  const activeAudio = feedbackAudio.activeAudio
  const activeAudioId = activeAudio?.id ?? null

  // Synchronous hide: when overlay becomes invisible, hide bubble immediately
  if (!overlayVisible && bubbleVisible) {
    hideBubble('audio-stop')
  }

  useEffect(() => {
    if (!overlayVisible) {
      return
    }

    const candidateId = selection.highlightedFeedbackId

    if (!candidateId) {
      return
    }

    const nextBubbleIndex = bubbleIndexById.get(candidateId) ?? null

    if (nextBubbleIndex === null || (currentBubbleIndex === nextBubbleIndex && bubbleVisible)) {
      return
    }

    showBubble(nextBubbleIndex)
  }, [
    overlayVisible,
    activeAudioId,
    selection.highlightedFeedbackId,
    bubbleIndexById,
    hideBubble,
    showBubble,
    bubbleVisible,
    currentBubbleIndex,
  ])

  return {
    highlightedFeedbackId: selection.highlightedFeedbackId,
    isCoachSpeaking: selection.isCoachSpeaking,
    bubbleState: {
      currentBubbleIndex,
      bubbleVisible,
    },
    overlayVisible,
    activeAudio,
    onProgressTrigger: handleProgressTrigger,
    onUserTapFeedback: handleUserTapFeedback,
    onPlay: handlePlay,
    onPanelCollapse: handlePanelCollapse,
    onAudioOverlayClose: () => {
      log.info('useFeedbackCoordinator', 'Audio overlay closed by user')
      handleAudioStop('audio-overlay-close')
    },
    onAudioOverlayInactivity: () => {
      log.info('useFeedbackCoordinator', 'Audio overlay inactivity detected')
      handleAudioStop('audio-overlay-inactivity')
    },
    onAudioOverlayInteraction: () => {
      log.debug('useFeedbackCoordinator', 'Audio overlay interaction detected')
    },
    onPlayPendingFeedback: handlePlayPendingFeedback,
  }
}
