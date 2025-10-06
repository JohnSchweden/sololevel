import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LayoutAnimation, Platform } from 'react-native'
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
import { useBubbleController } from './hooks/useBubbleController'
import { useFeedbackAudioSource } from './hooks/useFeedbackAudioSource'
import { useFeedbackPanel } from './hooks/useFeedbackPanel'
import { useFeedbackSelection } from './hooks/useFeedbackSelection'
import { useVideoAudioSync } from './hooks/useVideoAudioSync'
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
    replay: replayVideo,
    seek: seekVideo,
    handleLoad: registerDuration,
    handleEnd: handleVideoComplete,
    handleSeekComplete: resolveSeek,
  } = videoPlayback

  const feedbackItems = useMemo(() => {
    if (analysisState.feedback.feedbackItems.length > 0) {
      return analysisState.feedback.feedbackItems
    }
    return DEFAULT_FEEDBACK_ITEMS
  }, [analysisState.feedback.feedbackItems])

  const feedbackAudio = useFeedbackAudioSource(feedbackItems)
  const audioController = useAudioController(feedbackAudio.activeAudio?.url ?? null)
  const feedbackSelection = useFeedbackSelection(feedbackAudio, audioController, videoPlayback)
  const feedbackPanel = useFeedbackPanel()
  const videoAudioSync = useVideoAudioSync({
    isVideoPlaying: isPlaying,
    isAudioActive: audioController.isPlaying,
  })

  const videoControlsRef = useRef<VideoControlsRef>(null)

  // Filter feedback items to only include 'suggestion' type for bubble controller
  const bubbleFeedbackItems = useMemo(
    () => feedbackItems.filter((item) => item.type === 'suggestion'),
    [feedbackItems]
  )

  // Track current time (updated less frequently via onSignificantProgress)
  const [currentTime, setCurrentTime] = useState(0)

  const bubbleController = useBubbleController(
    bubbleFeedbackItems,
    currentTime,
    isPlaying,
    feedbackAudio.audioUrls,
    audioController.duration,
    {
      onBubbleShow: ({ index }: { index: number }) => {
        const item = bubbleFeedbackItems[index]
        if (!item) return

        feedbackPanel.selectFeedback(item.id)
        feedbackSelection.triggerCoachSpeaking()
      },
      onBubbleHide: () => {
        feedbackPanel.clearSelection()
        feedbackSelection.triggerCoachSpeaking(0)
      },
    }
  )

  const shouldShowAudioOverlay = Boolean(feedbackAudio.activeAudio && audioController.isPlaying)
  const resolvedVideoUri = videoUri ?? FALLBACK_VIDEO_URI
  const uploadError = analysisState.error?.phase === 'upload' ? analysisState.error?.message : null

  // Auto-play only once when transitioning from processing -> ready
  const prevProcessingRef = useRef(analysisState.isProcessing)
  useEffect(() => {
    const wasProcessing = prevProcessingRef.current
    const isNowProcessing = analysisState.isProcessing
    // Detect edge: processing -> not processing
    if (wasProcessing && !isNowProcessing) {
      if (!isPlaying) {
        playVideo()
      }
    }
    prevProcessingRef.current = isNowProcessing
  }, [analysisState.isProcessing, isPlaying, playVideo])

  useEffect(() => {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      LayoutAnimation.configureNext(
        LayoutAnimation.create(
          300,
          LayoutAnimation.Types.easeInEaseOut,
          LayoutAnimation.Properties.opacity
        )
      )
    }
  }, [feedbackPanel.panelFraction])

  useEffect(() => {
    if (!feedbackSelection.selectedFeedbackId) {
      feedbackPanel.clearSelection()
      return
    }
    feedbackPanel.selectFeedback(feedbackSelection.selectedFeedbackId)
  }, [feedbackPanel, feedbackSelection.selectedFeedbackId])

  // Only called on significant progress changes (> 1 second)
  const handleSignificantProgress = useCallback(
    (time: number) => {
      setCurrentTime(time)

      const triggeredIndex = bubbleController.checkAndShowBubbleAtTime(time * 1000)
      if (triggeredIndex === null) {
        return
      }

      const item = feedbackItems[triggeredIndex]
      if (!item) {
        return
      }

      feedbackPanel.selectFeedback(item.id)

      if (feedbackAudio.audioUrls[item.id]) {
        feedbackAudio.selectAudio(item.id)
        audioController.setIsPlaying(true)
      }
    },
    [audioController, bubbleController, feedbackAudio, feedbackItems, feedbackPanel]
  )

  const handleSeek = useCallback(
    (time: number) => {
      seekVideo(time)
      feedbackSelection.triggerCoachSpeaking(0)
    },
    [feedbackSelection, seekVideo]
  )

  const handleSeekComplete = useCallback(
    (time: number | null) => {
      resolveSeek(time)
      if (time === null) {
        return
      }
      bubbleController.checkAndShowBubbleAtTime(time * 1000)
    },
    [bubbleController, resolveSeek]
  )

  const handleFeedbackItemPress = useCallback(
    (item: FeedbackPanelItem) => {
      feedbackPanel.selectFeedback(item.id)
      feedbackSelection.selectFeedback(item)
      playVideo()
    },
    [feedbackPanel, feedbackSelection, playVideo]
  )

  const handleCollapsePanel = useCallback(() => {
    feedbackPanel.collapse()
    feedbackPanel.clearSelection()
    feedbackSelection.clearSelection()
  }, [feedbackPanel, feedbackSelection])

  const handleAudioOverlayClose = useCallback(() => {
    audioController.setIsPlaying(false)
    feedbackAudio.clearActiveAudio()
    feedbackSelection.clearSelection()
  }, [audioController, feedbackAudio, feedbackSelection])

  const shouldShowUploadError = Boolean(uploadError)

  // Provide rarely-changing data via context
  const contextValue = useMemo(
    () => ({
      videoUri: resolvedVideoUri,
      feedbackItems,
    }),
    [resolvedVideoUri, feedbackItems]
  )

  // Stable callbacks for social actions
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
      feedbackAudio.selectAudio(feedbackId)
      audioController.setIsPlaying(true)
    },
    [audioController, feedbackAudio]
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
            showControls={analysisState.isProcessing || !isPlaying || videoEnded}
            isProcessing={analysisState.isProcessing}
            videoAreaScale={1 - feedbackPanel.panelFraction}
            onPlay={playVideo}
            onPause={pauseVideo}
            onReplay={replayVideo}
            onSeek={handleSeek}
            onSeekComplete={handleSeekComplete}
            onSignificantProgress={handleSignificantProgress}
            onLoad={registerDuration}
            onEnd={handleVideoComplete}
            onTap={() => {}}
            onMenuPress={onMenuPress}
            headerBackHandler={onBack}
            audioPlayerController={audioController}
            bubbleState={{
              visible: bubbleController.bubbleVisible,
              currentIndex: bubbleController.currentBubbleIndex,
              items: feedbackItems,
            }}
            audioOverlay={{
              shouldShow: shouldShowAudioOverlay,
              activeAudio: feedbackAudio.activeAudio,
              onClose: handleAudioOverlayClose,
            }}
            coachSpeaking={feedbackSelection.isCoachSpeaking}
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
          selectedFeedbackId={feedbackSelection.selectedFeedbackId}
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
