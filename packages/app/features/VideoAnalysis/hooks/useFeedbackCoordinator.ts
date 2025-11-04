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
  onPause: () => void

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
  const skipSuppressionRef = useRef(false)

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
      onBubbleShow: ({ item, displayDurationMs }) => {
        const hasAudioUrl = Boolean(feedbackAudio.audioUrls[item.id])

        // log.info('useFeedbackCoordinator', 'Bubble show event received', {
        //   index,
        //   feedbackId: item.id,
        //   timestamp: item.timestamp,
        //   displayDurationMs,
        // })

        selection.highlightAutoFeedback(item, {
          seek: false,
          playAudio: true,
          autoDurationMs: hasAudioUrl ? undefined : displayDurationMs,
        })
      },
      onBubbleHide: ({ item, reason }) => {
        // log.info('useFeedbackCoordinator', 'Bubble hide event received', {
        //   feedbackId: item?.id ?? null,
        //   highlightedId: selection.highlightedFeedbackId,
        //   reason,
        // })

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

        // log.info('useFeedbackCoordinator', 'Bubble timer anchored to playback', {
        //   feedbackId: item.id,
        //   displayDurationMs,
        //   reason,
        // })

        selection.highlightAutoFeedback(item, {
          seek: false,
          playAudio: false,
          autoDurationMs: displayDurationMs,
        })
      },
      onBubbleTimerElapsed: ({ item }) => {
        if (!item) {
          return false
        }

        // log.info('useFeedbackCoordinator', 'Bubble timer elapsed — stopping audio for sync', {
        //   feedbackId: item.id,
        //   reason,
        // })

        handleAudioStop('bubble-timer-elapsed')
        return true
      },
    }
  )

  const { currentBubbleIndex, bubbleVisible, checkAndShowBubbleAtTime, showBubble, hideBubble } =
    bubbleController

  const pendingItemRef = useRef<FeedbackPanelItem | null>(null)
  const pendingFeedbackIdRef = useRef<string | null>(null)
  const cleanupPerformedRef = useRef(false)

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
        return
      }

      // Suppress bubble triggers immediately after a skip/seek operation
      // This prevents bubbles from popping up when user manually skips forward
      if (skipSuppressionRef.current) {
        // Clear suppression after this check - allow bubbles on subsequent progress events
        skipSuppressionRef.current = false
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
    },
    [
      bubbleFeedbackItems,
      bubbleController,
      checkAndShowBubbleAtTime,
      currentVideoTime,
      pendingFeedbackId,
      videoPlayback.isPlaying, // Only depend on isPlaying, not the whole videoPlayback object
    ]
  )

  const handleUserTapFeedback = useCallback(
    (item: FeedbackPanelItem) => {
      // log.info('useFeedbackCoordinator', 'User tapped feedback', {
      //   feedbackId: item.id,
      //   timestamp: item.timestamp,
      //   isPlaying: videoPlayback.isPlaying,
      //   videoEnded: videoPlayback.videoEnded,
      //   currentTime: videoPlayback.currentTime,
      // })

      hideBubble('manual')

      if (videoPlayback.isPlaying && !videoPlayback.videoEnded) {
        // Playing: seek, highlight, play, and show bubble immediately
        selection.selectFeedback(item, { seek: true, playAudio: true })

        const maybeIndex = bubbleIndexById.get(item.id)
        if (typeof maybeIndex === 'number') {
          showBubble(maybeIndex)
        }

        pendingItemRef.current = null
        pendingFeedbackIdRef.current = null
        setPendingFeedbackId(null)
        return
      }

      // Paused/Ended: seek, highlight, mark pending, no audio/bubble yet
      selection.selectFeedback(item, { seek: true, playAudio: false })
      pendingItemRef.current = item
      pendingFeedbackIdRef.current = item.id
      setPendingFeedbackId(item.id)
    },
    [
      bubbleIndexById,
      hideBubble,
      selection,
      showBubble,
      videoPlayback.isPlaying,
      videoPlayback.videoEnded,
    ]
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
      pendingFeedbackIdRef.current = null
      setPendingFeedbackId(null)

      selection.selectFeedback(item, { seek: false, playAudio: true })
    },
    [feedbackItems, selection]
  )

  // Extract videoPlayback.play() to a ref to avoid depending on entire videoPlayback object
  // videoPlayback changes when currentTime changes, but play() method is stable
  const videoPlayRef = useRef(videoPlayback.play)
  useEffect(() => {
    videoPlayRef.current = videoPlayback.play
  }, [videoPlayback.play])

  const handlePlay = useCallback(() => {
    // Resume audio ONLY if it was paused (has activeAudio but isPlaying is false)
    // Do NOT resume if audio finished (audio finished sets isPlaying=false but activeAudio might still exist)
    // Check if audio was paused vs finished by checking if audio is actually at a playable position
    // If currentTime is > 0 and duration > 0, audio was paused; if currentTime is 0, audio likely finished
    const currentController = audioControllerRef.current
    const wasPaused =
      feedbackAudio.activeAudio &&
      currentController &&
      !currentController.isPlaying &&
      currentController.currentTime > 0 &&
      currentController.duration > 0 &&
      currentController.currentTime < currentController.duration

    if (wasPaused) {
      audioController.setIsPlaying(true)
    }

    if (!pendingFeedbackIdRef.current || !pendingItemRef.current) {
      // log.info('useFeedbackCoordinator', 'Play pressed — no pending feedback, just play')
      videoPlayRef.current()
      return
    }

    const item = pendingItemRef.current
    // log.info('useFeedbackCoordinator', 'Handling pending feedback on play', {
    //   feedbackId: item.id,
    //   timestamp: item.timestamp,
    // })

    selection.selectFeedback(item, { seek: true, playAudio: true })

    const maybeIndex = bubbleIndexById.get(item.id)
    if (typeof maybeIndex === 'number') {
      showBubble(maybeIndex)
    }

    setPendingFeedbackId(null)
    pendingFeedbackIdRef.current = null
    pendingItemRef.current = null
    videoPlayRef.current()
  }, [
    bubbleIndexById,
    feedbackAudio.activeAudio,
    selection,
    showBubble,
    audioController.setIsPlaying,
  ])

  // Rule: After audio ends and video resumes playing, remove highlight and clear activeAudio
  useEffect(() => {
    if (!audioController.isPlaying && selection.highlightedFeedbackId && videoPlayback.isPlaying) {
      // log.info('useFeedbackCoordinator', 'Clearing highlight on audio end + video resume', {
      //   highlightedId: selection.highlightedFeedbackId,
      // })
      selection.clearHighlight({ reason: 'audio-ended-video-resumed' })
      // Clear activeAudio when audio ends naturally and video resumes
      // This prevents handlePlay from trying to resume finished audio
      if (feedbackAudioRef.current.activeAudio && audioController.currentTime === 0) {
        feedbackAudioRef.current.clearActiveAudio()
      }
    }
  }, [
    audioController.isPlaying,
    audioController.currentTime,
    selection,
    selection.highlightedFeedbackId,
    videoPlayback.isPlaying,
  ])

  // Rule: Clear activeAudio when audio ends naturally (currentTime reset to 0)
  // This handles the case where audio finishes but video isn't playing yet
  // Only clear if audio was actually playing (duration > 0 means audio was loaded and played)
  // and currentTime is 0 (indicating audio ended, not paused mid-track)
  const prevAudioPlayingRef = useRef(audioController.isPlaying)
  const prevAudioCurrentTimeRef = useRef(audioController.currentTime)
  useEffect(() => {
    const wasPlaying = prevAudioPlayingRef.current
    const wasAtNonZeroPosition = prevAudioCurrentTimeRef.current > 0
    const nowNotPlaying = !audioController.isPlaying
    const nowAtZero = audioController.currentTime === 0

    // Update refs for next comparison
    prevAudioPlayingRef.current = audioController.isPlaying
    prevAudioCurrentTimeRef.current = audioController.currentTime

    // Only clear if audio transitioned from playing to stopped AND reset to 0
    // This detects natural end (handleEnd sets currentTime=0) vs pause at start
    if (
      wasPlaying &&
      wasAtNonZeroPosition &&
      nowNotPlaying &&
      nowAtZero &&
      feedbackAudioRef.current.activeAudio &&
      audioController.duration > 0
    ) {
      // Audio ended naturally (transitioned from playing to stopped with currentTime reset to 0)
      // Clear activeAudio to prevent handlePlay from trying to resume finished audio
      feedbackAudioRef.current.clearActiveAudio()
    }
  }, [audioController.isPlaying, audioController.currentTime, audioController.duration])

  const handlePanelCollapse = useCallback(() => {
    hideBubble('manual')

    selection.clearHighlight({ reason: 'panel-collapsed' })
    selection.clearSelection()
    pendingItemRef.current = null
    pendingFeedbackIdRef.current = null
    setPendingFeedbackId(null)

    // Enable skip suppression to prevent immediate bubble popup after seek
    skipSuppressionRef.current = true
  }, [hideBubble, selection])

  const handleAudioStop = useCallback(
    (reason: string) => {
      // Use refs for all dependencies to make this callback completely stable
      // This prevents handleAudioOverlayClose/Inactivity from recreating
      bubbleControllerRef.current.hideBubble('manual')
      selection.clearHighlight({ reason })
      audioController.setIsPlaying(false)
      feedbackAudioRef.current.clearActiveAudio()
      selection.clearSelection()
      pendingItemRef.current = null
      pendingFeedbackIdRef.current = null
      setPendingFeedbackId(null)
    },
    [selection, audioController.setIsPlaying]
  )

  useEffect(() => {
    return () => {
      if (cleanupPerformedRef.current) {
        return
      }
      cleanupPerformedRef.current = true

      const nextBubbleController = bubbleControllerRef.current
      const nextSelection = selection
      const nextAudioController = audioControllerRef.current
      const nextFeedbackAudio = feedbackAudioRef.current

      nextBubbleController.hideBubble('cleanup')

      nextSelection.clearHighlight({ reason: 'coordinator-unmount' })
      nextSelection.clearSelection()

      nextAudioController.setIsPlaying(false)
      nextFeedbackAudio.clearActiveAudio()

      pendingItemRef.current = null
      pendingFeedbackIdRef.current = null
      setPendingFeedbackId(null)
    }
  }, [])

  const overlayVisible = audioController.isPlaying && Boolean(feedbackAudio.activeAudio)
  const activeAudio = feedbackAudio.activeAudio
  const activeAudioId = activeAudio?.id ?? null

  // Synchronous hide: when overlay becomes invisible due to audio stopping (not pausing)
  // Only hide if audio is actually stopped (no active audio), not just paused
  // When paused, activeAudio still exists, so we keep the bubble visible
  if (!feedbackAudio.activeAudio && bubbleVisible) {
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

  // Store videoPlayback.pause in ref to prevent handlePause from recreating
  // when videoPlayback object changes (which happens when its internal state changes)
  const videoPlaybackPauseRef = useRef(videoPlayback.pause)
  useEffect(() => {
    videoPlaybackPauseRef.current = videoPlayback.pause
  }, [videoPlayback.pause])

  // Memoize pause handler to prevent recreation
  // Always call setIsPlaying(false) - harmless if already false, avoids dependency on isPlaying
  const handlePause = useCallback(() => {
    // When pause is pressed, pause audio feedback if playing (but don't stop/hide)
    // The bubble timer will be paused automatically when isPlaying becomes false
    // Always call setIsPlaying(false) unconditionally to ensure audio stops
    audioController.setIsPlaying(false)
    videoPlaybackPauseRef.current()
  }, [audioController.setIsPlaying])

  // Memoize audio overlay handlers to prevent recreation
  const handleAudioOverlayClose = useCallback(() => {
    // log.info('useFeedbackCoordinator', 'Audio overlay closed by user')
    handleAudioStop('audio-overlay-close')
  }, [handleAudioStop])

  const handleAudioOverlayInactivity = useCallback(() => {
    // log.info('useFeedbackCoordinator', 'Audio overlay inactivity detected')
    handleAudioStop('audio-overlay-inactivity')
  }, [handleAudioStop])

  const handleAudioOverlayInteraction = useCallback(() => {
    // log.debug('useFeedbackCoordinator', 'Audio overlay interaction detected')
  }, [])

  // Memoize return value to prevent recreation on every render
  // This is critical for preventing cascading re-renders in VideoAnalysisScreen
  // Store primitive values for accurate comparison (not object references)
  const prevDepsRef = useRef<{
    selectionHighlightId: string | null
    selectionCoachSpeaking: boolean
    selectionSelectedId: string | null
    currentBubbleIndex: number | null
    bubbleVisible: boolean
    overlayVisible: boolean
    activeAudioId: string | null
    activeAudioUrl: string | null
    // Keep full objects for debug logging (but compare primitives)
    selection: any
    activeAudio: any
  }>({
    selectionHighlightId: null,
    selectionCoachSpeaking: false,
    selectionSelectedId: null,
    currentBubbleIndex: null,
    bubbleVisible: false,
    overlayVisible: false,
    activeAudioId: null,
    activeAudioUrl: null,
    selection: null,
    activeAudio: null,
  })

  const lastRecalcTimeRef = useRef<number>(Date.now())

  // Extract primitive values from activeAudio to prevent unnecessary recalculations
  // activeAudio object reference changes even when values are the same
  // activeAudioId is already declared above (line 388), reuse it
  const activeAudioUrl = activeAudio?.url ?? null

  // Normalize URL for comparison - remove cache-busting parameters (e.g., #replay=timestamp)
  // When same audio is selected again, useFeedbackAudioSource adds #replay=timestamp to force reset
  // We ignore this for comparison but keep original URL for actual playback
  const normalizeUrlForComparison = (url: string | null): string | null => {
    if (!url) return null
    // Remove #replay= timestamp and other cache-busting fragments
    return url.split('#')[0]
  }

  const normalizedActiveAudioUrl = normalizeUrlForComparison(activeAudioUrl)

  // Memoize activeAudio object with content-based comparison to prevent unnecessary recreation
  // This ensures the object only changes when id/url actually change, not when other dependencies change
  // NOTE: URL comparison uses normalized URL (ignores cache-busting params) to prevent recreation for replays
  const prevStableActiveAudioRef = useRef<{ id: string; url: string } | null>(null)
  const prevActiveAudioIdRef = useRef<string | null>(null)
  const prevNormalizedActiveAudioUrlRef = useRef<string | null>(null)

  const stableActiveAudio = useMemo(() => {
    // Compare by content (id/normalized-url) not reference
    const idChanged = prevActiveAudioIdRef.current !== activeAudioId
    const urlChanged = prevNormalizedActiveAudioUrlRef.current !== normalizedActiveAudioUrl

    if (!idChanged && !urlChanged) {
      // Content unchanged (including normalized URL) - return cached object to maintain stable reference
      // Even if raw URL changed (e.g., replay timestamp), normalized URL is same, so keep same object
      return prevStableActiveAudioRef.current
    }

    // Content changed - create new object
    // Use original URL (with replay parameter if present) for actual playback
    prevActiveAudioIdRef.current = activeAudioId
    prevNormalizedActiveAudioUrlRef.current = normalizedActiveAudioUrl

    const newActiveAudio =
      activeAudioId && activeAudioUrl ? { id: activeAudioId, url: activeAudioUrl } : null
    prevStableActiveAudioRef.current = newActiveAudio
    return newActiveAudio
  }, [activeAudioId, normalizedActiveAudioUrl, activeAudioUrl]) // Use normalized for comparison, actual URL for object

  // Store callbacks in refs to ensure stable references
  // These callbacks already use refs internally, so they're functionally stable
  const callbacksRef = useRef({
    onProgressTrigger: handleProgressTrigger,
    onUserTapFeedback: handleUserTapFeedback,
    onPlay: handlePlay,
    onPause: handlePause,
    onPanelCollapse: handlePanelCollapse,
    onAudioOverlayClose: handleAudioOverlayClose,
    onAudioOverlayInactivity: handleAudioOverlayInactivity,
    onAudioOverlayInteraction: handleAudioOverlayInteraction,
    onPlayPendingFeedback: handlePlayPendingFeedback,
  })

  // Update ref properties (not the ref itself) to maintain stable object identity
  callbacksRef.current.onProgressTrigger = handleProgressTrigger
  callbacksRef.current.onUserTapFeedback = handleUserTapFeedback
  callbacksRef.current.onPlay = handlePlay
  callbacksRef.current.onPause = handlePause
  callbacksRef.current.onPanelCollapse = handlePanelCollapse
  callbacksRef.current.onAudioOverlayClose = handleAudioOverlayClose
  callbacksRef.current.onAudioOverlayInactivity = handleAudioOverlayInactivity
  callbacksRef.current.onAudioOverlayInteraction = handleAudioOverlayInteraction
  callbacksRef.current.onPlayPendingFeedback = handlePlayPendingFeedback

  return useMemo(() => {
    const now = Date.now()
    const timeSinceLastRecalc = now - lastRecalcTimeRef.current
    lastRecalcTimeRef.current = now

    // Use pre-memoized stableActiveAudio to prevent object recreation when other dependencies change
    const reconstructedActiveAudio = stableActiveAudio

    // Debug: track what's changing
    // Compare PRIMITIVE values, not object references, to match useMemo dependency array
    const prev = prevDepsRef.current

    // Track which dependency triggered useMemo recalculation
    const dependencyChanges: string[] = []
    if (prev.selectionHighlightId !== selection.highlightedFeedbackId) {
      dependencyChanges.push(
        `selection.highlightedFeedbackId: ${prev.selectionHighlightId} → ${selection.highlightedFeedbackId}`
      )
    }
    if (prev.selectionCoachSpeaking !== selection.isCoachSpeaking) {
      dependencyChanges.push(
        `selection.isCoachSpeaking: ${prev.selectionCoachSpeaking} → ${selection.isCoachSpeaking}`
      )
    }
    if (prev.currentBubbleIndex !== currentBubbleIndex) {
      dependencyChanges.push(
        `currentBubbleIndex: ${prev.currentBubbleIndex} → ${currentBubbleIndex}`
      )
    }
    if (prev.bubbleVisible !== bubbleVisible) {
      dependencyChanges.push(`bubbleVisible: ${prev.bubbleVisible} → ${bubbleVisible}`)
    }
    if (prev.overlayVisible !== overlayVisible) {
      dependencyChanges.push(`overlayVisible: ${prev.overlayVisible} → ${overlayVisible}`)
    }
    if (prev.activeAudioId !== activeAudioId) {
      dependencyChanges.push(`activeAudioId: ${prev.activeAudioId} → ${activeAudioId}`)
    }
    if (prev.activeAudioUrl !== activeAudioUrl) {
      dependencyChanges.push(
        `activeAudioUrl: ${prev.activeAudioUrl !== null ? '...' : null} → ${activeAudioUrl !== null ? '...' : null}`
      )
    }

    if (prev.selectionHighlightId !== null || prev.selection !== null) {
      const changed: string[] = []

      // Compare selection primitives using stored values
      if (prev.selectionHighlightId !== selection.highlightedFeedbackId) {
        changed.push('selection.highlightedFeedbackId')
      }
      if (prev.selectionCoachSpeaking !== selection.isCoachSpeaking) {
        changed.push('selection.isCoachSpeaking')
      }
      if (prev.selectionSelectedId !== selection.selectedFeedbackId) {
        changed.push('selection.selectedFeedbackId')
      }
      // Only log 'selection' if actual values changed (for backward compatibility)
      if (
        prev.selectionHighlightId !== selection.highlightedFeedbackId ||
        prev.selectionCoachSpeaking !== selection.isCoachSpeaking ||
        prev.selectionSelectedId !== selection.selectedFeedbackId
      ) {
        changed.push('selection')
      }

      if (prev.currentBubbleIndex !== currentBubbleIndex) changed.push('currentBubbleIndex')
      if (prev.bubbleVisible !== bubbleVisible) changed.push('bubbleVisible')
      if (prev.overlayVisible !== overlayVisible) changed.push('overlayVisible')
      // Compare primitive values (not object references)
      if (prev.activeAudioId !== activeAudioId || prev.activeAudioUrl !== activeAudioUrl) {
        changed.push('activeAudio')
      }

      if (changed.length > 0 || dependencyChanges.length > 0) {
        log.debug('useFeedbackCoordinator', '🔥 Coordinator recalculating', {
          changed,
          dependencyChanges: dependencyChanges.length > 0 ? dependencyChanges : undefined,
          timeSinceLastRecalc,
          isRapid: timeSinceLastRecalc < 16,
          selectionHighlightId: selection.highlightedFeedbackId,
          selectionIsCoachSpeaking: selection.isCoachSpeaking,
          selectionSelectedId: selection.selectedFeedbackId,
          currentBubbleIndex,
          bubbleVisible,
          overlayVisible,
          activeAudioId: activeAudioId,
          stackTrace:
            timeSinceLastRecalc < 16
              ? new Error().stack?.split('\n').slice(1, 8).join('\n')
              : undefined,
        })
      }
    }

    // Store primitive values for accurate comparison (not object references)
    prevDepsRef.current = {
      selectionHighlightId: selection.highlightedFeedbackId,
      selectionCoachSpeaking: selection.isCoachSpeaking,
      selectionSelectedId: selection.selectedFeedbackId,
      currentBubbleIndex,
      bubbleVisible,
      overlayVisible,
      activeAudioId,
      activeAudioUrl,
      // Keep full objects for debug logging
      selection,
      activeAudio: reconstructedActiveAudio,
    }

    return {
      highlightedFeedbackId: selection.highlightedFeedbackId,
      isCoachSpeaking: selection.isCoachSpeaking,
      bubbleState: {
        currentBubbleIndex,
        bubbleVisible,
      },
      overlayVisible,
      activeAudio: reconstructedActiveAudio,
      // Use callbacks from ref to maintain stable object identity
      onProgressTrigger: callbacksRef.current.onProgressTrigger,
      onUserTapFeedback: callbacksRef.current.onUserTapFeedback,
      onPlay: callbacksRef.current.onPlay,
      onPause: callbacksRef.current.onPause,
      onPanelCollapse: callbacksRef.current.onPanelCollapse,
      onAudioOverlayClose: callbacksRef.current.onAudioOverlayClose,
      onAudioOverlayInactivity: callbacksRef.current.onAudioOverlayInactivity,
      onAudioOverlayInteraction: callbacksRef.current.onAudioOverlayInteraction,
      onPlayPendingFeedback: callbacksRef.current.onPlayPendingFeedback,
    }
  }, [
    // Only depend on PRIMITIVE values, not object references
    selection.highlightedFeedbackId,
    selection.isCoachSpeaking,
    currentBubbleIndex,
    bubbleVisible,
    overlayVisible,
    // Use primitive values instead of activeAudio object reference
    activeAudioId,
    activeAudioUrl,
    // Omit callbacks from deps - they're stable via refs
  ])
}
