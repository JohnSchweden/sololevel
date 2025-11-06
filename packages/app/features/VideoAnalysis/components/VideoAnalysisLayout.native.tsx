import { GlassBackground } from '@my/ui'
import type { RefObject } from 'react'
import { useCallback, useMemo } from 'react'
import { Dimensions } from 'react-native'
import type { ViewStyle } from 'react-native'
import { GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler'
import type { GestureType } from 'react-native-gesture-handler'
import Animated, { Extrapolation, interpolate, useAnimatedStyle } from 'react-native-reanimated'
import type { AnimatedRef, AnimatedStyle, SharedValue } from 'react-native-reanimated'
import { YStack } from 'tamagui'

import {
  type PersistentProgressBarProps,
  ProgressBar,
  type VideoControlsRef,
} from '@ui/components/VideoAnalysis'

import type { AnalysisPhase } from '../hooks/useAnalysisState'
import type { AudioControllerState } from '../hooks/useAudioController'
import { usePersistentProgressStore } from '../stores'
import type { FeedbackPanelItem } from '../types'
import { FeedbackSection } from './FeedbackSection'
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
    feedbackScrollEnabled: boolean
    blockFeedbackScrollCompletely: boolean
    isPullingToRevealJS: boolean
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
  }

  // Playback state
  playback: {
    isPlaying: boolean
    currentTime: number // Display time - updates every 1 second for UI
    videoEnded: boolean
    pendingSeek: number | null
    shouldPlayVideo: boolean
  }

  // Feedback state
  feedback: {
    items: FeedbackPanelItem[]
    panelFraction: number
    activeTab: 'feedback' | 'insights' | 'comments'
    selectedFeedbackId: string | null
    currentTime?: number // Optional - deprecated, use video.currentTime instead
    phase: AnalysisPhase
    progress: {
      upload: number
      analysis: number
      feedback: number
    }
    channelExhausted: boolean
  }

  // Audio URLs and errors - passed separately to prevent unnecessary VideoAnalysisLayout re-renders
  // VideoAnalysisLayout doesn't use these directly, only passes them to FeedbackSection
  feedbackAudioUrls: Record<string, string>
  feedbackErrors: Record<string, string>

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
    onFeedbackItemPress: (item: FeedbackPanelItem) => void
    onCollapsePanel: () => void
    onRetry: () => void
    onShare: () => void
    onLike: () => void
    onComment: () => void
    onBookmark: () => void
    onSelectAudio: (feedbackId: string) => void
    onFeedbackScrollY: (scrollY: number) => void
    onFeedbackMomentumScrollEnd: () => void
    onTabChange: (tab: 'feedback' | 'insights' | 'comments') => void
    onExpand: () => void
    onRetryFeedback: (feedbackId: string) => void
    onDismissError: (feedbackId: string) => void
  }

  // Component refs
  videoControlsRef: RefObject<VideoControlsRef | null>

  // Display state
  controls: {
    showControls: boolean
    onControlsVisibilityChange: (visible: boolean, isUserInteraction?: boolean) => void
    persistentProgressStoreSetter?: (props: PersistentProgressBarProps | null) => void
  }

  // Error state
  error: {
    visible: boolean
    message: string | null
    onRetry: () => void
    onBack: () => void
  }

  // Audio controller
  audioController: AudioControllerState

  // Audio state (FIX 3: grouped audio props)
  audio?: {
    controller: AudioControllerState
    source: any // FeedbackAudioSourceState - avoid circular import
    sync: any // VideoAudioSyncState - avoid circular import
  }

  // Bubble state
  bubbleState: {
    visible: boolean
    currentIndex: number | null
    items: FeedbackPanelItem[]
  }

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
  coachSpeaking: boolean

  // Social counts
  socialCounts: {
    likes: number
    comments: number
    bookmarks: number
    shares: number
  }

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
  // Destructure props for use
  const { feedbackAudioUrls, feedbackErrors } = props

  const {
    gesture,
    animation,
    video,
    playback,
    feedback,
    handlers,
    videoControlsRef,
    controls,
    error,
    audioController,
    bubbleState,
    audioOverlay,
    coachSpeaking,
    socialCounts,
    videoUri,
  } = props

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
   * @see usePersistentProgressStore - store with reference stability
   */
  const persistentProgressBarProps = usePersistentProgressStore((state) => state.props)

  // Toggle controls visibility on tap; guard with latest visibility state
  const handleTap = useCallback(() => {
    toggleControlsVisibilityOnTap(controls.showControls, controls.onControlsVisibilityChange)
  }, [controls])

  // Memoize social action handlers to prevent VideoPlayerSection re-renders
  const socialActionHandlers = useMemo(
    () => ({
      onShare: handlers.onShare,
      onLike: handlers.onLike,
      onComment: handlers.onComment,
      onBookmark: handlers.onBookmark,
    }),
    [handlers.onShare, handlers.onLike, handlers.onComment, handlers.onBookmark]
  )

  // Memoize inline calculations to prevent VideoPlayerSection re-renders
  const computedShowControls = useMemo(
    () => video.isReady && controls.showControls,
    [video.isReady, controls.showControls]
  )

  const computedVideoAreaScale = useMemo(() => 1 - feedback.panelFraction, [feedback.panelFraction])

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
  // When feedbackScrollEnabled is false, that indicates a gesture is active and animations are happening

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
                  pendingSeek={playback.pendingSeek}
                  userIsPlaying={playback.isPlaying}
                  videoShouldPlay={playback.shouldPlayVideo}
                  videoEnded={playback.videoEnded}
                  showControls={computedShowControls}
                  isProcessing={video.isProcessing}
                  videoAreaScale={computedVideoAreaScale}
                  posterUri={video.posterUri}
                  onPlay={handlers.onPlay}
                  onPause={handlers.onPause}
                  onReplay={handlers.onReplay}
                  onSeek={handlers.onSeek}
                  onSeekComplete={handlers.onSeekComplete}
                  onSignificantProgress={handlers.onSignificantProgress}
                  onLoad={handlers.onVideoLoad}
                  onEnd={handlers.onEnd}
                  onTap={handleTap}
                  onControlsVisibilityChange={controls.onControlsVisibilityChange}
                  audioPlayerController={audioController}
                  bubbleState={bubbleState}
                  audioOverlay={audioOverlay}
                  coachSpeaking={coachSpeaking}
                  panelFraction={feedback.panelFraction}
                  socialCounts={socialCounts}
                  onSocialAction={socialActionHandlers}
                  collapseProgress={animation.collapseProgress}
                  persistentProgressStoreSetter={controls.persistentProgressStoreSetter}
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
              {persistentProgressBarProps && (
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
                  <ProgressBar
                    variant="persistent"
                    progress={
                      persistentProgressBarProps.duration > 0
                        ? (persistentProgressBarProps.currentTime /
                            persistentProgressBarProps.duration) *
                          100
                        : 0
                    }
                    isScrubbing={persistentProgressBarProps.isScrubbing}
                    controlsVisible={persistentProgressBarProps.controlsVisible}
                    progressBarWidth={persistentProgressBarProps.progressBarWidth}
                    animatedStyle={persistentProgressBarProps.animatedStyle}
                    combinedGesture={persistentProgressBarProps.combinedGesture}
                    mainGesture={persistentProgressBarProps.mainGesture}
                    onLayout={persistentProgressBarProps.onLayout}
                    onFallbackPress={persistentProgressBarProps.onFallbackPress}
                    testID="persistent-progress-bar"
                  />
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
                channelExhausted={feedback.channelExhausted}
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
                  panelFraction={feedback.panelFraction}
                  activeTab={feedback.activeTab}
                  feedbackItems={feedback.items}
                  selectedFeedbackId={feedback.selectedFeedbackId}
                  currentVideoTime={playback.currentTime ?? 0}
                  videoDuration={0}
                  errors={feedbackErrors}
                  audioUrls={feedbackAudioUrls}
                  onTabChange={handlers.onTabChange}
                  onExpand={handlers.onExpand}
                  onCollapse={handlers.onCollapsePanel}
                  onItemPress={handlers.onFeedbackItemPress}
                  onSeek={handlers.onSeek}
                  onRetryFeedback={handlers.onRetryFeedback}
                  onDismissError={handlers.onDismissError}
                  onSelectAudio={handlers.onSelectAudio}
                  onScrollYChange={handlers.onFeedbackScrollY}
                  onScrollEndDrag={handlers.onFeedbackMomentumScrollEnd}
                  scrollEnabled={
                    gesture.feedbackScrollEnabled && !gesture.blockFeedbackScrollCompletely
                  }
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
