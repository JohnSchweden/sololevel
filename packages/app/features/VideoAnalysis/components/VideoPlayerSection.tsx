import { memo, useCallback, useMemo, useRef, useState } from 'react'

import { YStack } from 'tamagui'

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

import { useVideoAnalysisContext } from '../contexts/VideoAnalysisContext'
import type { FeedbackPanelItem } from '../types'

interface BubbleState {
  visible: boolean
  currentIndex: number | null
  items: FeedbackPanelItem[]
}

interface AudioOverlayState {
  shouldShow: boolean
  activeAudio: { id: string; url: string } | null
  onClose?: () => void
  onInactivity?: () => void
  onInteraction?: () => void
  audioDuration?: number
}

interface VideoPlayerSectionProps {
  videoControlsRef: React.RefObject<VideoControlsRef | null>
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
  onSignificantProgress: (time: number) => void
  onLoad: (data: { duration: number }) => void
  onEnd: () => void
  onTap: () => void
  onControlsVisibilityChange?: (visible: boolean) => void
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
  onSignificantProgress,
  onLoad,
  onEnd,
  onTap,
  onControlsVisibilityChange,
  audioPlayerController,
  bubbleState,
  audioOverlay,
  coachSpeaking,
  panelFraction,
  socialCounts,
  onSocialAction,
}: VideoPlayerSectionProps) {
  // Get rarely-changing data from context
  const { videoUri } = useVideoAnalysisContext()

  // Manage currentTime and duration internally
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const lastNotifiedTimeRef = useRef(0)

  // Only notify parent on significant progress changes (> 1 second)
  const handleProgress = useCallback(
    (data: { currentTime: number }) => {
      setCurrentTime(data.currentTime)

      // Notify parent only if time changed significantly
      if (Math.abs(data.currentTime - lastNotifiedTimeRef.current) > 1.0) {
        lastNotifiedTimeRef.current = data.currentTime
        onSignificantProgress(data.currentTime)
      }
    },
    [onSignificantProgress]
  )

  const handleLoad = useCallback(
    (data: { duration: number }) => {
      setDuration(data.duration)
      setCurrentTime(0)
      onLoad(data)
    },
    [onLoad]
  )
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
              onLoad={handleLoad}
              onProgress={handleProgress}
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
              onInactivity={audioOverlay.onInactivity}
              onInteraction={audioOverlay.onInteraction}
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
            onControlsVisibilityChange={onControlsVisibilityChange}
          />
        </YStack>
      </VideoPlayerArea>
    </VideoContainer>
  )
})

VideoPlayerSection.displayName = 'VideoPlayerSection'
