import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { YStack } from 'tamagui'

import { FALLBACK_VIDEO_URI } from '@app/mocks/feedback'
import { log } from '@my/logging'

import { VideoControlsRef } from '@ui/components/VideoAnalysis'

import { FeedbackSection } from './components/FeedbackSection'
import { ProcessingIndicator } from './components/ProcessingIndicator'
import { UploadErrorState } from './components/UploadErrorState'
import { VideoPlayerSection } from './components/VideoPlayerSection'
import { VideoAnalysisProvider } from './contexts/VideoAnalysisContext'
import { useAnalysisState } from './hooks/useAnalysisState'
import type { AnalysisPhase } from './hooks/useAnalysisState'
import { useAudioController } from './hooks/useAudioController'
import { useAutoPlayOnReady } from './hooks/useAutoPlayOnReady'
import { useFeedbackAudioSource } from './hooks/useFeedbackAudioSource'
import { useFeedbackCoordinator } from './hooks/useFeedbackCoordinator'
import { useFeedbackPanel } from './hooks/useFeedbackPanel'
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
    replay: rerunVideo,
    seek: seekVideo,
    handleLoad: registerDuration,
    handleEnd: handleVideoComplete,
    handleSeekComplete: resolveSeek,
  } = videoPlayback

  // Determine effective processing state: wait for either historical load or analysis processing
  const isProcessing = historicalAnalysis.isLoading || analysisState.isProcessing

  const videoControls = useVideoControls(isProcessing, isPlaying, videoEnded)

  // Use unified feedback source for both modes
  const feedbackItems = analysisState.feedback.feedbackItems

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
      coordinateFeedback.onPlayPendingFeedback(feedbackId)
    },
    [coordinateFeedback]
  )

  return (
    <VideoAnalysisProvider value={contextValue}>
      <YStack flex={1}>
        <UploadErrorState
          visible={shouldShowUploadError}
          errorMessage={uploadError}
          onRetry={() => {
            onBack?.()
          }}
          onBack={onBack ?? (() => {})}
        />

        {!shouldShowUploadError && (
          <VideoPlayerSection
            videoControlsRef={videoControlsRef}
            pendingSeek={pendingSeek}
            userIsPlaying={isPlaying}
            videoShouldPlay={videoAudioSync.shouldPlayVideo}
            videoEnded={videoEnded}
            showControls={videoReady && videoControls.showControls}
            isProcessing={isProcessing}
            videoAreaScale={1 - feedbackPanel.panelFraction}
            posterUri={posterUri}
            onPlay={handlePlay}
            onPause={pauseVideo}
            onReplay={rerunVideo}
            onSeek={handleSeek}
            onSeekComplete={handleSeekComplete}
            onSignificantProgress={handleSignificantProgress}
            onLoad={handleVideoLoad}
            onEnd={handleVideoComplete}
            onTap={() => {}}
            onControlsVisibilityChange={handleControlsVisibilityChange}
            audioPlayerController={audioController}
            bubbleState={{
              visible: coordinateFeedback.bubbleState.bubbleVisible,
              currentIndex: coordinateFeedback.bubbleState.currentBubbleIndex,
              items: feedbackItems,
            }}
            audioOverlay={{
              shouldShow: coordinateFeedback.overlayVisible,
              activeAudio: coordinateFeedback.activeAudio,
              onClose: coordinateFeedback.onAudioOverlayClose,
              onInactivity: coordinateFeedback.onAudioOverlayInactivity,
              onInteraction: coordinateFeedback.onAudioOverlayInteraction,
              audioDuration: audioController.duration,
            }}
            coachSpeaking={coordinateFeedback.isCoachSpeaking}
            panelFraction={feedbackPanel.panelFraction}
            socialCounts={{
              likes: 1200,
              comments: 89,
              bookmarks: 234,
              shares: 1500,
            }}
            onSocialAction={{
              onShare: handleShare,
              onLike: handleLike,
              onComment: handleComment,
              onBookmark: handleBookmark,
            }}
          />
        )}

        <ProcessingIndicator
          phase={
            videoReady && analysisState.phase === 'generating-feedback'
              ? ('ready' as AnalysisPhase)
              : videoReady
                ? analysisState.phase
                : 'analyzing'
          }
          progress={analysisState.progress}
          channelExhausted={analysisState.channelExhausted}
        />

        <FeedbackSection
          panelFraction={feedbackPanel.panelFraction}
          activeTab={feedbackPanel.activeTab}
          feedbackItems={feedbackItems}
          selectedFeedbackId={coordinateFeedback.highlightedFeedbackId}
          currentVideoTime={currentTime}
          videoDuration={0}
          errors={feedbackAudio.errors}
          audioUrls={feedbackAudio.audioUrls}
          onTabChange={feedbackPanel.setActiveTab}
          onExpand={feedbackPanel.expand}
          onCollapse={handleCollapsePanel}
          onItemPress={handleFeedbackItemPress}
          onSeek={handleSeek}
          onRetryFeedback={analysisState.feedback.retryFailedFeedback}
          onDismissError={feedbackAudio.clearError}
          onSelectAudio={handleSelectAudio}
        />
      </YStack>
    </VideoAnalysisProvider>
  )
}
