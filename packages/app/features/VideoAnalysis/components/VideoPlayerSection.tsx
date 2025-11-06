import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { log } from '@my/logging'
import Animated, {
  Extrapolation,
  type SharedValue,
  interpolate,
  useAnimatedStyle,
  Easing,
  useDerivedValue,
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
  type VideoPlayerRef,
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
  onClose?: () => void
  onInactivity?: () => void
  onInteraction?: () => void
  audioDuration?: number
}

interface VideoPlayerSectionProps {
  videoUri: string // Video URI - passed as prop instead of context
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
  // DEPRECATED: Use persistentProgressStoreSetter instead to prevent cascading re-renders
  // Callback to provide persistent progress bar props to parent for rendering at layout level
  onPersistentProgressBarPropsChange?: (props: PersistentProgressBarProps | null) => void
  // NEW: Store setter for persistent progress bar props (preferred over callback)
  persistentProgressStoreSetter?: (props: PersistentProgressBarProps | null) => void
}

const DEFAULT_BUBBLE_POSITION = { x: 0.5, y: 0.3 }

export const VideoPlayerSection = memo(function VideoPlayerSection({
  videoUri,
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
  persistentProgressStoreSetter,
}: VideoPlayerSectionProps) {
  // Direct seek ref to bypass React render cycle for immediate seeks
  const videoPlayerRef = useRef<VideoPlayerRef>(null)

  // Manage currentTime and duration internally
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const lastNotifiedTimeRef = useRef(0)
  const stateUpdateCountRef = useRef(0)
  const lastStateUpdateTimeRef = useRef(0)
  const lastSeekTargetRef = useRef<number | null>(null)
  const seekCompleteTimeRef = useRef(0)
  // Track the target seek time to ignore stale progress events after seeking
  const pendingSeekTimeRef = useRef<number | null>(null)
  // Track the time before seek to detect backward seeks and filter stale events
  const timeBeforeSeekRef = useRef<number | null>(null)
  // Persist pre-seek progress for the full stale event window (doesn't get cleared when accepting progress)
  const persistedPreSeekProgressRef = useRef<number | null>(null)
  const persistedPreSeekTimestampRef = useRef<number>(0)

  // Debug: Track pendingSeek prop changes and reset tracking if needed
  useEffect(() => {
    // If pendingSeek prop changes to a new value, reset our internal tracking
    // This handles cases like replay where we need to clear old seek state
    if (pendingSeek !== null && pendingSeek !== pendingSeekTimeRef.current) {
      // Save current time if this is a backward seek
      if (pendingSeek < currentTime) {
        timeBeforeSeekRef.current = currentTime
        persistedPreSeekProgressRef.current = currentTime
        persistedPreSeekTimestampRef.current = Date.now()
      } else {
        timeBeforeSeekRef.current = null
        persistedPreSeekProgressRef.current = null
      }
      // Don't set pendingSeekTimeRef here - let handleSeekComplete do it after seek completes
      // But we do want to update lastSeekTarget for stale event filtering
      lastSeekTargetRef.current = pendingSeek
      seekCompleteTimeRef.current = Date.now()
    }
  }, [pendingSeek, currentTime])

  // Debug: Track state updates
  useEffect(() => {
    stateUpdateCountRef.current++
    const now = Date.now()
    const timeSinceLastUpdate = now - lastStateUpdateTimeRef.current
    lastStateUpdateTimeRef.current = now

    if (stateUpdateCountRef.current > 1 && timeSinceLastUpdate < 100) {
      log.debug('VideoPlayerSection', '⚡ Rapid state updates', {
        count: stateUpdateCountRef.current,
        currentTime,
        duration,
        timeSinceLastUpdate,
      })
    }
  }, [currentTime, duration])

  // Optimized seek handler: use direct seek for immediate response, then update state
  const handleDirectSeek = useCallback(
    (time: number) => {
      // Seek immediately via ref to bypass render cycle
      videoPlayerRef.current?.seekDirect(time)
      // Still call onSeek for state updates (for UI consistency)
      onSeek(time)
    },
    [onSeek]
  )

  // Only notify parent on significant progress changes (> 1 second)
  const handleProgress = useCallback(
    (data: { currentTime: number }) => {
      const { currentTime: reportedTime } = data

      // Filter stale progress events that arrive shortly after a seek
      // Similar logic to useVideoPlayback.handleProgress
      const timeSinceSeekComplete = Date.now() - seekCompleteTimeRef.current
      const SEEK_STALE_EVENT_THRESHOLD_MS = 500

      if (
        lastSeekTargetRef.current !== null &&
        timeSinceSeekComplete < SEEK_STALE_EVENT_THRESHOLD_MS &&
        reportedTime > lastSeekTargetRef.current + 1.0 // Event is more than 1s ahead of seek target
      ) {
        return
      }

      // Clear seek tracking after threshold passes
      if (timeSinceSeekComplete >= SEEK_STALE_EVENT_THRESHOLD_MS) {
        lastSeekTargetRef.current = null
      }

      // If we have a pending seek, filter progress events intelligently
      // This prevents stale progress events from overwriting the seek position
      if (pendingSeekTimeRef.current !== null) {
        const targetTime = pendingSeekTimeRef.current
        const timeBeforeSeek = timeBeforeSeekRef.current
        const timeDifference = Math.abs(reportedTime - targetTime)

        // Detect if this is a stale event from before a backward seek
        // If we seek backward and reported time is close to pre-seek time, it's stale
        if (
          timeBeforeSeek !== null &&
          targetTime < timeBeforeSeek &&
          Math.abs(reportedTime - timeBeforeSeek) < 0.5 // Within 500ms of old position = stale
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
          // Additional check: if we seeked backward, ignore events that are close to pre-seek time
          // This catches stale events from before the backward seek
          if (
            timeBeforeSeek !== null &&
            targetTime < timeBeforeSeek &&
            Math.abs(reportedTime - timeBeforeSeek) < 0.5 // Within 500ms of old position = stale
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
        // BUT: Only if we didn't seek backward (would be stale event)
        if (reportedTime >= targetTime - 1.0 && reportedTime < targetTime + 0.2) {
          // Additional check: if we seeked backward, don't accept events that are close to pre-seek time
          const isStaleBackwardSeekEvent =
            timeBeforeSeek !== null &&
            targetTime < timeBeforeSeek &&
            Math.abs(reportedTime - timeBeforeSeek) < 0.5

          if (isStaleBackwardSeekEvent) {
            return
          }

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
      // BUT: Still check for stale events if we recently did a backward seek
      // Reuse timeSinceSeekComplete and SEEK_STALE_EVENT_THRESHOLD_MS from earlier in function
      const timeSincePreSeekSaved = Date.now() - persistedPreSeekTimestampRef.current

      // Clear persisted pre-seek progress after stale event window expires
      if (timeSincePreSeekSaved >= SEEK_STALE_EVENT_THRESHOLD_MS) {
        persistedPreSeekProgressRef.current = null
      }

      // Check for stale events after backward seek:
      // 1. We have persisted pre-seek progress (from backward seek)
      // 2. Still within stale event window
      // 3. The reported time is close to pre-seek position (stale event)
      if (
        persistedPreSeekProgressRef.current !== null &&
        lastSeekTargetRef.current !== null &&
        timeSinceSeekComplete < SEEK_STALE_EVENT_THRESHOLD_MS &&
        Math.abs(reportedTime - persistedPreSeekProgressRef.current) < 0.5 &&
        Math.abs(reportedTime - lastSeekTargetRef.current) > 1.0
      ) {
        return
      }

      setCurrentTime(reportedTime)

      // Notify parent on every progress update (for bubble triggers, feedback coordination)
      // The > 1 second throttle broke bubble detection - we need updates every ~200ms
      lastNotifiedTimeRef.current = reportedTime
      onSignificantProgress(reportedTime)
    },
    [onSignificantProgress, duration, currentTime]
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
          persistedPreSeekProgressRef.current = currentTime
          persistedPreSeekTimestampRef.current = Date.now()
        } else {
          timeBeforeSeekRef.current = null
          persistedPreSeekProgressRef.current = null
        }
        setCurrentTime(resolvedTime)
        lastNotifiedTimeRef.current = resolvedTime
        // Track the target seek time so we can filter stale progress events
        pendingSeekTimeRef.current = resolvedTime

        // Track seek target for grace period filtering (similar to useVideoPlayback)
        lastSeekTargetRef.current = resolvedTime
        seekCompleteTimeRef.current = Date.now()
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

  // Pass videoMode SharedValue directly to VideoControls (like collapseProgress)
  // Eliminated state conversion to prevent 60fps re-renders during gestures/animations

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
              ref={videoPlayerRef}
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
          {/* PERFORMANCE: Removed Tamagui animation prop to eliminate JS bridge saturation during gestures */}
          <Animated.View style={[avatarAnimatedStyle, { zIndex: 10 }]}>
            <CoachAvatar
              isSpeaking={coachSpeaking}
              size={80}
              testID="video-analysis-coach-avatar"
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
            videoMode={videoMode}
            collapseProgress={collapseProgress}
            onPlay={onPlay}
            onPause={onPause}
            onReplay={onReplay}
            onSeek={handleDirectSeek}
            onControlsVisibilityChange={onControlsVisibilityChange}
            onPersistentProgressBarPropsChange={onPersistentProgressBarPropsChange}
            persistentProgressStoreSetter={persistentProgressStoreSetter}
          />
        </YStack>
      </VideoPlayerArea>
    </VideoContainer>
  )
})

VideoPlayerSection.displayName = 'VideoPlayerSection'

// Enable WDYR tracking for render cascade investigation
if (__DEV__) {
  // why-did-you-render adds this property at runtime
  ;(VideoPlayerSection as any).whyDidYouRender = {
    logOnDifferentValues: true, // Log when props change
  }
}
