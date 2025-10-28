import type { RefObject } from 'react'
import { useCallback, useState } from 'react'
import { Dimensions } from 'react-native'
import type { ViewStyle } from 'react-native'
import { GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler'
import type { GestureType } from 'react-native-gesture-handler'
import Animated from 'react-native-reanimated'
import type { AnimatedRef, AnimatedStyle, DerivedValue, SharedValue } from 'react-native-reanimated'
import { YStack } from 'tamagui'

import {
  type PersistentProgressBarProps,
  ProgressBar,
  type VideoControlsRef,
} from '@ui/components/VideoAnalysis'

import { VideoAnalysisProvider } from '../contexts/VideoAnalysisContext'
import type { AnalysisPhase } from '../hooks/useAnalysisState'
import type { AudioControllerState } from '../hooks/useAudioController'
import type { FeedbackPanelItem } from '../types'
import { FeedbackSection } from './FeedbackSection'
import { ProcessingIndicator } from './ProcessingIndicator'
import { UploadErrorState } from './UploadErrorState'
import { VideoPlayerSection } from './VideoPlayerSection'

// Animation constants - Mode-based system
const { height: SCREEN_H } = Dimensions.get('window')

// Discrete video heights per mode (for contentContainerStyle)
const VIDEO_HEIGHTS = {
  max: SCREEN_H, // 100% - full screen
  normal: Math.round(SCREEN_H * 0.6), // 60% - default viewing
  min: Math.round(SCREEN_H * 0.33), // 33% - collapsed dock
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
    headerHeight: DerivedValue<number>
    collapseProgress: DerivedValue<number>
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
    currentTime: number
    phase: AnalysisPhase
    progress: {
      upload: number
      analysis: number
      feedback: number
    }
    channelExhausted: boolean
    errors: Record<string, string>
    audioUrls: Record<string, string>
  }

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
    onControlsVisibilityChange: (visible: boolean) => void
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

  // Context value
  contextValue: {
    videoUri: string
    feedbackItems: FeedbackPanelItem[]
    isPullingToReveal: boolean
  }
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
 * @param props - All orchestrated state and handlers from VideoAnalysisScreen
 */
export function VideoAnalysisLayout(props: VideoAnalysisLayoutProps) {
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
    contextValue,
  } = props

  // Store persistent progress bar props for rendering at layout level
  // This ensures React properly tracks and re-renders when props change
  const [persistentProgressBarProps, setPersistentProgressBarProps] =
    useState<PersistentProgressBarProps | null>(null)

  // Callback to receive persistent progress bar props from VideoControls
  const handlePersistentProgressBarPropsChange = useCallback(
    (props: PersistentProgressBarProps | null) => {
      setPersistentProgressBarProps(props)
    },
    []
  )

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <VideoAnalysisProvider value={contextValue}>
        <YStack
          flex={1}
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
              <Animated.View style={{ flex: 1 }}>
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
                    videoControlsRef={videoControlsRef}
                    pendingSeek={playback.pendingSeek}
                    userIsPlaying={playback.isPlaying}
                    videoShouldPlay={playback.shouldPlayVideo}
                    videoEnded={playback.videoEnded}
                    showControls={video.isReady && controls.showControls}
                    isProcessing={video.isProcessing}
                    videoAreaScale={1 - feedback.panelFraction}
                    posterUri={video.posterUri}
                    onPlay={handlers.onPlay}
                    onPause={handlers.onPause}
                    onReplay={handlers.onReplay}
                    onSeek={handlers.onSeek}
                    onSeekComplete={handlers.onSeekComplete}
                    onSignificantProgress={handlers.onSignificantProgress}
                    onLoad={handlers.onVideoLoad}
                    onEnd={handlers.onEnd}
                    onTap={() => {}}
                    onControlsVisibilityChange={controls.onControlsVisibilityChange}
                    audioPlayerController={audioController}
                    bubbleState={bubbleState}
                    audioOverlay={audioOverlay}
                    coachSpeaking={coachSpeaking}
                    panelFraction={feedback.panelFraction}
                    socialCounts={socialCounts}
                    onSocialAction={{
                      onShare: handlers.onShare,
                      onLike: handlers.onLike,
                      onComment: handlers.onComment,
                      onBookmark: handlers.onBookmark,
                    }}
                    collapseProgress={animation.collapseProgress}
                    onPersistentProgressBarPropsChange={handlePersistentProgressBarPropsChange}
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

                {/* Persistent Progress Bar - Positioned at bottom of video header using same transform pattern */}
                {persistentProgressBarProps && (
                  <Animated.View
                    style={[
                      {
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        zIndex: 10,
                        pointerEvents: 'box-none',
                      },
                      {
                        transform: [{ translateY: animation.headerHeight }],
                      },
                    ]}
                    testID="persistent-progress-bar-container"
                  >
                    <ProgressBar
                      variant="persistent"
                      progress={persistentProgressBarProps.progress}
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
                >
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
                </Animated.ScrollView>

                {/* Feedback positioned absolutely below video header - tracks exact height */}
                <Animated.View
                  style={[
                    {
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      zIndex: 1,
                    },
                    {
                      transform: [{ translateY: animation.headerHeight }],
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
                    currentVideoTime={feedback.currentTime}
                    videoDuration={0}
                    errors={feedback.errors}
                    audioUrls={feedback.audioUrls}
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
              </Animated.View>
            </GestureDetector>
          )}
        </YStack>
      </VideoAnalysisProvider>
    </GestureHandlerRootView>
  )
}
