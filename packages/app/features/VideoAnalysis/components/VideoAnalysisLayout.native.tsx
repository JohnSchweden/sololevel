import { GlassBackground } from '@my/ui'
import { useCallback, useSyncExternalStore } from 'react'
import type { RefObject } from 'react'
import { Dimensions } from 'react-native'
import type { ViewStyle } from 'react-native'
import { GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler'
import type { GestureType } from 'react-native-gesture-handler'
import Animated, { Extrapolation, interpolate, useAnimatedStyle } from 'react-native-reanimated'
import type { AnimatedRef, AnimatedStyle, SharedValue } from 'react-native-reanimated'
import { YStack } from 'tamagui'

import { type VideoControlsRef } from '@ui/components/VideoAnalysis'

import type { AnalysisPhase } from '../hooks/useAnalysisState'
import type { FeedbackScrollControl, PullToRevealControl } from '../hooks/useGestureController'
import { usePersistentProgressStore, useVideoPlayerStore } from '../stores'
import type { FeedbackPanelItem } from '../types'
import { FeedbackSection } from './FeedbackSection'
import { PersistentProgressBar } from './PersistentProgressBar'
import { ProcessingIndicator } from './ProcessingIndicator'
import { UploadErrorState } from './UploadErrorState'
import { VideoPlayerSection } from './VideoPlayerSection'
import { toggleControlsVisibilityOnTap } from './toggleControlsVisibility'

// Animation constants - Mode-based system
const { height: SCREEN_H } = Dimensions.get('window')

// Discrete video heights per mode (for contentContainerStyle)
const VIDEO_HEIGHTS = {
  max: SCREEN_H, // 100% - full screen
  normal: Math.round(SCREEN_H * 0.6), // 60% - default viewing
  min: Math.round(SCREEN_H * 0.33), // 33% - collapsed dock
} as const

// Mode transition scroll positions (for persistent progress bar positioning)
const MODE_SCROLL_POSITIONS = {
  max: 0,
  normal: VIDEO_HEIGHTS.max - VIDEO_HEIGHTS.normal, // 40% of screen
  min: VIDEO_HEIGHTS.max - VIDEO_HEIGHTS.min, // 67% of screen
} as const

/**
 * Props for VideoAnalysisLayout (Native)
 *
 * This component handles the native-specific render tree with gesture integration
 * and animated layout transitions. It receives all orchestrated state and handlers
 * from the parent VideoAnalysisScreen.
 */
export interface VideoAnalysisLayoutProps {
  // Gesture & Animation controllers
  gesture: {
    rootPan: GestureType
    feedbackScroll: FeedbackScrollControl
    pullToReveal: PullToRevealControl
    onFeedbackScrollY: (scrollY: number) => void
    onFeedbackMomentumScrollEnd: () => void
    rootPanRef: RefObject<any>
  }
  animation: {
    scrollY: SharedValue<number>
    collapseProgress: SharedValue<number>
    headerStyle: AnimatedStyle<ViewStyle>
    feedbackSectionStyle: AnimatedStyle<ViewStyle>
    pullIndicatorStyle: AnimatedStyle<ViewStyle>
    scrollRef: AnimatedRef<Animated.ScrollView>
    feedbackContentOffsetY: SharedValue<number>
  }

  // Video state
  video: {
    uri: string
    posterUri?: string
    isReady: boolean
    isProcessing: boolean
    initialStatus?: 'processing' | 'ready' | 'playing' | 'paused' // For useVideoPlayer
  }

  // Feedback state
  feedback: {
    items: FeedbackPanelItem[]
    // panelFraction: number - MOVED: FeedbackSection subscribes directly
    // activeTab: 'feedback' | 'insights' | 'comments' - MOVED: FeedbackSection subscribes directly
    // selectedFeedbackId: string | null - REMOVED: FeedbackSection subscribes directly
    currentTime?: number // Optional - deprecated, use video.currentTime instead
    phase: AnalysisPhase
    progress: {
      upload: number
      analysis: number
      feedback: number
    }
    analysisTitle?: string // AI-generated analysis title
  }

  subscription: {
    key: string | null
    shouldSubscribe: boolean
  }

  // Audio URLs and errors - REMOVED: FeedbackSection now subscribes directly from store
  // feedbackAudioUrls: Record<string, string>
  // feedbackErrors: Record<string, string>

  // Handlers
  handlers: {
    onPlay: () => void
    onPause: () => void
    onReplay: () => void
    onEnd: () => void
    onSeek: (time: number) => void
    onSeekComplete: (time: number | null) => void
    onVideoLoad: (data: { duration: number }) => void
    onSignificantProgress: (time: number) => void
    onAudioNaturalEnd: () => void
    onFeedbackItemPress: (item: FeedbackPanelItem) => void
    onCollapsePanel: () => void
    onRetry: () => void
    onSelectAudio: (feedbackId: string) => void
    onFeedbackScrollY: (scrollY: number) => void
    onFeedbackMomentumScrollEnd: () => void
    // onTabChange removed - FeedbackSection handles tab changes directly
    // onExpand removed - FeedbackSection handles expand directly
    onRetryFeedback: (feedbackId: string) => void
    onDismissError: (feedbackId: string) => void
  }

  // Component refs
  videoControlsRef: RefObject<VideoControlsRef | null>

  // Display state - only callbacks remain (state moved to store)
  controls: {
    onControlsVisibilityChange: (visible: boolean, isUserInteraction?: boolean) => void
    // persistentProgressStoreSetter: (props: any) => void - REMOVED: VideoPlayerSection subscribes directly
  }

  // Error state
  error: {
    visible: boolean
    message: string | null
    onRetry: () => void
    onBack: () => void
  }

  // Audio controller - REMOVED: now in VideoPlayerSection to prevent screen re-renders
  // audioController: AudioControllerState

  // Audio state (FIX 3: grouped audio props) - REMOVED: audioController moved to VideoPlayerSection
  // audio?: {
  //   controller: AudioControllerState
  //   source: any // FeedbackAudioSourceState - avoid circular import
  //   sync: any // VideoAudioSyncState - avoid circular import
  // }

  // Audio overlay
  audioOverlay: {
    shouldShow: boolean
    activeAudio: { id: string; url: string } | null
    onClose?: () => void
    onInactivity?: () => void
    onInteraction?: () => void
    audioDuration?: number
  }

  // Coach speaking state
  // coachSpeaking: boolean - REMOVED: VideoPlayerSection now subscribes directly

  // Video URI - passed directly instead of context to prevent memo bypass
  videoUri: string

  // REMOVED: persistentProgressBarProps - now read directly from Zustand store
  // REMOVED: onPersistentProgressBarPropsChange - deprecated, use store setter in controls
}

/**
 * VideoAnalysisLayout - Native Implementation
 *
 * Renders the native-specific layout with gesture handling and animated transitions.
 * This component is automatically selected by the bundler when Platform.OS !== 'web'.
 *
 * Features:
 * - YouTube-style gesture delegation (pull-to-reveal, swipe modes)
 * - Animated header collapse/expand
 * - Feedback panel with scroll integration
 * - Processing indicator overlay
 * - Error state handling
 *
 * Performance:
 * - React.memo was removed as internal hooks (Zustand subscriptions, animated values)
 *   bypass memoization. Optimization should be handled at parent level by stabilizing
 *   props and moving state subscriptions to child components.
 *
 * @param props - All orchestrated state and handlers from VideoAnalysisScreen
 */
function VideoAnalysisLayoutComponent(props: VideoAnalysisLayoutProps) {
  // PERF: Track render timing to identify FPS bottlenecks
  // const renderStartTime = __DEV__ ? performance.now() : 0

  // Audio URLs and errors - REMOVED: FeedbackSection now subscribes directly from store

  const {
    gesture,
    animation,
    video,
    feedback,
    subscription,
    handlers,
    videoControlsRef,
    controls,
    error,
    // audioController, - REMOVED: moved to VideoPlayerSection
    audioOverlay,
    // coachSpeaking, - REMOVED: VideoPlayerSection now subscribes directly
    videoUri,
  } = props

  // PERFORMANCE FIX: Granular store subscriptions - only re-render when specific values change
  // Eliminates prop drilling and prevents VideoAnalysisLayout re-renders on playback state changes
  // GATE: Only read displayTime after meaningful playback has started to avoid 0 → 6.133 flip
  const playbackCurrentTime =
    process.env.NODE_ENV !== 'test'
      ? useVideoPlayerStore((state) => {
          const isPlaying = state.isPlaying
          return isPlaying || state.pendingSeek !== null ? state.displayTime : 0
        })
      : 0
  const controlsVisible =
    process.env.NODE_ENV !== 'test' ? useVideoPlayerStore((state) => state.controlsVisible) : true

  const feedbackScrollSnapshot = useSyncExternalStore(
    gesture.feedbackScroll.subscribe,
    gesture.feedbackScroll.getSnapshot,
    gesture.feedbackScroll.getSnapshot
  )
  const isFeedbackScrollEnabled = feedbackScrollSnapshot.enabled
  const isFeedbackScrollCompletelyBlocked = feedbackScrollSnapshot.blockCompletely

  /**
   * Read persistent progress bar props directly from Zustand store.
   *
   * CRITICAL PERFORMANCE FIX: Reading directly from store prevents intermediary re-renders.
   *
   * Previous pattern (prop passing):
   * 1. VideoControls updates store
   * 2. VideoAnalysisScreen subscribes → re-renders
   * 3. Passes new prop to VideoAnalysisLayout → re-renders
   * Result: 2 renders (Screen + Layout)
   *
   * Current pattern (direct read):
   * 1. VideoControls updates store
   * 2. VideoAnalysisLayout subscribes → re-renders
   * Result: 1 render (Layout only)
   *
   * VideoAnalysisScreen does NOT subscribe to store, so it never re-renders
   * when persistent progress changes. Only VideoAnalysisLayout re-renders.
   *
   * PERF FIX 2: Use useShallow to subscribe only to primitive values, not gestures.
   * Gestures change frequently (Reanimated recreation) but don't affect rendering logic.
   * This prevents re-renders when only gesture IDs/handlerTags change.
   *
   * @see usePersistentProgressStore - store with reference stability
   */
  // PERF FIX FINAL: Only subscribe to shouldRenderPersistent flag
  // ProgressBar reads all other props directly from store (no parent re-render)
  const shouldRenderPersistent = usePersistentProgressStore(
    (state) => state.props?.shouldRenderPersistent ?? false
  )

  // PERF: Log render duration to identify bottlenecks
  // useEffect(() => {
  //   if (__DEV__) {
  //     const renderDuration = performance.now() - renderStartTime
  //     if (renderDuration > 16) {
  //       // More than 1 frame at 60fps
  //       log.warn('VideoAnalysisLayout', `Slow render: ${renderDuration.toFixed(2)}ms`, {
  //         stack: new Error('VideoAnalysisLayout slow render').stack ?? undefined,
  //       })
  //     }
  //   }
  // })

  // Toggle controls visibility on tap; guard with latest visibility state
  const handleTap = useCallback(() => {
    // Note: onControlsVisibilityChange is still passed as prop since it's a callback, not state
    toggleControlsVisibilityOnTap(controlsVisible, controls.onControlsVisibilityChange)
  }, [controlsVisible, controls.onControlsVisibilityChange])

  // Static layout: panelFraction is always EXPANDED_FRACTION (0.4), so videoAreaScale is always 0.6
  const computedVideoAreaScale = 0.6

  // Animated style for persistent progress bar positioning
  // Positions it at the bottom of the video header (top = headerHeight)
  const persistentProgressBarPositionStyle = useAnimatedStyle(() => {
    const scrollValue = animation.scrollY.value

    // Calculate headerHeight from scrollY (same logic as useAnimationController)
    let headerHeight: number
    if (scrollValue < 0) {
      // Pull-to-reveal: expand beyond max
      const pullDistance = Math.abs(scrollValue)
      const easedPull = interpolate(pullDistance, [0, 200], [0, 200 * 1.4], Extrapolation.CLAMP)
      headerHeight = VIDEO_HEIGHTS.max + easedPull
    } else if (scrollValue <= MODE_SCROLL_POSITIONS.normal) {
      // Phase 1: Max → Normal
      headerHeight = interpolate(
        scrollValue,
        [MODE_SCROLL_POSITIONS.max, MODE_SCROLL_POSITIONS.normal],
        [VIDEO_HEIGHTS.max, VIDEO_HEIGHTS.normal],
        Extrapolation.CLAMP
      )
    } else {
      // Phase 2: Normal → Min
      headerHeight = interpolate(
        scrollValue,
        [MODE_SCROLL_POSITIONS.normal, MODE_SCROLL_POSITIONS.min],
        [VIDEO_HEIGHTS.normal, VIDEO_HEIGHTS.min],
        Extrapolation.CLAMP
      )
    }

    return {
      top: headerHeight,
    }
  }, [animation.scrollY])

  // Performance tracking: Track header collapse animations
  // Reanimated animations are harder to track directly, so we track:
  // - Frame drops during animations (only when gesture is blocking scroll)
  // - Render performance
  // Note: Can't read SharedValue.value during render, so we use gesture state instead
  // When feedback scroll is disabled, that indicates a gesture is active and animations are happening

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <GlassBackground
        flex={1}
        backgroundColor="$color3"
        testID="video-analysis-screen"
      >
        <UploadErrorState
          visible={error.visible}
          errorMessage={error.message}
          onRetry={error.onRetry}
          onBack={error.onBack}
        />

        {!error.visible && (
          <GestureDetector gesture={gesture.rootPan}>
            <YStack flex={1}>
              {/* Collapsible header (video) */}
              <Animated.View
                style={[
                  {
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    zIndex: 2,
                    overflow: 'hidden',
                  },
                  animation.headerStyle,
                ]}
                testID="video-analysis-collapsible-header"
              >
                <VideoPlayerSection
                  videoUri={videoUri}
                  videoControlsRef={videoControlsRef}
                  isProcessing={video.isProcessing}
                  videoAreaScale={computedVideoAreaScale}
                  posterUri={video.posterUri}
                  initialStatus={video.initialStatus}
                  onPlay={handlers.onPlay}
                  onPause={handlers.onPause}
                  onReplay={handlers.onReplay}
                  onSeek={handlers.onSeek}
                  onSeekComplete={handlers.onSeekComplete}
                  onSignificantProgress={handlers.onSignificantProgress}
                  onLoad={handlers.onVideoLoad}
                  onEnd={handlers.onEnd}
                  onAudioNaturalEnd={handlers.onAudioNaturalEnd}
                  onTap={handleTap}
                  onControlsVisibilityChange={controls.onControlsVisibilityChange}
                  feedbackItems={feedback.items}
                  analysisTitle={feedback.analysisTitle}
                  audioOverlayFunctions={{
                    onClose: audioOverlay.onClose,
                    onInactivity: audioOverlay.onInactivity,
                    onInteraction: audioOverlay.onInteraction,
                    audioDuration: audioOverlay.audioDuration,
                  }}
                  // audioOverlay={audioOverlay} - RECONSTRUCTED: VideoPlayerSection subscribes to state directly
                  // panelFraction removed - static layout uses EXPANDED_FRACTION (0.4)
                  // onSetActiveTab removed - tab changes handled by FeedbackSection directly
                  collapseProgress={animation.collapseProgress}
                  overscroll={animation.scrollY}
                  // persistentProgressStoreSetter={controls.persistentProgressStoreSetter} - REMOVED: VideoPlayerSection subscribes directly from store
                />
              </Animated.View>

              {/* Pull-to-reveal indicator */}
              <Animated.View
                style={[
                  {
                    position: 'absolute',
                    top: VIDEO_HEIGHTS.normal - 40, // Show indicator at normal video height
                    left: 0,
                    right: 0,
                    zIndex: 3,
                    alignItems: 'center',
                    pointerEvents: 'none',
                  },
                  animation.pullIndicatorStyle,
                ]}
                testID="pull-to-reveal-indicator"
              >
                {/* Indicator content commented out in original - keeping same */}
              </Animated.View>

              {/* Persistent Progress Bar - Positioned at bottom of video header */}
              {shouldRenderPersistent && (
                <Animated.View
                  style={[
                    {
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      zIndex: 10,
                      pointerEvents: 'box-none',
                    },
                    persistentProgressBarPositionStyle,
                  ]}
                  testID="persistent-progress-bar-container"
                >
                  <PersistentProgressBar />
                </Animated.View>
              )}

              {/* Single scroll source with content starting below header */}
              <Animated.ScrollView
                ref={animation.scrollRef}
                scrollEnabled={false}
                pointerEvents="none"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                  paddingTop: VIDEO_HEIGHTS.max, // Start content below full video (100%)
                  paddingBottom: 0,
                }}
                testID="video-analysis-scroll-container"
              />

              {/* Processing Indicator - positioned absolutely to overlay above video section */}
              <ProcessingIndicator
                phase={
                  video.isReady && feedback.phase === 'generating-feedback'
                    ? ('ready' as AnalysisPhase)
                    : video.isReady
                      ? feedback.phase
                      : 'analyzing'
                }
                progress={feedback.progress}
                subscription={subscription}
              />

              {/* Feedback positioned absolutely below video header - tracks exact height */}
              {/* OPTIMIZED: feedbackSectionStyle now includes merged transform */}
              <Animated.View
                style={[
                  {
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    zIndex: 1,
                  },
                  animation.feedbackSectionStyle,
                ]}
                testID="feedback-section-container"
              >
                <FeedbackSection
                  feedbackItems={feedback.items}
                  analysisTitle={feedback.analysisTitle}
                  // selectedFeedbackId={feedback.selectedFeedbackId} - REMOVED: FeedbackSection subscribes directly
                  currentVideoTime={playbackCurrentTime}
                  videoDuration={0}
                  // errors={feedbackErrors} - REMOVED: FeedbackSection subscribes directly
                  // audioUrls={feedbackAudioUrls} - REMOVED: FeedbackSection subscribes directly
                  onCollapse={handlers.onCollapsePanel}
                  onItemPress={handlers.onFeedbackItemPress}
                  onSeek={handlers.onSeek}
                  onRetryFeedback={handlers.onRetryFeedback}
                  onDismissError={handlers.onDismissError}
                  onSelectAudio={handlers.onSelectAudio}
                  onScrollYChange={handlers.onFeedbackScrollY}
                  onScrollEndDrag={handlers.onFeedbackMomentumScrollEnd}
                  scrollEnabled={isFeedbackScrollEnabled && !isFeedbackScrollCompletelyBlocked}
                  rootPanRef={gesture.rootPanRef}
                />
              </Animated.View>
            </YStack>
          </GestureDetector>
        )}
      </GlassBackground>
    </GestureHandlerRootView>
  )
}

export const VideoAnalysisLayout = VideoAnalysisLayoutComponent

// Enable why-did-you-render tracking for performance debugging
if (__DEV__) {
  ;(VideoAnalysisLayout as any).whyDidYouRender = true
}
