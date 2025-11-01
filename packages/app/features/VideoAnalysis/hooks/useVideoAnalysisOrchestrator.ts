import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { Platform } from 'react-native'

import { FALLBACK_VIDEO_URI } from '@app/mocks/feedback'
import { log } from '@my/logging'

import { useStatusBar } from '@app/hooks/useStatusBar'
import type { VideoControlsRef } from '@ui/components/VideoAnalysis'
import type { VideoAnalysisContextValue } from '../contexts/VideoAnalysisContext'
import type { FeedbackPanelItem } from '../types'
import { type AnalysisPhase, useAnalysisState } from './useAnalysisState'
import { useAnimationController } from './useAnimationController'
import type { UseAnimationControllerReturn } from './useAnimationController'
import { useAudioController } from './useAudioController'
import { useAutoPlayOnReady } from './useAutoPlayOnReady'
import { useFeedbackAudioSource } from './useFeedbackAudioSource'
import { useFeedbackCoordinator } from './useFeedbackCoordinator'
import { useFeedbackPanel } from './useFeedbackPanel'
import { useGestureController } from './useGestureController'
import type { UseGestureControllerReturn } from './useGestureController'
import { useHistoricalAnalysis } from './useHistoricalAnalysis'
import { useVideoAudioSync } from './useVideoAudioSync'
import { useVideoControls } from './useVideoControls'
import { useVideoPlayback } from './useVideoPlayback'

export interface VideoAnalysisScreenProps {
  analysisJobId?: number
  videoRecordingId?: number
  videoUri?: string
  initialStatus?: 'processing' | 'ready' | 'playing' | 'paused'
  onBack?: () => void
  onControlsVisibilityChange?: (visible: boolean, isUserInteraction?: boolean) => void
  onProcessingChange?: (isProcessing: boolean) => void
}

/**
 * Warm CDN edge cache by fetching first 256KB of video
 * Non-blocking operation that primes the buffer for instant playback
 * @returns Success status and duration for performance tracking
 */
async function warmEdgeCache(videoUrl: string): Promise<{ success: boolean; duration: number }> {
  try {
    const startTime = Date.now()
    await fetch(videoUrl, {
      method: 'GET',
      headers: { Range: 'bytes=0-262143' }, // First 256KB
    })
    const duration = Date.now() - startTime
    log.info('VideoAnalysisScreen.warmEdgeCache', 'Edge cache warmed', {
      duration,
      bytes: 262144,
      edgeWarmingSuccess: true,
    })
    return { success: true, duration }
  } catch (error) {
    log.warn('VideoAnalysisScreen.warmEdgeCache', 'Failed to warm edge cache', {
      error: error instanceof Error ? error.message : String(error),
      edgeWarmingSuccess: false,
    })
    return { success: false, duration: 0 }
  }
}

/**
 * Return type for useVideoAnalysisOrchestrator hook
 */
export interface UseVideoAnalysisOrchestratorReturn {
  video: {
    uri: string
    posterUri?: string
    isReady: boolean
    isProcessing: boolean
    currentTime: number
    duration: number
    ended: boolean
  }
  playback: {
    isPlaying: boolean
    videoEnded: boolean
    pendingSeek: number | null
    shouldPlayVideo: boolean
    play: () => void
    pause: () => void
    replay: () => void
    seek: (time: number) => void
  }
  audio: {
    controller: ReturnType<typeof useAudioController>
    source: ReturnType<typeof useFeedbackAudioSource>
    sync: ReturnType<typeof useVideoAudioSync>
  }
  feedback: {
    items: FeedbackPanelItem[]
    coordinator: ReturnType<typeof useFeedbackCoordinator>
    panel: ReturnType<typeof useFeedbackPanel>
    state: ReturnType<typeof useAnalysisState>
    panelFraction: number
    activeTab: 'feedback' | 'insights' | 'comments'
    selectedFeedbackId: string | null
    phase: AnalysisPhase
    progress: { upload: number; analysis: number; feedback: number }
    channelExhausted: boolean
    errors: Record<string, string>
    audioUrls: Record<string, string>
    // Granular state objects for components (prevents unnecessary re-renders)
    itemsState: {
      items: FeedbackPanelItem[]
      selectedFeedbackId: string | null
    }
    panelState: {
      panelFraction: number
      activeTab: 'feedback' | 'insights' | 'comments'
    }
    analysisState: {
      phase: AnalysisPhase
      progress: { upload: number; analysis: number; feedback: number }
      channelExhausted: boolean
    }
    errorsState: {
      errors: Record<string, string>
      audioUrls: Record<string, string>
    }
  }
  gesture?: UseGestureControllerReturn
  animation?: UseAnimationControllerReturn
  controls: {
    showControls: boolean
    videoControlsRef: React.RefObject<VideoControlsRef | null>
    onControlsVisibilityChange: (visible: boolean, isUserInteraction?: boolean) => void
  }
  error: {
    visible: boolean
    message: string | null
  }
  handlers: {
    onPlay: () => void
    onPause: () => void
    onReplay: () => void
    onEnd: () => void
    onSeek: (time: number) => void
    onSeekComplete: (time: number | null) => void
    onVideoLoad: (data: { duration: number }) => void
    onSignificantProgress: (time: number) => void
    onFeedbackItemPress: (item: FeedbackPanelItem) => void
    onCollapsePanel: () => void
    onBack?: () => void
    onRetry: () => void
    onShare: () => void
    onLike: () => void
    onComment: () => void
    onBookmark: () => void
    onSelectAudio: (feedbackId: string) => void
    onFeedbackScrollY: (scrollY: number) => void
    onFeedbackMomentumScrollEnd: () => void
  }
  contextValue: VideoAnalysisContextValue
  refs: {
    videoControlsRef: React.RefObject<VideoControlsRef | null>
    rootPanRef: React.RefObject<any>
  }
}

/**
 * Orchestrates all VideoAnalysisScreen hooks and aggregates their interfaces
 * into organized groups for simplified consumption by layout components.
 *
 * Coordinates 14 hooks:
 * 1. useHistoricalAnalysis - Load historical analysis data
 * 2. useAnalysisState - Manage analysis state and feedback
 * 3. useVideoPlayback - Control video playback
 * 4. useVideoControls - Manage video control visibility
 * 5. useFeedbackAudioSource - Resolve audio URLs for feedback
 * 6. useAudioController - Control audio playback
 * 7. useFeedbackCoordinator - Coordinate feedback with video/audio
 * 8. useFeedbackPanel - Manage feedback panel state
 * 9. useVideoAudioSync - Sync video and audio playback
 * 10. useAutoPlayOnReady - Auto-play video when ready
 * 11. useGestureController - YouTube-style gesture delegation (native only)
 * 12. useAnimationController - Mode-based animation calculations (native only)
 * 13. useStatusBar - Hide status bar when screen focused
 * 14. Context value aggregation
 *
 * @param props - VideoAnalysisScreen props
 * @returns Organized orchestrator interface with video, playback, audio, feedback, gesture, animation, controls, error, handlers, context, and refs
 */
export function useVideoAnalysisOrchestrator(
  props: VideoAnalysisScreenProps
): UseVideoAnalysisOrchestratorReturn {
  const {
    analysisJobId,
    videoRecordingId,
    videoUri,
    initialStatus = 'processing',
    onBack,
    onControlsVisibilityChange,
    onProcessingChange,
  } = props

  // useTransition for deferring non-critical updates during animations
  const [, startTransition] = useTransition()

  // Hide status bar when this screen is focused
  useStatusBar(true, 'fade')

  // Detect history mode: when analysisJobId is provided, we're viewing historical analysis
  const isHistoryMode = !!analysisJobId

  // Load historical analysis data if in history mode
  const historicalAnalysis = useHistoricalAnalysis(isHistoryMode ? analysisJobId : null)

  // Log mode detection for debugging
  useEffect(() => {
    if (isHistoryMode) {
      log.info('VideoAnalysisScreen', 'History mode detected', {
        analysisJobId,
        isLoading: historicalAnalysis.isLoading,
        hasData: !!historicalAnalysis.data,
      })
    }
  }, [isHistoryMode, analysisJobId, historicalAnalysis.isLoading, historicalAnalysis.data])

  // In history mode, use 'ready' as initial status since data is prefetched
  // This prevents isProcessing from being true initially
  const normalizedInitialStatus = useMemo(() => {
    if (isHistoryMode) {
      return 'ready' as const
    }
    return initialStatus === 'ready' ? 'ready' : 'processing'
  }, [isHistoryMode, initialStatus])
  // In history mode, still pass analysisJobId to load feedback from database
  // but the hook will skip creating new analysis jobs
  const analysisState = useAnalysisState(
    analysisJobId,
    videoRecordingId,
    normalizedInitialStatus,
    isHistoryMode
  )

  const videoPlayback = useVideoPlayback(initialStatus)
  const {
    isPlaying,
    pendingSeek,
    videoEnded,
    play: playVideo,
    pause: pauseVideo,
    seek: seekVideo,
    replay: replayVideo,
    handleLoad: registerDuration,
    handleSeekComplete: resolveSeek,
    handleEnd: handleVideoEnd,
  } = videoPlayback

  // Determine effective processing state: wait for either historical load or analysis processing
  const isProcessing = historicalAnalysis.isLoading || analysisState.isProcessing

  // Notify parent when processing state changes
  useEffect(() => {
    onProcessingChange?.(isProcessing)
  }, [isProcessing, onProcessingChange])

  const videoControls = useVideoControls(isProcessing, isPlaying, videoEnded)

  // Use unified feedback source for both modes
  const realFeedbackItems = analysisState.feedback.feedbackItems

  // Track realFeedbackItems reference changes
  const prevRealFeedbackItemsRef = useRef<{
    realFeedbackItems: any
    length: number
    itemsIds: string
  }>({
    realFeedbackItems: [],
    length: 0,
    itemsIds: '',
  })
  useEffect(() => {
    const prev = prevRealFeedbackItemsRef.current
    const prevIds = prev.itemsIds
    const currentIds = realFeedbackItems?.map((item: any) => item.id).join(',') ?? ''
    const idsChanged = prevIds !== currentIds

    if (prev.realFeedbackItems !== realFeedbackItems) {
      const sameContentButNewRef = !idsChanged && prev.length === (realFeedbackItems?.length ?? 0)

      log.debug('useVideoAnalysisOrchestrator', '🔍 realFeedbackItems reference changed', {
        length: prev.length,
        newLength: realFeedbackItems?.length ?? 0,
        sameLength: prev.length === (realFeedbackItems?.length ?? 0),
        prevIds: prevIds || '(none)',
        currentIds: currentIds || '(none)',
        idsChanged,
        sameContentButNewRef,
        // If same content, feedbackItems useMemo won't recalculate (correct behavior)
        feedbackItemsWillRecalculate:
          idsChanged || prev.length !== (realFeedbackItems?.length ?? 0),
        stackTrace: sameContentButNewRef
          ? new Error().stack?.split('\n').slice(1, 8).join('\n')
          : undefined,
      })

      if (sameContentButNewRef) {
        log.debug(
          'useVideoAnalysisOrchestrator',
          '✅ Stabilization: realFeedbackItems ref changed but content same - feedbackItems useMemo will NOT recalculate (using cached array)',
          {
            itemsIds: currentIds || '(none)',
            length: realFeedbackItems?.length ?? 0,
          }
        )
      }

      prevRealFeedbackItemsRef.current = {
        realFeedbackItems,
        length: realFeedbackItems?.length ?? 0,
        itemsIds: currentIds,
      }
    }
  }, [realFeedbackItems])

  // TEMP: Add 5 dummy feedback items for testing
  // Move outside component to prevent recreation on every render
  const DUMMY_FEEDBACK: FeedbackPanelItem[] = [
    {
      id: 'dummy-1',
      timestamp: 5000,
      text: 'Your backswing is looking great! Keep that smooth tempo.',
      type: 'positive',
      category: 'movement',
      confidence: 0.92,
      ssmlStatus: 'completed',
      audioStatus: 'completed',
    },
    {
      id: 'dummy-2',
      timestamp: 10000,
      text: 'Try to keep your head down through impact for better contact.',
      type: 'suggestion',
      category: 'posture',
      confidence: 0.85,
      ssmlStatus: 'completed',
      audioStatus: 'completed',
    },
    {
      id: 'dummy-3',
      timestamp: 15000,
      text: 'Excellent follow-through! Your weight transfer is on point.',
      type: 'positive',
      category: 'movement',
      confidence: 0.88,
      ssmlStatus: 'completed',
      audioStatus: 'completed',
    },
    {
      id: 'dummy-4',
      timestamp: 20000,
      text: 'Your grip pressure seems too tight. Try relaxing your hands slightly.',
      type: 'correction',
      category: 'grip',
      confidence: 0.79,
      ssmlStatus: 'completed',
      audioStatus: 'completed',
    },
    {
      id: 'dummy-5',
      timestamp: 25000,
      text: 'Nice rhythm! Keep that consistent pace throughout your swing.',
      type: 'positive',
      category: 'movement',
      confidence: 0.91,
      ssmlStatus: 'completed',
      audioStatus: 'completed',
    },
  ]

  // Memoize feedbackItems to prevent recreation on every render
  // This is critical because it's used in contextValue, which breaks memoization downstream
  // Stabilize by comparing content (IDs) instead of reference - prevents unnecessary recreations
  const feedbackItemsIds = realFeedbackItems.map((item) => item.id).join(',')
  const prevFeedbackItemsIdsRef = useRef<string>('')
  const prevFeedbackItemsRef = useRef<FeedbackPanelItem[]>([])
  const prevRealFeedbackItemsLengthRef = useRef<number>(0)

  const feedbackItems = useMemo(
    () => {
      // Only recreate if IDs actually changed (content changed), not just reference
      const prevIds = prevFeedbackItemsIdsRef.current
      const prevLength = prevRealFeedbackItemsLengthRef.current
      const prevRef = prevFeedbackItemsRef.current
      const realRefChanged =
        prevRealFeedbackItemsRef.current?.realFeedbackItems !== realFeedbackItems

      if (prevIds === feedbackItemsIds && prevLength === realFeedbackItems.length) {
        // Content is the same, return previous array to maintain stable reference
        if (realRefChanged) {
          log.debug(
            'useVideoAnalysisOrchestrator',
            '✅ feedbackItems: same content, returning cached array (realFeedbackItems ref changed but IDs unchanged)',
            {
              itemsIds: feedbackItemsIds || '(none)',
              length: realFeedbackItems.length,
              prevRealRef: prevRealFeedbackItemsRef.current?.realFeedbackItems ? 'exists' : 'null',
              currentRealRef: realFeedbackItems ? 'exists' : 'null',
              usingCachedArray: true,
            }
          )
        }
        return prevRef
      }

      // Content changed, create new array
      const newFeedbackItems = [...realFeedbackItems, ...DUMMY_FEEDBACK]

      log.debug(
        'useVideoAnalysisOrchestrator',
        '🔄 feedbackItems: content changed, creating new array',
        {
          prevItemsIds: prevIds || '(none)',
          newItemsIds: feedbackItemsIds || '(none)',
          prevLength,
          newLength: realFeedbackItems.length,
          totalLength: newFeedbackItems.length,
          idsChanged: prevIds !== feedbackItemsIds,
          lengthChanged: prevLength !== realFeedbackItems.length,
          realRefChanged,
        }
      )

      prevFeedbackItemsIdsRef.current = feedbackItemsIds
      prevRealFeedbackItemsLengthRef.current = realFeedbackItems.length
      prevFeedbackItemsRef.current = newFeedbackItems

      return newFeedbackItems
    },
    [feedbackItemsIds, realFeedbackItems.length] // Only depend on IDs string and length, not array reference
  )

  const feedbackAudio = useFeedbackAudioSource(feedbackItems)
  const audioController = useAudioController(feedbackAudio.activeAudio?.url ?? null)

  // Stabilize audioController immediately to prevent useFeedbackCoordinator from re-running
  // when audioController reference changes but signature is unchanged
  const audioControllerSignature = `${audioController.isPlaying}:${audioController.seekTime ?? 'null'}`
  const prevAudioControllerForCoordinatorRef = useRef(audioController)
  const prevAudioControllerSignatureForCoordinatorRef = useRef(audioControllerSignature)

  const stableAudioControllerForCoordinator = useMemo(() => {
    const currentSignature = audioControllerSignature
    const prevSignature = prevAudioControllerSignatureForCoordinatorRef.current

    if (prevSignature !== currentSignature) {
      prevAudioControllerSignatureForCoordinatorRef.current = currentSignature
      prevAudioControllerForCoordinatorRef.current = audioController
      return audioController
    }

    // Signature unchanged - return cached object
    if (prevAudioControllerForCoordinatorRef.current !== audioController) {
      return prevAudioControllerForCoordinatorRef.current
    }

    return audioController
  }, [audioControllerSignature, audioController])

  const coordinateFeedback = useFeedbackCoordinator({
    feedbackItems,
    feedbackAudio,
    audioController: stableAudioControllerForCoordinator,
    videoPlayback,
  })
  const feedbackPanel = useFeedbackPanel({
    highlightedFeedbackId: coordinateFeedback.highlightedFeedbackId,
  })

  // Extract isAudioActive as primitive before stabilizing audioController
  const isAudioActiveValue = audioController.isPlaying

  // Call hook with primitive values
  const videoAudioSyncRaw = useVideoAudioSync({
    isVideoPlaying: isPlaying,
    isAudioActive: isAudioActiveValue,
  })

  // Stabilize videoAudioSync - only recreate when primitive values actually change
  const prevVideoAudioSyncRef = useRef(videoAudioSyncRaw)
  const prevIsPlayingRef = useRef(isPlaying)
  const prevIsAudioActiveRef = useRef(isAudioActiveValue)

  const videoAudioSync = useMemo(() => {
    const valuesChanged =
      prevIsPlayingRef.current !== isPlaying || prevIsAudioActiveRef.current !== isAudioActiveValue

    if (valuesChanged) {
      prevIsPlayingRef.current = isPlaying
      prevIsAudioActiveRef.current = isAudioActiveValue
      prevVideoAudioSyncRef.current = videoAudioSyncRaw
      return videoAudioSyncRaw
    }

    // Values unchanged - return cached object to prevent unnecessary recreations
    return prevVideoAudioSyncRef.current
  }, [isPlaying, isAudioActiveValue]) // Only depend on primitives, not videoAudioSyncRaw

  const videoControlsRef = useRef<VideoControlsRef>(null)

  // Performance tracking state (Task 33 Module 5)
  const performanceMetrics = useRef({
    mountTime: Date.now(),
    edgeWarmingSuccess: false,
    edgeWarmingDuration: 0,
  })

  const currentTimeRef = useRef(0)
  const [videoReady, setVideoReady] = useState(() => {
    if (isHistoryMode && historicalAnalysis.data?.videoUri?.startsWith('file://')) {
      return true
    }
    if (videoUri?.startsWith('file://')) {
      return true
    }
    return false
  })

  // Animation controller (native only - but called unconditionally to avoid Rules of Hooks violation)
  const animation = useAnimationController()

  // Gesture controller (native only - but called unconditionally to avoid Rules of Hooks violation)
  const gesture = useGestureController(
    animation.scrollY,
    animation.feedbackContentOffsetY,
    animation.scrollRef
  )

  const resolvedVideoUri = useMemo(() => {
    if (videoUri) {
      return videoUri
    }

    if (isHistoryMode && historicalAnalysis.data?.videoUri) {
      return historicalAnalysis.data.videoUri
    }

    return FALLBACK_VIDEO_URI
  }, [videoUri, isHistoryMode, historicalAnalysis.data?.videoUri])

  // Resolve thumbnail poster URL from analysis state (Task 33 Module 3)
  const posterUri = useMemo(() => {
    // Prefer thumbnailUrl from analysis state (cloud CDN URL)
    if (analysisState.thumbnailUrl) {
      return analysisState.thumbnailUrl
    }

    // Fallback to thumbnail from historical data (backward compatibility)
    if (isHistoryMode && historicalAnalysis.data?.thumbnail) {
      return historicalAnalysis.data.thumbnail
    }

    return undefined
  }, [analysisState.thumbnailUrl, isHistoryMode, historicalAnalysis.data?.thumbnail])

  useEffect(() => {
    if (resolvedVideoUri.startsWith('file://')) {
      setVideoReady(true)
    } else {
      setVideoReady(false)
    }
  }, [resolvedVideoUri])

  // Warm CDN edge cache when video URL is available (non-blocking)
  useEffect(() => {
    if (
      resolvedVideoUri &&
      !resolvedVideoUri.startsWith('file://') &&
      resolvedVideoUri !== FALLBACK_VIDEO_URI
    ) {
      void warmEdgeCache(resolvedVideoUri).then((result) => {
        performanceMetrics.current.edgeWarmingSuccess = result.success
        performanceMetrics.current.edgeWarmingDuration = result.duration
      })
    }
  }, [resolvedVideoUri])

  useEffect(() => {
    if (isProcessing && !resolvedVideoUri.startsWith('file://')) {
      setVideoReady(false)
    }
  }, [isProcessing, resolvedVideoUri])

  const uploadError = analysisState.error?.phase === 'upload' ? analysisState.error?.message : null

  useAutoPlayOnReady(isProcessing || !videoReady, isPlaying, playVideo)

  // Store coordinator callbacks in refs to prevent handler recreation when coordinator object changes
  // coordinator object may recreate, but callbacks are stable function references
  const coordinatorOnPauseRef = useRef(coordinateFeedback.onPause)
  const coordinatorOnProgressTriggerRef = useRef(coordinateFeedback.onProgressTrigger)
  const coordinatorOnPanelCollapseRef = useRef(coordinateFeedback.onPanelCollapse)
  const coordinatorOnPlayRef = useRef(coordinateFeedback.onPlay)
  const coordinatorOnUserTapFeedbackRef = useRef(coordinateFeedback.onUserTapFeedback)
  const coordinatorOnPlayPendingFeedbackRef = useRef(coordinateFeedback.onPlayPendingFeedback)

  useEffect(() => {
    coordinatorOnPauseRef.current = coordinateFeedback.onPause
    coordinatorOnProgressTriggerRef.current = coordinateFeedback.onProgressTrigger
    coordinatorOnPanelCollapseRef.current = coordinateFeedback.onPanelCollapse
    coordinatorOnPlayRef.current = coordinateFeedback.onPlay
    coordinatorOnUserTapFeedbackRef.current = coordinateFeedback.onUserTapFeedback
    coordinatorOnPlayPendingFeedbackRef.current = coordinateFeedback.onPlayPendingFeedback
  }, [
    coordinateFeedback.onPause,
    coordinateFeedback.onProgressTrigger,
    coordinateFeedback.onPanelCollapse,
    coordinateFeedback.onPlay,
    coordinateFeedback.onUserTapFeedback,
    coordinateFeedback.onPlayPendingFeedback,
  ])

  const handleSignificantProgress = useCallback(
    (time: number) => {
      currentTimeRef.current = time
      coordinatorOnProgressTriggerRef.current(time)
    },
    [] // No dependencies - uses refs
  )

  // Store posterUri and videoReady in refs for logging-only handlers
  // These values don't affect functionality, only logging, so we can use refs
  const posterUriRef = useRef(posterUri)
  const videoReadyRef = useRef(videoReady)

  useEffect(() => {
    posterUriRef.current = posterUri
    videoReadyRef.current = videoReady
  }, [posterUri, videoReady])

  // Store videoPlayback callbacks in refs to prevent handler recreation when they change
  // handleEnd and handleSeekComplete depend on currentTime/duration which change frequently
  const handleVideoEndRef = useRef(handleVideoEnd)
  const resolveSeekRef = useRef(resolveSeek)
  const registerDurationRef = useRef(registerDuration)
  const seekVideoRef = useRef(seekVideo)
  const replayVideoRef = useRef(replayVideo)

  useEffect(() => {
    handleVideoEndRef.current = handleVideoEnd
    resolveSeekRef.current = resolveSeek
    registerDurationRef.current = registerDuration
    seekVideoRef.current = seekVideo
    replayVideoRef.current = replayVideo
  }, [handleVideoEnd, resolveSeek, registerDuration, seekVideo, replayVideo])

  const handleVideoLoad = useCallback(
    (data: { duration: number }) => {
      const videoReadyTime = Date.now() - performanceMetrics.current.mountTime
      log.info('VideoAnalysisScreen.videoReady', 'Video ready for playback', {
        videoReadyTime,
        edgeWarmingSuccess: performanceMetrics.current.edgeWarmingSuccess,
        warmingDuration: performanceMetrics.current.edgeWarmingDuration,
        posterDisplayed: !!posterUriRef.current,
      })
      registerDurationRef.current(data)
      setVideoReady(true)
    },
    [] // No dependencies - uses refs
  )

  const handleSeek = useCallback(
    (time: number) => {
      seekVideoRef.current(time)
      coordinatorOnPanelCollapseRef.current()
    },
    [] // No dependencies - uses refs
  )

  const handleSeekComplete = useCallback(
    (time: number | null) => {
      resolveSeekRef.current(time)
      if (time !== null) {
        currentTimeRef.current = time
        coordinatorOnProgressTriggerRef.current(time)
      }
    },
    [] // No dependencies - uses refs
  )

  // Store setControlsVisible in ref to prevent handleControlsVisibilityChange from recreating
  // when videoControls object changes (which happens when showControls changes)
  const setControlsVisibleRef = useRef(videoControls.setControlsVisible)
  useEffect(() => {
    setControlsVisibleRef.current = videoControls.setControlsVisible
  }, [videoControls.setControlsVisible])

  const handleControlsVisibilityChange = useCallback(
    (visible: boolean, isUserInteraction = false) => {
      // Defer non-critical state updates during animations to reduce jank
      startTransition(() => {
        setControlsVisibleRef.current(visible)
        onControlsVisibilityChange?.(visible, isUserInteraction)
      })
    },
    [onControlsVisibilityChange, startTransition]
  )

  const handlePlay = useCallback(() => {
    const playbackStartTime = Date.now() - performanceMetrics.current.mountTime
    log.info('VideoAnalysisScreen.playbackStart', 'Playback initiated by user', {
      playbackStartTime,
      videoReadyTime: videoReadyRef.current ? 'ready' : 'not ready',
      edgeWarmingSuccess: performanceMetrics.current.edgeWarmingSuccess,
    })
    coordinatorOnPlayRef.current()
  }, []) // No dependencies - uses refs for coordinator and videoReady

  const handleFeedbackItemPress = useCallback(
    (item: FeedbackPanelItem) => {
      coordinatorOnUserTapFeedbackRef.current(item)
    },
    [] // No dependencies - uses refs
  )

  // Store feedbackPanel.collapse in ref to prevent handleCollapsePanel from recreating
  // when feedbackPanel object changes
  const feedbackPanelCollapseRef = useRef(feedbackPanel.collapse)
  useEffect(() => {
    feedbackPanelCollapseRef.current = feedbackPanel.collapse
  }, [feedbackPanel.collapse])

  const handleCollapsePanel = useCallback(() => {
    feedbackPanelCollapseRef.current()
    coordinatorOnPanelCollapseRef.current()
  }, []) // No dependencies - uses refs

  const shouldShowUploadError = Boolean(uploadError)

  // Store isPullingToReveal in ref to prevent reads from triggering re-renders
  // Updates happen in gesture hook, we just provide stable reference for consumers
  const isPullingToRevealRef = useRef(false)
  isPullingToRevealRef.current = gesture?.isPullingToRevealJS ?? false

  const contextValue: VideoAnalysisContextValue = useMemo(
    () => ({
      videoUri: resolvedVideoUri,
      feedbackItems,
      get isPullingToReveal() {
        return isPullingToRevealRef.current
      },
    }),
    [resolvedVideoUri, feedbackItems]
  )

  const handleShare = useCallback(() => log.info('VideoAnalysisScreen', 'Share button pressed'), [])
  const handleLike = useCallback(() => log.info('VideoAnalysisScreen', 'Like button pressed'), [])
  const handleComment = useCallback(
    () => log.info('VideoAnalysisScreen', 'Comment button pressed'),
    []
  )
  const handleBookmark = useCallback(
    () => log.info('VideoAnalysisScreen', 'Bookmark button pressed'),
    []
  )

  const handleSelectAudio = useCallback(
    (feedbackId: string) => {
      coordinatorOnPlayPendingFeedbackRef.current(feedbackId)
    },
    [] // No dependencies - uses refs
  )

  // Use refs for gesture scroll callbacks to prevent handler recreation when gesture object changes
  // gesture object recreates when feedbackScrollEnabled changes, but the callbacks themselves are stable
  const feedbackScrollYRef = useRef(gesture.onFeedbackScrollY)
  const feedbackMomentumScrollEndRef = useRef(gesture.onFeedbackMomentumScrollEnd)
  useEffect(() => {
    feedbackScrollYRef.current = gesture.onFeedbackScrollY
    feedbackMomentumScrollEndRef.current = gesture.onFeedbackMomentumScrollEnd
  }, [gesture.onFeedbackScrollY, gesture.onFeedbackMomentumScrollEnd])

  const handleFeedbackScrollY = useCallback((scrollY: number) => {
    feedbackScrollYRef.current(scrollY)
  }, [])

  const handleFeedbackMomentumScrollEnd = useCallback(() => {
    feedbackMomentumScrollEndRef.current()
  }, [])

  const handlePause = useCallback(() => {
    coordinatorOnPauseRef.current()
  }, [])

  const handleReplay = useCallback(() => {
    replayVideoRef.current()
  }, [])

  const handleEnd = useCallback(() => {
    handleVideoEndRef.current()
  }, [])

  const handleRetry = useCallback(() => {
    log.info('VideoAnalysisScreen', 'Retry button pressed')
  }, [])

  // Store onBack from props in ref to prevent handler recreation when it changes
  // onBack comes from parent (route) and may change identity, but it's just a navigation callback
  const onBackRef = useRef(onBack)
  useEffect(() => {
    onBackRef.current = onBack
  }, [onBack])

  const handleBack = useCallback(() => {
    onBackRef.current?.()
  }, [])

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Memoize nested sub-objects to stabilize return value and prevent re-renders
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  // Video state - memoize to prevent re-renders when only currentTime changes
  // currentTime updates every frame but VideoAnalysisLayout doesn't use it from video object
  // So we exclude it from dependencies to prevent unnecessary object recreation
  const videoStateRef = useRef<{
    uri: string
    posterUri?: string
    isReady: boolean
    isProcessing: boolean
    currentTime: number
    duration: number
    ended: boolean
  }>({
    uri: '',
    posterUri: undefined,
    isReady: false,
    isProcessing: false,
    currentTime: 0,
    duration: 0,
    ended: false,
  })

  const videoState = useMemo(
    () => {
      const prev = videoStateRef.current
      const needsUpdate =
        prev.uri !== resolvedVideoUri ||
        prev.posterUri !== posterUri ||
        prev.isReady !== videoReady ||
        prev.isProcessing !== isProcessing ||
        prev.duration !== 0 ||
        prev.ended !== videoEnded

      if (needsUpdate) {
        // Create new object only when non-currentTime values change
        videoStateRef.current = {
          uri: resolvedVideoUri,
          posterUri,
          isReady: videoReady,
          isProcessing,
          currentTime: currentTimeRef.current, // Use latest from ref
          duration: 0,
          ended: videoEnded,
        }
        return { ...videoStateRef.current }
      }

      // Non-currentTime values unchanged - return same object reference
      // Update currentTime in returned object to latest value from ref
      videoStateRef.current.currentTime = currentTimeRef.current
      return videoStateRef.current
    },
    // Exclude currentTime from dependencies - only recreate when other values change
    [resolvedVideoUri, posterUri, videoReady, isProcessing, videoEnded]
  )

  // Playback control - stabilize callbacks via refs to prevent object recreation
  // Callbacks from useVideoPlayback are stable (useCallback with empty deps), so store in refs
  const playbackCallbacksRef = useRef({
    play: playVideo,
    pause: pauseVideo,
    replay: replayVideo,
    seek: seekVideo,
  })

  useEffect(() => {
    playbackCallbacksRef.current.play = playVideo
    playbackCallbacksRef.current.pause = handlePause
    playbackCallbacksRef.current.replay = replayVideo
    playbackCallbacksRef.current.seek = seekVideo
  }, [playVideo, handlePause, replayVideo, seekVideo])

  const playbackState = useMemo(
    () => ({
      isPlaying,
      videoEnded,
      pendingSeek,
      shouldPlayVideo: videoAudioSync.shouldPlayVideo,
      play: playbackCallbacksRef.current.play,
      pause: playbackCallbacksRef.current.pause,
      replay: playbackCallbacksRef.current.replay,
      seek: playbackCallbacksRef.current.seek,
    }),
    [
      // Only depend on state values, not callbacks (callbacks are stable via refs)
      isPlaying,
      videoEnded,
      pendingSeek,
      videoAudioSync.shouldPlayVideo,
    ]
  )

  // Stabilize audioController - only recreate when isPlaying or seekTime changes
  // currentTime and duration change frequently but don't need to trigger recreations
  // Reuse audioControllerSignature from earlier stabilization
  const prevAudioControllerRef = useRef(audioController)
  const prevAudioControllerSignatureRef = useRef<string>('')

  const stableAudioController = useMemo(() => {
    const currentSignature = audioControllerSignature
    const prevSignature = prevAudioControllerSignatureRef.current
    const signatureChanged = prevSignature !== currentSignature

    // Signature changed or first render - return current value and update refs
    if (signatureChanged) {
      if (prevSignature) {
        log.debug(
          'useVideoAnalysisOrchestrator',
          '🔄 audioController: signature changed, creating new object',
          {
            prevSignature: prevSignature || '(none)',
            newSignature: currentSignature,
            isPlaying: audioController.isPlaying,
            seekTime: audioController.seekTime,
          }
        )
      }
      // Update refs BEFORE returning so next render sees the updated values
      prevAudioControllerSignatureRef.current = currentSignature
      prevAudioControllerRef.current = audioController
      return audioController
    }

    // Signature unchanged but reference changed - return previous object for stability
    if (prevAudioControllerRef.current !== audioController) {
      log.debug(
        'useVideoAnalysisOrchestrator',
        '✅ Stabilizing audioController: signature unchanged, returning cached object',
        {
          signature: currentSignature,
          isPlaying: audioController.isPlaying,
          seekTime: audioController.seekTime,
          prevRef: prevAudioControllerRef.current ? 'exists' : 'null',
          currentRef: audioController ? 'exists' : 'null',
        }
      )
      return prevAudioControllerRef.current
    }

    return audioController
  }, [audioControllerSignature]) // Only depend on signature - audioController is accessed via closure

  // Audio control - memoize to prevent re-renders from hook object references
  const prevAudioStateDepsRef = useRef({
    stableAudioController,
    feedbackAudio,
    videoAudioSync,
  })

  const audioState = useMemo(() => {
    prevAudioStateDepsRef.current = {
      stableAudioController,
      feedbackAudio,
      videoAudioSync,
    }

    return {
      controller: stableAudioController,
      source: feedbackAudio,
      sync: videoAudioSync,
    }
  }, [stableAudioController, feedbackAudio, videoAudioSync])

  // Extract primitive values from coordinator to prevent unnecessary recalculations
  // Coordinator object reference changes even when values are the same
  const coordinatorHighlightedId = coordinateFeedback.highlightedFeedbackId
  const coordinatorCoachSpeaking = coordinateFeedback.isCoachSpeaking
  const coordinatorBubbleIndex = coordinateFeedback.bubbleState.currentBubbleIndex
  const coordinatorBubbleVisible = coordinateFeedback.bubbleState.bubbleVisible
  const coordinatorOverlayVisible = coordinateFeedback.overlayVisible
  const coordinatorActiveAudioId = coordinateFeedback.activeAudio?.id ?? null
  const coordinatorActiveAudioUrl = coordinateFeedback.activeAudio?.url ?? null

  // Store coordinator callbacks in ref to maintain stable object identity
  // These callbacks are already stable via refs in coordinator hook
  const coordinatorCallbacksRef = useRef({
    onProgressTrigger: coordinateFeedback.onProgressTrigger,
    onUserTapFeedback: coordinateFeedback.onUserTapFeedback,
    onPlay: coordinateFeedback.onPlay,
    onPause: coordinateFeedback.onPause,
    onPanelCollapse: coordinateFeedback.onPanelCollapse,
    onAudioOverlayClose: coordinateFeedback.onAudioOverlayClose,
    onAudioOverlayInactivity: coordinateFeedback.onAudioOverlayInactivity,
    onAudioOverlayInteraction: coordinateFeedback.onAudioOverlayInteraction,
    onPlayPendingFeedback: coordinateFeedback.onPlayPendingFeedback,
  })

  // Update ref properties (not the ref itself) to maintain stable object identity
  coordinatorCallbacksRef.current.onProgressTrigger = coordinateFeedback.onProgressTrigger
  coordinatorCallbacksRef.current.onUserTapFeedback = coordinateFeedback.onUserTapFeedback
  coordinatorCallbacksRef.current.onPlay = coordinateFeedback.onPlay
  coordinatorCallbacksRef.current.onPause = coordinateFeedback.onPause
  coordinatorCallbacksRef.current.onPanelCollapse = coordinateFeedback.onPanelCollapse
  coordinatorCallbacksRef.current.onAudioOverlayClose = coordinateFeedback.onAudioOverlayClose
  coordinatorCallbacksRef.current.onAudioOverlayInactivity =
    coordinateFeedback.onAudioOverlayInactivity
  coordinatorCallbacksRef.current.onAudioOverlayInteraction =
    coordinateFeedback.onAudioOverlayInteraction
  coordinatorCallbacksRef.current.onPlayPendingFeedback = coordinateFeedback.onPlayPendingFeedback

  // Track previous primitive values to detect when stableCoordinator should recalculate
  const prevStableCoordinatorDepsRef = useRef<{
    highlightedId: string | null
    coachSpeaking: boolean
    bubbleIndex: number | null
    bubbleVisible: boolean
    overlayVisible: boolean
    activeAudioId: string | null
    activeAudioUrl: string | null
  }>({
    highlightedId: null,
    coachSpeaking: false,
    bubbleIndex: null,
    bubbleVisible: false,
    overlayVisible: false,
    activeAudioId: null,
    activeAudioUrl: null,
  })

  // Reconstruct coordinator object with stable callbacks
  const stableCoordinator = useMemo(() => {
    const prev = prevStableCoordinatorDepsRef.current
    const stableCoordinatorDepsChanged: string[] = []

    if (prev.highlightedId !== coordinatorHighlightedId) {
      stableCoordinatorDepsChanged.push(
        `highlightedId: ${prev.highlightedId} → ${coordinatorHighlightedId}`
      )
    }
    if (prev.coachSpeaking !== coordinatorCoachSpeaking) {
      stableCoordinatorDepsChanged.push(
        `coachSpeaking: ${prev.coachSpeaking} → ${coordinatorCoachSpeaking}`
      )
    }
    if (prev.bubbleIndex !== coordinatorBubbleIndex) {
      stableCoordinatorDepsChanged.push(
        `bubbleIndex: ${prev.bubbleIndex} → ${coordinatorBubbleIndex}`
      )
    }
    if (prev.bubbleVisible !== coordinatorBubbleVisible) {
      stableCoordinatorDepsChanged.push(
        `bubbleVisible: ${prev.bubbleVisible} → ${coordinatorBubbleVisible}`
      )
    }
    if (prev.overlayVisible !== coordinatorOverlayVisible) {
      stableCoordinatorDepsChanged.push(
        `overlayVisible: ${prev.overlayVisible} → ${coordinatorOverlayVisible}`
      )
    }
    if (prev.activeAudioId !== coordinatorActiveAudioId) {
      stableCoordinatorDepsChanged.push(
        `activeAudioId: ${prev.activeAudioId} → ${coordinatorActiveAudioId}`
      )
    }
    if (prev.activeAudioUrl !== coordinatorActiveAudioUrl) {
      stableCoordinatorDepsChanged.push(
        `activeAudioUrl: ${prev.activeAudioUrl !== null ? '...' : null} → ${coordinatorActiveAudioUrl !== null ? '...' : null}`
      )
    }

    if (stableCoordinatorDepsChanged.length > 0) {
      log.debug('useVideoAnalysisOrchestrator', '🔄 stableCoordinator recalculating', {
        dependencyChanges: stableCoordinatorDepsChanged,
      })
    }

    prevStableCoordinatorDepsRef.current = {
      highlightedId: coordinatorHighlightedId,
      coachSpeaking: coordinatorCoachSpeaking,
      bubbleIndex: coordinatorBubbleIndex,
      bubbleVisible: coordinatorBubbleVisible,
      overlayVisible: coordinatorOverlayVisible,
      activeAudioId: coordinatorActiveAudioId,
      activeAudioUrl: coordinatorActiveAudioUrl,
    }

    return {
      highlightedFeedbackId: coordinatorHighlightedId,
      isCoachSpeaking: coordinatorCoachSpeaking,
      bubbleState: {
        currentBubbleIndex: coordinatorBubbleIndex,
        bubbleVisible: coordinatorBubbleVisible,
      },
      overlayVisible: coordinatorOverlayVisible,
      activeAudio:
        coordinatorActiveAudioId && coordinatorActiveAudioUrl
          ? { id: coordinatorActiveAudioId, url: coordinatorActiveAudioUrl }
          : null,
      // Use callbacks from ref to maintain stable object identity
      onProgressTrigger: coordinatorCallbacksRef.current.onProgressTrigger,
      onUserTapFeedback: coordinatorCallbacksRef.current.onUserTapFeedback,
      onPlay: coordinatorCallbacksRef.current.onPlay,
      onPause: coordinatorCallbacksRef.current.onPause,
      onPanelCollapse: coordinatorCallbacksRef.current.onPanelCollapse,
      onAudioOverlayClose: coordinatorCallbacksRef.current.onAudioOverlayClose,
      onAudioOverlayInactivity: coordinatorCallbacksRef.current.onAudioOverlayInactivity,
      onAudioOverlayInteraction: coordinatorCallbacksRef.current.onAudioOverlayInteraction,
      onPlayPendingFeedback: coordinatorCallbacksRef.current.onPlayPendingFeedback,
    }
  }, [
    coordinatorHighlightedId,
    coordinatorCoachSpeaking,
    coordinatorBubbleIndex,
    coordinatorBubbleVisible,
    coordinatorOverlayVisible,
    coordinatorActiveAudioId,
    coordinatorActiveAudioUrl,
    // Omit callbacks from deps - they're stable via refs
  ])

  // GRANULAR FEEDBACK STATE - Split into separate memoized objects to prevent unnecessary re-renders
  // Each object only recalculates when its specific dependencies change

  // Feedback items state - only recalculates when items or selection changes
  // Use coordinatorHighlightedId (primitive) instead of stableCoordinator.highlightedFeedbackId (object property)
  // This prevents recalculation when stableCoordinator recreates but highlightedFeedbackId value hasn't changed
  const prevFeedbackItemsStateDepsRef = useRef<{
    feedbackItems: any
    coordinatorHighlightedId: string | null
  }>({
    feedbackItems: [],
    coordinatorHighlightedId: null,
  })
  const feedbackItemsState = useMemo(() => {
    const prev = prevFeedbackItemsStateDepsRef.current
    const changed: string[] = []

    if (prev.feedbackItems !== feedbackItems) {
      changed.push(
        `feedbackItems: ${prev.feedbackItems?.length ?? 0} → ${feedbackItems?.length ?? 0} (ref changed)`
      )
    }
    if (prev.coordinatorHighlightedId !== coordinatorHighlightedId) {
      changed.push(
        `coordinatorHighlightedId: ${prev.coordinatorHighlightedId} → ${coordinatorHighlightedId}`
      )
    }

    if (changed.length > 0) {
      log.debug('useVideoAnalysisOrchestrator', '🔄 feedbackItemsState recalculating', {
        dependencyChanges: changed,
        feedbackItemsLength: feedbackItems?.length ?? 0,
        coordinatorHighlightedId,
      })
    }

    prevFeedbackItemsStateDepsRef.current = {
      feedbackItems,
      coordinatorHighlightedId,
    }

    return {
      items: feedbackItems,
      selectedFeedbackId: coordinatorHighlightedId,
    }
  }, [feedbackItems, coordinatorHighlightedId])

  // Feedback panel state - only recalculates when panel fraction or tab changes
  const feedbackPanelState = useMemo(
    () => ({
      panelFraction: feedbackPanel.panelFraction,
      activeTab: feedbackPanel.activeTab,
    }),
    [feedbackPanel.panelFraction, feedbackPanel.activeTab]
  )

  // Feedback analysis state - only recalculates when phase, progress, or channel status changes
  const feedbackAnalysisState = useMemo(
    () => ({
      phase: analysisState.phase,
      progress: analysisState.progress,
      channelExhausted: analysisState.channelExhausted,
    }),
    [analysisState.phase, analysisState.progress, analysisState.channelExhausted]
  )

  // Feedback errors state - only recalculates when errors or audio URLs change
  // Track audioUrls keys to detect actual changes (not just reference changes)
  const prevFeedbackErrorsStateDepsRef = useRef<{
    errors: any
    audioUrls: any
    audioUrlsKeys: string[]
  }>({
    errors: {},
    audioUrls: {},
    audioUrlsKeys: [],
  })
  const feedbackErrorsState = useMemo(() => {
    const prev = prevFeedbackErrorsStateDepsRef.current
    const changed: string[] = []
    const currentAudioUrlsKeys = Object.keys(feedbackAudio.audioUrls)

    // Compare object references
    if (prev.errors !== feedbackAudio.errors) {
      changed.push(`errors: ref changed`)
    }
    if (prev.audioUrls !== feedbackAudio.audioUrls) {
      // Check if keys actually changed
      const keysChanged =
        currentAudioUrlsKeys.length !== prev.audioUrlsKeys.length ||
        !currentAudioUrlsKeys.every((key) => prev.audioUrlsKeys.includes(key))
      if (keysChanged) {
        const newKeys = currentAudioUrlsKeys.filter((k) => !prev.audioUrlsKeys.includes(k))
        const removedKeys = prev.audioUrlsKeys.filter((k) => !currentAudioUrlsKeys.includes(k))
        changed.push(
          `audioUrls: keys changed (added: ${newKeys.join(', ') || 'none'}, removed: ${removedKeys.join(', ') || 'none'})`
        )
      } else {
        changed.push(
          `audioUrls: ref changed (same keys: ${currentAudioUrlsKeys.join(', ') || 'none'})`
        )
      }
    }

    if (changed.length > 0) {
      log.debug('useVideoAnalysisOrchestrator', '🔄 feedbackErrorsState recalculating', {
        dependencyChanges: changed,
        audioUrlsKeys: currentAudioUrlsKeys,
        audioUrlsCount: currentAudioUrlsKeys.length,
      })
    }

    prevFeedbackErrorsStateDepsRef.current = {
      errors: feedbackAudio.errors,
      audioUrls: feedbackAudio.audioUrls,
      audioUrlsKeys: currentAudioUrlsKeys,
    }

    return {
      errors: feedbackAudio.errors,
      audioUrls: feedbackAudio.audioUrls,
    }
  }, [feedbackAudio.errors, feedbackAudio.audioUrls])

  // Legacy feedbackState for backward compatibility (includes coordinator and panel objects)
  // This is only used internally - components receive granular props
  const feedbackState = useMemo(
    () => ({
      items: feedbackItems,
      coordinator: stableCoordinator,
      panel: feedbackPanel,
      state: analysisState,
      panelFraction: feedbackPanel.panelFraction,
      activeTab: feedbackPanel.activeTab,
      selectedFeedbackId: stableCoordinator.highlightedFeedbackId,
      phase: analysisState.phase,
      progress: analysisState.progress,
      channelExhausted: analysisState.channelExhausted,
      errors: feedbackAudio.errors,
      audioUrls: feedbackAudio.audioUrls,
      // Granular state objects for components (prevents unnecessary re-renders)
      itemsState: feedbackItemsState,
      panelState: feedbackPanelState,
      analysisState: feedbackAnalysisState,
      errorsState: feedbackErrorsState,
    }),
    [
      feedbackItems,
      stableCoordinator,
      feedbackPanel,
      analysisState,
      feedbackAudio.errors,
      feedbackAudio.audioUrls,
      feedbackItemsState,
      feedbackPanelState,
      feedbackAnalysisState,
      feedbackErrorsState,
    ]
  )

  // Controls state - memoize to prevent re-renders
  // Only depend on showControls value, not the entire videoControls object
  const controlsState = useMemo(
    () => ({
      showControls: videoControls.showControls,
      videoControlsRef,
      onControlsVisibilityChange: handleControlsVisibilityChange,
    }),
    [videoControls.showControls, videoControlsRef, handleControlsVisibilityChange]
  )

  // Error state - memoize to prevent re-renders
  const errorState = useMemo(
    () => ({
      visible: shouldShowUploadError,
      message: uploadError,
    }),
    [shouldShowUploadError, uploadError]
  )

  // Aggregated handlers - use ref to hold object and prevent recreation
  // CRITICAL: Use stable wrapper callbacks (handlePause, handleReplay, handleEnd, handleBack) instead of direct hook callbacks or props
  // This prevents handler object recreation when hook callbacks or props recreate
  // useMemo() recreates the object on every orchestrator re-render even when deps are stable
  // This is because React re-evaluates useMemo when the component renders, creating new object identity
  const handlersRef = useRef({
    onPlay: handlePlay,
    onPause: handlePause,
    onReplay: handleReplay,
    onEnd: handleEnd,
    onSeek: handleSeek,
    onSeekComplete: handleSeekComplete,
    onVideoLoad: handleVideoLoad,
    onSignificantProgress: handleSignificantProgress,
    onFeedbackItemPress: handleFeedbackItemPress,
    onCollapsePanel: handleCollapsePanel,
    onBack: handleBack,
    onRetry: handleRetry,
    onShare: handleShare,
    onLike: handleLike,
    onComment: handleComment,
    onBookmark: handleBookmark,
    onSelectAudio: handleSelectAudio,
    onFeedbackScrollY: handleFeedbackScrollY,
    onFeedbackMomentumScrollEnd: handleFeedbackMomentumScrollEnd,
  })

  // Update the ref's properties (not the ref itself) to keep same object identity
  handlersRef.current.onPlay = handlePlay
  handlersRef.current.onPause = handlePause
  handlersRef.current.onReplay = handleReplay
  handlersRef.current.onEnd = handleEnd
  handlersRef.current.onSeek = handleSeek
  handlersRef.current.onSeekComplete = handleSeekComplete
  handlersRef.current.onVideoLoad = handleVideoLoad
  handlersRef.current.onSignificantProgress = handleSignificantProgress
  handlersRef.current.onFeedbackItemPress = handleFeedbackItemPress
  handlersRef.current.onCollapsePanel = handleCollapsePanel
  handlersRef.current.onBack = handleBack
  handlersRef.current.onRetry = handleRetry
  handlersRef.current.onShare = handleShare
  handlersRef.current.onLike = handleLike
  handlersRef.current.onComment = handleComment
  handlersRef.current.onBookmark = handleBookmark
  handlersRef.current.onSelectAudio = handleSelectAudio
  handlersRef.current.onFeedbackScrollY = handleFeedbackScrollY
  handlersRef.current.onFeedbackMomentumScrollEnd = handleFeedbackMomentumScrollEnd

  const handlers = handlersRef.current

  // Refs - memoize to prevent re-renders
  const refs = useMemo(
    () => ({
      videoControlsRef,
      rootPanRef: gesture.rootPanRef,
    }),
    [videoControlsRef, gesture.rootPanRef]
  )

  // Gesture state - memoize to prevent recreation when only rootPan changes
  // rootPan changes every render by design, but primitive values (feedbackScrollEnabled, etc.) are stable
  const gestureCallbacksRef = useRef({
    onFeedbackScrollY: gesture.onFeedbackScrollY,
    onFeedbackMomentumScrollEnd: gesture.onFeedbackMomentumScrollEnd,
  })

  useEffect(() => {
    gestureCallbacksRef.current.onFeedbackScrollY = gesture.onFeedbackScrollY
    gestureCallbacksRef.current.onFeedbackMomentumScrollEnd = gesture.onFeedbackMomentumScrollEnd
  }, [gesture.onFeedbackScrollY, gesture.onFeedbackMomentumScrollEnd])

  const gestureState = useMemo(
    () =>
      Platform.OS !== 'web'
        ? {
            rootPan: gesture.rootPan, // Always include latest (changes every render)
            rootPanRef: gesture.rootPanRef, // Ref is stable
            feedbackScrollEnabled: gesture.feedbackScrollEnabled,
            blockFeedbackScrollCompletely: gesture.blockFeedbackScrollCompletely,
            isPullingToRevealJS: gesture.isPullingToRevealJS,
            onFeedbackScrollY: gestureCallbacksRef.current.onFeedbackScrollY,
            onFeedbackMomentumScrollEnd: gestureCallbacksRef.current.onFeedbackMomentumScrollEnd,
          }
        : undefined,
    [
      // Only depend on primitive values that actually change
      // rootPan changes every render but we include it in the object
      gesture.rootPanRef,
      gesture.feedbackScrollEnabled,
      gesture.blockFeedbackScrollCompletely,
      gesture.isPullingToRevealJS,
      // Callbacks are stable via refs
    ]
  )

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Memoize the entire return value to prevent re-renders in consuming components
  // This is critical for performance-sensitive screens with animations
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const prevDepsRef = useRef({
    videoState,
    playbackState,
    audioState,
    feedbackState,
    gestureState,
    controlsState,
    errorState,
    handlers,
    contextValue,
    refs,
  })

  return useMemo(() => {
    prevDepsRef.current = {
      videoState,
      playbackState,
      audioState,
      feedbackState,
      gestureState,
      controlsState,
      errorState,
      handlers,
      contextValue,
      refs,
    }

    return {
      video: videoState,
      playback: playbackState,
      audio: audioState,
      feedback: feedbackState,
      // Gesture & Animation (native only) - memoized to prevent unnecessary recreations
      gesture: gestureState,
      animation: Platform.OS !== 'web' ? animation : undefined,
      controls: controlsState,
      error: errorState,
      handlers,
      contextValue,
      refs,
    }
  }, [
    videoState,
    playbackState,
    audioState,
    feedbackState,
    gestureState, // Now memoized separately
    // Omit animation - SharedValues change every render by design
    controlsState,
    errorState,
    handlers,
    contextValue,
    refs,
  ])
}
