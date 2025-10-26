import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Platform } from 'react-native'

import { FALLBACK_VIDEO_URI } from '@app/mocks/feedback'
import { log } from '@my/logging'

import { VideoControlsRef } from '@ui/components/VideoAnalysis'

import { useStatusBar } from '@app/hooks/useStatusBar'
import { VideoAnalysisLayout } from './components/VideoAnalysisLayout.native'
import { useAnalysisState } from './hooks/useAnalysisState'
import { useAnimationController } from './hooks/useAnimationController'
import { useAudioController } from './hooks/useAudioController'
import { useAutoPlayOnReady } from './hooks/useAutoPlayOnReady'
import { useFeedbackAudioSource } from './hooks/useFeedbackAudioSource'
import { useFeedbackCoordinator } from './hooks/useFeedbackCoordinator'
import { useFeedbackPanel } from './hooks/useFeedbackPanel'
import { useGestureController } from './hooks/useGestureController'
import { useHistoricalAnalysis } from './hooks/useHistoricalAnalysis'
import { useVideoAudioSync } from './hooks/useVideoAudioSync'
import { useVideoControls } from './hooks/useVideoControls'
import { useVideoPlayback } from './hooks/useVideoPlayback'
import type { FeedbackPanelItem } from './types'

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

export interface VideoAnalysisScreenProps {
  analysisJobId?: number
  videoRecordingId?: number
  videoUri?: string
  initialStatus?: 'processing' | 'ready' | 'playing' | 'paused'
  onBack?: () => void
  onControlsVisibilityChange?: (visible: boolean) => void
}

export function VideoAnalysisScreen({
  analysisJobId,
  videoRecordingId,
  videoUri,
  initialStatus = 'processing',
  onBack,
  onControlsVisibilityChange,
}: VideoAnalysisScreenProps) {
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
    handleLoad: registerDuration,
    handleSeekComplete: resolveSeek,
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

  const contextValue = useMemo(
    () => ({
      videoUri: resolvedVideoUri,
      feedbackItems,
      isPullingToReveal: gesture.isPullingToRevealJS,
    }),
    [resolvedVideoUri, feedbackItems, gesture.isPullingToRevealJS]
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

  // Aggregate all props for layout component
  const layoutProps = {
    gesture: {
      rootPan: gesture.rootPan,
      feedbackScrollEnabled: gesture.feedbackScrollEnabled,
      blockFeedbackScrollCompletely: gesture.blockFeedbackScrollCompletely,
      isPullingToRevealJS: gesture.isPullingToRevealJS,
      onFeedbackScrollY: gesture.onFeedbackScrollY,
      onFeedbackMomentumScrollEnd: gesture.onFeedbackMomentumScrollEnd,
      rootPanRef: gesture.rootPanRef,
    },
    animation: {
      scrollY: animation.scrollY,
      headerHeight: animation.headerHeight,
      collapseProgress: animation.collapseProgress,
      headerStyle: animation.headerStyle,
      feedbackSectionStyle: animation.feedbackSectionStyle,
      pullIndicatorStyle: animation.pullIndicatorStyle,
      scrollRef: animation.scrollRef,
      feedbackContentOffsetY: animation.feedbackContentOffsetY,
    },
    video: {
      uri: resolvedVideoUri,
      posterUri,
      isReady: videoReady,
      isProcessing,
    },
    playback: {
      isPlaying,
      videoEnded,
      pendingSeek,
      shouldPlayVideo: videoAudioSync.shouldPlayVideo,
    },
    feedback: {
      items: feedbackItems,
      panelFraction: feedbackPanel.panelFraction,
      activeTab: feedbackPanel.activeTab,
      selectedFeedbackId: coordinateFeedback.highlightedFeedbackId,
      currentTime,
      phase: analysisState.phase,
      progress: analysisState.progress,
      channelExhausted: analysisState.channelExhausted,
      errors: feedbackAudio.errors,
      audioUrls: feedbackAudio.audioUrls,
    },
    handlers: {
      onPlay: handlePlay,
      onPause: pauseVideo,
      onSeek: handleSeek,
      onSeekComplete: handleSeekComplete,
      onVideoLoad: handleVideoLoad,
      onSignificantProgress: handleSignificantProgress,
      onFeedbackItemPress: handleFeedbackItemPress,
      onCollapsePanel: handleCollapsePanel,
      onRetry: () => onBack?.(),
      onShare: handleShare,
      onLike: handleLike,
      onComment: handleComment,
      onBookmark: handleBookmark,
      onSelectAudio: handleSelectAudio,
      onFeedbackScrollY: handleFeedbackScrollY,
      onFeedbackMomentumScrollEnd: handleFeedbackMomentumScrollEnd,
      onTabChange: feedbackPanel.setActiveTab,
      onExpand: feedbackPanel.expand,
      onRetryFeedback: analysisState.feedback.retryFailedFeedback,
      onDismissError: feedbackAudio.clearError,
    },
    videoControlsRef,
    controls: {
      showControls: videoControls.showControls,
      onControlsVisibilityChange: handleControlsVisibilityChange,
    },
    error: {
      visible: shouldShowUploadError,
      message: uploadError,
      onRetry: () => onBack?.(),
      onBack: onBack ?? (() => {}),
    },
    audioController,
    bubbleState: {
      visible: coordinateFeedback.bubbleState.bubbleVisible,
      currentIndex: coordinateFeedback.bubbleState.currentBubbleIndex,
      items: feedbackItems,
    },
    audioOverlay: {
      shouldShow: coordinateFeedback.overlayVisible,
      activeAudio: coordinateFeedback.activeAudio,
      onClose: coordinateFeedback.onAudioOverlayClose,
      onInactivity: coordinateFeedback.onAudioOverlayInactivity,
      onInteraction: coordinateFeedback.onAudioOverlayInteraction,
      audioDuration: audioController.duration,
    },
    coachSpeaking:
      Platform.OS !== 'web' ? coordinateFeedback.isCoachSpeaking : audioController.isPlaying,
    socialCounts:
      Platform.OS !== 'web'
        ? { likes: 1200, comments: 89, bookmarks: 234, shares: 1500 }
        : { likes: 0, comments: 0, bookmarks: 0, shares: 0 },
    contextValue,
  }

  // Platform-based layout selection
  return <VideoAnalysisLayout {...layoutProps} />
}
