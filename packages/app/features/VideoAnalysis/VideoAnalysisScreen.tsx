import { useCallback, useEffect, useMemo, useRef } from 'react'

import { useStatusBar } from '@app/hooks/useStatusBar'
import { rateAnalysisFeedback, rateFeedbackItem } from '@my/api'
import { log } from '@my/logging'
import type { VideoControlsRef } from '@ui/components/VideoAnalysis'
// PERFORMANCE FIX: useVideoPlayer moved to VideoPlayerSection to prevent screen re-renders
// import { useVideoPlayer } from './hooks/useVideoPlayer'
import { useVoicePreferencesStore } from '../../stores/voicePreferences'
import { useVideoHistoryStore } from '../HistoryProgress/stores/videoHistory'
import { VideoAnalysisLayout } from './components/VideoAnalysisLayout.native'
import { useAnalysisState } from './hooks/useAnalysisState'
import { useAnimationController } from './hooks/useAnimationController'
import { useFeedbackAudioSource } from './hooks/useFeedbackAudioSource'
import { useFeedbackCoordinator } from './hooks/useFeedbackCoordinator'
import { useGestureController } from './hooks/useGestureController'
import { useHistoricalAnalysis } from './hooks/useHistoricalAnalysis'
import { useVideoPlayerStore } from './stores'
import { useFeedbackAudioStore } from './stores/feedbackAudio'
import { useFeedbackCoordinatorStore } from './stores/feedbackCoordinatorStore'
import { useFeedbackStatusStore } from './stores/feedbackStatus'
// Removed unused store imports - moved subscriptions to child components
// import { usePersistentProgressStore, useVideoPlayerStore } from './stores'
import type { FeedbackPanelItem, VideoAnalysisScreenProps } from './types'

/**
 * VideoAnalysisScreen - Direct Hook Composition with Granular Store Subscriptions
 *
 * Integrates focused hooks with single responsibilities and moves store subscriptions to leaf components.
 * This approach provides:
 * ✅ **Maintainability** - Each hook owns one concern; subscriptions follow data flow
 * ✅ **Testability** - Hooks tested independently; no cascading store subscriptions
 * ✅ **Performance** - Screen re-renders only on props that directly affect it; child components own their subscriptions
 * ✅ **Debugging** - Clear data flow: hooks → screen (no subscriptions) → layout → children (subscriptions)
 *
 * ## Performance Optimization Strategy
 *
 * **Problem Solved:** Excessive screen re-renders from nested `useState` and store subscriptions.
 * - Before: Store subscription in screen → all store updates re-render screen → cascades to children
 * - After: Store subscriptions in leaf components → only affected children re-render
 *
 * **Result:** Screen render count drops from 4-5 per tap to 0-1 on feedback selection.
 *
 * ## Hook Composition
 *
 * ```
 * VideoAnalysisScreen (no store subscriptions - stays dark)
 * ├── useAnalysisState (analysis phase + progress)
 * ├── useFeedbackAudioSource (audio source discovery)
 * ├── useFeedbackCoordinator (feedback coordination logic - no subscriptions)
 * ├── useAnimationController (animated values)
 * ├── useGestureController (pan + scroll)
 * └── VideoAnalysisLayout (layout composition)
 *     ├── VideoPlayerSection (subscribes to: activeAudio, isCoachSpeaking, overlayVisible)
 *     │   ├── useVideoPlayer (video playback)
 *     │   └── useAudioController (audio playback - owns store subscription to activeAudio)
 *     └── FeedbackSection (subscribes to: highlightedFeedbackId, selectedFeedbackId)
 * ```
 *
 * **Key Rule:** Subscriptions live as close to components that use the data as possible.
 * - `activeAudioUrl` ✗ NOT in screen | ✓ VideoPlayerSection
 * - `highlightedFeedbackId` ✗ NOT in screen | ✓ FeedbackSection
 * - `isCoachSpeaking` ✗ NOT in screen | ✓ VideoPlayerSection
 *
 * ## Store Subscriptions Pattern
 *
 * Screen passes **stub/computed values** instead of store subscriptions:
 * - `audioController` → stub created in layout, real instance in VideoPlayerSection
 * - `feedback.highlightedFeedbackId` → removed; FeedbackSection subscribes directly
 * - `isCoachSpeaking` → removed; VideoPlayerSection subscribes directly
 * - `overlayVisible`, `activeAudio` → moved to VideoPlayerSection
 *
 * Coordinator reads imperative store values via `getState()` (no subscriptions):
 * ```ts
 * const activeAudioDuration = useFeedbackAudioStore.getState().activeAudio ? 0 : audioController.duration
 * ```
 *
 * ## Adding New Features
 *
 * 1. Create hook: `useNewFeature()` (no store subscriptions in parent)
 * 2. Call in appropriate component (screen for logic, layout/children for state)
 * 3. If hook needs store data: subscribe in the component that renders with it
 * 4. Never subscribe in screen unless screen directly renders with that data
 *
 * ## Performance Checklist
 *
 * - [ ] Does screen re-render on this store update? If no → move subscription to child
 * - [ ] Does screen render anything using this value? If no → remove from screen
 * - [ ] Can this be computed imperatively in a coordinator? Use `getState()`
 * - [ ] Does layout need this? Pass as prop from screen (not subscription)
 *
 * ## Migration Notes
 *
 * **Previous Pattern:** `useVideoAnalysisOrchestrator` (God Object - 1789 LOC, all subscriptions in screen)
 * **Phase 1:** Direct hook composition (still had screen subscriptions - 4-5 re-renders per tap)
 * **Phase 2:** Moved subscriptions to leaf components (current - 0-1 re-renders per tap)
 *
 * @param props - Component props (analysisJobId, videoUri, callbacks, etc.)
 * @returns VideoAnalysisLayout with composed props and stub values (no subscriptions)
 */
export function VideoAnalysisScreen(props: VideoAnalysisScreenProps) {
  // Extract props used in Batch 1-2 hooks
  const { analysisJobId, videoRecordingId, initialStatus = 'processing' } = props

  // 🆕 Batch 1: Direct hook composition (Phase 2 Task 2.1)
  // Independent hooks with no dependencies - ALWAYS CALL HOOKS (React rules)
  useStatusBar(true, 'fade')

  const isHistoryMode = !!analysisJobId
  const historical = useHistoricalAnalysis(isHistoryMode ? analysisJobId : null)

  // 🆕 Batch 2: Single-dependency hooks (Phase 2 Task 2.2)
  // These hooks depend on Batch 1 hooks
  // NOTE: ALL hooks must be called unconditionally (React rules)
  // When USE_DIRECT_COMPOSITION is false, we still call them but use orchestrator results

  // 1. useAnalysisState - depends on historical.data, analysisJobId, videoRecordingId
  // NOTE: Normalize initial status so downstream hooks (useVideoPlayer) receive readiness state.
  //       Passing raw props breaks history-mode auto-play. Keep this normalization in sync with
  //       useVideoPlayer JSDoc expectations.
  const normalizedInitialStatus = isHistoryMode
    ? 'ready'
    : initialStatus === 'ready'
      ? 'ready'
      : 'processing'
  const analysisState = useAnalysisState(
    isHistoryMode ? analysisJobId : undefined,
    videoRecordingId,
    normalizedInitialStatus,
    isHistoryMode
  )

  const subscriptionKey = useMemo(() => {
    if (isHistoryMode) {
      return null
    }

    if (analysisState.analysisJobId) {
      return `job:${analysisState.analysisJobId}`
    }

    if (analysisState.videoRecordingId) {
      return `recording:${analysisState.videoRecordingId}`
    }

    return null
  }, [isHistoryMode, analysisState.analysisJobId, analysisState.videoRecordingId])

  // 2. useFeedbackAudioSource - depends on analysisState.feedback.feedbackItems
  // PERF: Memoize feedback items by content, not lastUpdated timestamps
  const feedbackItems = analysisState.feedback.feedbackItems

  const feedbackAudioSource = useFeedbackAudioSource(feedbackItems)

  // 3. useAudioController moved to VideoPlayerSection (PERF FIX: Prevent screen re-renders)
  const isProcessing = historical.isLoading || analysisState.isProcessing

  // PERFORMANCE FIX: useVideoPlayer moved to VideoPlayerSection
  // Store setters are stable references - no subscriptions, no re-renders
  const setIsPlaying = useVideoPlayerStore((state) => state.setIsPlaying)
  const setPendingSeek = useVideoPlayerStore((state) => state.setPendingSeek)
  const setVideoEnded = useVideoPlayerStore((state) => state.setVideoEnded)
  const setDisplayTime = useVideoPlayerStore((state) => state.setDisplayTime)
  const setDuration = useVideoPlayerStore((state) => state.setDuration)
  const getPreciseCurrentTime = useCallback(() => useVideoPlayerStore.getState().displayTime, [])
  const currentTimeRef = useRef(0)

  // Store playback state in refs - updated via subscription, read without causing re-renders
  const videoEndedRef = useRef(useVideoPlayerStore.getState().videoEnded)
  const pendingSeekRef = useRef(useVideoPlayerStore.getState().pendingSeek)

  // Subscribe to store changes to update refs (no re-render of VideoAnalysisScreen)
  useEffect(() => {
    const unsubscribe = useVideoPlayerStore.subscribe((state) => {
      videoEndedRef.current = state.videoEnded
      pendingSeekRef.current = state.pendingSeek
    })
    return unsubscribe
  }, [])

  // Update ref on every render for stable access
  currentTimeRef.current = useVideoPlayerStore.getState().displayTime

  // PERFORMANCE FIX: videoPlaybackForCoordinator uses refs instead of subscriptions
  // This prevents VideoAnalysisScreen from re-rendering when playback state changes
  const videoPlaybackForCoordinator = useMemo(
    () => ({
      // Read from refs - no subscriptions, no re-renders
      get pendingSeek() {
        return pendingSeekRef.current
      },
      get videoEnded() {
        return videoEndedRef.current
      },
      currentTimeRef,
      getPreciseCurrentTime,
      play: () => setIsPlaying(true),
      pause: () => setIsPlaying(false),
      replay: () => {
        setDisplayTime(0)
        setPendingSeek(0)
        setVideoEnded(false)
        setIsPlaying(true)
      },
      seek: (time: number) => {
        setPendingSeek(time)
        setVideoEnded(false)
      },
      handleProgress: (time: number) => {
        currentTimeRef.current = time
        // Store updates handled by VideoPlayerSection.handleProgress → videoPlayer.handleProgress
        // Don't override with rounded value here
      },
      handleLoad: (data: { duration: number }) => {
        setDuration(data.duration)
        setVideoEnded(false)
      },
      handleEnd: (_endTime?: number) => {
        // Store updates handled by useVideoPlayer.handleEnd
        // Don't override with rounded value here
        setIsPlaying(false)
        setVideoEnded(true)
        return true
      },
      handleSeekComplete: (_time: number | null) => {
        // Store updates handled by useVideoPlayer.handleSeekComplete
        // Don't override with rounded value here
        setPendingSeek(null)
      },
      reset: () => {
        setDisplayTime(0)
        setIsPlaying(false)
        setDuration(0)
        setPendingSeek(null)
        setVideoEnded(false)
      },
    }),
    [
      // Only stable setters - refs don't need to be in deps
      setIsPlaying,
      setPendingSeek,
      setVideoEnded,
      setDisplayTime,
      setDuration,
      getPreciseCurrentTime,
    ]
  )

  // 🆕 Batch 3: useFeedbackCoordinator (Phase 2 Task 2.3)
  // Complex coordinator that depends on Batch 1-2 hooks
  // NOTE: feedbackItems comes from analysisState.feedback.feedbackItems
  // The orchestrator adds DUMMY_FEEDBACK, but we'll skip that for now (it's marked TEMP)
  // PERF FIX: Coordinator will be called with a real audioController from VideoPlayerSection
  // For now, pass a minimal stub with required methods so selection layer doesn't break
  const minimalAudioController = useMemo(
    () => ({
      duration: 0,
      isPlaying: false,
      currentTime: 0,
      isLoaded: false,
      seekTime: null,
      setIsPlaying: () => {},
      togglePlayback: () => {},
      handleLoad: () => {},
      handleProgress: () => {},
      handleEnd: () => false,
      handleError: () => {},
      handleSeekComplete: () => {},
      seekTo: () => {},
      reset: () => {},
    }),
    []
  )
  const feedbackCoordinator = useFeedbackCoordinator({
    feedbackItems, // Use memoized version
    audioController: minimalAudioController as any,
    videoPlayback: videoPlaybackForCoordinator,
  })

  // **PERFORMANCE FIX: Granular subscriptions to coordinator store**
  // Instead of using entire coordinator object, subscribe only to needed slices
  // This prevents re-renders when unrelated coordinator state changes
  // const highlightedFeedbackId = useFeedbackCoordinatorStore((state) => state.highlightedFeedbackId) - REMOVED: FeedbackSection subscribes directly
  // const isCoachSpeaking = useFeedbackCoordinatorStore((state) => state.isCoachSpeaking) - REMOVED: VideoPlayerSection now subscribes directly

  // PERF: Bubble state subscriptions moved to VideoPlayerSection to eliminate cascades

  // overlayVisible and activeAudio moved to VideoPlayerSection for direct subscriptions
  // const overlayVisible = useFeedbackCoordinatorStore((state) => state.overlayVisible)
  // const activeAudio = useFeedbackCoordinatorStore((state) => state.activeAudio)

  // 🆕 Batch 4: Native-only hooks (Phase 2 Task 2.4)
  // NOTE: These hooks are native-only but must be called unconditionally (React rules)
  // They will be no-ops on web platforms
  const animation = useAnimationController()
  // Note: gesture controller moved below videoState definition to access isProcessing

  // Notify parent of processing state changes (when using direct composition)

  /**
   * DEBUG: Track useState index 0 changes to identify which hook is causing re-renders
   *
   * why-did-you-render shows "useState index 0" changing on every progress event.
   * This tracks all possible state values that could be at index 0 to identify the culprit.
   *
   * React hook order (first useState in each hook gets index based on call order):
   * - useVideoPlayer: index 0-4 (isPlaying, displayTime, duration, pendingSeek, videoEnded)
   * - useFeedbackPanel: index 5-7 (panelFraction, activeTab, selectedFeedbackId)
   * - useFeedbackCoordinator: index 8 (pendingFeedbackId)
   * - useFeedbackSelection: index 9-11 (selectedFeedbackId, highlightedFeedback, isCoachSpeaking)
   * - useBubbleController: index 12-13 (currentBubbleIndex, bubbleVisible)
   * - useAudioController: index 14-18 (isPlaying, currentTime, duration, isLoaded, seekTime)
   * - useGestureController: index 19-21 (feedbackScroll store, pullToReveal control)
   *
   * If index 0 is changing, it's likely videoPlayer.isPlaying or videoPlayer.currentTime
   */
  // Debug logs removed - playback state subscriptions removed to prevent re-renders

  /**
   * DEBUG: Track Zustand store subscription changes to identify if store updates
   * are causing phantom re-renders during progress events.
   */
  useEffect(
    () => {
      log.debug('VideoAnalysisScreen', '🔍 Zustand store subscription tracking', {
        // highlightedFeedbackId moved to FeedbackSection to eliminate cascades
        // isCoachSpeaking, overlayVisible, activeAudio moved to VideoPlayerSection to eliminate cascades
      })
    },
    [
      // highlightedFeedbackId removed - moved to FeedbackSection
      // isCoachSpeaking, overlayVisible, activeAudio removed - moved to VideoPlayerSection
    ]
  )

  /**
   * MEMORY LEAK FIX: Cleanup video player store resources on unmount
   * This prevents state retention when navigating away from VideoAnalysisScreen
   */
  useEffect(() => {
    return () => {
      log.debug('VideoAnalysisScreen', '🧹 Cleaning up video player resources on unmount')
      useVideoPlayerStore.getState().releaseResources()
    }
  }, [])

  // 🔧 Keep orchestrator for comparison (Phase 2 Task 2.1 - Batch 1)
  // NOTE: When USE_DIRECT_COMPOSITION is true, Batch 1 hooks are called directly above
  // AND via orchestrator (double call). This is acceptable for gradual migration.
  // Later batches will eliminate orchestrator calls.
  // const orchestrated = useVideoAnalysisOrchestrator(props)

  /**
   * Store setter for persistent progress bar props.
   *
   * PERFORMANCE FIX: Using Zustand store eliminates cascading re-renders.
   *
   * Previous approach (callback):
   * 1. VideoControls creates props object
   * 2. Calls onPersistentProgressBarPropsChange(props)
   * 3. VideoAnalysisScreen re-renders (setState)
   * 4. VideoControls receives new callback reference
   * 5. useEffect cleanup runs → calls callback(null)
   * 6. Cycle repeats → 78 renders in 1.5 seconds
   *
   * New approach (Zustand store):
   * 1. VideoControls writes directly to store via setter
   * 2. VideoAnalysisLayout reads directly from store (no prop passing)
   * 3. VideoAnalysisScreen does NOT re-render (not subscribed to store)
   * 4. Only VideoAnalysisLayout re-renders when store updates
   *
   * CRITICAL: VideoAnalysisScreen does NOT read from store (no subscription).
   * Only VideoAnalysisLayout reads from store. This prevents intermediary renders.
   *
   * Reference stability is maintained by the store itself - it compares primitives
   * and only updates when actual values change (not gesture IDs).
   *
   * @see usePersistentProgressStore - store implementation with reference stability
   * @see VideoControls.tsx - writes to store via persistentProgressStoreSetter
   * @see PersistentProgressBar.tsx - reads directly from store (no prop drilling)
   */
  const videoControlsRef = useRef<VideoControlsRef | null>(null)
  const setControlsVisible = useVideoPlayerStore((state) => state.setManualControlsVisible)

  const handleControlsVisibilityChange = useCallback(
    (visible: boolean, isUserInteraction?: boolean) => {
      setControlsVisible(visible)
      if (props.onControlsVisibilityChange) {
        props.onControlsVisibilityChange(visible, isUserInteraction)
      }
    },
    [setControlsVisible, props.onControlsVisibilityChange]
  )

  /**
   * Memoized controls object to prevent VideoAnalysisLayout re-renders.
   */
  const controls = useMemo(
    () => ({
      onControlsVisibilityChange: handleControlsVisibilityChange,
      // persistentProgressStoreSetter: setPersistentProgressProps, - REMOVED: VideoPlayerSection subscribes directly
    }),
    [handleControlsVisibilityChange]
  )

  /**
   * audioOverlay is memoized at source in orchestrator.
   * Provides stable reference that only changes when actual data changes.
   * No local memoization needed - just pass through.
   *
   * @see useVideoAnalysisOrchestrator.stableAudioOverlay
   */

  /**
   * Memoized audioOverlay object to prevent VideoAnalysisLayout re-renders
   * when feedbackCoordinator object changes but callbacks remain stable.
   * NOTE: audioController moved to VideoPlayerSection for direct store subscription
   */
  const audioOverlay = useMemo(
    () => ({
      shouldShow: false, // Not used - VideoPlayerSection subscribes directly
      activeAudio: null, // Not used - VideoPlayerSection subscribes directly
      onClose: feedbackCoordinator.onAudioOverlayClose,
      onInactivity: feedbackCoordinator.onAudioOverlayInactivity,
      onInteraction: feedbackCoordinator.onAudioOverlayInteraction,
    }),
    [
      feedbackCoordinator.onAudioOverlayClose,
      feedbackCoordinator.onAudioOverlayInactivity,
      feedbackCoordinator.onAudioOverlayInteraction,
    ]
  )

  /**
   * Memoized feedback object for VideoAnalysisLayout (Phase 3 Task 3.1).
   *
   * Combines feedback state from multiple hooks into a single stable object.
   * This reduces prop drilling and simplifies the layout interface.
   *
   * PERFORMANCE FIX: currentTime removed from deps - it was causing 3+ re-renders
   * per 250ms during playback. Now uses ref-based access in handlers that need it.
   *
   * PERFORMANCE FIX: selectedFeedbackId now from granular Zustand subscription
   * instead of coordinator object - prevents re-renders when other coordinator state changes
   */
  // Extract analysis title and full feedback text from historical data (history mode) or cache (active analysis)
  // useHistoricalAnalysis returns data: CachedAnalysis | null (not HistoricalAnalysisData)
  let analysisTitle = historical.data?.title ?? undefined
  let fullFeedbackText = historical.data?.fullFeedbackText ?? undefined
  let fullFeedbackRating = historical.data?.fullFeedbackRating ?? undefined
  let avatarAssetKey = historical.data?.avatarAssetKeyUsed ?? undefined

  // FIX: Allow cache access in history mode too - fullFeedbackRating updates need to be visible
  // CRITICAL: Use selector hook (not getState()) to subscribe to cache updates
  // When background fetch in useHistoricalAnalysis calls updateCache() to populate fullFeedbackText,
  // this component will re-render with the new data
  const cachedAnalysis = useVideoHistoryStore((state) => {
    if (!analysisState.analysisJobId) {
      return null
    }
    const result = state.getCached(analysisState.analysisJobId)
    return result
  })
  if (cachedAnalysis?.title) {
    analysisTitle = cachedAnalysis.title
  }
  if (cachedAnalysis?.fullFeedbackText) {
    fullFeedbackText = cachedAnalysis.fullFeedbackText
  }
  if (cachedAnalysis?.fullFeedbackRating !== undefined) {
    fullFeedbackRating = cachedAnalysis.fullFeedbackRating ?? undefined
  } else {
  }
  if (cachedAnalysis?.avatarAssetKeyUsed) {
    avatarAssetKey = cachedAnalysis.avatarAssetKeyUsed
  }

  // CRITICAL: Subscribe to Zustand for avatar updates in HISTORY MODE
  // The backfill in useHistoricalAnalysis updates Zustand after TanStack Query returns
  // TanStack Query cache is stale, but Zustand has the fresh backfilled value
  const historyModeAvatar = useVideoHistoryStore((state) =>
    isHistoryMode && analysisJobId ? state.getCached(analysisJobId)?.avatarAssetKeyUsed : undefined
  )
  if (isHistoryMode && historyModeAvatar && !avatarAssetKey) {
    avatarAssetKey = historyModeAvatar
  }

  // Fallback for FRESH analysis only: Use current voice preferences
  // This handles cache entries created before server set avatar_asset_key_used
  // For history mode: avatar comes from cache/DB, don't override with current preferences
  const voiceGender = useVoicePreferencesStore((s) => s.gender)
  const voiceMode = useVoicePreferencesStore((s) => s.mode)
  if (!isHistoryMode && !avatarAssetKey && voiceGender && voiceMode) {
    avatarAssetKey = `${voiceGender}_${voiceMode}`
  }

  // NOTE: fullFeedbackText is now fetched via the analysis subscription (subscribeToAnalysisTitle)
  // which receives both title and full_feedback_text from the same realtime event.
  // No need for a separate useEffect query - the subscription handles it automatically.

  const feedback = useMemo(
    () => ({
      items: analysisState.feedback.feedbackItems,
      panelFraction: 0.4, // Static layout uses EXPANDED_FRACTION
      activeTab: 'feedback' as const, // Default tab - FeedbackSection manages its own state
      // NOTE: currentTime removed - deprecated in FeedbackPanel (auto-highlighting via coordinator)
      // Handlers that need precise time use videoPlayer.getPreciseCurrentTime()
      phase: analysisState.phase,
      progress: analysisState.progress,
      analysisTitle, // AI-generated analysis title
      fullFeedbackText, // Full AI-generated feedback text from analyses table
      fullFeedbackRating, // User rating for the full feedback text
      isHistoryMode,
    }),
    [
      analysisState.feedback.feedbackItems,
      // feedbackPanel.panelFraction, - MOVED: FeedbackSection subscribes directly
      // feedbackPanel.activeTab, - MOVED: FeedbackSection subscribes directly
      // highlightedFeedbackId, - REMOVED: FeedbackSection subscribes directly
      // videoPlayer.currentTime REMOVED - was causing render cascades
      analysisTitle,
      fullFeedbackText,
      fullFeedbackRating,
      analysisState.phase,
      analysisState.progress,
      isHistoryMode,
    ]
  )

  /**
   * PERFORMANCE FIX: Direct store subscriptions for playback object
   *
   * Problem: Reading from videoPlayer hook result causes VideoAnalysisScreen to re-render
   * whenever the hook has internal state changes, even if the values VideoAnalysisScreen
   * cares about haven't changed.
   *
   * Solution: Subscribe directly to Zustand store values. VideoAnalysisScreen only re-renders
   * when the specific playback values it uses actually change, not on every videoPlayer
   * hook internal state change.
   *
   * Impact: Eliminates unnecessary VideoAnalysisScreen re-renders during playback.
   */
  // PERFORMANCE FIX: Audio sync logic moved to VideoPlayerSection
  // Eliminates VideoAnalysisScreen re-renders when playback state changes
  // const audioSyncShouldPlayAudio = audioController.isPlaying
  // const audioSyncIsVideoPausedForAudio = audioController.isPlaying
  // const audioSync = useMemo(() => ({
  //   shouldPlayVideo: audioSyncShouldPlayVideo,
  //   shouldPlayAudio: audioSyncShouldPlayAudio,
  //   isVideoPausedForAudio: audioSyncIsVideoPausedForAudio,
  // }), [audioSyncShouldPlayVideo, audioSyncShouldPlayAudio, audioSyncIsVideoPausedForAudio])

  /**
   * FIX 3: Audio prop grouping removed - audioController moved to VideoPlayerSection
   * Reduces memoization layers and prevents screen-level store subscription
   */

  /**
   * FIX 4: Merge video + playback into videoState
   * Simplifies interface by combining related video state
   *
   * PERFORMANCE FIX: currentTime only updates on 1-second boundaries now (display time)
   * This prevents object recreation on every 250ms progress event
   */
  // PERFORMANCE FIX: videoState only includes static values
  // Playback state (videoEnded, pendingSeek, shouldPlayVideo) removed - VideoPlayerSection subscribes directly
  const videoState = useMemo(
    () => ({
      uri: historical.data?.videoUri ?? props.videoUri ?? '',
      posterUri: undefined,
      // // Use cached thumbnail as poster for instant visual feedback while video loads
      // posterUri: historical.data?.thumbnail,
      isReady: !isProcessing,
      isProcessing,
      initialStatus: normalizedInitialStatus as 'processing' | 'ready' | 'playing' | 'paused',
      avatarAssetKey,
    }),
    [
      historical.data?.videoUri,
      historical.data?.thumbnail,
      props.videoUri,
      isProcessing,
      normalizedInitialStatus,
      avatarAssetKey,
    ]
  )

  // 🆕 Gesture controller (after videoState to access isProcessing)
  const gesture = useGestureController(
    animation.scrollY,
    animation.feedbackContentOffsetY,
    animation.scrollRef,
    videoState.isProcessing // Disable gestures during video processing
  )

  /**
   * Memoized handlers object for VideoAnalysisLayout.
   *
   * Composes handlers from direct hook callbacks.
   * Minimal dependency tracking - hook callbacks are already memoized internally.
   */
  // Track gesture state to prevent accidental feedback taps during pan
  const gestureActiveRef = useRef(false)
  const gestureEndTimeRef = useRef(0)
  const GESTURE_GRACE_PERIOD_MS = 150 // Grace period to ignore taps right after gesture ends

  useEffect(() => {
    const handleUpdate = () => {
      const snapshot = gesture.feedbackScroll.getSnapshot()
      const wasActive = gestureActiveRef.current
      const isActive = !snapshot.enabled
      gestureActiveRef.current = isActive
      if (wasActive && !isActive) {
        gestureEndTimeRef.current = Date.now()
      }
    }

    handleUpdate()
    const unsubscribe = gesture.feedbackScroll.subscribe(handleUpdate)
    return unsubscribe
  }, [gesture.feedbackScroll])

  /**
   * PERFORMANCE FIX: Stable/Reactive Handler Split
   *
   * Problem: Original handlers useMemo had 42 dependencies including reactive state
   * (highlightedFeedbackId, bubbleVisible) that change every 150-200ms during playback.
   * This caused:
   * - New handlers object every render
   * - VideoAnalysisLayout re-render
   * - Gesture recreation (ID changes: 66/67 → 74/75)
   * - Cascade of 78 renders in 1.5 seconds
   *
   * Solution: Split handlers into stable (empty deps) and reactive (minimal deps).
   * Use refs to bridge stable callbacks to latest coordinator state.
   *
   * Impact: Reduces renders from 78 → ~5 during seek, eliminates gesture recreation.
   */

  // Store latest coordinator refs for stable handlers to access
  const feedbackCoordinatorRef = useRef(feedbackCoordinator)
  const analysisStateRef = useRef(analysisState)
  const feedbackAudioSourceRef = useRef(feedbackAudioSource)
  const gestureRef = useRef(gesture)
  // videoPlayerRef removed - using store setters directly

  // Update refs on every render (synchronous, no effect delay)
  feedbackCoordinatorRef.current = feedbackCoordinator
  analysisStateRef.current = analysisState
  feedbackAudioSourceRef.current = feedbackAudioSource
  gestureRef.current = gesture

  /**
   * Stable handlers - empty deps array.
   * These handlers access latest state via refs, maintaining reference stability.
   * Critical: These must NOT depend on reactive state (highlightedFeedbackId, bubbleVisible).
   */
  const handlers = useMemo(
    () => ({
      // Playback handlers - stable, invoke through refs and store setters
      onPlay: () => {
        // CRITICAL: If video has ended, replay from beginning instead of trying to play from end
        if (videoEndedRef.current) {
          // Call onReplay to seek to 0 and start playing
          setDisplayTime(0)
          setPendingSeek(0)
          setVideoEnded(false)
          setIsPlaying(true)
          return
        }

        // Only set video playing immediately if no pending feedback
        // When pending feedback exists, let feedback coordinator decide (audio may need to load first)
        const coordinator = feedbackCoordinatorRef.current

        // CRITICAL: Read pendingFeedbackId directly from coordinator's internal state
        // The coordinator returns a memoized object that doesn't update when refs change
        // So we must call onPlay first, which reads the ref internally, then check the result
        log.debug(
          'VideoAnalysisScreen.handlers.onPlay',
          '🎮 Play button pressed (BEFORE onPlay call)',
          {
            coordinatorExists: !!coordinator,
          }
        )

        setVideoEnded(false)
        coordinator?.onPlay()

        // After onPlay is called, the coordinator has already handled pending feedback internally
        // We don't need to check pendingFeedbackId here - just always let coordinator decide
      },
      onPause: () => {
        setIsPlaying(false)
        setVideoEnded(false)
        feedbackCoordinatorRef.current.onPause()
      },
      onReplay: () => {
        setDisplayTime(0)
        setPendingSeek(0)
        setVideoEnded(false)
        setIsPlaying(true)
      },
      onEnd: () => {
        setIsPlaying(false)
        setVideoEnded(true)
      },
      onSeek: (time: number) => {
        log.debug('VideoAnalysisScreen.onSeek', '⏭️ User seeking', { time })
        setPendingSeek(time)
        setVideoEnded(false)

        // PERFORMANCE: Check if there's anything to clean up before calling handler
        // Clear selection/highlight on any manual seek (user scrubbing away from feedback)
        // Only stop audio/hide overlay if actually active
        const audioState = useFeedbackAudioStore.getState()
        const feedbackState = useFeedbackCoordinatorStore.getState()
        const hasActiveAudio = audioState.isPlaying || audioState.activeAudio
        const hasSelection = feedbackState.selectedFeedbackId || feedbackState.highlightedFeedbackId

        if (hasActiveAudio || hasSelection) {
          // Clear everything: selection, highlight, audio, bubble
          feedbackCoordinatorRef.current.onAudioOverlayClose()
        }
      },
      onSeekComplete: (time: number | null) => {
        log.debug('VideoAnalysisScreen.onSeekComplete', '✓ Seek complete', { time })
        // Store updates handled by VideoPlayerSection.handleSeekComplete → videoPlayer.handleSeekComplete
        // Don't override with rounded value here
        setPendingSeek(null)
      },
      onVideoLoad: (data: { duration: number }) => {
        setDuration(data.duration)
        setVideoEnded(false)
      },
      onSignificantProgress: (time: number) => {
        // Access latest state via refs (not from stale closure)
        const currentCoordinator = feedbackCoordinatorRef.current
        currentTimeRef.current = time
        // Store updates handled by VideoPlayerSection.handleProgress → videoPlayer.handleProgress
        // Don't override with rounded value here
        currentCoordinator.onProgressTrigger(time)
      },
      onAudioNaturalEnd: () => {
        feedbackCoordinatorRef.current.onAudioNaturalEnd?.()
      },
      onFeedbackItemPress: (item: FeedbackPanelItem) => {
        // Guard against accidental taps during/after gesture
        const timeSinceGestureEnd = Date.now() - gestureEndTimeRef.current
        if (timeSinceGestureEnd < GESTURE_GRACE_PERIOD_MS && !gestureActiveRef.current) {
          log.debug('VideoAnalysisScreen.onFeedbackItemPress', '🚫 Ignoring tap in grace period', {
            itemId: item.id,
            timeSinceGestureEnd,
          })
          return
        }
        feedbackCoordinatorRef.current.onUserTapFeedback(item)
      },
      onCollapsePanel: () => feedbackCoordinatorRef.current.onPanelCollapse(),
      onBack: props.onBack,
      onRetry: () => analysisStateRef.current.retry(),
      onSelectAudio: (id: string) => feedbackAudioSourceRef.current.selectAudio(id),
      onFeedbackScrollY: (scrollY: number) => gestureRef.current.onFeedbackScrollY?.(scrollY),
      onFeedbackMomentumScrollEnd: () => gestureRef.current.onFeedbackMomentumScrollEnd?.(),
      onRetryFeedback: (feedbackId: string) =>
        analysisStateRef.current.feedback.retryFailedFeedback(feedbackId),
      onDismissError: (id: string) => feedbackAudioSourceRef.current.clearError(id),
      onFeedbackRatingChange: async (feedbackId: string, rating: 'up' | 'down' | null) => {
        try {
          const numericId = Number.parseInt(feedbackId, 10)
          if (Number.isNaN(numericId)) {
            log.error('VideoAnalysisScreen.onFeedbackRatingChange', 'Invalid feedbackId', {
              feedbackId,
              numericId,
            })
            return
          }
          // Optimistic update could be added here if needed
          await rateFeedbackItem(numericId, rating)

          // Update store directly instead of waiting for realtime (realtime may not fire for rating updates)
          useFeedbackStatusStore.getState().updateFeedback(numericId, {
            user_rating: rating,
            user_rating_at: rating ? new Date().toISOString() : null,
          })

          log.info('VideoAnalysisScreen.onFeedbackRatingChange', 'Rating updated', {
            feedbackId,
            numericId,
            rating,
          })
        } catch (error) {
          log.error('VideoAnalysisScreen.onFeedbackRatingChange', 'Failed to update rating', {
            feedbackId,
            rating,
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            errorDetails: error,
          })
        }
      },
      onFullFeedbackRatingChange: async (rating: 'up' | 'down' | null) => {
        try {
          const analysisUuid = analysisState.analysisUuid
          if (!analysisUuid) {
            log.warn('VideoAnalysisScreen.onFullFeedbackRatingChange', 'No analysis UUID available')
            return
          }
          // Optimistic update could be added here if needed
          await rateAnalysisFeedback(analysisUuid, rating)

          // Update cache directly so it persists and shows on next load
          if (analysisState.analysisJobId) {
            useVideoHistoryStore.getState().updateCache(analysisState.analysisJobId, {
              fullFeedbackRating: rating,
            })
          }

          log.info(
            'VideoAnalysisScreen.onFullFeedbackRatingChange',
            'Full feedback rating updated',
            {
              analysisUuid,
              rating,
            }
          )
        } catch (error) {
          log.error(
            'VideoAnalysisScreen.onFullFeedbackRatingChange',
            'Failed to update full feedback rating',
            {
              rating,
              error,
            }
          )
        }
      },
    }),
    [
      // Only truly stable dependencies - props that rarely change
      props.onBack,
      log,
      isProcessing, // Rarely changes (processing → ready)
      setIsPlaying,
      setPendingSeek,
      setVideoEnded,
      setDisplayTime,
      setDuration,
      analysisState.analysisUuid, // For rating full feedback
    ]
  )

  /**
   * Memoized error object for VideoAnalysisLayout.
   *
   * Combines error state from analysis hook into a single stable object.
   */
  const error = useMemo(
    () => ({
      visible: analysisState.error !== null,
      message: analysisState.error?.message ?? null,
      onRetry: analysisState.retry,
      onBack: props.onBack ?? (() => {}),
    }),
    [analysisState.error !== null, analysisState.error?.message, analysisState.retry, props.onBack]
  )

  /**
   * bubbleState - stable reference from feedbackCoordinator
   * Only changes when actual data changes, providing stability for React.memo.
   */

  /**
   * Pass props to VideoAnalysisLayout.
   *
   * Direct hook composition provides:
   * - Directly from hooks (already stable)
   * - Memoized here with minimal dependencies
   * - Stable callbacks/refs
   *
   * VideoAnalysisLayout's arePropsEqual will deep-compare and prevent
   * renders when data is actually unchanged.
   */
  return (
    <VideoAnalysisLayout
      gesture={gesture as any}
      animation={animation}
      video={videoState}
      feedback={feedback}
      // feedbackAudioUrls={feedbackAudioSource.audioUrls} - REMOVED: FeedbackSection subscribes directly
      // feedbackErrors={feedbackAudioSource.errors} - REMOVED: FeedbackSection subscribes directly
      handlers={handlers}
      videoControlsRef={videoControlsRef}
      controls={controls}
      error={error}
      // audio={audio} - REMOVED: audioController moved to VideoPlayerSection
      // audioController={audioController} - REMOVED: moved to VideoPlayerSection
      audioOverlay={audioOverlay}
      // coachSpeaking={isCoachSpeaking} - REMOVED: VideoPlayerSection now subscribes directly
      videoUri={historical.data?.videoUri ?? props.videoUri ?? ''}
      subscription={{
        key: subscriptionKey,
        shouldSubscribe: !isHistoryMode,
      }}
      voiceMode={voiceMode}
    />
  )
}

// Re-export props type for convenience
export type { VideoAnalysisScreenProps }

// Enable WDYR tracking for render cascade investigation
if (__DEV__) {
  // why-did-you-render adds this property at runtime
  ;(VideoAnalysisScreen as any).whyDidYouRender = {
    logOnDifferentValues: true, // Log when props change
  }
}
