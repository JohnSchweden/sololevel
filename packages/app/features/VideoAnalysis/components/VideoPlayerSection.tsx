import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { log } from '@my/logging'

import type { VideoPlayerRef as NativeVideoPlayerRef } from '@ui/components/VideoAnalysis/types'
import Animated, {
  Extrapolation,
  type SharedValue,
  interpolate,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
} from 'react-native-reanimated'
import { YStack } from 'tamagui'
import { useAudioController } from '../hooks/useAudioController'
import { requestFeedbackPanelTab } from '../hooks/useFeedbackPanel'
import { useVideoPlayer } from '../hooks/useVideoPlayer'
// PERFORMANCE FIX: Import stores for direct subscriptions
import { usePersistentProgressStore, useVideoPlayerStore } from '../stores'
import { useFeedbackAudioStore } from '../stores/feedbackAudio'
import { useFeedbackCoordinatorStore } from '../stores/feedbackCoordinatorStore'
import type { FeedbackPanelItem } from '../types'

import { ShareSheet } from '@ui/components/BottomSheets'
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
  VideoTitle,
} from '@ui/components/VideoAnalysis'

// Social counts definition - moved from screen level to video section
const SOCIAL_COUNTS = {
  likes: 1200,
  comments: 89,
  bookmarks: 234,
  shares: 1500,
} as const

// AudioOverlayState interface removed - reconstructed locally from store subscriptions

interface VideoPlayerSectionProps {
  videoUri: string // Video URI - passed as prop instead of context
  videoControlsRef: React.RefObject<VideoControlsRef | null>
  // PERFORMANCE FIX: State props removed - now read directly from Zustand store
  // pendingSeek, userIsPlaying, videoShouldPlay, videoEnded, showControls removed
  isProcessing: boolean
  videoAreaScale: number
  posterUri?: string // Optional thumbnail poster
  initialStatus?: 'processing' | 'ready' | 'playing' | 'paused' // For useVideoPlayer
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
  // Bubble state data - passed from parent to avoid duplicate store subscriptions
  feedbackItems: FeedbackPanelItem[]
  // audioOverlay: AudioOverlayState - RECONSTRUCTED: State subscribed directly, functions passed separately
  audioOverlayFunctions: {
    onClose?: () => void
    onInactivity?: () => void
    onInteraction?: () => void
    audioDuration?: number
  }
  // coachSpeaking: boolean - REMOVED: Now subscribed directly from store
  // panelFraction removed - static layout
  // onSetActiveTab removed - tab switching handled by FeedbackSection directly
  // NEW: Animation props
  collapseProgress?: SharedValue<number> // 0 expanded → 1 collapsed
  /**
   * Optional overscroll shared value emitted by the header gesture controller.
   * Negative values indicate the user pulled past the top edge while in max mode.
   * VideoControls uses this to fade out the normal progress bar immediately during pull-to-expand.
   */
  overscroll?: SharedValue<number>
  // Analysis title for video overlay
  analysisTitle?: string
  // DEPRECATED: Use persistentProgressStoreSetter instead to prevent cascading re-renders
  // Callback to provide persistent progress bar props to parent for rendering at layout level
  onPersistentProgressBarPropsChange?: (props: PersistentProgressBarProps | null) => void
  // persistentProgressStoreSetter?: (props: PersistentProgressBarProps | null) => void - REMOVED: Subscribed directly from store
  onAudioNaturalEnd?: () => void
}

const DEFAULT_BUBBLE_POSITION = { x: 0.5, y: 0.3 }

/**
 * VideoPlayerSection - Owns Store Subscriptions for Audio and Coach State
 *
 * **PERFORMANCE ROLE:** This component owns all store subscriptions related to audio playback
 * and coach speaking feedback. By moving subscriptions from VideoAnalysisScreen to here,
 * we prevent unnecessary parent re-renders.
 *
 * **Store Subscriptions (Direct):**
 * - `useFeedbackAudioStore` → `activeAudio` → determines which audio to play
 * - `useFeedbackCoordinatorStore` → `isCoachSpeaking`, `overlayVisible` → coach avatar state
 * - `usePersistentProgressStore` → progress bar visibility
 * - `useVideoPlayerStore` → playback state for UI + registers seekImmediate
 *
 * **Local Hook Calls:**
 * - `useVideoPlayer()` - video playback state and handlers
 * - `useAudioController(activeAudioUrl)` - subscribes to activeAudio changes (only here)
 * - Effect that registers seekImmediate in store for feedback coordinator
 *
 * **Data Flow:**
 * 1. Parent passes stub controller + callbacks
 * 2. This section creates real controller from store subscription
 * 3. Video/Audio UI components render with real state
 * 4. Parent never sees these updates (stays dark)
 *
 * **Key Optimization:** Only this component re-renders when:
 * - Audio URL changes (activeAudio)
 * - Coach speaking state flips (isCoachSpeaking)
 * - Overlay visibility toggles (overlayVisible)
 * - Persistent progress visibility changes
 *
 * VideoAnalysisScreen remains unchanged when these states flip.
 *
 * @memoized - Yes (memo wrapper), but internal subscriptions bypass memoization
 */
export const VideoPlayerSection = memo(function VideoPlayerSection({
  videoUri,
  videoControlsRef,
  isProcessing,
  posterUri,
  initialStatus = 'processing',
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
  feedbackItems,
  audioOverlayFunctions,
  // audioOverlay, - RECONSTRUCTED: State subscribed directly
  // coachSpeaking, - REMOVED: Now subscribed directly from store
  // panelFraction removed - static layout
  // onSetActiveTab removed - tab switching handled by FeedbackSection directly
  collapseProgress,
  overscroll,
  onPersistentProgressBarPropsChange,
  // persistentProgressStoreSetter, - REMOVED: Subscribed directly from store
  onAudioNaturalEnd = () => {},
  analysisTitle,
}: VideoPlayerSectionProps) {
  const playbackProgressShared = useSharedValue(0)

  const audioIsPlaying = useFeedbackAudioStore((state) =>
    process.env.NODE_ENV !== 'test' ? state.isPlaying : false
  )

  // PERFORMANCE FIX: Call useVideoPlayer here instead of in VideoAnalysisScreen
  // This prevents VideoAnalysisScreen from re-rendering when isPlaying changes
  const videoPlayer = useVideoPlayer({
    initialStatus,
    isProcessing,
    audioIsPlaying,
    progressShared: playbackProgressShared,
  })

  // Separate ref for native VideoPlayer component (has seekDirect method)
  const nativeVideoPlayerRef = useRef<NativeVideoPlayerRef>(null)

  /**
   * PERFORMANCE FIX: Register imperative seek in store
   * Allows feedback coordinator to seek immediately without React render latency
   * Coordinator reads this function imperatively (no subscription, no re-render)
   */
  const [fastSeek, setFastSeek] = useState<((time: number) => void) | null>(null)
  const handleSeekCompleteRef = useRef<(time?: number) => void>(() => {})

  useEffect(() => {
    const seekImmediateFn = (time: number) => {
      // First sync store so pendingSeek/videoEnded update before native completion fires
      onSeek(time)

      log.debug('VideoPlayerSection.seekImmediate', 'Invoked fast seek', {
        seekTime: time,
      })

      // PERFORMANCE FIX: Call native video player's seekDirect immediately
      // Bypasses React render cycle for <16ms latency
      // Note: seekDirect internally calls onSeekComplete, which triggers handleSeekComplete via VideoPlayer props
      nativeVideoPlayerRef.current?.seekDirect(time)
    }

    // Register in store for imperative access by feedback coordinator
    useVideoPlayerStore.getState().setSeekImmediate(seekImmediateFn)

    // Also store in local state to pass to VideoControls
    setFastSeek(() => seekImmediateFn)

    return () => {
      // Clear on unmount
      useVideoPlayerStore.getState().setSeekImmediate(null)
      setFastSeek(null)
    }
  }, [onSeek, videoPlayer.ref])

  // PERFORMANCE FIX: Granular store subscriptions - only re-render when specific values change
  // Eliminates prop drilling and prevents VideoPlayerSection re-renders on state changes
  const pendingSeek = useVideoPlayerStore((state) =>
    process.env.NODE_ENV !== 'test' ? state.pendingSeek : null
  )
  // Subscribe directly to store to avoid screen re-renders from hook subscriptions
  const storeCurrentTime = useVideoPlayerStore((state) =>
    process.env.NODE_ENV !== 'test' ? state.displayTime : 0
  )
  const storeDuration = useVideoPlayerStore((state) =>
    process.env.NODE_ENV !== 'test' ? state.duration : 0
  )
  // Track actual controls visibility (respects auto-hide, not forced visibility)
  // This is different from store's controlsVisible which includes forced visibility (when paused)
  const [actualControlsVisible, setActualControlsVisible] = useState(false)

  // Update actual controls visibility from callback (tracks real visibility, not forced)
  const handleControlsVisibilityChange = useCallback(
    (visible: boolean) => {
      setActualControlsVisible(visible)
      onControlsVisibilityChange?.(visible)
    },
    [onControlsVisibilityChange]
  )

  const showControls = useVideoPlayerStore((state) =>
    process.env.NODE_ENV !== 'test' ? state.controlsVisible : true
  )
  const videoEnded = useVideoPlayerStore((state) =>
    process.env.NODE_ENV !== 'test' ? state.videoEnded : false
  )

  // PERFORMANCE FIX: Direct subscription to coach speaking state
  // Eliminates VideoAnalysisLayout re-renders when coach speaking state changes
  const isCoachSpeaking = useFeedbackCoordinatorStore((state) =>
    process.env.NODE_ENV !== 'test' ? state.isCoachSpeaking : false
  )

  // PERFORMANCE FIX: Direct subscription to audio overlay state
  // Eliminates VideoAnalysisLayout re-renders when audio overlay state changes
  const overlayVisible = useFeedbackCoordinatorStore((state) =>
    process.env.NODE_ENV !== 'test' ? state.overlayVisible : false
  )

  // PERF FIX: Subscribe to primitive values instead of full activeAudio object
  // Prevents useMemo thrash when activeAudio object reference changes but values are stable
  const activeAudioId = useFeedbackAudioStore((state) =>
    process.env.NODE_ENV !== 'test' ? (state.activeAudio?.id ?? null) : null
  )
  const activeAudioUrl = useFeedbackAudioStore((state) =>
    process.env.NODE_ENV !== 'test' ? (state.activeAudio?.url ?? null) : null
  )

  // PERFORMANCE FIX: Move useAudioController subscription here (moved from VideoAnalysisScreen)
  // VideoPlayerSection now owns the store subscription, preventing VideoAnalysisScreen re-renders
  const audioController = useAudioController(
    activeAudioUrl,
    useMemo(
      () => ({
        onNaturalEnd: onAudioNaturalEnd,
      }),
      [onAudioNaturalEnd]
    )
  )

  useEffect(() => {
    const audioStore = useFeedbackAudioStore.getState()
    audioStore.setController(audioController)
    return () => {
      useFeedbackAudioStore.getState().setController(null)
    }
  }, [audioController])

  // PERFORMANCE FIX: Direct subscription to persistent progress setter
  // Eliminates VideoAnalysisScreen re-renders when progress state changes
  const persistentProgressStoreSetter = usePersistentProgressStore((state) =>
    process.env.NODE_ENV !== 'test' ? state.setStaticProps : undefined
  )

  // playbackIsPlaying removed - using videoPlayer.isPlaying from hook

  // PERFORMANCE FIX: Subscribe directly to bubble state stores instead of receiving as props
  // Eliminates VideoAnalysisScreen re-renders when bubble state changes
  const bubbleVisible = useFeedbackCoordinatorStore((state) =>
    process.env.NODE_ENV !== 'test' ? state.bubbleState.bubbleVisible : false
  )
  const currentBubbleIndex = useFeedbackCoordinatorStore((state) =>
    process.env.NODE_ENV !== 'test' ? state.bubbleState.currentBubbleIndex : null
  )
  const bubbleItems = useMemo(
    () => feedbackItems.filter((item: any) => item.type === 'suggestion'),
    [feedbackItems]
  )

  // Reconstruct bubbleState locally (same structure as before)
  const bubbleState = useMemo(
    () => ({
      visible: bubbleVisible,
      currentIndex: currentBubbleIndex,
      items: bubbleItems,
    }),
    [bubbleVisible, currentBubbleIndex, bubbleItems]
  )

  // Reconstruct audioOverlay locally using subscribed state + passed functions
  // PERFORMANCE FIX: Eliminates VideoAnalysisLayout re-renders when audio overlay state changes
  // PERF FIX: Depend on primitive values (id, url) instead of activeAudio object
  // This prevents AudioPlayer mount/unmount loop when activeAudio reference changes
  const audioOverlay = useMemo(
    () => ({
      shouldShow: overlayVisible,
      activeAudio:
        activeAudioId && activeAudioUrl ? { id: activeAudioId, url: activeAudioUrl } : null,
      onClose: audioOverlayFunctions.onClose,
      onInactivity: audioOverlayFunctions.onInactivity,
      onInteraction: audioOverlayFunctions.onInteraction,
      audioDuration: audioController.duration,
    }),
    [
      overlayVisible,
      activeAudioId,
      activeAudioUrl,
      audioOverlayFunctions.onClose,
      audioOverlayFunctions.onInactivity,
      audioOverlayFunctions.onInteraction,
      audioController.duration,
    ]
  )

  // Social action handlers - moved from screen level to video section
  const [isShareSheetOpen, setShareSheetOpen] = useState(false)

  const socialActionHandlers = useMemo(
    () => ({
      onShare: () => {
        log.info('VideoPlayerSection', 'Share button pressed')
        setShareSheetOpen(true)
      },
      onLike: () => log.info('VideoPlayerSection', 'Like button pressed'),
      onComment: () => {
        log.info('VideoPlayerSection', 'Comment button pressed - requesting comments tab')
        requestFeedbackPanelTab('comments')
      },
      onBookmark: () => log.info('VideoPlayerSection', 'Bookmark button pressed'),
    }),
    [setShareSheetOpen]
  )

  // Compute videoShouldPlay locally using videoPlayer hook result
  const videoShouldPlay = videoPlayer.shouldPlayVideo

  // videoPlayerRef removed - using videoPlayer.ref from hook

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
      // CRITICAL: For replay (seek to 0), don't set pendingSeekTimeRef
      // Let progress events flow immediately without filtering
      // This makes replay behave like manual backward seek (instant, no delay)
      if (pendingSeek === 0) {
        // Clear tracking, don't set pending
        timeBeforeSeekRef.current = null
        persistedPreSeekProgressRef.current = null
        lastSeekTargetRef.current = null
        seekCompleteTimeRef.current = 0
        return
      }

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

  // PERFORMANCE FIX: Use fast imperative seek for progress bar touches
  // Falls back to slow callback-based seek if fast seek not yet registered
  const handleDirectSeek = useCallback(
    (time: number) => {
      if (fastSeek) {
        // FAST PATH: Call videoPlayer.seekDirect immediately (<16ms), then onSeek for state sync
        fastSeek(time)
      } else {
        // SLOW PATH: Fallback to callback-based seek (goes through React render cycle)
        onSeek(time)
      }
    },
    [fastSeek, onSeek]
  )

  // Only notify parent on significant progress changes (> 1 second)
  const handleProgress = useCallback(
    (data: { currentTime: number }) => {
      const { currentTime: reportedTime } = data

      // Ignore progress events when video isn't playing and we aren't waiting for a seek
      // Read isPlaying directly from store to avoid recreating callback on every change
      const isPlaying = useVideoPlayerStore.getState().isPlaying
      if (!isPlaying && pendingSeekTimeRef.current === null) {
        return
      }

      // Filter stale progress events that arrive shortly after a seek
      // Similar logic to useVideoPlayback.handleProgress
      const timeSinceSeekComplete = Date.now() - seekCompleteTimeRef.current
      const SEEK_STALE_EVENT_THRESHOLD_MS = 500

      // CRITICAL: Skip stale-event guard for restart scenarios (seek to 0)
      // After replay/restart, video starts from 0 and all progress > 0 is valid
      const isRestartScenario = lastSeekTargetRef.current === 0
      const shouldApplyStaleGuard = !isRestartScenario

      if (
        shouldApplyStaleGuard &&
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

        // CRITICAL: For restart scenarios (seek to 0), accept ANY forward progress immediately
        // Don't wait for proximity window - native player may have decode/buffer delay
        const isRestartScenario = targetTime === 0
        if (isRestartScenario && reportedTime > 0) {
          pendingSeekTimeRef.current = null
          timeBeforeSeekRef.current = null
          // Fall through to normal progress update
        }
        // Detect if this is a stale event from before a backward seek
        // If we seek backward and reported time is close to pre-seek time, it's stale
        else if (
          timeBeforeSeek !== null &&
          targetTime < timeBeforeSeek &&
          Math.abs(reportedTime - timeBeforeSeek) < 0.5 // Within 500ms of old position = stale
        ) {
          return
        }
        // If the reported time is very close to target (within 0.2s), accept it and clear pending seek
        else if (timeDifference < 0.2) {
          pendingSeekTimeRef.current = null
          timeBeforeSeekRef.current = null
          // Fall through to normal progress update
        }
        // If reported time is moving forward from target (video is playing past seek point)
        // Accept it and clear pending seek - we've successfully moved past the seek
        // But only if we're not dealing with a stale backward-seek event
        else if (reportedTime > targetTime + 0.2) {
          // Additional check: if we seeked backward, ignore events that are close to pre-seek time
          // This catches stale events from before the backward seek
          if (
            timeBeforeSeek !== null &&
            targetTime < timeBeforeSeek &&
            Math.abs(reportedTime - timeBeforeSeek) < 0.5 // Within 500ms of old position = stale
          ) {
            return
          }

          pendingSeekTimeRef.current = null
          timeBeforeSeekRef.current = null
          // Fall through to normal progress update
        }
        // If reported time is approaching target from before (within 1s window), accept it
        // This handles the case where we seek forward and video catches up
        // BUT: Only if we didn't seek backward (would be stale event)
        else if (reportedTime >= targetTime - 1.0 && reportedTime < targetTime + 0.2) {
          // Additional check: if we seeked backward, don't accept events that are close to pre-seek time
          const isStaleBackwardSeekEvent =
            timeBeforeSeek !== null &&
            targetTime < timeBeforeSeek &&
            Math.abs(reportedTime - timeBeforeSeek) < 0.5

          if (isStaleBackwardSeekEvent) {
            return
          }

          // Fall through to normal progress update
        }
        // Ignore stale progress events that are too far behind the target
        // This filters out old progress events from before the seek
        else if (reportedTime < targetTime - 1.0) {
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

      // CRITICAL: Update store with precise time for progress bars
      videoPlayer.handleProgress(reportedTime)

      // Notify parent on every progress update (for bubble triggers, feedback coordination)
      // The > 1 second throttle broke bubble detection - we need updates every ~200ms
      lastNotifiedTimeRef.current = reportedTime
      onSignificantProgress(reportedTime)
    },
    [onSignificantProgress, duration, currentTime, videoPlayer]
  )

  // Handle seek completion - update local currentTime immediately
  // This ensures VideoControls shows the correct time after seeking
  const handleSeekComplete = useCallback(
    (seekTime?: number) => {
      const resolvedTime = seekTime ?? pendingSeek ?? currentTime
      if (typeof resolvedTime === 'number' && Number.isFinite(resolvedTime)) {
        log.debug('VideoPlayerSection.handleSeekComplete', 'Synchronizing seek result', {
          seekTime,
          pendingSeek,
          currentTime,
          resolvedTime,
        })
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

        // CRITICAL: For restart scenarios (seek to 0), don't set pendingSeekTimeRef
        // This prevents re-activating pending seek filtering that causes 2s delay
        // Manual seek backward and replay should both be instant
        const isRestartScenario = resolvedTime === 0
        if (!isRestartScenario) {
          // Track the target seek time so we can filter stale progress events
          pendingSeekTimeRef.current = resolvedTime
          // Track seek target for grace period filtering (similar to useVideoPlayback)
          lastSeekTargetRef.current = resolvedTime
          seekCompleteTimeRef.current = Date.now()
        }

        // CRITICAL: Update store with precise seek time for progress bars
        videoPlayer.handleSeekComplete(resolvedTime)
      }
      onSeekComplete(seekTime ?? pendingSeek ?? null)
    },
    [currentTime, pendingSeek, onSeekComplete, videoPlayer]
  )

  handleSeekCompleteRef.current = handleSeekComplete

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
      const handled = videoPlayer.handleEnd(endTime)
      if (!handled) {
        log.debug(
          'VideoPlayerSection.handleEnd',
          'Ignoring stale end event (delegated to useVideoPlayer)',
          {
            endTime,
          }
        )
        return
      }

      // Update local currentTime state to the actual end time if provided
      // This ensures the UI shows the correct end time even if progress was throttled
      if (typeof endTime === 'number' && Number.isFinite(endTime)) {
        setCurrentTime(endTime)
        lastNotifiedTimeRef.current = endTime
      }

      onEnd(endTime)
    },
    [onEnd, videoPlayer]
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

  // Animation styles for avatar - visible in max mode [0, 0.1] regardless of controls visibility
  const avatarAnimatedStyle = useAnimatedStyle(() => {
    if (!collapseProgress) return { opacity: 1 }
    // Fade in when in max mode (collapseProgress 0-0.1), fade out when transitioning away
    // Avatar remains visible in max mode even when controls are hidden
    const opacity = interpolate(collapseProgress.value, [0, 0.1], [1, 0], Extrapolation.CLAMP)
    return {
      opacity,
      transform: [
        { translateY: interpolate(collapseProgress.value, [0, 1], [0, -12], Extrapolation.CLAMP) },
        { scale: interpolate(collapseProgress.value, [0, 1], [1, 0.9], Extrapolation.CLAMP) },
      ],
    }
  })

  // Shared value for social icons opacity - synced with controls visibility (matches title/avatar pattern)
  const socialOverlayOpacity = useSharedValue(showControls ? 1 : 0)

  // Sync social icons overlay opacity with controls visibility
  useEffect(() => {
    socialOverlayOpacity.value = showControls ? 1 : 0
  }, [showControls, socialOverlayOpacity])

  // Animation styles for social icons - matches title pattern with range [0.4, 0.5, 0.6]
  // Fade in from 0.4 to 0.5, fade out from 0.5 to 0.6 (visible only at 0.5 normal mode)
  const socialAnimatedStyle = useAnimatedStyle(() => {
    if (!collapseProgress) return { opacity: 1 }
    // Fade in from 0.4 to 0.5, fade out from 0.5 to 0.6 (matches title pattern but narrower range)
    const collapseOpacity = interpolate(
      collapseProgress.value,
      [0.4, 0.5, 0.6],
      [0, 1, 0],
      Extrapolation.CLAMP
    )
    // Combine collapse opacity with controls visibility opacity (matches title pattern - direct assignment, no easing)
    const opacity = collapseOpacity * socialOverlayOpacity.value
    return {
      opacity,
      transform: [
        { translateY: interpolate(collapseProgress.value, [0, 1], [16, 0], Extrapolation.CLAMP) },
      ],
    }
  }, [socialOverlayOpacity])

  // Shared value for title overlay opacity - synced with actual controls visibility (not forced visibility)
  const titleOverlayOpacity = useSharedValue(actualControlsVisible ? 1 : 0)

  // Sync title overlay opacity with actual controls visibility (respects auto-hide, not forced visibility)
  useEffect(() => {
    titleOverlayOpacity.value = actualControlsVisible ? 1 : 0
  }, [actualControlsVisible, titleOverlayOpacity])

  // Animation style for video title overlay - only visible in max mode (collapseProgress = 0) and when controls are visible
  const titleOverlayAnimatedStyle = useAnimatedStyle(() => {
    if (!collapseProgress || !analysisTitle) return { opacity: 0 }
    // Fade in when in max mode (collapseProgress 0-0.1), fade out when transitioning away
    const collapseOpacity = interpolate(
      collapseProgress.value,
      [0, 0.1],
      [1, 0],
      Extrapolation.CLAMP
    )
    // Combine collapse opacity with controls visibility opacity
    const opacity = collapseOpacity * titleOverlayOpacity.value
    return {
      opacity,
      transform: [
        {
          translateY: interpolate(collapseProgress.value, [0, 0.1], [0, -20], Extrapolation.CLAMP),
        },
      ],
    }
  }, [analysisTitle])
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
              ref={nativeVideoPlayerRef}
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

          {/* Video Title Overlay - Only visible in max mode (collapseProgress = 0) */}
          {analysisTitle && (
            <Animated.View
              style={[
                titleOverlayAnimatedStyle,
                { zIndex: 5, position: 'absolute', top: 0, left: 0, right: 0 },
              ]}
              testID="video-title-overlay-container"
            >
              <VideoTitle
                title={analysisTitle}
                overlayMode={true}
                isEditable={false}
                controlsVisible={showControls}
              />
            </Animated.View>
          )}

          {audioOverlay.activeAudio && (
            <AudioPlayer
              audioUrl={audioOverlay.activeAudio.url}
              controller={audioController}
              testID="feedback-audio-player"
            />
          )}

          <MotionCaptureOverlay
            poseData={[]}
            isVisible
          />

          <FeedbackBubbles
            messages={activeBubbleMessages}
            collapseProgress={collapseProgress}
          />

          {/* Audio Feedback Controls - Commented out, is for P1 */}
          {/* {audioOverlay.shouldShow && audioOverlay.activeAudio && (
            <AudioFeedback
              audioUrl={audioOverlay.activeAudio.url}
              controller={audioController}
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
              isSpeaking={isCoachSpeaking}
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
              likes={SOCIAL_COUNTS.likes}
              comments={SOCIAL_COUNTS.comments}
              bookmarks={SOCIAL_COUNTS.bookmarks}
              shares={SOCIAL_COUNTS.shares}
              onShare={socialActionHandlers.onShare}
              onLike={socialActionHandlers.onLike}
              onComment={socialActionHandlers.onComment}
              onBookmark={socialActionHandlers.onBookmark}
              isVisible={true}
              placement="rightBottom"
              offsetBottom={30}
            />
          </Animated.View>

          <VideoControls
            ref={videoControlsRef}
            isPlaying={videoPlayer.isPlaying || audioIsPlaying}
            currentTime={storeCurrentTime}
            duration={storeDuration}
            showControls={showControls}
            isProcessing={isProcessing}
            videoEnded={videoEnded}
            videoMode={videoMode}
            collapseProgress={collapseProgress}
            overscroll={overscroll}
            onPlay={onPlay}
            onPause={onPause}
            onReplay={onReplay}
            onSeek={handleDirectSeek}
            onControlsVisibilityChange={handleControlsVisibilityChange}
            onPersistentProgressBarPropsChange={onPersistentProgressBarPropsChange}
            persistentProgressStoreSetter={persistentProgressStoreSetter}
            persistentProgressShared={playbackProgressShared}
          />
          {/* PERFORMANCE FIX: Always mount sheet to avoid mounting BlurView during animation */}
          <ShareSheet
            open={isShareSheetOpen}
            onOpenChange={setShareSheetOpen}
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
