import { Platform } from 'react-native'

import { useCallback } from 'react'
import { VideoAnalysisLayout } from './components/VideoAnalysisLayout.native'
import { useVideoAnalysisOrchestrator } from './hooks/useVideoAnalysisOrchestrator'
import type { VideoAnalysisScreenProps } from './hooks/useVideoAnalysisOrchestrator'

/**
 * VideoAnalysisScreen - Integration layer
 *
 * Simplified component that orchestrates all hooks via useVideoAnalysisOrchestrator
 * and delegates rendering to platform-specific layout components.
 *
 * Architecture:
 * - Props → useVideoAnalysisOrchestrator → Platform Layout
 * - All hook coordination happens in orchestrator
 * - Main component focuses on integration, not coordination
 *
 * Platform Selection:
 * - Native: VideoAnalysisLayout.native.tsx (with gestures/animations)
 * - Web: VideoAnalysisLayout.web.tsx (simplified, no gestures)
 *
 * @param props - VideoAnalysisScreen props
 */
export function VideoAnalysisScreen(props: VideoAnalysisScreenProps) {
  // Orchestrate all hooks and aggregate interfaces
  const orchestrated = useVideoAnalysisOrchestrator(props)

  // Memoize default onBack to prevent closure recreation on every render
  const defaultOnBack = useCallback(() => {}, [])

  // Aggregate all props for layout component
  // Note: gesture and animation are always present (hooks called unconditionally to avoid Rules of Hooks violations)
  const layoutProps = {
    gesture: {
      rootPan: orchestrated.gesture?.rootPan ?? ({} as any),
      feedbackScrollEnabled: orchestrated.gesture?.feedbackScrollEnabled ?? true,
      blockFeedbackScrollCompletely: orchestrated.gesture?.blockFeedbackScrollCompletely ?? false,
      isPullingToRevealJS: orchestrated.gesture?.isPullingToRevealJS ?? false,
      onFeedbackScrollY: orchestrated.gesture?.onFeedbackScrollY ?? (() => {}),
      onFeedbackMomentumScrollEnd: orchestrated.gesture?.onFeedbackMomentumScrollEnd ?? (() => {}),
      rootPanRef: orchestrated.gesture?.rootPanRef ?? { current: null },
    },
    animation: {
      scrollY: orchestrated.animation?.scrollY ?? ({ value: 0 } as any),
      collapseProgress: orchestrated.animation?.collapseProgress ?? ({ value: 0.5 } as any),
      headerStyle: orchestrated.animation?.headerStyle ?? {},
      feedbackSectionStyle: orchestrated.animation?.feedbackSectionStyle ?? {},
      pullIndicatorStyle: orchestrated.animation?.pullIndicatorStyle ?? {},
      headerTransformStyle: orchestrated.animation?.headerTransformStyle ?? {},
      scrollRef: (orchestrated.animation?.scrollRef ?? { current: null }) as any,
      feedbackContentOffsetY:
        orchestrated.animation?.feedbackContentOffsetY ?? ({ value: 0 } as any),
    },
    video: orchestrated.video,
    playback: orchestrated.playback,
    feedback: {
      items: orchestrated.feedback.items,
      panelFraction: orchestrated.feedback.panelFraction,
      activeTab: orchestrated.feedback.activeTab,
      selectedFeedbackId: orchestrated.feedback.selectedFeedbackId,
      currentTime: orchestrated.video.currentTime,
      phase: orchestrated.feedback.phase,
      progress: orchestrated.feedback.progress,
      channelExhausted: orchestrated.feedback.channelExhausted,
      errors: orchestrated.feedback.errors,
      audioUrls: orchestrated.feedback.audioUrls,
    },
    handlers: {
      ...orchestrated.handlers,
      onTabChange: orchestrated.feedback.panel.setActiveTab,
      onExpand: orchestrated.feedback.panel.expand,
      onRetryFeedback: orchestrated.feedback.state.feedback.retryFailedFeedback,
      onDismissError: orchestrated.audio.source.clearError,
    },
    videoControlsRef: orchestrated.refs.videoControlsRef,
    controls: orchestrated.controls,
    error: {
      ...orchestrated.error,
      onRetry: orchestrated.handlers.onRetry,
      onBack: orchestrated.handlers.onBack ?? defaultOnBack,
    },
    audioController: orchestrated.audio.controller,
    bubbleState: {
      visible: orchestrated.feedback.coordinator.bubbleState.bubbleVisible,
      currentIndex: orchestrated.feedback.coordinator.bubbleState.currentBubbleIndex,
      items: orchestrated.feedback.items,
    },
    audioOverlay: {
      shouldShow: orchestrated.feedback.coordinator.overlayVisible,
      activeAudio: orchestrated.feedback.coordinator.activeAudio,
      onClose: orchestrated.feedback.coordinator.onAudioOverlayClose,
      onInactivity: orchestrated.feedback.coordinator.onAudioOverlayInactivity,
      onInteraction: orchestrated.feedback.coordinator.onAudioOverlayInteraction,
      audioDuration: orchestrated.audio.controller.duration,
    },
    coachSpeaking:
      Platform.OS !== 'web'
        ? orchestrated.feedback.coordinator.isCoachSpeaking
        : orchestrated.audio.controller.isPlaying,
    socialCounts:
      Platform.OS !== 'web'
        ? { likes: 1200, comments: 89, bookmarks: 234, shares: 1500 }
        : { likes: 0, comments: 0, bookmarks: 0, shares: 0 },
    contextValue: orchestrated.contextValue,
  }

  // Platform-based layout selection
  return <VideoAnalysisLayout {...layoutProps} />
}

// Re-export props type for convenience
export type { VideoAnalysisScreenProps }
