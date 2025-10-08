import { useCallback, useMemo, useRef, useState } from 'react'
import { YStack } from 'tamagui'

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
  onMenuPress?: () => void
}

const FALLBACK_VIDEO_URI =
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'

const DEFAULT_FEEDBACK_ITEMS: FeedbackPanelItem[] = [
  {
    id: 'seed-1',
    timestamp: 2_000,
    text: 'Great posture! Keep your shoulders relaxed.',
    type: 'suggestion',
    category: 'posture',
    ssmlStatus: 'completed',
    audioStatus: 'completed',
    confidence: 1,
  },
  {
    id: 'seed-2',
    timestamp: 5_000,
    text: 'Try speaking with more confidence.',
    type: 'suggestion',
    category: 'voice',
    ssmlStatus: 'completed',
    audioStatus: 'completed',
    confidence: 1,
  },
  {
    id: 'seed-3',
    timestamp: 8_000,
    text: 'Your hand gestures are too stiff.',
    type: 'suggestion',
    category: 'movement',
    ssmlStatus: 'completed',
    audioStatus: 'completed',
    confidence: 1,
  },
]

export function VideoAnalysisScreen({
  analysisJobId,
  videoRecordingId,
  videoUri,
  initialStatus = 'processing',
  onBack,
  onMenuPress,
}: VideoAnalysisScreenProps) {
  const normalizedInitialStatus = initialStatus === 'ready' ? 'ready' : 'processing'
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

  const videoControls = useVideoControls(analysisState.isProcessing, isPlaying, videoEnded)

  const feedbackItems = useMemo(() => {
    if (analysisState.feedback.feedbackItems.length > 0) {
      return analysisState.feedback.feedbackItems
    }
    return DEFAULT_FEEDBACK_ITEMS
  }, [analysisState.feedback.feedbackItems])

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

  const resolvedVideoUri = videoUri ?? FALLBACK_VIDEO_URI
  const uploadError = analysisState.error?.phase === 'upload' ? analysisState.error?.message : null

  useAutoPlayOnReady(analysisState.isProcessing, isPlaying, playVideo)

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
            isProcessing={analysisState.isProcessing}
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
            onMenuPress={onMenuPress}
            onControlsVisibilityChange={videoControls.setControlsVisible}
            headerBackHandler={onBack}
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
          phase={analysisState.phase}
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
