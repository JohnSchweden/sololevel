import { useEffect, useMemo, useRef } from 'react'
import { Platform } from 'react-native'

import { VideoAnalysisLayout } from './components/VideoAnalysisLayout.native'
import type { AnalysisPhase } from './hooks/useAnalysisState'
import { useVideoAnalysisOrchestrator } from './hooks/useVideoAnalysisOrchestrator'
import type { VideoAnalysisScreenProps } from './hooks/useVideoAnalysisOrchestrator'
import type { FeedbackPanelItem } from './types'

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
 * Performance Notes:
 * - orchestrator return value is fully memoized at source
 * - Only compose layout-specific props here (bubbleState, audioOverlay, etc.)
 * - Callbacks from route component are memoized to ensure stable references
 *
 * @param props - VideoAnalysisScreen props
 */
export function VideoAnalysisScreen(props: VideoAnalysisScreenProps) {
  // Orchestrate all hooks and aggregate interfaces
  // Return value is fully memoized inside the hook
  const orchestrated = useVideoAnalysisOrchestrator(props)

  // Extract primitive values first to prevent nested property access from breaking memoization
  const bubbleVisible = orchestrated.feedback.coordinator.bubbleState.bubbleVisible
  const currentBubbleIndex = orchestrated.feedback.coordinator.bubbleState.currentBubbleIndex
  const bubbleItems = orchestrated.feedback.items // Used for bubbleState.items
  const overlayVisible = orchestrated.feedback.coordinator.overlayVisible
  const activeAudio = orchestrated.feedback.coordinator.activeAudio
  const activeAudioId = activeAudio?.id ?? null
  const activeAudioUrl = activeAudio?.url ?? null
  const coordinatorOnAudioOverlayClose = orchestrated.feedback.coordinator.onAudioOverlayClose
  const coordinatorOnAudioOverlayInactivity =
    orchestrated.feedback.coordinator.onAudioOverlayInactivity
  const coordinatorOnAudioOverlayInteraction =
    orchestrated.feedback.coordinator.onAudioOverlayInteraction

  // Extract audioController before stabilizing to get duration value
  const audioControllerValue = orchestrated.audio.controller
  // Normalize undefined to 0 for duration (undefined means not loaded yet)
  const audioDuration = (audioControllerValue.duration ?? 0) as number

  // Stabilize activeAudio to prevent unnecessary audioOverlay recreation
  // activeAudio object reference changes even when id/url are the same
  const activeAudioRef = useRef<{ id: string; url: string } | null>(null)
  const prevActiveAudioIdRef = useRef<string | null>(null)
  const prevActiveAudioUrlRef = useRef<string | null>(null)

  // Update ref synchronously during render so useMemo can read latest value
  // Only create new object when id/url actually change
  const idChanged = prevActiveAudioIdRef.current !== activeAudioId
  const urlChanged = prevActiveAudioUrlRef.current !== activeAudioUrl
  if (idChanged || urlChanged) {
    prevActiveAudioIdRef.current = activeAudioId
    prevActiveAudioUrlRef.current = activeAudioUrl

    if (activeAudioId && activeAudioUrl) {
      const isSameObject =
        activeAudioRef.current?.id === activeAudioId &&
        activeAudioRef.current?.url === activeAudioUrl

      if (!isSameObject) {
        activeAudioRef.current = { id: activeAudioId, url: activeAudioUrl }
      }
    } else if (activeAudioRef.current !== null) {
      activeAudioRef.current = null
    }
  }

  // Stabilize audioOverlay callbacks via refs
  const audioOverlayCallbacksRef = useRef({
    onClose: coordinatorOnAudioOverlayClose,
    onInactivity: coordinatorOnAudioOverlayInactivity,
    onInteraction: coordinatorOnAudioOverlayInteraction,
  })

  // Update callbacks synchronously during render
  audioOverlayCallbacksRef.current.onClose = coordinatorOnAudioOverlayClose
  audioOverlayCallbacksRef.current.onInactivity = coordinatorOnAudioOverlayInactivity
  audioOverlayCallbacksRef.current.onInteraction = coordinatorOnAudioOverlayInteraction

  // Stabilize audioDuration - only update when change is meaningful
  // Ignore intermediate 0/undefined values when same audio is loading
  // Normalize duration first (undefined → 0) to ensure ref is always a number
  const normalizedDuration = audioDuration ?? 0
  const stableAudioDurationRef = useRef<number>(normalizedDuration)
  const prevActiveAudioIdForDurationRef = useRef<string | null>(null)

  // Normalize previous duration for comparison
  const prevNormalizedDuration = stableAudioDurationRef.current ?? 0

  // Update stable duration only when change is meaningful
  const audioIdChanged = prevActiveAudioIdForDurationRef.current !== activeAudioId
  const durationChanged = prevNormalizedDuration !== normalizedDuration
  const isMeaningfulDurationChange =
    audioIdChanged || // New audio - accept any duration (even 0/undefined)
    (durationChanged && prevNormalizedDuration !== 0 && normalizedDuration !== 0) || // Non-zero → non-zero
    (durationChanged && prevNormalizedDuration === 0 && normalizedDuration !== 0) // 0 → non-zero (audio loaded)

  if (isMeaningfulDurationChange) {
    stableAudioDurationRef.current = normalizedDuration
    prevActiveAudioIdForDurationRef.current = activeAudioId
  } else if (audioIdChanged) {
    // Audio ID changed but duration didn't change meaningfully - still update audio ID tracker
    prevActiveAudioIdForDurationRef.current = activeAudioId
    // Also update duration ref to current value (even if 0/undefined) for new audio
    stableAudioDurationRef.current = normalizedDuration
  }

  // Always return normalized value (never undefined)
  const stableAudioDuration = stableAudioDurationRef.current ?? 0

  // Store audioOverlay object in ref to maintain stable reference
  const audioOverlayRef = useRef<{
    shouldShow: boolean
    activeAudio: { id: string; url: string } | null
    onClose?: () => void
    onInactivity?: () => void
    onInteraction?: () => void
    audioDuration?: number
  }>({
    shouldShow: false,
    activeAudio: null,
    onClose: coordinatorOnAudioOverlayClose,
    onInactivity: coordinatorOnAudioOverlayInactivity,
    onInteraction: coordinatorOnAudioOverlayInteraction,
    audioDuration: undefined,
  })

  // Update audioOverlay ref synchronously - only recreate when values actually change
  const overlayChanged = audioOverlayRef.current.shouldShow !== overlayVisible
  const activeAudioChanged = audioOverlayRef.current.activeAudio !== activeAudioRef.current
  const audioDurationChanged = audioOverlayRef.current.audioDuration !== stableAudioDuration
  const callbacksChanged =
    audioOverlayRef.current.onClose !== coordinatorOnAudioOverlayClose ||
    audioOverlayRef.current.onInactivity !== coordinatorOnAudioOverlayInactivity ||
    audioOverlayRef.current.onInteraction !== coordinatorOnAudioOverlayInteraction

  if (overlayChanged || activeAudioChanged || audioDurationChanged || callbacksChanged) {
    audioOverlayRef.current = {
      shouldShow: overlayVisible,
      activeAudio: activeAudioRef.current,
      onClose: audioOverlayCallbacksRef.current.onClose,
      onInactivity: audioOverlayCallbacksRef.current.onInactivity,
      onInteraction: audioOverlayCallbacksRef.current.onInteraction,
      audioDuration: stableAudioDuration,
    }
  }

  // Compose layout-specific props from orchestrated values
  // ONLY memoize based on PRIMITIVE deps - extract nested properties first
  const bubbleState = useMemo(
    () => ({
      visible: bubbleVisible,
      currentIndex: currentBubbleIndex,
      items: bubbleItems,
    }),
    [bubbleVisible, currentBubbleIndex, bubbleItems]
  )

  const prevAudioOverlayDepsRef = useRef<{
    overlayVisible: boolean
    activeAudioId: string | null
    activeAudioUrl: string | null
    audioDuration: number
  }>({
    overlayVisible: false,
    activeAudioId: null,
    activeAudioUrl: null,
    audioDuration: 0,
  })

  const audioOverlay = useMemo(() => {
    const prev = prevAudioOverlayDepsRef.current

    prevAudioOverlayDepsRef.current = {
      overlayVisible,
      activeAudioId,
      activeAudioUrl,
      audioDuration: stableAudioDuration,
    }

    // Update audioOverlayRef if duration changed meaningfully
    if (prev.audioDuration !== stableAudioDuration) {
      audioOverlayRef.current = {
        ...audioOverlayRef.current,
        audioDuration: stableAudioDuration,
      }
    }

    // Return the stable ref object - only recreate when dependencies change
    return audioOverlayRef.current
  }, [
    // Only depend on primitive values that actually change
    overlayVisible,
    activeAudioId, // Use primitive id instead of object
    activeAudioUrl, // Use primitive url instead of object
    stableAudioDuration, // Use stabilized duration that filters intermediate 0 values
    callbacksChanged,
    // Callbacks are stable via refs
  ])

  const socialCounts = useMemo(
    () =>
      Platform.OS !== 'web'
        ? { likes: 1200, comments: 89, bookmarks: 234, shares: 1500 }
        : { likes: 0, comments: 0, bookmarks: 0, shares: 0 },
    []
  )

  const coachSpeaking = useMemo(
    () =>
      Platform.OS !== 'web'
        ? orchestrated.feedback.coordinator.isCoachSpeaking
        : orchestrated.audio.controller.isPlaying,
    [orchestrated.feedback.coordinator.isCoachSpeaking, orchestrated.audio.controller.isPlaying]
  )

  // Augment handlers with layout-specific callbacks
  const handlers = useMemo(
    () => ({
      ...orchestrated.handlers,
      onTabChange: orchestrated.feedback.panel.setActiveTab,
      onExpand: orchestrated.feedback.panel.expand,
      onRetryFeedback: orchestrated.feedback.state.feedback.retryFailedFeedback,
      onDismissError: orchestrated.audio.source.clearError,
    }),
    [
      orchestrated.handlers,
      orchestrated.feedback.panel.setActiveTab,
      orchestrated.feedback.panel.expand,
      orchestrated.feedback.state.feedback.retryFailedFeedback,
      orchestrated.audio.source.clearError,
    ]
  )

  // Augment error with handlers
  const error = useMemo(
    () => ({
      ...orchestrated.error,
      onRetry: orchestrated.handlers.onRetry,
      onBack: orchestrated.handlers.onBack ?? (() => {}),
    }),
    [orchestrated.error, orchestrated.handlers.onRetry, orchestrated.handlers.onBack]
  )

  // GRANULAR FEEDBACK STATE - Extract primitive values to prevent unnecessary object recreation
  // Use primitive values in dependency arrays instead of object references

  // Extract primitive values from granular state objects (avoiding naming conflicts)
  const feedbackItemsArray = orchestrated.feedback.itemsState.items
  const selectedFeedbackIdValue = orchestrated.feedback.itemsState.selectedFeedbackId
  const currentTimeValue = orchestrated.video.currentTime
  const panelFractionValue = orchestrated.feedback.panelState.panelFraction
  const activeTabValue = orchestrated.feedback.panelState.activeTab
  const phaseValue = orchestrated.feedback.analysisState.phase
  const progressValue = orchestrated.feedback.analysisState.progress
  const channelExhaustedValue = orchestrated.feedback.analysisState.channelExhausted
  const errorsValue = orchestrated.feedback.errorsState.errors
  const audioUrlsValue = orchestrated.feedback.errorsState.audioUrls
  // audioControllerValue already extracted above for audioDuration

  // Stabilize audioUrls and errors to prevent unnecessary VideoAnalysisLayout re-renders
  // VideoAnalysisLayout only passes these to FeedbackSection, so we can stabilize by comparing keys
  const audioUrlsKeys = Object.keys(audioUrlsValue || {})
    .sort()
    .join(',')
  const prevAudioUrlsRef = useRef<Record<string, string>>({})
  const prevAudioUrlsKeysRef = useRef<string>('')

  const stableAudioUrls = useMemo(() => {
    const prevKeys = prevAudioUrlsKeysRef.current
    const keysChanged = prevKeys !== audioUrlsKeys

    // Only recreate if keys actually changed
    if (!keysChanged && prevAudioUrlsRef.current !== audioUrlsValue) {
      // Keys are the same but reference changed - return previous object to prevent unnecessary VideoAnalysisLayout re-render
      return prevAudioUrlsRef.current
    }

    // Keys changed or first render - update refs and return new object
    prevAudioUrlsKeysRef.current = audioUrlsKeys
    prevAudioUrlsRef.current = audioUrlsValue
    return audioUrlsValue
  }, [audioUrlsKeys, audioUrlsValue])

  const errorsKeys = Object.keys(errorsValue || {})
    .sort()
    .join(',')
  const prevErrorsRef = useRef<Record<string, string>>({})
  const prevErrorsKeysRef = useRef<string>('')

  const stableErrors = useMemo(() => {
    const prevKeys = prevErrorsKeysRef.current

    // Only recreate if keys actually changed
    if (prevKeys === errorsKeys && prevErrorsRef.current !== errorsValue) {
      // Keys are the same but reference changed - return previous object
      return prevErrorsRef.current
    }

    // Keys changed or first render - update refs and return new object
    prevErrorsKeysRef.current = errorsKeys
    prevErrorsRef.current = errorsValue
    return errorsValue
  }, [errorsKeys, errorsValue])

  // Stabilize audioController to prevent unnecessary VideoAnalysisLayout re-renders
  // AudioPlayer only checks isPlaying and seekTime in its memo comparison
  const audioControllerSignature = `${audioControllerValue.isPlaying}:${audioControllerValue.seekTime ?? 'null'}`
  const prevAudioControllerRef = useRef(audioControllerValue)
  const prevAudioControllerSignatureRef = useRef<string>('')

  const stableAudioController = useMemo(() => {
    const prevSignature = prevAudioControllerSignatureRef.current
    const signatureChanged = prevSignature !== audioControllerSignature

    // Update refs BEFORE deciding what to return (synchronously during render)
    if (signatureChanged) {
      prevAudioControllerSignatureRef.current = audioControllerSignature
      prevAudioControllerRef.current = audioControllerValue
      return audioControllerValue
    }

    // Signature unchanged but reference changed - return previous object for stability
    if (prevAudioControllerRef.current !== audioControllerValue) {
      return prevAudioControllerRef.current
    }

    return audioControllerValue
  }, [audioControllerSignature, audioControllerValue])

  // Track previous dependencies to debug feedback object recreation
  const prevFeedbackDepsRef = useRef<{
    feedbackItemsArray: any
    selectedFeedbackIdValue: string | null
    currentTimeValue: number
    panelFractionValue: number
    activeTabValue: string
    phaseValue: string
    channelExhaustedValue: boolean
    progressValue: any
    // Omit errorsValue and audioUrlsValue - they're passed separately
  }>({
    feedbackItemsArray: [],
    selectedFeedbackIdValue: null,
    currentTimeValue: 0,
    panelFractionValue: 0,
    activeTabValue: 'feedback',
    phaseValue: 'idle',
    channelExhaustedValue: false,
    progressValue: null,
  })

  // Store feedback object in ref to allow updating currentTime without recreating object
  const feedbackRef = useRef<{
    items: FeedbackPanelItem[]
    panelFraction: number
    activeTab: 'feedback' | 'insights' | 'comments'
    selectedFeedbackId: string | null
    currentTime: number
    phase: AnalysisPhase
    progress: { upload: number; analysis: number; feedback: number }
    channelExhausted: boolean
  }>({
    items: [],
    panelFraction: 0,
    activeTab: 'feedback',
    selectedFeedbackId: null,
    currentTime: 0,
    phase: 'analyzing',
    progress: { upload: 0, analysis: 0, feedback: 0 },
    channelExhausted: false,
  })

  // Update currentTime in ref without triggering object recreation
  useEffect(() => {
    feedbackRef.current.currentTime = currentTimeValue
  }, [currentTimeValue])

  // Compose feedback object using primitive values - only recreates when values actually change
  const feedback = useMemo(() => {
    const prev = prevFeedbackDepsRef.current
    const changed: string[] = []

    // Compare array reference
    if (prev.feedbackItemsArray !== feedbackItemsArray) {
      changed.push(
        `feedbackItemsArray: ref changed (length ${prev.feedbackItemsArray?.length ?? 0} → ${feedbackItemsArray?.length ?? 0})`
      )
    }
    // Compare primitives (excluding currentTimeValue - handled separately)
    if (prev.selectedFeedbackIdValue !== selectedFeedbackIdValue) {
      changed.push(
        `selectedFeedbackIdValue: ${prev.selectedFeedbackIdValue} → ${selectedFeedbackIdValue}`
      )
    }
    if (prev.panelFractionValue !== panelFractionValue) {
      changed.push(`panelFractionValue: ${prev.panelFractionValue} → ${panelFractionValue}`)
    }
    if (prev.activeTabValue !== activeTabValue) {
      changed.push(`activeTabValue: ${prev.activeTabValue} → ${activeTabValue}`)
    }
    if (prev.phaseValue !== phaseValue) {
      changed.push(`phaseValue: ${prev.phaseValue} → ${phaseValue}`)
    }
    if (prev.channelExhaustedValue !== channelExhaustedValue) {
      changed.push(
        `channelExhaustedValue: ${prev.channelExhaustedValue} → ${channelExhaustedValue}`
      )
    }
    // Compare object references
    if (prev.progressValue !== progressValue) {
      changed.push(`progressValue: ref changed`)
    }
    // Omit errorsValue and audioUrlsValue - they're passed separately to prevent unnecessary VideoAnalysisLayout re-renders

    const needsUpdate = changed.length > 0

    if (needsUpdate) {
      prevFeedbackDepsRef.current = {
        feedbackItemsArray,
        selectedFeedbackIdValue,
        currentTimeValue, // Track for comparison but don't trigger recreation
        panelFractionValue,
        activeTabValue,
        phaseValue,
        channelExhaustedValue,
        progressValue,
        // Omit errorsValue and audioUrlsValue - they're passed separately
      }

      feedbackRef.current = {
        items: feedbackItemsArray,
        panelFraction: panelFractionValue,
        activeTab: activeTabValue,
        selectedFeedbackId: selectedFeedbackIdValue,
        currentTime: feedbackRef.current.currentTime, // Use latest from ref
        phase: phaseValue,
        progress: progressValue,
        channelExhausted: channelExhaustedValue,
        // Omit errors and audioUrls - pass separately to prevent unnecessary VideoAnalysisLayout re-renders
      }
      return { ...feedbackRef.current }
    }

    // Values unchanged - return same object reference (currentTime updated via ref)
    return feedbackRef.current
  }, [
    // Exclude currentTimeValue from dependencies - update via ref instead
    feedbackItemsArray, // Array reference - compare by reference
    selectedFeedbackIdValue, // Primitive
    panelFractionValue, // Primitive
    activeTabValue, // Primitive
    phaseValue, // Primitive
    progressValue, // Object reference - compare by reference
    channelExhaustedValue, // Primitive
  ])

  return (
    <VideoAnalysisLayout
      gesture={orchestrated.gesture!}
      animation={orchestrated.animation!}
      video={orchestrated.video}
      playback={orchestrated.playback}
      feedback={feedback}
      feedbackAudioUrls={stableAudioUrls}
      feedbackErrors={stableErrors}
      handlers={handlers}
      videoControlsRef={orchestrated.refs.videoControlsRef}
      controls={orchestrated.controls}
      error={error}
      audioController={stableAudioController}
      bubbleState={bubbleState}
      audioOverlay={audioOverlay}
      coachSpeaking={coachSpeaking}
      socialCounts={socialCounts}
      contextValue={orchestrated.contextValue}
    />
  )
}

// Re-export props type for convenience
export type { VideoAnalysisScreenProps }
