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
  const analysisState = useAnalysisState(analysisJobId, videoRecordingId, normalizedInitialStatus)

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

  // Determine effective processing state (loading historical data OR real-time analysis)
  const isProcessing = isHistoryMode ? historicalAnalysis.isLoading : analysisState.isProcessing

  const videoControls = useVideoControls(isProcessing, isPlaying, videoEnded)

  // Use historical feedback items if in history mode, otherwise use real-time analysis
  const feedbackItems = useMemo(() => {
    if (isHistoryMode) {
      // In history mode, use feedback from the database via the feedback status store
      // The historicalAnalysis hook should have triggered subscription to analysis_feedback table
      return analysisState.feedback.feedbackItems
    }
    return analysisState.feedback.feedbackItems
  }, [isHistoryMode, analysisState.feedback.feedbackItems])

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

  const [currentTime, setCurrentTime] = useState(0)
  const [resolvedVideoUri, setResolvedVideoUri] = useState<string>(videoUri || FALLBACK_VIDEO_URI)

  // Resolve video URI: prop > historical data > fallback
  // Use effect for async signed URL generation
  useEffect(() => {
    const resolveUri = async () => {
      log.info('VideoAnalysisScreen', 'Resolving video URI', {
        isHistoryMode,
        hasVideoUriProp: !!videoUri,
        hasHistoricalData: !!historicalAnalysis.data,
        historicalVideoUri: historicalAnalysis.data?.videoUri,
        videoUriProp: videoUri,
      })

      if (videoUri) {
        log.info('VideoAnalysisScreen', 'Using video URI from prop', { videoUri })
        setResolvedVideoUri(videoUri)
        return
      }
      if (isHistoryMode && historicalAnalysis.data?.videoUri) {
        // Convert storage path to signed URL if it looks like a storage path
        const historicalUri = historicalAnalysis.data.videoUri
        if (
          historicalUri.startsWith('file://') ||
          historicalUri.startsWith('http://') ||
          historicalUri.startsWith('https://')
        ) {
          // Already a full URI
          log.info('VideoAnalysisScreen', 'Using video URI from historical data', {
            videoUri: historicalUri,
          })
          setResolvedVideoUri(historicalUri)
          return
        }
        // Storage path - convert to signed URL for secure access
        const { createSignedDownloadUrl } = await import('@my/api')
        const { data, error } = await createSignedDownloadUrl('raw', historicalUri)
        if (error || !data) {
          log.error('VideoAnalysisScreen', 'Failed to create signed URL', {
            storagePath: historicalUri,
            error,
          })
          setResolvedVideoUri(FALLBACK_VIDEO_URI)
          return
        }
        log.info('VideoAnalysisScreen', 'Converted storage path to signed URL', {
          storagePath: historicalUri,
          signedUrl: data.signedUrl,
        })
        setResolvedVideoUri(data.signedUrl)
        return
      }
      log.warn('VideoAnalysisScreen', 'Falling back to sample video', {
        isHistoryMode,
        hasHistoricalData: !!historicalAnalysis.data,
        fallbackUri: FALLBACK_VIDEO_URI,
      })
      setResolvedVideoUri(FALLBACK_VIDEO_URI)
    }

    resolveUri()
  }, [videoUri, isHistoryMode, historicalAnalysis.data])

  const uploadError = analysisState.error?.phase === 'upload' ? analysisState.error?.message : null

  useAutoPlayOnReady(isProcessing, isPlaying, playVideo)

  const handleSignificantProgress = useCallback(
    (time: number) => {
      setCurrentTime(time)
      coordinateFeedback.onProgressTrigger(time)
    },
    [coordinateFeedback]
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
    coordinateFeedback.onPlay()
  }, [coordinateFeedback])

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
            showControls={videoControls.showControls}
            isProcessing={isProcessing}
            videoAreaScale={1 - feedbackPanel.panelFraction}
            onPlay={handlePlay}
            onPause={pauseVideo}
            onReplay={rerunVideo}
            onSeek={handleSeek}
            onSeekComplete={handleSeekComplete}
            onSignificantProgress={handleSignificantProgress}
            onLoad={registerDuration}
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
          phase={isHistoryMode && historicalAnalysis.isLoading ? 'analyzing' : analysisState.phase}
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
