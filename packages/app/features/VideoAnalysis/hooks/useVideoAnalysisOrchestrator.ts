import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
  onControlsVisibilityChange?: (visible: boolean) => void
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
  }
  gesture?: UseGestureControllerReturn
  animation?: UseAnimationControllerReturn
  controls: {
    showControls: boolean
    videoControlsRef: React.RefObject<VideoControlsRef | null>
    onControlsVisibilityChange: (visible: boolean) => void
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
  } = props

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

  const normalizedInitialStatus = initialStatus === 'ready' ? 'ready' : 'processing'
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

  const videoControls = useVideoControls(isProcessing, isPlaying, videoEnded)

  // Use unified feedback source for both modes
  const realFeedbackItems = analysisState.feedback.feedbackItems

  // TEMP: Add 5 dummy feedback items for testing
  const dummyFeedback: FeedbackPanelItem[] = [
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

  const feedbackItems = [...realFeedbackItems, ...dummyFeedback]

  const feedbackAudio = useFeedbackAudioSource(feedbackItems)
  const audioController = useAudioController(feedbackAudio.activeAudio?.url ?? null)
  const coordinateFeedback = useFeedbackCoordinator({
    feedbackItems,
    feedbackAudio,
    audioController,
    videoPlayback,
  })
  const feedbackPanel = useFeedbackPanel({
    highlightedFeedbackId: coordinateFeedback.highlightedFeedbackId,
  })

  const videoAudioSync = useVideoAudioSync({
    isVideoPlaying: isPlaying,
    isAudioActive: audioController.isPlaying,
  })

  const videoControlsRef = useRef<VideoControlsRef>(null)

  // Performance tracking state (Task 33 Module 5)
  const performanceMetrics = useRef({
    mountTime: Date.now(),
    edgeWarmingSuccess: false,
    edgeWarmingDuration: 0,
  })

  const [currentTime, setCurrentTime] = useState(0)
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

  const handleSignificantProgress = useCallback(
    (time: number) => {
      setCurrentTime(time)
      coordinateFeedback.onProgressTrigger(time)
    },
    [coordinateFeedback]
  )

  const handleVideoLoad = useCallback(
    (data: { duration: number }) => {
      const videoReadyTime = Date.now() - performanceMetrics.current.mountTime
      log.info('VideoAnalysisScreen.videoReady', 'Video ready for playback', {
        videoReadyTime,
        edgeWarmingSuccess: performanceMetrics.current.edgeWarmingSuccess,
        warmingDuration: performanceMetrics.current.edgeWarmingDuration,
        posterDisplayed: !!posterUri,
      })
      registerDuration(data)
      setVideoReady(true)
    },
    [registerDuration, posterUri]
  )

  const handleSeek = useCallback(
    (time: number) => {
      seekVideo(time)
      coordinateFeedback.onPanelCollapse()
    },
    [coordinateFeedback, seekVideo]
  )

  const handleSeekComplete = useCallback(
    (time: number | null) => {
      resolveSeek(time)
      if (time !== null) {
        setCurrentTime(time)
        coordinateFeedback.onProgressTrigger(time)
      }
    },
    [coordinateFeedback, resolveSeek]
  )

  const handleControlsVisibilityChange = useCallback(
    (visible: boolean) => {
      videoControls.setControlsVisible(visible)
      onControlsVisibilityChange?.(visible)
    },
    [onControlsVisibilityChange, videoControls]
  )

  const handlePlay = useCallback(() => {
    const playbackStartTime = Date.now() - performanceMetrics.current.mountTime
    log.info('VideoAnalysisScreen.playbackStart', 'Playback initiated by user', {
      playbackStartTime,
      videoReadyTime: videoReady ? 'ready' : 'not ready',
      edgeWarmingSuccess: performanceMetrics.current.edgeWarmingSuccess,
    })
    coordinateFeedback.onPlay()
  }, [coordinateFeedback, videoReady])

  const handleFeedbackItemPress = useCallback(
    (item: FeedbackPanelItem) => {
      coordinateFeedback.onUserTapFeedback(item)
    },
    [coordinateFeedback]
  )

  const handleCollapsePanel = useCallback(() => {
    feedbackPanel.collapse()
    coordinateFeedback.onPanelCollapse()
  }, [coordinateFeedback, feedbackPanel])

  const shouldShowUploadError = Boolean(uploadError)

  const contextValue: VideoAnalysisContextValue = useMemo(
    () => ({
      videoUri: resolvedVideoUri,
      feedbackItems,
      isPullingToReveal: gesture?.isPullingToRevealJS ?? false,
    }),
    [resolvedVideoUri, feedbackItems, gesture?.isPullingToRevealJS]
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
      coordinateFeedback.onPlayPendingFeedback(feedbackId)
    },
    [coordinateFeedback]
  )

  // Use gesture controller callbacks for feedback scroll
  const handleFeedbackScrollY = gesture.onFeedbackScrollY
  const handleFeedbackMomentumScrollEnd = gesture.onFeedbackMomentumScrollEnd

  const handleRetry = useCallback(() => {
    log.info('VideoAnalysisScreen', 'Retry button pressed')
  }, [])

  // Organize return value into logical groups
  return {
    // Video state
    video: {
      uri: resolvedVideoUri,
      posterUri,
      isReady: videoReady,
      isProcessing,
      currentTime,
      duration: 0, // TODO: Extract from videoPlayback
      ended: videoEnded,
    },

    // Playback control
    playback: {
      isPlaying,
      videoEnded,
      pendingSeek,
      shouldPlayVideo: videoAudioSync.shouldPlayVideo,
      play: playVideo,
      pause: pauseVideo,
      replay: replayVideo,
      seek: seekVideo,
    },

    // Audio control
    audio: {
      controller: audioController,
      source: feedbackAudio,
      sync: videoAudioSync,
    },

    // Feedback state
    feedback: {
      items: feedbackItems,
      coordinator: coordinateFeedback,
      panel: feedbackPanel,
      state: analysisState,
      panelFraction: feedbackPanel.panelFraction,
      activeTab: feedbackPanel.activeTab,
      selectedFeedbackId: coordinateFeedback.highlightedFeedbackId,
      phase: analysisState.phase,
      progress: analysisState.progress,
      channelExhausted: analysisState.channelExhausted,
      errors: feedbackAudio.errors,
      audioUrls: feedbackAudio.audioUrls,
    },

    // Gesture & Animation (native only)
    gesture: Platform.OS !== 'web' ? gesture : undefined,
    animation: Platform.OS !== 'web' ? animation : undefined,

    // Display state
    controls: {
      showControls: videoControls.showControls,
      videoControlsRef,
      onControlsVisibilityChange: handleControlsVisibilityChange,
    },

    // Error state
    error: {
      visible: shouldShowUploadError,
      message: uploadError,
    },

    // Aggregated handlers
    handlers: {
      onPlay: handlePlay,
      onPause: coordinateFeedback.onPause,
      onReplay: replayVideo,
      onEnd: handleVideoEnd,
      onSeek: handleSeek,
      onSeekComplete: handleSeekComplete,
      onVideoLoad: handleVideoLoad,
      onSignificantProgress: handleSignificantProgress,
      onFeedbackItemPress: handleFeedbackItemPress,
      onCollapsePanel: handleCollapsePanel,
      onBack,
      onRetry: handleRetry,
      // Social actions
      onShare: handleShare,
      onLike: handleLike,
      onComment: handleComment,
      onBookmark: handleBookmark,
      onSelectAudio: handleSelectAudio,
      onFeedbackScrollY: handleFeedbackScrollY,
      onFeedbackMomentumScrollEnd: handleFeedbackMomentumScrollEnd,
    },

    // Context value
    contextValue,

    // Refs
    refs: {
      videoControlsRef,
      rootPanRef: gesture.rootPanRef,
    },
  }
}
