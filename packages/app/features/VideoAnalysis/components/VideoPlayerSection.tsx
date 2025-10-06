import { memo, useMemo } from 'react'

import { YStack } from 'tamagui'

import { AppHeader } from '@my/ui'
import {
  AudioFeedback,
  AudioPlayer,
  CoachAvatar,
  FeedbackBubbles,
  MotionCaptureOverlay,
  SocialIcons,
  VideoContainer,
  VideoControls,
  VideoControlsRef,
  VideoPlayer,
  VideoPlayerArea,
} from '@ui/components/VideoAnalysis'

import type { FeedbackPanelItem } from '../types'

interface BubbleState {
  visible: boolean
  currentIndex: number | null
  items: FeedbackPanelItem[]
}

interface AudioOverlayState {
  shouldShow: boolean
  activeAudio: { id: string; url: string } | null
  onClose: () => void
}

interface VideoPlayerSectionProps {
  videoControlsRef: React.RefObject<VideoControlsRef | null>
  videoUri: string | null
  currentTime: number
  duration: number
  pendingSeek: number | null
  userIsPlaying: boolean
  videoShouldPlay: boolean
  videoEnded: boolean
  showControls: boolean
  isProcessing: boolean
  videoAreaScale: number
  onPlay: () => void
  onPause: () => void
  onReplay: () => void
  onSeek: (time: number) => void
  onSeekComplete: (seekedTime: number | null) => void
  onProgress: (data: { currentTime: number }) => void
  onLoad: (data: { duration: number }) => void
  onEnd: () => void
  onTap: () => void
  onMenuPress?: () => void
  headerBackHandler?: () => void
  audioPlayerController: {
    setIsPlaying: (playing: boolean) => void
    isPlaying: boolean
    currentTime: number
    duration: number
    isLoaded: boolean
    seekTime: number | null
    togglePlayback: () => void
    handleLoad: (data: { duration: number }) => void
    handleProgress: (data: { currentTime: number }) => void
    handleEnd: () => void
    handleError: (error: any) => void
    handleSeekComplete: () => void
    seekTo: (time: number) => void
    reset: () => void
  }
  bubbleState: BubbleState
  audioOverlay: AudioOverlayState
  coachSpeaking: boolean
  panelFraction: number
  // Social icons props
  socialCounts: {
    likes: number
    comments: number
    bookmarks: number
    shares: number
  }
  onSocialAction: {
    onShare: () => void
    onLike: () => void
    onComment: () => void
    onBookmark: () => void
  }
}

const DEFAULT_BUBBLE_POSITION = { x: 0.5, y: 0.3 }

export const VideoPlayerSection = memo(function VideoPlayerSection({
  videoControlsRef,
  videoUri,
  currentTime,
  duration,
  pendingSeek,
  userIsPlaying,
  videoShouldPlay,
  videoEnded,
  showControls,
  isProcessing,
  videoAreaScale,
  onPlay,
  onPause,
  onReplay,
  onSeek,
  onSeekComplete,
  onProgress,
  onLoad,
  onEnd,
  onTap,
  onMenuPress,
  headerBackHandler,
  audioPlayerController,
  bubbleState,
  audioOverlay,
  coachSpeaking,
  panelFraction,
  socialCounts,
  onSocialAction,
}: VideoPlayerSectionProps) {
  const activeBubbleMessages = useMemo(() => {
    if (!bubbleState.visible || bubbleState.currentIndex === null) {
      return []
    }

    const item = bubbleState.items[bubbleState.currentIndex]
    return [
      {
        id: item.id,
        timestamp: item.timestamp,
        text: item.text,
        type: item.type,
        category: item.category,
        position: DEFAULT_BUBBLE_POSITION,
        isHighlighted: false,
        isActive: true,
      },
    ]
  }, [bubbleState.currentIndex, bubbleState.items, bubbleState.visible])

  return (
    <VideoContainer
      useFlexLayout
      flex={1 - panelFraction}
    >
      <VideoPlayerArea>
        <YStack
          flex={1}
          position="relative"
          onPress={onTap}
          marginBottom={-34}
          testID="video-player-container"
        >
          {videoUri && (
            <VideoPlayer
              videoUri={videoUri}
              isPlaying={videoShouldPlay}
              onPause={onPause}
              onEnd={onEnd}
              onLoad={onLoad}
              onProgress={onProgress}
              seekToTime={pendingSeek}
              onSeekComplete={() => onSeekComplete(pendingSeek ?? null)}
            />
          )}

          {audioOverlay.activeAudio && (
            <AudioPlayer
              audioUrl={audioOverlay.activeAudio.url}
              controller={audioPlayerController}
              testID="feedback-audio-player"
            />
          )}

          <MotionCaptureOverlay
            poseData={[]}
            isVisible
          />

          <FeedbackBubbles messages={activeBubbleMessages} />

          {audioOverlay.shouldShow && audioOverlay.activeAudio && (
            <AudioFeedback
              audioUrl={audioOverlay.activeAudio.url}
              controller={audioPlayerController}
              onClose={audioOverlay.onClose}
              isVisible
              testID="audio-feedback-controls"
            />
          )}

          {panelFraction <= 0.1 && (
            <CoachAvatar
              isSpeaking={coachSpeaking}
              size={90 * (1 - panelFraction)}
              testID="video-analysis-coach-avatar"
              animation="quick"
              enterStyle={{
                opacity: 0,
                scale: 0.8,
              }}
              exitStyle={{
                opacity: 0,
                scale: 0.8,
              }}
            />
          )}

          {/* Social Icons - Show when panel is expanded */}
          {panelFraction > 0.1 && (
            <SocialIcons
              likes={socialCounts.likes}
              comments={socialCounts.comments}
              bookmarks={socialCounts.bookmarks}
              shares={socialCounts.shares}
              onShare={onSocialAction.onShare}
              onLike={onSocialAction.onLike}
              onComment={onSocialAction.onComment}
              onBookmark={onSocialAction.onBookmark}
              isVisible={true}
              placement="rightBottom"
              offsetBottom={64}
            />
          )}

          <VideoControls
            ref={videoControlsRef}
            isPlaying={userIsPlaying}
            currentTime={currentTime}
            duration={duration}
            showControls={showControls}
            isProcessing={isProcessing}
            videoEnded={videoEnded}
            scaleFactor={videoAreaScale}
            onPlay={onPlay}
            onPause={onPause}
            onReplay={onReplay}
            onSeek={onSeek}
            headerComponent={
              <AppHeader
                title="Video Analysis"
                mode="videoSettings"
                onBackPress={headerBackHandler}
                onMenuPress={onMenuPress}
              />
            }
          />
        </YStack>
      </VideoPlayerArea>
    </VideoContainer>
  )
})

VideoPlayerSection.displayName = 'VideoPlayerSection'
