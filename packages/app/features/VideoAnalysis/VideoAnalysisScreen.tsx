import { useCallback, useEffect, useMemo, useRef } from 'react'
import { LayoutAnimation, Platform } from 'react-native'
import { YStack } from 'tamagui'

import { log } from '@my/logging'

import { VideoControlsRef } from '@ui/components/VideoAnalysis'

import { FeedbackSection } from './components/FeedbackSection'
import { ProcessingIndicator } from './components/ProcessingIndicator'
import { UploadErrorState } from './components/UploadErrorState'
import { VideoPlayerSection } from './components/VideoPlayerSection'
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
    currentTime,
    duration,
    pendingSeek,
    videoEnded,
    play: playVideo,
    pause: pauseVideo,
    replay: replayVideo,
    seek: seekVideo,
    handleProgress: updateProgress,
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

  const bubbleController = useBubbleController(
    bubbleFeedbackItems,
    currentTime,
    isPlaying,
    feedbackAudio.audioUrls,
    audioController.duration,
    {
      onBubbleShow: ({ index }) => {
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

  useEffect(() => {
    if (!analysisState.isProcessing && !isPlaying) {
      playVideo()
    }
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

  const handleVideoProgress = useCallback(
    (data: { currentTime: number }) => {
      updateProgress(data)

      const triggeredIndex = bubbleController.checkAndShowBubbleAtTime(data.currentTime * 1000)
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
    [audioController, bubbleController, feedbackAudio, feedbackItems, feedbackPanel, updateProgress]
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

  const videoPlayerProps = useMemo(
    () => ({
      videoControlsRef,
      videoUri: resolvedVideoUri,
      currentTime,
      duration,
      pendingSeek,
      userIsPlaying: isPlaying,
      videoShouldPlay: videoAudioSync.shouldPlayVideo,
      videoEnded,
      showControls: analysisState.isProcessing || !isPlaying || videoEnded,
      isProcessing: analysisState.isProcessing,
      videoAreaScale: 1 - feedbackPanel.panelFraction,
      onPlay: playVideo,
      onPause: pauseVideo,
      onReplay: replayVideo,
      onSeek: handleSeek,
      onSeekComplete: handleSeekComplete,
      onProgress: handleVideoProgress,
      onLoad: registerDuration,
      onEnd: handleVideoComplete,
      onTap: () => {},
      onMenuPress: onMenuPress ?? (() => {}),
      headerBackHandler: onBack,
      audioPlayerController: audioController,
      bubbleState: {
        visible: bubbleController.bubbleVisible,
        currentIndex: bubbleController.currentBubbleIndex,
        items: feedbackItems,
      },
      audioOverlay: {
        shouldShow: shouldShowAudioOverlay,
        activeAudio: feedbackAudio.activeAudio,
        onClose: handleAudioOverlayClose,
      },
      coachSpeaking: feedbackSelection.isCoachSpeaking,
      panelFraction: feedbackPanel.panelFraction,
    }),
    [
      analysisState.isProcessing,
      audioController,
      bubbleController.bubbleVisible,
      bubbleController.currentBubbleIndex,
      currentTime,
      duration,
      feedbackAudio.activeAudio,
      feedbackItems,
      feedbackPanel.panelFraction,
      feedbackSelection.isCoachSpeaking,
      handleAudioOverlayClose,
      handleSeek,
      handleSeekComplete,
      handleVideoComplete,
      handleVideoProgress,
      isPlaying,
      onBack,
      onMenuPress,
      pauseVideo,
      pendingSeek,
      playVideo,
      registerDuration,
      replayVideo,
      resolvedVideoUri,
      shouldShowAudioOverlay,
      videoAudioSync.shouldPlayVideo,
      videoEnded,
      videoControlsRef,
    ]
  )

  const feedbackSectionProps = useMemo(
    () => ({
      panelFraction: feedbackPanel.panelFraction,
      activeTab: feedbackPanel.activeTab,
      feedbackItems,
      selectedFeedbackId: feedbackSelection.selectedFeedbackId,
      currentVideoTime: currentTime,
      videoDuration: duration,
      errors: feedbackAudio.errors,
      audioUrls: feedbackAudio.audioUrls,
      onTabChange: feedbackPanel.setActiveTab,
      onExpand: feedbackPanel.expand,
      onCollapse: handleCollapsePanel,
      onItemPress: handleFeedbackItemPress,
      onSeek: handleSeek,
      onRetryFeedback: analysisState.feedback.retryFailedFeedback,
      onDismissError: feedbackAudio.clearError,
      onSelectAudio: (feedbackId: string) => {
        feedbackAudio.selectAudio(feedbackId)
        audioController.setIsPlaying(true)
      },
      onShare: () => log.info('VideoAnalysisScreen', 'Share button pressed'),
      onLike: () => log.info('VideoAnalysisScreen', 'Like button pressed'),
      onComment: () => log.info('VideoAnalysisScreen', 'Comment button pressed'),
      onBookmark: () => log.info('VideoAnalysisScreen', 'Bookmark button pressed'),
    }),
    [
      analysisState.feedback.retryFailedFeedback,
      audioController,
      currentTime,
      duration,
      feedbackAudio,
      feedbackItems,
      feedbackPanel,
      feedbackSelection.selectedFeedbackId,
      handleCollapsePanel,
      handleFeedbackItemPress,
      handleSeek,
    ]
  )

  const shouldShowUploadError = Boolean(uploadError)

  return (
    <YStack flex={1}>
      <UploadErrorState
        visible={shouldShowUploadError}
        errorMessage={uploadError}
        onRetry={() => {
          onBack?.()
        }}
        onBack={onBack ?? (() => {})}
      />

      {!shouldShowUploadError && <VideoPlayerSection {...videoPlayerProps} />}

      <ProcessingIndicator
        phase={analysisState.phase}
        progress={analysisState.progress}
        channelExhausted={analysisState.channelExhausted}
      />

      <FeedbackSection {...feedbackSectionProps} />
    </YStack>
  )
}
