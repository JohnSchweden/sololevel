import { useCallback, useMemo, useRef, useState } from 'react'

import type { PersistentProgressBarProps } from '@ui/components/VideoAnalysis'
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
 * - All hook coordination happens in orchestrator (which handles memoization internally)
 * - Main component focuses on integration, not coordination
 *
 * Platform Selection:
 * - Native: VideoAnalysisLayout.native.tsx (with gestures/animations)
 * - Web: VideoAnalysisLayout.web.tsx (simplified, no gestures)
 *
 * Performance Optimization:
 * - Orchestrator return value is fully memoized at source, including pre-composed
 *   objects (audioOverlay, bubbleState) to prevent race conditions
 * - Memoization moved INTO orchestrator (not here) to prevent "MEMO BYPASSED" errors
 *   where props change between React.memo's arePropsEqual check and render
 * - Only minimal prop composition happens here (feedback object with currentTime)
 * - Handlers and error objects are memoized here with primitive dependencies
 * - persistentProgressBarProps uses content-based memoization to prevent unnecessary updates
 *
 * @param props - VideoAnalysisScreen props
 */
export function VideoAnalysisScreen(props: VideoAnalysisScreenProps) {
  // Orchestrate all hooks and aggregate interfaces
  // Return value is fully memoized inside the hook
  const orchestrated = useVideoAnalysisOrchestrator(props)

  /**
   * Lift persistentProgressBarProps state from VideoAnalysisLayout to prevent memo bypass.
   *
   * Local state in a memoized component causes re-renders that bypass arePropsEqual.
   * By lifting state to parent, we maintain a stable reference in state itself.
   *
   * CRITICAL: We store the stable reference directly in state, not in a derived useMemo.
   * This prevents race conditions where setState creates a new object before useMemo runs.
   */
  const [persistentProgressBarProps, setPersistentProgressBarProps] =
    useState<PersistentProgressBarProps | null>(null)

  /**
   * Ref to track the stable props object we're currently using.
   * This allows us to return the SAME object reference when content hasn't changed.
   */
  const stablePropsRef = useRef<PersistentProgressBarProps | null>(null)

  /**
   * Callback to receive persistent progress bar props from VideoControls.
   *
   * Compares primitive values and reuses the existing object reference when content is unchanged.
   * This prevents VideoAnalysisLayout from re-rendering due to new object references.
   *
   * Key insight: We maintain object reference stability HERE in the callback,
   * not in a downstream useMemo, to prevent race conditions with React's reconciliation.
   */
  const handlePersistentProgressBarPropsChange = useCallback(
    (newProps: PersistentProgressBarProps | null) => {
      const currentStable = stablePropsRef.current

      // Handle null case
      if (!newProps) {
        if (currentStable !== null) {
          stablePropsRef.current = null
          setPersistentProgressBarProps(null)
        }
        return
      }

      // Handle first update (null -> value)
      if (currentStable === null) {
        stablePropsRef.current = newProps
        setPersistentProgressBarProps(newProps)
        return
      }

      // Compare content - if unchanged, keep existing reference
      const contentUnchanged =
        currentStable.progress === newProps.progress &&
        currentStable.isScrubbing === newProps.isScrubbing &&
        currentStable.controlsVisible === newProps.controlsVisible &&
        currentStable.progressBarWidth === newProps.progressBarWidth

      if (contentUnchanged) {
        // Content unchanged - DON'T call setState, keep existing reference
        return
      }

      // Content changed - update with new reference
      stablePropsRef.current = newProps
      setPersistentProgressBarProps(newProps)
    },
    [] // Empty deps - uses refs for state management
  )

  /**
   * audioOverlay is memoized at source in orchestrator.
   * Provides stable reference that only changes when actual data changes.
   * No local memoization needed - just pass through.
   *
   * @see useVideoAnalysisOrchestrator.stableAudioOverlay
   */

  // Memoize social counts (static data, never changes)
  const socialCounts = useMemo(
    () => ({ likes: 1200, comments: 89, bookmarks: 234, shares: 1500 }),
    []
  )

  /**
   * Memoized feedback object for VideoAnalysisLayout.
   *
   * Composes feedback data from orchestrator with currentTime from video.
   * Dependencies are primitive values and array references, not entire objects,
   * to prevent unnecessary recreation when unrelated properties change.
   *
   * Note: This is still memoized here (not in orchestrator) because it combines
   * data from multiple orchestrator properties (feedback + video.currentTime).
   */
  const feedback = useMemo(
    () => ({
      items: orchestrated.feedback.items,
      panelFraction: orchestrated.feedback.panelFraction,
      activeTab: orchestrated.feedback.activeTab,
      selectedFeedbackId: orchestrated.feedback.selectedFeedbackId,
      currentTime: orchestrated.video.currentTime,
      phase: orchestrated.feedback.phase,
      progress: orchestrated.feedback.progress,
      channelExhausted: orchestrated.feedback.channelExhausted,
    }),
    [
      orchestrated.feedback.items,
      orchestrated.feedback.panelFraction,
      orchestrated.feedback.activeTab,
      orchestrated.feedback.selectedFeedbackId,
      orchestrated.video.currentTime,
      orchestrated.feedback.phase,
      orchestrated.feedback.progress,
      orchestrated.feedback.channelExhausted,
    ]
  )

  /**
   * Memoized handlers object for VideoAnalysisLayout.
   *
   * Combines orchestrator handlers with feedback panel handlers.
   * Dependencies are individual callbacks, not the entire handlers object,
   * to prevent recreation when unrelated handlers change.
   *
   * Note: Individual callbacks are already stable via useCallback in orchestrator,
   * so this only recreates when specific callbacks change identity.
   */
  const handlers = useMemo(
    () => ({
      onPlay: orchestrated.handlers.onPlay,
      onPause: orchestrated.handlers.onPause,
      onReplay: orchestrated.handlers.onReplay,
      onEnd: orchestrated.handlers.onEnd,
      onSeek: orchestrated.handlers.onSeek,
      onSeekComplete: orchestrated.handlers.onSeekComplete,
      onVideoLoad: orchestrated.handlers.onVideoLoad,
      onSignificantProgress: orchestrated.handlers.onSignificantProgress,
      onFeedbackItemPress: orchestrated.handlers.onFeedbackItemPress,
      onCollapsePanel: orchestrated.handlers.onCollapsePanel,
      onBack: orchestrated.handlers.onBack,
      onRetry: orchestrated.handlers.onRetry,
      onShare: orchestrated.handlers.onShare,
      onLike: orchestrated.handlers.onLike,
      onComment: orchestrated.handlers.onComment,
      onBookmark: orchestrated.handlers.onBookmark,
      onSelectAudio: orchestrated.handlers.onSelectAudio,
      onFeedbackScrollY: orchestrated.handlers.onFeedbackScrollY,
      onFeedbackMomentumScrollEnd: orchestrated.handlers.onFeedbackMomentumScrollEnd,
      onTabChange: orchestrated.feedback.panel.setActiveTab,
      onExpand: orchestrated.feedback.panel.expand,
      onRetryFeedback: orchestrated.feedback.state.feedback.retryFailedFeedback,
      onDismissError: orchestrated.audio.source.clearError,
    }),
    [
      // 🎯 Depend on individual callbacks, not the entire handlers object
      orchestrated.handlers.onPlay,
      orchestrated.handlers.onPause,
      orchestrated.handlers.onReplay,
      orchestrated.handlers.onEnd,
      orchestrated.handlers.onSeek,
      orchestrated.handlers.onSeekComplete,
      orchestrated.handlers.onVideoLoad,
      orchestrated.handlers.onSignificantProgress,
      orchestrated.handlers.onFeedbackItemPress,
      orchestrated.handlers.onCollapsePanel,
      orchestrated.handlers.onBack,
      orchestrated.handlers.onRetry,
      orchestrated.handlers.onShare,
      orchestrated.handlers.onLike,
      orchestrated.handlers.onComment,
      orchestrated.handlers.onBookmark,
      orchestrated.handlers.onSelectAudio,
      orchestrated.handlers.onFeedbackScrollY,
      orchestrated.handlers.onFeedbackMomentumScrollEnd,
      orchestrated.feedback.panel.setActiveTab,
      orchestrated.feedback.panel.expand,
      orchestrated.feedback.state.feedback.retryFailedFeedback,
      orchestrated.audio.source.clearError,
    ]
  )

  /**
   * Memoized error object for VideoAnalysisLayout.
   *
   * Combines orchestrator error state with handler callbacks.
   * Dependencies are primitive values (visible, message) and callbacks,
   * not the entire error object, to prevent recreation when unrelated properties change.
   */
  const error = useMemo(
    () => ({
      visible: orchestrated.error.visible,
      message: orchestrated.error.message,
      onRetry: orchestrated.handlers.onRetry,
      onBack: orchestrated.handlers.onBack ?? (() => {}),
    }),
    [
      // 🎯 Depend on primitive values and callbacks, not the entire error object
      orchestrated.error.visible,
      orchestrated.error.message,
      orchestrated.handlers.onRetry,
      orchestrated.handlers.onBack,
    ]
  )

  /**
   * bubbleState is memoized at source in orchestrator.
   * Provides stable reference that only changes when actual data changes.
   * No local memoization needed - just pass through.
   *
   * @see useVideoAnalysisOrchestrator.stableBubbleState
   */

  /**
   * Pass props to VideoAnalysisLayout.
   *
   * All props are either:
   * - Directly from orchestrator (already memoized at source)
   * - Memoized here with primitive dependencies
   * - Stable callbacks/refs
   *
   * VideoAnalysisLayout's arePropsEqual will deep-compare and prevent
   * renders when data is actually unchanged.
   */
  return (
    <VideoAnalysisLayout
      gesture={orchestrated.gesture!}
      animation={orchestrated.animation!}
      video={orchestrated.video}
      playback={orchestrated.playback}
      feedback={feedback}
      feedbackAudioUrls={orchestrated.feedback.audioUrls}
      feedbackErrors={orchestrated.feedback.errors}
      handlers={handlers}
      videoControlsRef={orchestrated.refs.videoControlsRef}
      controls={orchestrated.controls}
      error={error}
      audioController={orchestrated.audio.controller}
      bubbleState={orchestrated.bubbleState}
      audioOverlay={orchestrated.audioOverlay}
      coachSpeaking={orchestrated.feedback.coordinator.isCoachSpeaking}
      socialCounts={socialCounts}
      videoUri={orchestrated.video.uri}
      persistentProgressBarProps={persistentProgressBarProps}
      onPersistentProgressBarPropsChange={handlePersistentProgressBarPropsChange}
    />
  )
}

// Re-export props type for convenience
export type { VideoAnalysisScreenProps }
