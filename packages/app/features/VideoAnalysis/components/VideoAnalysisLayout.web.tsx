import { YStack } from 'tamagui'

import { VideoAnalysisProvider } from '../contexts/VideoAnalysisContext'
import { FeedbackSection } from './FeedbackSection'
import { UploadErrorState } from './UploadErrorState'
import type { VideoAnalysisLayoutProps } from './VideoAnalysisLayout.native'
import { VideoPlayerSection } from './VideoPlayerSection'

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
    gesture,
  } = props

  return (
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
          <YStack flex={1}>
            {/* Video player section */}
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
              onReplay={handlers.onPause}
              onSeek={handlers.onSeek}
              onSeekComplete={handlers.onSeekComplete}
              onSignificantProgress={handlers.onSignificantProgress}
              onLoad={handlers.onVideoLoad}
              onEnd={handlers.onPause}
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
            />

            {/* Feedback section */}
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
          </YStack>
        )}
      </YStack>
    </VideoAnalysisProvider>
  )
}
