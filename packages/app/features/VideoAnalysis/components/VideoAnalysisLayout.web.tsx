import { useCallback, useState, useSyncExternalStore } from 'react'

import { YStack } from 'tamagui'

import { type PersistentProgressBarProps, ProgressBar } from '@ui/components/VideoAnalysis'

import { useVideoPlayerStore } from '../stores'
import { FeedbackSection } from './FeedbackSection'
import { UploadErrorState } from './UploadErrorState'
import type { VideoAnalysisLayoutProps } from './VideoAnalysisLayout.native'
import { VideoPlayerSection } from './VideoPlayerSection'
import { toggleControlsVisibilityOnTap } from './toggleControlsVisibility'

/**
 * VideoAnalysisLayout - Web Implementation
 *
 * Renders the web-specific layout with simplified structure (no gestures/animations).
 * This component is automatically selected by the bundler when Platform.OS === 'web'.
 *
 * Features:
 * - Simplified layout without gesture handling
 * - No animated transitions (uses static layout)
 * - Same interface as native for consistency
 * - Gesture/animation props accepted but ignored
 *
 * @param props - All orchestrated state and handlers from VideoAnalysisScreen
 */
export function VideoAnalysisLayout(props: VideoAnalysisLayoutProps) {
  const {
    video,
    feedback,
    // feedbackAudioUrls, - REMOVED: FeedbackSection subscribes directly
    // feedbackErrors, - REMOVED: FeedbackSection subscribes directly
    handlers,
    videoControlsRef,
    controls,
    error,
    // audioController, - REMOVED: moved to VideoPlayerSection
    audioOverlay,
    // coachSpeaking, - REMOVED: VideoPlayerSection now subscribes directly
    videoUri,
    gesture,
    animation,
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

  const handleTap = useCallback(() => {
    toggleControlsVisibilityOnTap(controlsVisible, controls.onControlsVisibilityChange)
  }, [controls])

  const computedVideoAreaScale = 0.6

  return (
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
        <YStack
          flex={1}
          position="relative"
        >
          {/* Video player section */}
          <VideoPlayerSection
            videoUri={videoUri}
            videoControlsRef={videoControlsRef}
            isProcessing={video.isProcessing}
            videoAreaScale={computedVideoAreaScale}
            posterUri={video.posterUri}
            onPlay={handlers.onPlay}
            onPause={handlers.onPause}
            onReplay={handlers.onPause}
            onSeek={handlers.onSeek}
            onSeekComplete={handlers.onSeekComplete}
            onSignificantProgress={handlers.onSignificantProgress}
            onLoad={handlers.onVideoLoad}
            onEnd={handlers.onPause}
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
            collapseProgress={animation.collapseProgress}
            overscroll={animation.scrollY}
            onPersistentProgressBarPropsChange={handlePersistentProgressBarPropsChange}
          />

          {/* Feedback section */}
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

          {/* Persistent Progress Bar - Rendered at layout level with high z-index to stay above feedback */}
          {persistentProgressBarProps && (
            <YStack
              position="absolute"
              bottom={0}
              left={0}
              right={0}
              zIndex={10}
              pointerEvents="box-none"
              testID="persistent-progress-bar-container"
            >
              <ProgressBar
                variant="persistent"
                animatedStyle={persistentProgressBarProps.animatedStyle}
                pointerEvents={persistentProgressBarProps.pointerEvents}
                progress={
                  persistentProgressBarProps.duration > 0
                    ? (persistentProgressBarProps.currentTime /
                        persistentProgressBarProps.duration) *
                      100
                    : 0
                }
                isScrubbing={persistentProgressBarProps.isScrubbing}
                controlsVisible={persistentProgressBarProps.controlsVisible}
                combinedGesture={persistentProgressBarProps.combinedGesture}
                mainGesture={persistentProgressBarProps.mainGesture}
                onLayout={persistentProgressBarProps.onLayout}
                onFallbackPress={persistentProgressBarProps.onFallbackPress}
                testID="persistent-progress-bar"
              />
            </YStack>
          )}
        </YStack>
      )}
    </YStack>
  )
}
