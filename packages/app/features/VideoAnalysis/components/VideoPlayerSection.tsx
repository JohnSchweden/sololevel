import { memo, useCallback, useMemo, useRef, useState } from 'react'

import Animated, {
  Extrapolation,
  type SharedValue,
  interpolate,
  useAnimatedStyle,
  Easing,
  useDerivedValue,
  useAnimatedReaction,
  runOnJS,
} from 'react-native-reanimated'
import { YStack } from 'tamagui'

import {
  // AudioFeedback,
  AudioPlayer,
  CoachAvatar,
  FeedbackBubbles,
  MotionCaptureOverlay,
  type PersistentProgressBarProps,
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
  posterUri?: string // Optional thumbnail poster
  onPlay: () => void
  onPause: () => void
  onReplay: () => void
  onSeek: (time: number) => void
  onSeekComplete: (seekedTime: number | null) => void
  onSignificantProgress: (time: number) => void
  onLoad: (data: { duration: number }) => void
  onEnd: (endTime?: number) => void
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
  // NEW: Animation props
  collapseProgress?: SharedValue<number> // 0 expanded → 1 collapsed
  // NEW: Callback to provide persistent progress bar props to parent for rendering at layout level
  onPersistentProgressBarPropsChange?: (props: PersistentProgressBarProps | null) => void
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
  posterUri,
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
  panelFraction: _panelFraction,
  socialCounts,
  onSocialAction,
  collapseProgress,
  onPersistentProgressBarPropsChange,
}: VideoPlayerSectionProps) {
  // Get rarely-changing data from context
  const { videoUri } = useVideoAnalysisContext()

  // Manage currentTime and duration internally
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const lastNotifiedTimeRef = useRef(0)
  // Track the target seek time to ignore stale progress events after seeking
  const pendingSeekTimeRef = useRef<number | null>(null)
  // Track the time before seek to detect backward seeks and filter stale events
  const timeBeforeSeekRef = useRef<number | null>(null)

  // Only notify parent on significant progress changes (> 1 second)
  const handleProgress = useCallback(
    (data: { currentTime: number }) => {
      const { currentTime: reportedTime } = data

      // If we have a pending seek, filter progress events intelligently
      // This prevents stale progress events from overwriting the seek position
      if (pendingSeekTimeRef.current !== null) {
        const targetTime = pendingSeekTimeRef.current
        const timeBeforeSeek = timeBeforeSeekRef.current
        const timeDifference = Math.abs(reportedTime - targetTime)

        // Detect if this is a stale event from before a backward seek
        // If we seek backward and reported time is still ahead of where we were, it's stale
        if (
          timeBeforeSeek !== null &&
          targetTime < timeBeforeSeek &&
          reportedTime > timeBeforeSeek
        ) {
          return
        }

        // If the reported time is very close to target (within 0.2s), accept it and clear pending seek
        if (timeDifference < 0.2) {
          const previousNotifiedTime = lastNotifiedTimeRef.current
          pendingSeekTimeRef.current = null
          timeBeforeSeekRef.current = null
          setCurrentTime(reportedTime)
          lastNotifiedTimeRef.current = reportedTime

          // Notify parent on significant progress
          if (Math.abs(reportedTime - previousNotifiedTime) > 1.0) {
            onSignificantProgress(reportedTime)
          }
          return
        }

        // If reported time is moving forward from target (video is playing past seek point)
        // Accept it and clear pending seek - we've successfully moved past the seek
        // But only if we're not dealing with a stale backward-seek event
        if (reportedTime > targetTime + 0.2) {
          // Additional check: if we seeked backward, ignore events that are still ahead of pre-seek time
          if (
            timeBeforeSeek !== null &&
            targetTime < timeBeforeSeek &&
            reportedTime > timeBeforeSeek
          ) {
            return
          }

          const previousNotifiedTime = lastNotifiedTimeRef.current
          pendingSeekTimeRef.current = null
          timeBeforeSeekRef.current = null
          setCurrentTime(reportedTime)
          lastNotifiedTimeRef.current = reportedTime

          // Notify parent on significant progress
          if (Math.abs(reportedTime - previousNotifiedTime) > 1.0) {
            onSignificantProgress(reportedTime)
          }
          return
        }

        // If reported time is approaching target from before (within 1s window), accept it
        // This handles the case where we seek forward and video catches up
        if (reportedTime >= targetTime - 1.0 && reportedTime < targetTime + 0.2) {
          setCurrentTime(reportedTime)
          lastNotifiedTimeRef.current = reportedTime
          return
        }

        // Ignore stale progress events that are too far behind the target
        // This filters out old progress events from before the seek
        if (reportedTime < targetTime - 1.0) {
          return
        }
      }

      // Normal progress update (no pending seek)
      setCurrentTime(reportedTime)

      // Notify parent only if time changed significantly
      if (Math.abs(reportedTime - lastNotifiedTimeRef.current) > 1.0) {
        lastNotifiedTimeRef.current = reportedTime
        onSignificantProgress(reportedTime)
      }
    },
    [onSignificantProgress, duration]
  )

  // Handle seek completion - update local currentTime immediately
  // This ensures VideoControls shows the correct time after seeking
  const handleSeekComplete = useCallback(
    (seekTime?: number) => {
      const resolvedTime = seekTime ?? pendingSeek ?? currentTime
      if (typeof resolvedTime === 'number' && Number.isFinite(resolvedTime)) {
        // Track time before seek if this is a backward seek (to filter stale events)
        if (resolvedTime < currentTime) {
          timeBeforeSeekRef.current = currentTime
        } else {
          timeBeforeSeekRef.current = null
        }
        setCurrentTime(resolvedTime)
        lastNotifiedTimeRef.current = resolvedTime
        // Track the target seek time so we can filter stale progress events
        pendingSeekTimeRef.current = resolvedTime
      }
      onSeekComplete(seekTime ?? pendingSeek ?? null)
    },
    [currentTime, pendingSeek, onSeekComplete]
  )

  const handleLoad = useCallback(
    (data: { duration: number }) => {
      setDuration(data.duration)
      setCurrentTime(0)
      onLoad(data)
    },
    [onLoad]
  )

  const handleEnd = useCallback(
    (endTime?: number) => {
      // Update local currentTime state to the actual end time if provided
      // This ensures the UI shows the correct end time even if progress was throttled
      if (typeof endTime === 'number' && Number.isFinite(endTime)) {
        setCurrentTime(endTime)
        lastNotifiedTimeRef.current = endTime
      }
      onEnd(endTime)
    },
    [onEnd]
  )

  // Determine video mode from collapseProgress using useDerivedValue for SharedValue reactivity
  // Only needed for JS-level mode tracking (e.g., for render profiling)
  const videoMode = useDerivedValue(() => {
    if (!collapseProgress) {
      return 'max' as const
    }

    const progress = collapseProgress.value
    let mode: 'max' | 'normal' | 'min'

    if (progress <= 0.25) {
      mode = 'max'
    } else if (progress <= 0.75) {
      mode = 'normal'
    } else {
      mode = 'min'
    }

    return mode
  })

  // Convert videoMode SharedValue to state only (for JS use, e.g., render profiling)
  // REMOVED: collapseProgress state conversion - pass SharedValue directly to VideoControls
  // This eliminates re-renders during gestures (~60fps updates → 0 JS re-renders)
  const [currentVideoMode, setCurrentVideoMode] = useState<'max' | 'normal' | 'min'>('max')

  useAnimatedReaction(
    () => videoMode.value,
    (currentMode) => {
      runOnJS(setCurrentVideoMode)(currentMode)
    },
    [videoMode]
  )

  // Note: collapseProgress is passed directly as SharedValue to VideoControls
  // No state conversion needed - VideoControls handles SharedValue directly

  // Animation styles for avatar and social icons
  const avatarAnimatedStyle = useAnimatedStyle(() => {
    if (!collapseProgress) return { opacity: 1 }
    // Apply cubic easing for smooth slow-start fast-end effect
    //const easeFunction = Easing.inOut(Easing.cubic)
    //const easedProgress = easeFunction(collapseProgress.value)

    // Fade in when transitioning to max mode (collapseProgress 0-0.15), fade out otherwise
    return {
      opacity: interpolate(collapseProgress.value, [0, 0.02], [1, 0], Extrapolation.CLAMP),
      transform: [
        { translateY: interpolate(collapseProgress.value, [0, 1], [0, -12], Extrapolation.CLAMP) },
        { scale: interpolate(collapseProgress.value, [0, 1], [1, 0.9], Extrapolation.CLAMP) },
      ],
    }
  })

  const socialAnimatedStyle = useAnimatedStyle(() => {
    if (!collapseProgress) return { opacity: 1 }
    // Apply cubic easing for smooth slow-start fast-end effect
    const easeFunction = Easing.inOut(Easing.cubic)
    const easedProgress = easeFunction(collapseProgress.value)

    // Fade out at max mode (0) and min mode (1), visible in normal mode (0.5)
    const opacity = interpolate(easedProgress, [0, 0.5, 1], [0, 1, 0], Extrapolation.CLAMP)
    return {
      opacity,
      transform: [
        { translateY: interpolate(collapseProgress.value, [0, 1], [16, 0], Extrapolation.CLAMP) },
      ],
    }
  })
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
      flex={1}
    >
      <VideoPlayerArea>
        <YStack
          flex={1}
          position="relative"
          onPress={onTap}
          testID="video-player-container"
        >
          {videoUri && (
            <VideoPlayer
              videoUri={videoUri}
              isPlaying={videoShouldPlay}
              posterUri={posterUri}
              onPause={onPause}
              onEnd={handleEnd}
              onLoad={handleLoad}
              onProgress={handleProgress}
              seekToTime={pendingSeek}
              onSeekComplete={handleSeekComplete}
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

          {/* Audio Feedback Controls - Commented out, is for P1 */}
          {/* {audioOverlay.shouldShow && audioOverlay.activeAudio && (
            <AudioFeedback
              audioUrl={audioOverlay.activeAudio.url}
              controller={audioPlayerController}
              onClose={audioOverlay.onClose}
              onInactivity={audioOverlay.onInactivity}
              onInteraction={audioOverlay.onInteraction}
              isVisible
              testID="audio-feedback-controls"
            />
          )} */}

          {/* Avatar - Always render with animated style */}
          <Animated.View style={[avatarAnimatedStyle, { zIndex: 10 }]}>
            <CoachAvatar
              isSpeaking={coachSpeaking}
              size={80}
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
          </Animated.View>

          {/* Social Icons - Always render with animated style */}
          <Animated.View
            style={[socialAnimatedStyle, { zIndex: 10 }]}
            testID="social-icons-container"
          >
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
              offsetBottom={30}
            />
          </Animated.View>

          <VideoControls
            ref={videoControlsRef}
            isPlaying={userIsPlaying}
            currentTime={currentTime}
            duration={duration}
            showControls={showControls}
            isProcessing={isProcessing}
            videoEnded={videoEnded}
            videoMode={currentVideoMode}
            collapseProgress={collapseProgress}
            onPlay={onPlay}
            onPause={onPause}
            onReplay={onReplay}
            onSeek={onSeek}
            onControlsVisibilityChange={onControlsVisibilityChange}
            onPersistentProgressBarPropsChange={onPersistentProgressBarPropsChange}
          />
        </YStack>
      </VideoPlayerArea>
    </VideoContainer>
  )
})

VideoPlayerSection.displayName = 'VideoPlayerSection'
